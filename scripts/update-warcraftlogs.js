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
      Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
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

    const mythicFights = allFights.filter(fight => fight.difficulty === 5);

    const killedBosses = new Set(
      mythicFights
        .filter(fight => fight.kill)
        .map(fight => fight.name)
    );

    const mythicKills = killedBosses.size;

    group.progress =
      mythicKills >= TOTAL_BOSSES ? "CE" : `${mythicKills}/${TOTAL_BOSSES}M`;

    group.totalPulls = mythicFights.length;

    const wipeFights = mythicFights.filter(fight => !fight.kill);

    if (wipeFights.length > 0) {
      const bestWipe = wipeFights.reduce((best, fight) => {
        return fight.bossPercentage < best.bossPercentage ? fight : best;
      }, wipeFights[0]);

      group.bossProg = `${bestWipe.bossPercentage.toFixed(2)}%`;
      group.bestBoss = bestWipe.name;
    } else {
      group.bossProg = mythicKills >= TOTAL_BOSSES ? "WR " + group.worldRank : "-";
      group.bestBoss = "";
    }

    group.latestReport = latestUsefulReport?.code || "";
    group.latestReportTitle = latestUsefulReport?.title || "";

    console.log(`${group.name}: ${group.progress}, ${group.totalPulls} pulls, ${group.bossProg}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run();
