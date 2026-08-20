const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

/*
 * ========================================
 * CURRENT LIVE RAID
 * ========================================
 *
 * IMPORTANT:
 * This must match the raidKey written by
 * update-warcraftlogs.js and the Raider.IO
 * raid key inside guildsio.json.
 */
const CURRENT_RAID = "the-venomous-abyss";

const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 8;

/*
 * These raid teams must always use the
 * automatic Warcraft Logs data.
 *
 * Even if an old JSON entry still has
 * "manual": true, build-leaderboard will
 * treat these as automatic.
 */
const AUTOMATIC_LOG_GROUP_IDS = new Set([
  "disobedient-group-ii",
  "disobedient-group-iii"
]);

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function slugifyId(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProgress(progress) {
  return String(progress || "-")
    .trim()
    .replace(/\s+/g, "");
}

/*
 * ========================================
 * HELPERS
 * ========================================
 */

function isAutomaticLogGroup(group) {
  return AUTOMATIC_LOG_GROUP_IDS.has(
    group?.id
  );
}

function isCurrentRaidLogGroup(group) {
  return (
    group &&
    group.raidKey === CURRENT_RAID
  );
}

/*
 * ========================================
 * RAIDER.IO
 * ========================================
 */

function getRaiderRaid(guild) {
  return (
    guild.progress?.[CURRENT_RAID] ||
    null
  );
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);

  if (!raid) {
    return "-";
  }

  const totalBosses =
    Number(raid.total_bosses) ||
    TOTAL_BOSSES;

  const mythicKills =
    Number(
      raid.mythic_bosses_killed
    ) || 0;

  const heroicKills =
    Number(
      raid.heroic_bosses_killed
    ) || 0;

  const normalKills =
    Number(
      raid.normal_bosses_killed
    ) || 0;

  /*
   * Mythic has priority.
   */
  if (mythicKills > 0) {
    return mythicKills >= totalBosses
      ? "CE"
      : `${mythicKills}/${totalBosses}M`;
  }

  /*
   * Heroic next.
   */
  if (heroicKills > 0) {
    return `${heroicKills}/${totalBosses}H`;
  }

  /*
   * Normal fallback.
   */
  if (normalKills > 0) {
    return `${normalKills}/${totalBosses}N`;
  }

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings =
    guild.rankings?.[CURRENT_RAID];

  if (!rankings) {
    return DEFAULT_WORLD_RANK;
  }

  const raid = getRaiderRaid(guild);

  const mythicKills =
    Number(
      raid?.mythic_bosses_killed
    ) || 0;

  const heroicKills =
    Number(
      raid?.heroic_bosses_killed
    ) || 0;

  const normalKills =
    Number(
      raid?.normal_bosses_killed
    ) || 0;

  if (
    mythicKills > 0 &&
    Number(rankings?.mythic?.world) > 0
  ) {
    return Number(
      rankings.mythic.world
    );
  }

  if (
    heroicKills > 0 &&
    Number(rankings?.heroic?.world) > 0
  ) {
    return Number(
      rankings.heroic.world
    );
  }

  if (
    normalKills > 0 &&
    Number(rankings?.normal?.world) > 0
  ) {
    return Number(
      rankings.normal.world
    );
  }

  return DEFAULT_WORLD_RANK;
}

/*
 * ========================================
 * WARCRAFT LOGS
 * ========================================
 */

/*
 * IMPORTANT FIX:
 *
 * Boss progress is now raid-aware.
 *
 * Old bossProg / bestBoss information from
 * the previous raid will NEVER be displayed
 * if the group's raidKey does not equal
 * CURRENT_RAID.
 */
function formatBossProgress(group) {
  if (!group) {
    return "-";
  }

  /*
   * Never use boss data from an old tier.
   */
  if (
    group.raidKey !== CURRENT_RAID
  ) {
    return "-";
  }

  /*
   * Current-raid CE.
   */
  if (
    group.bossProg === "CE" ||
    group.progress === "CE"
  ) {
    return "CE";
  }

  /*
   * Current progression boss.
   *
   * Examples:
   *
   * 36.6% P3
   * 57.9% P2
   * 12.4% Nexus-King Salhadaar
   *
   * Whatever update-warcraftlogs.js writes
   * into bossProg + bestBoss will be used.
   */
  if (
    group.bestBoss &&
    group.bossProg &&
    group.bossProg !== "-"
  ) {
    return (
      `${group.bossProg} ` +
      `${group.bestBoss}`
    );
  }

  return "-";
}

