const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);

  if (!raid) return "-";

  const totalBosses = raid.total_bosses || 9;
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

function formatRaidTeamBossProgress(group) {
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  if (group.bossProg) {
    return group.bossProg;
  }

  return "-";
}

function buildRaiderRow(guild) {
  const worldRank = getRaiderWorldRank(guild);
  const progress = getRaiderProgress(guild);

  return {
    id: guild.id,
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,
    bossProg: worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-",
    worldRank,
    totalPulls: "-",
    source: "raiderio"
  };
}

function buildLogRow(group) {
  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress: group.progress || "-",
    bossProg: formatRaidTeamBossProgress(group),
    worldRank: group.worldRank || DEFAULT_WORLD_RANK,
    totalPulls: group.totalPulls ?? 0,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossPercentDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossPercentDiff !== 0) return bossPercentDiff;

  const pullsA = Number(a.totalPulls) || 0;
  const pullsB = Number(b.totalPulls) || 0;

  return pullsB - pullsA;
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(buildRaiderRow);
  const logRows = logGroups.map(buildLogRow);

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
