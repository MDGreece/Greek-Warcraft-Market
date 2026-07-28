const fs = require("fs");
const path = require("path");

const guildsIOPath = "data/guildsio.json";
const guildProfilesDirectory = "data/guilds";

const RAID_NAMES = {
  "nerubar-palace": "NP",
  "liberation-of-undermine": "LoU",
  "manaforge-omega": "MO",
  "tier-mn-1": "T1 (DR, VS, MoQ)"
};

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

function buildTierRanks(guildData) {
  const tierRanks = {};

  for (const [raidSlug, displayName] of Object.entries(RAID_NAMES)) {
    const progression = guildData.progress?.[raidSlug];
    const rankings = guildData.rankings?.[raidSlug];

    if (!progression && !rankings) {
      continue;
    }

    const bestRanking = getBestRanking(rankings);

    tierRanks[displayName] = {
      progress: progression?.summary || "-",
      WR: bestRanking?.WR?.toString() || "-",
      GR: "-"
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
      profileUrl: guildData.profileUrl || "",
      realm: guildData.realm || profile.raiderIO?.realm || "",
      region: guildData.region || profile.raiderIO?.region || "",
      lastUpdated: new Date().toISOString()
    },

    tierRanks: buildTierRanks(guildData),

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
    throw new Error(`${guildsIOPath} must contain an array`);
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
