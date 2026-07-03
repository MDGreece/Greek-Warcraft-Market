const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const raiderPath = "data/guildsio.json";
const outputPath = "data/warcraftlogs-groups.json";

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET");
  }

  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not get Warcraft Logs token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function queryWarcraftLogs(token, query, variables = {}) {
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (data.errors) {
    console.log(JSON.stringify(data.errors, null, 2));
    return null;
  }

  return data.data;
}

function slugifyRealm(realm) {
  return String(realm)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function findGuild(token, guild) {
  const query = `
    query($name: String!, $serverSlug: String!, $serverRegion: String!) {
      guildData {
        guild(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          id
          name
          server {
            name
            slug
            region {
              name
              slug
            }
          }
        }
      }
    }
  `;

  const variables = {
    name: guild.name,
    serverSlug: slugifyRealm(guild.realm),
    serverRegion: "EU"
  };

  const data = await queryWarcraftLogs(token, query, variables);
  return data?.guildData?.guild || null;
}

function loadExistingGroups() {
  if (!fs.existsSync(outputPath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

function groupAlreadyExists(groups, guild, wclGuild) {
  const newId = slugifyId(guild.name);
  const guildName = guild.name?.toLowerCase();
  const guildRealm = guild.realm?.toLowerCase();

  return groups.some(group => {
    const sameId = group.id === newId;
    const sameWclId = group.warcraftLogsGuildId === wclGuild.id;
    const sameName = group.name?.toLowerCase() === guildName;
    const sameRealm =
      !group.realm ||
      !guildRealm ||
      group.realm.toLowerCase() === guildRealm;

    return sameId || sameWclId || (sameName && sameRealm);
  });
}

async function run() {
  console.log("Finding Warcraft Logs guild IDs without removing existing entries");

  const token = await getToken();
  const raiderGuilds = JSON.parse(fs.readFileSync(raiderPath, "utf8"));
  const groups = loadExistingGroups();

  for (const guild of raiderGuilds) {
    console.log(`Searching Warcraft Logs: ${guild.name} - ${guild.realm}`);

    const wclGuild = await findGuild(token, guild);

    if (!wclGuild) {
      console.log(`NOT FOUND: ${guild.name}`);
      continue;
    }

    if (groupAlreadyExists(groups, guild, wclGuild)) {
      console.log(`SKIP EXISTING: ${guild.name}`);
      continue;
    }

    groups.push({
      id: slugifyId(guild.name),
      name: guild.name,
      parentGuild: guild.name,
      realm: guild.realm,
      warcraftLogsGuildId: wclGuild.id,
      autoFound: true
    });

    console.log(`FOUND: ${guild.name} => ${wclGuild.id}`);
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log(`Updated ${outputPath} with ${groups.length} total entries`);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
