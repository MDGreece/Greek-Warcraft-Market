const fs = require("fs");

const sourcePath = "data/greek-guilds-source.json";
const outputPath = "data/guildsio.json";

/*
 * Only these raid tiers will be saved.
 *
 * The keys must match the raid slugs returned by Raider.IO.
 */
const ALLOWED_RAIDS = [
  // The War Within
  "nerubar-palace",
  "liberation-of-undermine",
  "manaforge-omega",

  // Midnight
  "tier-mn-1"
];

function makeId(name) {
  return name
    .toLowerCase()
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function filterRaids(raidData) {
  const filtered = {};

  if (!raidData || typeof raidData !== "object") {
    return filtered;
  }

  for (const raidSlug of ALLOWED_RAIDS) {
    if (raidData[raidSlug]) {
      filtered[raidSlug] = raidData[raidSlug];
    }
  }

  return filtered;
}

async function getGuildData(guild) {
  const url =
    "https://raider.io/api/v1/guilds/profile" +
    `?region=${encodeURIComponent(guild.region)}` +
    `&realm=${encodeURIComponent(guild.realm)}` +
    `&name=${encodeURIComponent(guild.name)}` +
    "&fields=raid_progression,raid_rankings";

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      `Failed to fetch ${guild.name}: ${response.status} ${errorText}`
    );

    return null;
  }

  const data = await response.json();

  return {
    id: guild.id || makeId(guild.name),
    name: guild.name,
    realm: guild.realm,
    region: guild.region,
    profileUrl: data.profile_url || "",

    progress: filterRaids(data.raid_progression),
    rankings: filterRaids(data.raid_rankings)
  };
}

async function run() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const guilds = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

  if (!Array.isArray(guilds)) {
    throw new Error(`${sourcePath} must contain a JSON array`);
  }

  const results = [];

  for (const guild of guilds) {
    console.log(`Fetching ${guild.name}...`);

    try {
      const data = await getGuildData(guild);

      if (data) {
        results.push(data);
      }
    } catch (error) {
      console.error(`Error updating ${guild.name}: ${error.message}`);
    }
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(results, null, 2) + "\n"
  );

  console.log(
    `Done. Saved ${results.length} guilds to ${outputPath}`
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
