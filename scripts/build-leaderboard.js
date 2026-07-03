const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

function readJson(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing file: ${path}`);
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

  const total = raid.total_bosses || TOTAL_BOSSES;
  const mythic = raid.mythic_bosses_killed || 0;
  const heroic = raid.heroic_bosses_killed || 0;
  const normal = raid.normal_bosses_killed || 0;

  if (mythic > 0) return mythic >= total ? "CE" : `${mythic}/${total}M`;
  if (heroic > 0) return `${heroic}/${total}H`;
  if (normal > 0) return `${normal}/${total}N`;

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
  if (group?.bestBoss && group?.bossProg && group.bossProg !== "-") {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return "-";
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
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  return { M: 300, H: 200, N: 100 }[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 999;

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
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : formatBossProgress(logGroup),
    worldRank,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeRaidTeamProgress(group);
  const worldRank = group.worldRank || DEFAULT_WORLD_RANK;
  const isCE = progress === "CE";

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

  const aIsCE = a.progress === "CE";
  const bIsCE = b.progress === "CE";

  if (aIsCE && bIsCE) {
    const worldRankDiff = a.worldRank - b.worldRank;
    if (worldRankDiff !== 0) return worldRankDiff;
  }

  const bossDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossDiff !== 0) return bossDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

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
