const fs = require("fs");
const path = require("path");

const guildsIOPath = "data/guildsio.json";
const guildProfilesDirectory = "data/guilds";

/*
 * Raider.IO tiers that should be updated automatically.
 *
 * Historical/manual tiers already stored in the guild profile
 * are always preserved.
 */
const RAID_NAMES = {
  "tier-mn-1": "T1 (DR, VS, MoQ)"

  // Future example:
  // "tier-mn-2": "Midnight T2"
};

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function writeJson(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + "\n"
  );
}

function getBestRanking(raidRankings) {
  if (!raidRankings) {
    return null;
  }

  if (raidRankings.mythic?.world > 0) {
    return {
      difficulty: "M",
      WR: raidRankings.mythic.world
    };
  }

  if (raidRankings.heroic?.world > 0) {
    return {
      difficulty: "H",
      WR: raidRankings.heroic.world
    };
  }

  if (raidRankings.normal?.world > 0) {
    return {
      difficulty: "N",
      WR: raidRankings.normal.world
    };
  }

  return null;
}

function buildTierRanks(
  guildData,
  existingTierRanks = {}
) {
  /*
   * Preserve every existing tier.
   *
   * This includes:
   * - NP
   * - LoU
   * - MO
   * - older expansions
   * - any other manually maintained raid history
   */
  const tierRanks = {
    ...existingTierRanks
  };

  /*
   * Update only the Raider.IO tiers explicitly configured
   * in RAID_NAMES.
   */
  for (
    const [raidSlug, displayName]
    of Object.entries(RAID_NAMES)
  ) {
    const progression =
      guildData.progress?.[raidSlug];

    const rankings =
      guildData.rankings?.[raidSlug];

    /*
     * When Raider.IO does not return this tier, preserve the
     * existing manual or previously fetched entry unchanged.
     */
    if (!progression && !rankings) {
      continue;
    }

    const existingTier =
      existingTierRanks[displayName] || {};

    const bestRanking =
      getBestRanking(rankings);

    tierRanks[displayName] = {
      progress:
        progression?.summary ||
        existingTier.progress ||
        "-",

      WR:
        bestRanking?.WR?.toString() ||
        existingTier.WR ||
        "-",

      /*
       * Raider.IO does not currently provide the Greek rank
       * used by this site, so it stays manual.
       */
      GR:
        existingTier.GR ||
        "-"
    };
  }

  return tierRanks;
}

function updateGuildProfile(guildData) {
  const profilePath = path.join(
    guildProfilesDirectory,
    `${guildData.id}.json`
  );

  if (!fs.existsSync(profilePath)) {
    console.log(
      `Profile not found: ${profilePath}`
    );

    return;
  }

  const profile =
    readJson(profilePath);

  const updatedProfile = {
    ...profile,

    raiderIO: {
      profileUrl:
        guildData.profileUrl ||
        profile.raiderIO?.profileUrl ||
        "",

      realm:
        guildData.realm ||
        profile.raiderIO?.realm ||
        "",

      region:
        guildData.region ||
        profile.raiderIO?.region ||
        "",

      lastUpdated:
        new Date().toISOString()
    },

    tierRanks: buildTierRanks(
      guildData,
      profile.tierRanks || {}
    ),

    /*
     * The separate Warcraft Logs updater manages this.
     */
    roster:
      profile.roster || {
        tanks: [],
        healers: [],
        dps: []
      }
  };

  writeJson(
    profilePath,
    updatedProfile
  );

  console.log(
    `Updated profile: ${guildData.name}`
  );
}

function run() {
  if (!fs.existsSync(guildsIOPath)) {
    throw new Error(
      `Missing file: ${guildsIOPath}`
    );
  }

  if (
    !fs.existsSync(
      guildProfilesDirectory
    )
  ) {
    throw new Error(
      `Missing directory: ${guildProfilesDirectory}`
    );
  }

  const guilds =
    readJson(guildsIOPath);

  if (!Array.isArray(guilds)) {
    throw new Error(
      `${guildsIOPath} must contain an array`
    );
  }

  console.log(
    `Found ${guilds.length} guilds to process.`
  );

  for (const guild of guilds) {
    try {
      updateGuildProfile(guild);
    } catch (error) {
      console.error(
        `Failed to update ${guild.name || guild.id}: ` +
        error.message
      );
    }
  }

  console.log(
    "Finished updating guild profiles."
  );
}

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
