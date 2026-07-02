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
  if (!raid) return "-";

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythicKills = raid.mythic_bosses_killed || 0;
  const heroicKills = raid.heroic_bosses_killed || 0;
  const normalKills = raid.normal_bosses_killed || 0;

  if (mythicKills > 0) {
    return mythicKills >= totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;
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

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  if (progress !== "CE") {
    return progress;
  }

  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return "CE";
}

function parseProgress(progress) {
  if (!progress || progress === "-") {
    return { difficulty: "", kills: 0, total: TOTAL_BOSSES, ce: false };
  }

  if (progress === "CE") {
    return { difficulty: "M", kills: TOTAL_BOSSES, total: TOTAL_BOSSES, ce: true };
  }

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);

  if (!match) {
    return { difficulty: "", kills: 0, total: TOTAL_BOSSES, ce: false };
  }

  return {
    kills: Number(match[1]),
    total: Number(match[2]),
    difficulty: match[3],
    ce: false
  };
}

function logMatchesCurrentRaiderProgress(raiderProgress, logProgress) {
  const raider = parseProgress(raiderProgress);
  const logs = parseProgress(logProgress);

  if (!raider.difficulty || !logs.difficulty) {
    return false;
  }

  return (
    raider.difficulty === logs.difficulty &&
    raider.kills === logs.kills &&
    raider.total === logs.total
  );
}

function formatBossProgress(group) {
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return group.bossProg || "-";
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = guild.id || slugifyId(guild.name);
  const guildName = guild.name?.toLowerCase();
  const guildRealm = guild.realm?.toLowerCase();

  return logGroups.find(group => {
    const groupId = group.id;
    const groupName = group.name?.toLowerCase();
    const parentGuild = group.parentGuild?.toLowerCase();
    const groupRealm = group.realm?.toLowerCase();

    const sameId = groupId === guildId;
    const sameName = groupName === guildName;
    const sameParent = parentGuild === guildName;
    const sameRealm = !guildRealm || !groupRealm || guildRealm === groupRealm;

    return sameRealm && (sameId || sameName || sameParent);
  });
}

function getProgressScore(progress) {
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyScore = {
    M: 300,
    H: 200,
    N: 100
  };

  return difficultyScore[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 100;

  const match = String(bossProg).match(/([\d.]+)%/);
  if (!match) return 100;

  return Number(match[1]);
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);
  const logProgress = logGroup ? normalizeLogProgress(logGroup) : "-";
  const isCE = progress === "CE";

  const useLogBossProgress =
    !isCE &&
    logGroup &&
    logMatchesCurrentRaiderProgress(progress, logProgress);

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : useLogBossProgress ? formatBossProgress(logGroup) : "-",
    worldRank,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeLogProgress(group);
  const isCE = progress === "CE";
  const worldRank = group.worldRank || DEFAULT_WORLD_RANK;

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : formatBossProgress(group),
    worldRank,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  const raiderIds = new Set(
    raiderGuilds.map(guild => guild.id || slugifyId(guild.name))
  );

  return !raiderIds.has(group.id);
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossPercentDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossPercentDiff !== 0) return bossPercentDiff;

  return a.name.localeCompare(b.name);
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild => buildRaiderRow(guild, logGroups));

  const logRows = logGroups
    .filter(group => isManualRaidTeam(group, raiderGuilds))
    .map(buildLogRow);

  const leaderboard = [...raiderRows, ...logRows]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));

  console.log(`Created ${outputPath} with ${leaderboard.length} entries`);
}

run();
