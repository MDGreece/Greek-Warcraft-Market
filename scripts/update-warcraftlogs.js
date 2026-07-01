const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

const TOTAL_BOSSES = 9;

async function getToken() {
  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) throw new Error("Could not get Warcraft Logs token");

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

  if (data.errors) {
    console.log(JSON.stringify(data.errors, null, 2));
    throw new Error("Warcraft Logs GraphQL error");
  }

  return data.data;
}

async function getReportsForGuild(token, guildId) {
  const query = `
    query($guildId: Int!) {
      reportData {
        reports(guildID: $guildId, limit: 20) {
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

  const data = await queryWarcraftLogs(token, query, { guildId });
  return data.reportData.reports.data || [];
}

async function getFightsFromReport(token, reportCode) {
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
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, { code: reportCode });
  return data.reportData.report.fights || [];
}

function countUniqueKills(fights) {
  return new Set(
    fights
      .filter(fight => fight.kill)
      .map(fight => fight.name)
  ).size;
}

function getDifficultyData(allFights) {
  const mythic = allFights.filter(fight => fight.difficulty === 5);
  const heroic = allFights.filter(fight => fight.difficulty === 4);
  const normal = allFights.filter(fight => fight.difficulty === 3);

  const mythicKills = countUniqueKills(mythic);
  const heroicKills = countUniqueKills(heroic);
  const normalKills = countUniqueKills(normal);

  if (mythic.length > 0 || mythicKills > 0) {
    return {
      fights: mythic,
      kills: mythicKills,
      suffix: "M",
      progress: mythicKills >= TOTAL_BOSSES ? "CE" : `${mythicKills}/${TOTAL_BOSSES}M`
    };
  }

  if (heroic.length > 0 || heroicKills > 0) {
    return {
      fights: heroic,
      kills: heroicKills,
      suffix: "H",
      progress: `${heroicKills}/${TOTAL_BOSSES}H`
    };
  }

  if (normal.length > 0 || normalKills > 0) {
    return {
      fights: normal,
      kills: normalKills,
      suffix: "N",
      progress: `${normalKills}/${TOTAL_BOSSES}N`
    };
  }

  return {
    fights: [],
    kills: 0,
    suffix: "",
    progress: "-"
  };
}

function getCurrentBossProgress(fights) {
  const killedBosses = new Set(
    fights
      .filter(fight => fight.kill)
      .map(fight => fight.name)
  );

  const wipes = fights.filter(fight =>
    !fight.kill &&
    typeof fight.bossPercentage === "number" &&
    fight.bossPercentage > 0 &&
    !killedBosses.has(fight.name)
  );

  if (wipes.length === 0) {
    return {
      bossProg: "-",
      bestBoss: ""
    };
  }

  const byBoss = {};

  wipes.forEach(fight => {
    if (!byBoss[fight.name]) byBoss[fight.name] = [];
    byBoss[fight.name].push(fight);
  });

  const bossNames = Object.keys(byBoss);

  const currentBoss = bossNames[bossNames.length - 1];

  const bestWipe = byBoss[currentBoss].reduce((best, fight) => {
    return fight.bossPercentage < best.bossPercentage ? fight : best;
  }, byBoss[currentBoss][0]);

  return {
    bossProg: `${bestWipe.bossPercentage.toFixed(2)}%`,
    bestBoss: currentBoss
  };
}

async function run() {
  console.log("Warcraft Logs script started");

  const token = await getToken();
  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  for (const group of groups) {
    console.log(`Fetching Warcraft Logs for ${group.name}...`);

    const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);

    group.totalReports = reports.length;

    let allFights = [];
    let latestUsefulReport = null;

    for (const report of reports) {
      const fights = await getFightsFromReport(token, report.code);

      if (fights.length > 0 && !latestUsefulReport) {
        latestUsefulReport = report;
      }

      allFights = allFights.concat(fights);
    }

    const difficultyData = getDifficultyData(allFights);

    group.progress = difficultyData.progress;
    group.totalPulls = difficultyData.fights.length;

    const bossProgress = getCurrentBossProgress(difficultyData.fights);

    group.bossProg = bossProgress.bossProg;
    group.bestBoss = bossProgress.bestBoss;

    group.latestReport = latestUsefulReport?.code || "";
    group.latestReportTitle = latestUsefulReport?.title || "";

    console.log(
      `${group.name}: ${group.progress}, ${group.bossProg} ${group.bestBoss}, ${group.totalPulls} pulls`
    );
  }

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run();