function findLogGroupForGuild(
  guild,
  logGroups
) {
  const guildId =
    guild.id ||
    slugifyId(guild.name);

  const guildName =
    String(guild.name || "")
      .trim()
      .toLowerCase();

  const guildRealm =
    String(guild.realm || "")
      .trim()
      .toLowerCase();

  return logGroups.find(group => {
    /*
     * IMPORTANT:
     * Only use a Warcraft Logs group
     * belonging to the current raid.
     *
     * This prevents old-tier boss progress
     * being attached to a current Raider.IO
     * guild row.
     */
    if (
      group.raidKey &&
      group.raidKey !== CURRENT_RAID
    ) {
      return false;
    }

    const groupId =
      group.id || "";

    const groupName =
      String(group.name || "")
        .trim()
        .toLowerCase();

    const parentGuild =
      String(group.parentGuild || "")
        .trim()
        .toLowerCase();

    const groupRealm =
      String(group.realm || "")
        .trim()
        .toLowerCase();

    const sameId =
      groupId === guildId;

    const sameName =
      groupName === guildName;

    const sameParent =
      parentGuild === guildName;

    const sameRealm =
      !guildRealm ||
      !groupRealm ||
      guildRealm === groupRealm;

    return (
      sameRealm &&
      (
        sameId ||
        sameName ||
        sameParent
      )
    );
  });
}

/*
 * Manual progress overrides are allowed
 * ONLY if explicitly assigned to the
 * current raid.
 *
 * Example:
 *
 * "fixedRaidKey": "the-venomous-abyss",
 * "fixedProgress": "3/8M"
 */
function getLogProgress(group) {
  /*
   * Automatic groups must never use an old
   * manual fixedProgress value.
   */
  if (
    !isAutomaticLogGroup(group) &&
    group.fixedRaidKey === CURRENT_RAID &&
    group.fixedProgress
  ) {
    return normalizeProgress(
      group.fixedProgress
    );
  }

  /*
   * Normal current-raid Warcraft Logs data.
   */
  if (
    group.raidKey === CURRENT_RAID
  ) {
    return normalizeProgress(
      group.progress || "-"
    );
  }

  /*
   * Old raid.
   */
  return "-";
}

/*
 * ========================================
 * SORTING
 * ========================================
 */

function getProgressScore(progress) {
  const normalized =
    normalizeProgress(progress);

  if (
    !normalized ||
    normalized === "-"
  ) {
    return 0;
  }

  if (normalized === "CE") {
    return 1000;
  }

  const match =
    normalized.match(
      /^(\d+)\/(\d+)([MNH])$/
    );

  if (!match) {
    return 0;
  }

  const kills =
    Number(match[1]);

  const difficulty =
    match[3];

  const difficultyBase = {
    M: 300,
    H: 200,
    N: 100
  };

  return (
    difficultyBase[difficulty] +
    kills
  );
}

function getBossPercentValue(
  bossProg
) {
  if (
    !bossProg ||
    bossProg === "-" ||
    bossProg === "CE" ||
    bossProg === "No official WR"
  ) {
    return 999;
  }

  const match =
    String(bossProg).match(
      /([\d.]+)%/
    );

  return match
    ? Number(match[1])
    : 999;
}

/*
 * Manual fixed ranking is allowed only
 * for the current raid.
 *
 * Automatic groups ignore fixedRank.
 */
function getFixedRank(group) {
  if (
    isAutomaticLogGroup(group)
  ) {
    return null;
  }

  if (
    group.fixedRankRaidKey !==
    CURRENT_RAID
  ) {
    return null;
  }

  const fixedRank =
    Number(group.fixedRank);

  return (
    Number.isInteger(fixedRank) &&
    fixedRank > 0
  )
    ? fixedRank
    : null;
}

/*
 * ========================================
 * ROW BUILDERS
 * ========================================
 */

function buildRaiderRow(
  guild,
  logGroups
) {
  const progress =
    getRaiderProgress(guild);

  const worldRank =
    getRaiderWorldRank(guild);

  const logGroup =
    findLogGroupForGuild(
      guild,
      logGroups
    );

  const isCE =
    progress === "CE";

  return {
    id:
      guild.id ||
      slugifyId(guild.name),

    name:
      guild.name,

    type:
      "guild",

    realm:
      guild.realm || "",

    parentGuild:
      "",

    raidKey:
      CURRENT_RAID,

    progress,

    /*
     * CE guilds show their world rank.
     *
     * Non-CE guilds show ONLY current-tier
     * Warcraft Logs boss progress.
     */
    bossProg:
      isCE
        ? worldRank !==
          DEFAULT_WORLD_RANK
          ? `WR ${worldRank}`
          : "CE"
        : formatBossProgress(
            logGroup
          ),

    worldRank,

    hasWorldRank:
      worldRank !==
      DEFAULT_WORLD_RANK,

    fixedRank:
      null,

    raceFinished:
      isCE,

    source:
      "raiderio"
  };
}

