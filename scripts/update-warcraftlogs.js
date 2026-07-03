const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

const TOTAL_BOSSES = 9;
const REPORT_LIMIT = 50;

const CURRENT_RAID_BOSSES = [
  "Imperator Averzian",
  "Vorasius",
  "Vaelgor & Ezzorak",
  "Fallen-King Salhadaar",
  "Lightblinded Vanguard",
  "Crown of the Cosmos",
  "Chimaerus the Undreamt God",
  "Belo'ren, Child of Al'ar",
  "Midnight Falls"
];

const DIFFICULTIES = [
  { id: 5, suffix: "M", name: "Mythic" },
  { id: 4, suffix: "H", name: "Heroic" },
  { id: 3, suffix: "N", name: "Normal" }
];

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET");
  }

  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not get Warcraft Logs token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function queryWarcraftLogs(token, query, variables = {}) {
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Warcraft Logs HTTP error: ${response.status} ${JSON.stringify(data)}`);
  }

  if (data.errors) {
    console.log(JSON.stringify(data.errors, null, 2));
    throw new Error("Warcraft Logs GraphQL error");
  }

  return data.data;
}

async function getReportsForGuild(token, guildId) {
  const query = `
    query($guildId: Int!, $limit: Int!) {
      reportData {
        reports(guildID: $guildId, limit: $limit) {
          data {
            code
            title
            startTime
            endTime
            zone {
              name
            }
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, {
    guildId,
    limit: REPORT_LIMIT
  });

  return data?.reportData?.reports?.data || [];
}

async function getFightsFromReport(token, report) {
  const query = `
    query($code: String!) {
      reportData {
        report(code: $code) {
          fights(killType: Encounters) {
            id
            name
            kill
            bossPercentage
            difficulty
            startTime
            endTime
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, { code: report.code });
  const fights = data?.reportData?.report?.fights || [];

  return fights.map(fight => ({
    ...fight,
    reportCode: report.code,
    reportTitle: report.title,
    reportStartTime: report.startTime,
    reportEndTime: report.endTime,
    zoneName: report.zone?.name || ""
  }));
}

function isCurrentRaidBoss(name) {
  return CURRENT_RAID_BOSSES.includes(name);
}

function countUniqueKills(fights) {
  return new Set(
    fights
      .filter(fight => fight.kill && fight.name && isCurrentRaidBoss(fight.name))
      .map(fight => fight.name)
  ).size;
}

function getDifficultySummary(allFights) {
  const currentRaidFights = allFights.filter(fight => isCurrentRaidBoss(fight.name));

  const summaries = DIFFICULTIES.map(diff => {
    const fights = currentRaidFights.filter(fight => fight.difficulty === diff.id);
    const kills = countUniqueKills(fights);

    return {
      ...diff,
      fights,
      kills,
      hasFights: fights.length > 0
    };
  });

  const mythic = summaries.find(d => d.suffix === "M");
  const heroic = summaries.find(d => d.suffix === "H");
  const normal = summaries.find(d => d.suffix === "N");

  if (mythic.kills > 0 || mythic.hasFights) {
    return {
      ...mythic,
      progress: mythic.kills >= TOTAL_BOSSES ? "CE" : `${mythic.kills}/${TOTAL_BOSSES}M`
    };
  }

  if (heroic.kills > 0 || heroic.hasFights) {
    return {
      ...heroic,
      progress: `${heroic.kills}/${TOTAL_BOSSES}H`
    };
  }

  if (normal.kills > 0 || normal.hasFights) {
    return {
      ...normal,
      progress: `${normal.kills}/${TOTAL_BOSSES}N`
    };
  }

  return {
    id: null,
    suffix: "",
    name: "",
    fights: [],
    kills: 0,
    hasFights: false,
    progress: "-"
  };
}

function getCurrentProgressionBoss(fights) {
  const currentRaidFights = fights.filter(fight => isCurrentRaidBoss(fight.name));

  const killedBosses = new Set(
    currentRaidFights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  );

  const wipes = currentRaidFights.filter(fight =>
    !fight.kill &&
    fight.name &&
    typeof fight.bossPercentage === "number" &&
    fight.bossPercentage > 0 &&
    !killedBosses.has(fight.name)
  );

  if (wipes.length === 0) {
    return {
      bestBoss: "",
      bossProg: "-",
      latestReport: "",
      latestReportTitle: "",
      zoneName: ""
    };
  }

  const bosses = new Map();

  for (const fight of wipes) {
    if (!bosses.has(fight.name)) {
      bosses.set(fight.name, {
        name: fight.name,
        bestPercent: 100,
        latestTimestamp: 0,
        latestReport: "",
        latestReportTitle: "",
        zoneName: fight.zoneName || ""
      });
    }

    const boss = bosses.get(fight.name);

    if (fight.bossPercentage < boss.bestPercent) {
      boss.bestPercent = fight.bossPercentage;
    }

    const timestamp = Number(fight.reportStartTime || 0) + Number(fight.startTime || 0);

    if (timestamp > boss.latestTimestamp) {
      boss.latestTimestamp = timestamp;
      boss.latestReport = fight.reportCode || "";
      boss.latestReportTitle = fight.reportTitle || "";
      boss.zoneName = fight.zoneName || "";
    }
  }

  const currentBoss = [...bosses.values()]
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp)[0];

  return {
    bestBoss: currentBoss.name,
    bossProg: `${currentBoss.bestPercent.toFixed(2)}%`,
    latestReport: currentBoss.latestReport,
    latestReportTitle: currentBoss.latestReportTitle,
    zoneName: currentBoss.zoneName
  };
}

async function updateGroup(token, group) {
  console.log(`Fetching Warcraft Logs for ${group.name}...`);

  if (!group.warcraftLogsGuildId) {
    return {
      ...group,
      progress: group.progress || "-",
      bossProg: "-",
      bestBoss: "",
      totalReports: 0
    };
  }

  const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);

  let allFights = [];

  for (const report of reports) {
    const fights = await getFightsFromReport(token, report);
    allFights = allFights.concat(fights);
  }

  const difficulty = getDifficultySummary(allFights);
  const progression = getCurrentProgressionBoss(difficulty.fights);

  let progress = difficulty.progress;
  let raidKills = difficulty.kills;

  if (
    difficulty.suffix === "M" &&
    progress === "CE" &&
    progression.bestBoss
  ) {
    raidKills = TOTAL_BOSSES - 1;
    progress = `${raidKills}/${TOTAL_BOSSES}M`;
  }

  const updatedGroup = {
    ...group,
    progress,
    raidDifficulty: difficulty.name,
    raidDifficultySuffix: difficulty.suffix,
    raidKills,
    totalReports: reports.length,
    bossProg: progression.bossProg,
    bestBoss: progression.bestBoss,
    latestReport: progression.latestReport,
    latestReportTitle: progression.latestReportTitle,
    raidZone: progression.zoneName || "",
    updatedAt: new Date().toISOString()
  };

  delete updatedGroup.totalPulls;

  console.log(
    `${updatedGroup.name}: ${updatedGroup.progress}, ${updatedGroup.bossProg} ${updatedGroup.bestBoss}`
  );

  return updatedGroup;
}

async function run() {
  console.log("Running Warcraft Logs updater for Midnight VS / DR / MQD");

  const token = await getToken();
  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const updatedGroups = [];

  for (const group of groups) {
    try {
      const updatedGroup = await updateGroup(token, group);
      updatedGroups.push(updatedGroup);
    } catch (error) {
      console.error(`Failed updating ${group.name}:`, error.message);

      updatedGroups.push({
        ...group,
        updateError: error.message,
        updatedAt: new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(updatedGroups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
