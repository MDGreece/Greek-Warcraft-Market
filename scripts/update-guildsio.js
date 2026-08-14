const fs = require("fs");

const sourcePath = "data/greek-guilds-source.json";
const outputPath = "data/guildsio.json";

/*
 * Guild Raider.IO updater
 *
 * IMPORTANT:
 * We no longer hard-code allowed raid slugs here.
 *
 * Raider.IO decides which raid tiers are currently available.
 * We preserve every raid progression/ranking object returned by
 * Raider.IO so that a new season does not silently disappear.
 *
 * The leaderboard script will separately decide which raid is
 * considered CURRENT.
 */

function makeId(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanRaidData(raidData) {
  if (
    !raidData ||
    typeof raidData !== "object" ||
    Array.isArray(raidData)
  ) {
    return {};
  }

  return raidData;
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
      `Failed to fetch ${guild.name}: ` +
      `${response.status} ${errorText}`
    );

    return null;
  }

  const data = await response.json();

  const progress =
    cleanRaidData(data.raid_progression);

  const rankings =
    cleanRaidData(data.raid_rankings);

  /*
   * Print the raid slugs returned by Raider.IO.
   *
   * This is especially useful during a new season because the
   * workflow log will immediately tell us the new raid key.
   */
  const progressionRaidKeys =
    Object.keys(progress);

  const rankingRaidKeys =
    Object.keys(rankings);

  console.log(
    `${guild.name} progression raids: ${
      progressionRaidKeys.length
        ? progressionRaidKeys.join(", ")
        : "none"
    }`
  );

  console.log(
    `${guild.name} ranking raids: ${
      rankingRaidKeys.length
        ? rankingRaidKeys.join(", ")
        : "none"
    }`
  );

  return {
    id:
      guild.id ||
      makeId(guild.name),

    name:
      guild.name,

    realm:
      guild.realm,

    region:
      guild.region,

    profileUrl:
      data.profile_url || "",

    progress,

    rankings
  };
}

async function run() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Source file not found: ${sourcePath}`
    );
  }

  const guilds =
    JSON.parse(
      fs.readFileSync(
        sourcePath,
        "utf8"
      )
    );

  if (!Array.isArray(guilds)) {
    throw new Error(
      `${sourcePath} must contain a JSON array`
    );
  }

  const results = [];

  const discoveredProgressRaids =
    new Set();

  const discoveredRankingRaids =
    new Set();

  for (const guild of guilds) {
    console.log("");
    console.log(
      `Fetching ${guild.name}...`
    );

    try {
      const data =
        await getGuildData(guild);

      if (!data) {
        continue;
      }

      results.push(data);

      for (
        const raidKey of
        Object.keys(data.progress || {})
      ) {
        discoveredProgressRaids.add(
          raidKey
        );
      }

      for (
        const raidKey of
        Object.keys(data.rankings || {})
      ) {
        discoveredRankingRaids.add(
          raidKey
        );
      }
    } catch (error) {
      console.error(
        `Error updating ${guild.name}: ` +
        error.message
      );
    }
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      results,
      null,
      2
    ) + "\n"
  );

  console.log("");
  console.log(
    "========================================"
  );

  console.log(
    "Raider.IO raid discovery"
  );

  console.log(
    "========================================"
  );

  console.log(
    "Progression raid keys:"
  );

  if (
    discoveredProgressRaids.size === 0
  ) {
    console.log("  none");
  } else {
    for (
      const raidKey of
      discoveredProgressRaids
    ) {
      console.log(
        `  - ${raidKey}`
      );
    }
  }

  console.log("");

  console.log(
    "Ranking raid keys:"
  );

  if (
    discoveredRankingRaids.size === 0
  ) {
    console.log("  none");
  } else {
    for (
      const raidKey of
      discoveredRankingRaids
    ) {
      console.log(
        `  - ${raidKey}`
      );
    }
  }

  console.log("");

  console.log(
    `Done. Saved ${results.length} guilds to ${outputPath}`
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
