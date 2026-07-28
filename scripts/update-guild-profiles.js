const fs = require("fs");
const path = require("path");

const guildsIOPath = "data/guildsio.json";
const guildProfilesDirectory = "data/guilds";

/*
 * Add each new raid tier here when Raider.IO introduces it.
 *
 * Existing entries are preserved.
 * New entries are added separately.
 */
const RAID_NAMES = {
  "tier-mn-1": "T1 (DR, VS, MoQ)"

  // Future example:
  // "tier-mn-2": "Midnight T2"
};

/*
 * These manual The War Within tiers are preserved.
 * Older unwanted tiers are removed.
 */
const MANUAL_TWW_TIERS = ["NP", "LoU", "MO"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function buildTierRanks(guildData, existingTierRanks = {}) {
  const tierRanks = {};

  /*
   * Preserve only the three manual The War Within tiers.
   */
  for (const tierName of MANUAL_TWW_TIERS) {
    if (existingTierRanks[tierName]) {
      tierRanks[tierName] = existingTierRanks[tierName];
    }
  }

  /*
   * Preserve configured Midnight tiers, then update them
   * when fresh Raider.IO data exists.
   */
  for (const [raidSlug, displayName] of Object.entries(RAID_NAMES)) {
    if (existingTierRanks[displayName]) {
      tierRanks[displayName] = existingTierRanks[displayName];
    }

    const progression = guildData.progress?.[raidSlug];
    const rankings = guildData.rankings?.[raidSlug];

    if (!progression && !rankings) {
      continue;
    }

    const bestRanking = getBestRanking(rankings);

    tierRanks[displayName] = {
      progress:
        progression?.summary ||
        existingTierRanks[displayName]?.progress ||
        "-",

      WR:
        bestRanking?.WR?.toString() ||
        existingTierRanks[displayName]?.WR ||
        "-",

      GR:
        existingTierRanks[displayName]?.GR ||
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
    console.log(`Profile not found: ${profilePath}`);
    return;
  }

  const profile = readJson(profilePath);

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

      lastUpdated: new Date().toISOString()
    },

    tierRanks: buildTierRanks(
      guildData,
      profile.tierRanks || {}
    ),

    roster: profile.roster || {
      tanks: [],
      healers: [],
      dps: []
    }
  };

  writeJson(profilePath, updatedProfile);

  console.log(`Updated profile: ${guildData.name}`);
}

function run() {
  if (!fs.existsSync(guildsIOPath)) {
    throw new Error(`Missing file: ${guildsIOPath}`);
  }

  if (!fs.existsSync(guildProfilesDirectory)) {
    throw new Error(
      `Missing directory: ${guildProfilesDirectory}`
    );
  }

  const guilds = readJson(guildsIOPath);

  if (!Array.isArray(guilds)) {
    throw new Error(
      `${guildsIOPath} must contain an array`
    );
  }

  for (const guild of guilds) {
    updateGuildProfile(guild);
  }

  console.log("Finished updating guild profiles.");
}

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
