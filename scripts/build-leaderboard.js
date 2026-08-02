const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

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

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);

  if (!raid) {
    return "-";
  }

  const totalBosses =
    Number(raid.total_bosses) || TOTAL_BOSSES;

  const mythicKills =
    Number(raid.mythic_bosses_killed) || 0;

  const heroicKills =
    Number(raid.heroic_bosses_killed) || 0;

  const normalKills =
    Number(raid.normal_bosses_killed) || 0;

  if (mythicKills > 0) {
    return mythicKills >= totalBosses
      ? "CE"
      : `${mythicKills}/${totalBosses}M`;
  }

  if (heroicKills > 0) {
    return `${heroicKills}/${totalBosses}H`;
  }

  if (normalKills > 0) {
    return `${normalKills}/${totalBosses}N`;
  }

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings =
    guild.rankings?.[CURRENT_RAID];

  return (
    Number(rankings?.mythic?.world) ||
    Number(rankings?.heroic?.world) ||
    Number(rankings?.normal?.world) ||
    DEFAULT_WORLD_RANK
  );
}

function formatBossProgress(group) {
  if (
    group?.bossProg === "CE" ||
    group?.progress === "CE"
  ) {
    return "CE";
  }

  if (
    group?.bestBoss &&
    group?.bossProg &&
    group.bossProg !== "-"
  ) {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return "-";
}

function findLogGroupForGuild(
  guild,
  logGroups
) {
  const guildId =
    guild.id || slugifyId(guild.name);

  const guildName =
    String(guild.name || "")
      .trim()
      .toLowerCase();

  const guildRealm =
    String(guild.realm || "")
      .trim()
      .toLowerCase();

  return logGroups.find(group => {
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
      (sameId || sameName || sameParent)
    );
  });
}

function getLogProgress(group) {
  /*
   * fixedProgress is an optional manual override.
   *
   * If it exists, it wins over the automatically
   * calculated Warcraft Logs progress.
   */
  const progress =
    group.fixedProgress ??
    group.progress ??
    "-";

  return normalizeProgress(progress);
}