function buildLogRow(group) {
  const progress =
    getLogProgress(group);

  const isCE =
    progress === "CE";

  /*
   * World rank must also belong to the
   * current raid.
   */
  const suppliedWorldRank =
    group.raidKey === CURRENT_RAID
      ? Number(
          group.currentWorldRank ??
          group.worldRank
        )
      : DEFAULT_WORLD_RANK;

  const hasWorldRank =
    Number.isInteger(
      suppliedWorldRank
    ) &&
    suppliedWorldRank > 0 &&
    suppliedWorldRank <
      DEFAULT_WORLD_RANK;

  const worldRank =
    hasWorldRank
      ? suppliedWorldRank
      : DEFAULT_WORLD_RANK;

  return {
    id:
      group.id,

    name:
      group.name,

    type:
      group.type ||
      "raid-team",

    realm:
      group.realm || "",

    parentGuild:
      group.parentGuild || "",

    raidKey:
      CURRENT_RAID,

    progress,

    bossProg:
      isCE
        ? hasWorldRank
          ? `WR ${worldRank}`
          : "No official WR"
        : formatBossProgress(
            group
          ),

    worldRank,

    hasWorldRank,

    fixedRank:
      getFixedRank(group),

    raceFinished:
      group.raceFinished === true &&
      group.raidKey === CURRENT_RAID
        ? true
        : isCE,

    source:
      "warcraftlogs",

    latestReport:
      group.raidKey === CURRENT_RAID
        ? group.latestReport || ""
        : "",

    latestReportTitle:
      group.raidKey === CURRENT_RAID
        ? group.latestReportTitle || ""
        : ""
  };
}

function getGuildId(guild) {
  return (
    guild.id ||
    slugifyId(guild.name)
  );
}

/*
 * ========================================
 * MANUAL / AUTOMATIC LOG GROUPS
 * ========================================
 */

function getManualLogIds(
  logGroups
) {
  return new Set(
    logGroups
      .filter(group => {
        /*
         * Group II and III are explicitly
         * automatic.
         */
        if (
          isAutomaticLogGroup(group)
        ) {
          return false;
        }

        return (
          group.manual === true
        );
      })
      .map(
        group =>
          group.id
      )
      .filter(Boolean)
  );
}

/*
 * ========================================
 * SORTING
 * ========================================
 */

function sortLeaderboard(a, b) {
  const progressDifference =
    getProgressScore(b.progress) -
    getProgressScore(a.progress);

  if (
    progressDifference !== 0
  ) {
    return progressDifference;
  }

  const bothCE =
    a.progress === "CE" &&
    b.progress === "CE";

  /*
   * CE: official WR decides.
   */
  if (
    bothCE &&
    a.hasWorldRank &&
    b.hasWorldRank
  ) {
    const difference =
      a.worldRank -
      b.worldRank;

    if (difference !== 0) {
      return difference;
    }
  }

  /*
   * Ranked CE before unranked CE.
   */
  if (
    bothCE &&
    a.hasWorldRank !==
    b.hasWorldRank
  ) {
    return a.hasWorldRank
      ? -1
      : 1;
  }

  /*
   * Current boss percentage.
   *
   * Lower % = better.
   */
  const bossPercentageDifference =
    getBossPercentValue(
      a.bossProg
    ) -
    getBossPercentValue(
      b.bossProg
    );

  if (
    bossPercentageDifference !== 0
  ) {
    return bossPercentageDifference;
  }

  /*
   * World rank tie-breaker for
   * equal non-CE progression.
   */
  if (
    !bothCE &&
    a.hasWorldRank &&
    b.hasWorldRank
  ) {
    const difference =
      a.worldRank -
      b.worldRank;

    if (difference !== 0) {
      return difference;
    }
  }

  if (
    !bothCE &&
    a.hasWorldRank !==
    b.hasWorldRank
  ) {
    return a.hasWorldRank
      ? -1
      : 1;
  }

  return String(
    a.name || ""
  ).localeCompare(
    String(
      b.name || ""
    ),
    undefined,
    {
      sensitivity: "base"
    }
  );
}

/*
 * Apply manual positions AFTER the normal
 * automatic sorting.
 */
