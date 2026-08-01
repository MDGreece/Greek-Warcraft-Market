const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);

  if (!raid) {
    return "-";
  }

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythicKills = raid.mythic_bosses_killed || 0;
  const heroicKills = raid.heroic_bosses_killed || 0;
  const normalKills = raid.normal_bosses_killed || 0;

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
  const rankings = guild.rankings?.[CURRENT_RAID];

  return (
    rankings?.mythic?.world ||
    rankings?.heroic?.world ||
    rankings?.normal?.world ||
    DEFAULT_WORLD_RANK
  );
}

function formatBossProgress(group) {
  if (
    group?.bestBoss &&
    group?.bossProg &&
    group.bossProg !== "-"
  ) {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return "-";
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = guild.id || slugifyId(guild.name);
  const guildName = String(guild.name || "").toLowerCase();
  const guildRealm = String(guild.realm || "").toLowerCase();

  return logGroups.find(group => {
    const groupId = group.id || "";
    const groupName = String(group.name || "").toLowerCase();
    const parentGuild = String(group.parentGuild || "").toLowerCase();
    const groupRealm = String(group.realm || "").toLowerCase();

    const sameId = groupId === guildId;
    const sameName = groupName === guildName;
    const sameParent = parentGuild === guildName;

    const sameRealm =
      !guildRealm ||
      !groupRealm ||
      guildRealm === groupRealm;

    return sameRealm && (sameId || sameName || sameParent);
  });
}

function normalizeRaidTeamProgress(group) {
  const progress = group.progress || "-";

  if (
    progress === "CE" &&
    group.bestBoss &&
    group.bossProg &&
    group.bossProg !== "-"
  ) {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return progress;
}

function getProgressScore(progress) {
  if (!progress || progress === "-") {
    return 0;
  }

  if (progress === "CE") {
    return 1000;
  }

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);

  if (!match) {
    return 0;
  }

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyBase = {
    M: 300,
    H: 200,
    N: 100
  };

  return difficultyBase[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") {
    return 999;
  }

  const match = String(bossProg).match(/([\d.]+)%/);

  return match ? Number(match[1]) : 999;
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);
  const isCE = progress === "CE";

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,

    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK
        ? `WR ${worldRank}`
        : "-"
      : formatBossProgress(logGroup),

    worldRank,
    hasWorldRank: worldRank !== DEFAULT_WORLD_RANK,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeRaidTeamProgress(group);

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,

    // Raid teams never display WR.
    bossProg: formatBossProgress(group),

    worldRank: DEFAULT_WORLD_RANK,
    hasWorldRank: false,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  if (group.manual === true) {
    return true;
  }

  const raiderIds = new Set(
    raiderGuilds.map(guild =>
      guild.id || slugifyId(guild.name)
    )
  );

  return !raiderIds.has(group.id);
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

  if (bothCE) {
    const worldRankDifference =
      a.worldRank - b.worldRank;

    if (worldRankDifference !== 0) {
      return worldRankDifference;
    }
  }

  const bossPercentageDifference =
    getBossPercentValue(a.bossProg) -
    getBossPercentValue(b.bossProg);

  if (bossPercentageDifference !== 0) {
    return bossPercentageDifference;
  }

  // For equal non-CE progress, real guilds with an official WR
  // may be used only as a final tie-breaker.
  if (!bothCE) {
    const worldRankDifference =
      a.worldRank - b.worldRank;

    if (worldRankDifference !== 0) {
      return worldRankDifference;
    }
  }

  return String(a.name).localeCompare(String(b.name));
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild =>
    buildRaiderRow(guild, logGroups)
  );

  const raidTeamRows = logGroups
    .filter(group =>
      isManualRaidTeam(group, raiderGuilds)
    )
    .map(buildLogRow);

  const leaderboard = [
    ...raiderRows,
    ...raidTeamRows
  ]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(
    outputPath,
    JSON.stringify(leaderboard, null, 2)
  );

  console.log(
    `Created ${outputPath} with ${leaderboard.length} entries`
  );
}

run();
