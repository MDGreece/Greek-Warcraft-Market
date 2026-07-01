const fs = require("fs");

const sourcePath = "data/greek-guilds-source.json";
const outputPath = "data/guildsio.json";

function makeId(name) {
  return name
    .toLowerCase()
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getGuildData(guild) {
  const url =
    `https://raider.io/api/v1/guilds/profile` +
    `?region=${guild.region}` +
    `&realm=${encodeURIComponent(guild.realm)}` +
    `&name=${encodeURIComponent(guild.name)}` +
    `&fields=raid_progression,raid_rankings`;

  const response = await fetch(url);

  if (!response.ok) {
    console.log(`Failed: ${guild.name}`);
    return null;
  }

  const data = await response.json();

  return {
    id: makeId(guild.name),
    name: guild.name,
    realm: guild.realm,
    region: guild.region,
    profileUrl: data.profile_url || "",
    progress: data.raid_progression || {},
    rankings: data.raid_rankings || {}
  };
}

async function run() {
  const guilds = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const results = [];

  for (const guild of guilds) {
    console.log(`Fetching ${guild.name}...`);
    const data = await getGuildData(guild);

    if (data) {
      results.push(data);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Done. Saved ${results.length} guilds to ${outputPath}`);
}

run();