function applyFixedRanks(entries) {
  const normalEntries =
    entries.filter(
      entry =>
        entry.fixedRank === null
    );

  const fixedEntries =
    entries
      .filter(
        entry =>
          entry.fixedRank !== null
      )
      .sort(
        (a, b) =>
          a.fixedRank -
          b.fixedRank
      );

  for (
    const entry of fixedEntries
  ) {
    const targetIndex =
      Math.max(
        0,
        Math.min(
          entry.fixedRank - 1,
          normalEntries.length
        )
      );

    normalEntries.splice(
      targetIndex,
      0,
      entry
    );
  }

  return normalEntries;
}

/*
 * ========================================
 * MAIN
 * ========================================
 */

function run() {
  const raiderGuilds =
    readJson(raiderPath);

  const logGroups =
    readJson(logsPath);

  if (
    !Array.isArray(
      raiderGuilds
    )
  ) {
    throw new Error(
      `${raiderPath} must contain an array`
    );
  }

  if (
    !Array.isArray(
      logGroups
    )
  ) {
    throw new Error(
      `${logsPath} must contain an array`
    );
  }

  console.log(
    "Building current leaderboard"
  );

  console.log(
    `Current raid: ${CURRENT_RAID}`
  );

  console.log(
    `Total bosses: ${TOTAL_BOSSES}`
  );

  /*
   * Manual Warcraft Logs entries can
   * override matching Raider.IO guilds.
   *
   * Group II and Group III are excluded
   * from this set and stay automatic.
   */
  const manualLogIds =
    getManualLogIds(
      logGroups
    );

  const raiderRows =
    raiderGuilds
      .filter(guild => {
        const guildId =
          getGuildId(guild);

        return (
          !manualLogIds.has(
            guildId
          )
        );
      })
      .map(guild =>
        buildRaiderRow(
          guild,
          logGroups
        )
      );

  const raiderIds =
    new Set(
      raiderGuilds.map(
        guild =>
          getGuildId(guild)
      )
    );

  /*
   * Include:
   *
   * - genuinely manual Warcraft Logs rows
   * - Warcraft Logs-only raid teams
   * - automatic Disobedient Group II / III
   */
  const raidTeamRows =
    logGroups
      .filter(group => {
        const automaticGroup =
          isAutomaticLogGroup(group);

        const genuinelyManual =
          group.manual === true &&
          !automaticGroup;

        const logsOnly =
          !raiderIds.has(
            group.id
          );

        return (
          genuinelyManual ||
          logsOnly
        );
      })
      .map(
        buildLogRow
      );

  const naturallySortedEntries = [
    ...raiderRows,
    ...raidTeamRows
  ].sort(
    sortLeaderboard
  );

  const leaderboard =
    applyFixedRanks(
      naturallySortedEntries
    ).map(
      (entry, index) => ({
        rank:
          index + 1,

        ...entry
      })
    );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      leaderboard,
      null,
      2
    ) + "\n"
  );

  console.log(
    `Created ${outputPath} with ` +
    `${leaderboard.length} entries`
  );

  console.log("");

  console.log(
    "Leaderboard sources:"
  );

  const raiderCount =
    leaderboard.filter(
      entry =>
        entry.source ===
        "raiderio"
    ).length;

  const logsCount =
    leaderboard.filter(
      entry =>
        entry.source ===
        "warcraftlogs"
    ).length;

  console.log(
    `Raider.IO: ${raiderCount}`
  );

  console.log(
    `Warcraft Logs: ${logsCount}`
  );

  /*
   * ========================================
   * DEBUGGING
   * ========================================
   */

  const amargosa =
    leaderboard.find(
      entry =>
        entry.id ===
        "amargosa-crew"
    );

  if (amargosa) {
    console.log(
      `Amargosa Crew: ` +
      `${amargosa.progress}, ` +
      `boss=${amargosa.bossProg}, ` +
      `raid=${amargosa.raidKey}, ` +
      `source=${amargosa.source}`
    );
  }

  const groupTwo =
    leaderboard.find(
      entry =>
        entry.id ===
        "disobedient-group-ii"
    );

  if (groupTwo) {
    console.log(
      `Disobedient Group II: ` +
      `${groupTwo.progress}, ` +
      `boss=${groupTwo.bossProg}, ` +
      `raid=${groupTwo.raidKey}, ` +
      `source=${groupTwo.source}`
    );
  }

  const groupThree =
    leaderboard.find(
      entry =>
        entry.id ===
        "disobedient-group-iii"
    );

  if (groupThree) {
    console.log(
      `Disobedient Group III: ` +
      `${groupThree.progress}, ` +
      `boss=${groupThree.bossProg}, ` +
      `raid=${groupThree.raidKey}, ` +
      `source=${groupThree.source}`
    );
  }
}

try {
  run();
} catch (error) {
  console.error(
    `Leaderboard build failed: ` +
    error.message
  );

  process.exit(1);
}
