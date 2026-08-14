const fs = require("fs");
const path = require("path");

const guildsIOPath =
  "data/guildsio.json";

const guildProfilesDirectory =
  "data/guilds";

/*
 * ONLY the current raid is automatically updated.
 *
 * Historical tiers are preserved exactly as they
 * already exist in each guild JSON.
 *
 * That means:
 *
 * NP
 * LoU
 * MO
 * T1 (DR, VS, MoQ)
 *
 * are historical/manual data from now on.
 */
const RAID_NAMES = {
  "the-venomous-abyss":
    "The Venomous Abyss"
};

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing file: ${filePath}`
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8"
    )
  );
}

function writeJson(
  filePath,
  data
) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    ) + "\n"
  );
}

function normalizeProgressSummary(
  summary
) {
  return String(
    summary || "-"
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

/*
 * Select the highest meaningful
 * Raider.IO world ranking.
 */
function getBestRanking(
  raidRankings,
  progression
) {
  if (!raidRankings) {
    return null;
  }

  const mythicKills =
    Number(
      progression
        ?.mythic_bosses_killed
    ) || 0;

  const heroicKills =
    Number(
      progression
        ?.heroic_bosses_killed
    ) || 0;

  const normalKills =
    Number(
      progression
        ?.normal_bosses_killed
    ) || 0;

  /*
   * Use Mythic rank when there
   * is actual Mythic progress.
   */
  if (
    mythicKills > 0 &&
    Number(
      raidRankings
        .mythic?.world
    ) > 0
  ) {
    return {
      difficulty:
        "M",

      WR:
        Number(
          raidRankings
            .mythic.world
        )
    };
  }

  /*
   * Otherwise Heroic.
   */
  if (
    heroicKills > 0 &&
    Number(
      raidRankings
        .heroic?.world
    ) > 0
  ) {
    return {
      difficulty:
        "H",

      WR:
        Number(
          raidRankings
            .heroic.world
        )
    };
  }

  /*
   * Normal remains available
   * as a fallback.
   */
  if (
    normalKills > 0 &&
    Number(
      raidRankings
        .normal?.world
    ) > 0
  ) {
    return {
      difficulty:
        "N",

      WR:
        Number(
          raidRankings
            .normal.world
        )
    };
  }

  return null;
}

function buildTierRanks(
  guildData,
  existingTierRanks = {}
) {
  /*
   * IMPORTANT:
   *
   * Copy every existing historical tier first.
   *
   * Nothing old is deleted.
   */
  const tierRanks = {
    ...existingTierRanks
  };

  /*
   * Only update raids explicitly listed
   * in RAID_NAMES.
   *
   * Currently that means ONLY
   * The Venomous Abyss.
   */
  for (
    const [
      raidSlug,
      displayName
    ]
    of Object.entries(
      RAID_NAMES
    )
  ) {
    const progression =
      guildData
        .progress?.[
          raidSlug
        ];

    const rankings =
      guildData
        .rankings?.[
          raidSlug
        ];

    /*
     * Raider.IO hasn't returned the
     * raid for this guild yet.
     *
     * Keep any existing entry untouched.
     */
    if (
      !progression &&
      !rankings
    ) {
      continue;
    }

    const existingTier =
      existingTierRanks[
        displayName
      ] || {};

    const bestRanking =
      getBestRanking(
        rankings,
        progression
      );

    /*
     * Automatically create/update ONLY
     * the current raid.
     */
    tierRanks[
      displayName
    ] = {
      progress:
        progression?.summary
          ? normalizeProgressSummary(
              progression.summary
            )
          : (
              existingTier.progress ||
              "-"
            ),

      WR:
        bestRanking?.WR
          ? String(
              bestRanking.WR
            )
          : (
              existingTier.WR ||
              "-"
            ),

      /*
       * Greek Rank is still manual.
       */
      GR:
        existingTier.GR ||
        "-"
    };
  }

  return tierRanks;
}

function updateGuildProfile(
  guildData
) {
  const profilePath =
    path.join(
      guildProfilesDirectory,
      `${guildData.id}.json`
    );

  if (
    !fs.existsSync(
      profilePath
    )
  ) {
    console.log(
      `Profile not found: ` +
      profilePath
    );

    return;
  }

  const profile =
    readJson(
      profilePath
    );

  const oldTierRanks =
    profile.tierRanks || {};

  const newTierRanks =
    buildTierRanks(
      guildData,
      oldTierRanks
    );

  const updatedProfile = {
    ...profile,

    /*
     * Raider.IO connection data
     * remains automatic.
     */
    raiderIO: {
      profileUrl:
        guildData.profileUrl ||
        profile.raiderIO
          ?.profileUrl ||
        "",

      realm:
        guildData.realm ||
        profile.raiderIO
          ?.realm ||
        "",

      region:
        guildData.region ||
        profile.raiderIO
          ?.region ||
        "",

      lastUpdated:
        new Date()
          .toISOString()
    },

    /*
     * Historical entries stay.
     *
     * Only Venomous Abyss is automatically
     * created/updated.
     */
    tierRanks:
      newTierRanks,

    /*
     * Roster is handled by the separate
     * Warcraft Logs roster updater.
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
    `Updated profile: ` +
    `${guildData.name}`
  );

  const venomousAbyss =
    updatedProfile
      .tierRanks?.[
        "The Venomous Abyss"
      ];

  if (venomousAbyss) {
    console.log(
      `  Venomous Abyss: ` +
      `${venomousAbyss.progress}, ` +
      `WR ${venomousAbyss.WR}, ` +
      `GR ${venomousAbyss.GR}`
    );
  }
}

function run() {
  if (
    !fs.existsSync(
      guildsIOPath
    )
  ) {
    throw new Error(
      `Missing file: ` +
      guildsIOPath
    );
  }

  if (
    !fs.existsSync(
      guildProfilesDirectory
    )
  ) {
    throw new Error(
      `Missing directory: ` +
      guildProfilesDirectory
    );
  }

  const guilds =
    readJson(
      guildsIOPath
    );

  if (
    !Array.isArray(
      guilds
    )
  ) {
    throw new Error(
      `${guildsIOPath} ` +
      `must contain an array`
    );
  }

  console.log(
    `Found ${guilds.length} ` +
    `guilds to process.`
  );

  console.log(
    "Current automatic raid: " +
    "The Venomous Abyss"
  );

  console.log(
    "Historical raid entries " +
    "will be preserved."
  );

  for (
    const guild of guilds
  ) {
    try {
      updateGuildProfile(
        guild
      );
    } catch (error) {
      console.error(
        `Failed to update ` +
        `${guild.name || guild.id}: ` +
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
  console.error(
    error.message
  );

  process.exit(1);
}