function getProgressScore(progress) {
  const normalized =
    normalizeProgress(progress);

  if (!normalized || normalized === "-") {
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

function getBossPercentValue(bossProg) {
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

function getFixedRank(group) {
  const fixedRank =
    Number(group.fixedRank);

  return (
    Number.isInteger(fixedRank) &&
    fixedRank > 0
  )
    ? fixedRank
    : null;
}

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

    progress,

    bossProg:
      isCE
        ? worldRank !== DEFAULT_WORLD_RANK
          ? `WR ${worldRank}`
          : "CE"
        : formatBossProgress(logGroup),

    worldRank,

    hasWorldRank:
      worldRank !== DEFAULT_WORLD_RANK,

    fixedRank: null,

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
   * Warcraft Logs-only raid teams normally have no
   * official Raider.IO world rank.
   *
   * currentWorldRank can be supplied manually if a
   * trustworthy current rank exists.
   */
  const suppliedWorldRank =
    Number(
      group.currentWorldRank ??
      group.worldRank
    );

  const hasWorldRank =
    Number.isInteger(suppliedWorldRank) &&
    suppliedWorldRank > 0 &&
    suppliedWorldRank < DEFAULT_WORLD_RANK;

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
      group.type || "raid-team",

    realm:
      group.realm || "",

    parentGuild:
      group.parentGuild || "",

    progress,

    bossProg:
      isCE
        ? hasWorldRank
          ? `WR ${worldRank}`
          : "No official WR"
        : formatBossProgress(group),

    worldRank,

    hasWorldRank,

    fixedRank:
      getFixedRank(group),

    raceFinished:
      group.raceFinished === true ||
      isCE,

    source:
      "warcraftlogs",

    latestReport:
      group.latestReport || "",

    latestReportTitle:
      group.latestReportTitle || ""
  };
}

function getGuildId(guild) {
  return (
    guild.id ||
    slugifyId(guild.name)
  );
}

function getManualLogIds(logGroups) {
  return new Set(
    logGroups
      .filter(
        group =>
          group.manual === true
      )
      .map(
        group =>
          group.id
      )
      .filter(Boolean)
  );
}

function sortLeaderboard(a, b) {
  const progressDifference =
    getProgressScore(b.progress) -
    getProgressScore(a.progress);

  if (progressDifference !== 0) {
    return progressDifference;
  }

  const bothCE =
    a.progress === "CE" &&
    b.progress === "CE";

  /*
   * Among CE entries, use official world rank
   * when both entries have one.
   */
  if (
    bothCE &&
    a.hasWorldRank &&
    b.hasWorldRank
  ) {
    const worldRankDifference =
      a.worldRank - b.worldRank;

    if (worldRankDifference !== 0) {
      return worldRankDifference;
    }
  }

  /*
   * If only one CE entry has an official rank,
   * put the officially ranked entry first.
   */
  if (
    bothCE &&
    a.hasWorldRank !== b.hasWorldRank
  ) {
    return a.hasWorldRank
      ? -1
      : 1;
  }

  const bossPercentageDifference =
    getBossPercentValue(a.bossProg) -
    getBossPercentValue(b.bossProg);

  if (bossPercentageDifference !== 0) {
    return bossPercentageDifference;
  }

  /*
   * For equal non-CE progress, use official
   * world rank as a later tie-breaker.
   */
  if (
    !bothCE &&
    a.hasWorldRank &&
    b.hasWorldRank
  ) {
    const worldRankDifference =
      a.worldRank - b.worldRank;

    if (worldRankDifference !== 0) {
      return worldRankDifference;
    }
  }

  if (
    !bothCE &&
    a.hasWorldRank !== b.hasWorldRank
  ) {
    return a.hasWorldRank
      ? -1
      : 1;
  }

  return String(a.name || "")
    .localeCompare(
      String(b.name || "")
    );
}

function applyFixedRanks(entries) {
  const normalEntries = entries.filter(
    entry => entry.fixedRank === null
  );

  const fixedEntries = entries
    .filter(
      entry => entry.fixedRank !== null
    )
    .sort(
      (a, b) =>
        a.fixedRank - b.fixedRank
    );

  for (const entry of fixedEntries) {
    const targetIndex = Math.max(
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
function run() {
  const raiderGuilds =
    readJson(raiderPath);

  const logGroups =
    readJson(logsPath);

  if (!Array.isArray(raiderGuilds)) {
    throw new Error(
      `${raiderPath} must contain an array`
    );
  }

  if (!Array.isArray(logGroups)) {
    throw new Error(
      `${logsPath} must contain an array`
    );
  }

  /*
   * A manual Warcraft Logs entry overrides the
   * Raider.IO entry with the same ID.
   *
   * This is required for Amargosa Crew and other
   * manually controlled raid teams/guilds.
   */
  const manualLogIds =
    getManualLogIds(logGroups);

  const raiderRows =
    raiderGuilds
      .filter(guild => {
        const guildId =
          getGuildId(guild);

        return !manualLogIds.has(guildId);
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
   * - all manual Warcraft Logs entries;
   * - all Warcraft Logs-only raid teams not found
   *   in Raider.IO.
   */
  const raidTeamRows =
    logGroups
      .filter(group => {
        return (
          group.manual === true ||
          !raiderIds.has(group.id)
        );
      })
      .map(buildLogRow);

const naturallySortedEntries = [
  ...raiderRows,
  ...raidTeamRows
].sort(sortLeaderboard);

const leaderboard = applyFixedRanks(
  naturallySortedEntries
).map((entry, index) => ({
  rank: index + 1,
  ...entry
}));

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

  const amargosa =
    leaderboard.find(
      entry =>
        entry.id === "amargosa-crew"
    );

  if (amargosa) {
    console.log(
      `Amargosa Crew: ` +
      `${amargosa.progress}, ` +
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
      `source=${groupTwo.source}`
    );
  }
}

try {
  run();
} catch (error) {
  console.error(
    `Leaderboard build failed: ${error.message}`
  );

  process.exit(1);
}
