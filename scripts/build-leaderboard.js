const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";

function getProgress(guild) {
  const raid = guild.progress?.[CURRENT_RAID];

  if (!raid) return "-";

  const mythicKills = raid.mythic_bosses_killed || 0;
  const totalBosses = raid.total_bosses || 9;

  return mythicKills === totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;
}

function getWorldRank(guild) {
  return guild.rankings?.[CURRENT_RAID]?.mythic?.world || 999999;
}

const raiderGuilds = JSON.parse(fs.readFileSync(raiderPath, "utf8"));
const logGroups = JSON.parse(fs.readFileSync(logsPath, "utf8"));

const raiderRows = raiderGuilds.map(guild => {
  const worldRank = getWorldRank(guild);

  return {
    id: guild.id,
    name: guild.name,
    type: "guild",
    realm: guild.realm,
    progress: getProgress(guild),
    bossProg: worldRank === 999999 ? "-" : `WR ${worldRank}`,
    worldRank: worldRank,
    totalPulls: "-"
  };
});

const logRows = logGroups.map(group => {
  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    parentGuild: group.parentGuild,
    progress: group.progress || "-",
    bossProg: group.bestBoss
      ? `${group.bossProg} ${group.bestBoss}`
      : group.bossProg || "-",
    worldRank: group.worldRank || 999999,
    totalPulls: group.totalPulls || 0
  };
});

const leaderboard = [...raiderRows, ...logRows]
  .sort((a, b) => a.worldRank - b.worldRank)
  .map((entry, index) => ({
    rank: index + 1,
    ...entry
  }));

fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));

console.log(`Created ${outputPath} with ${leaderboard.length} entries`);
