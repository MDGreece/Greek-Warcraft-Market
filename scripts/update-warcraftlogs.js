const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

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

async function getReportProgress(token, reportCode) {
  const query = `
    query($code: String!) {
      reportData {
        report(code: $code) {
          fights(killType: Encounters) {
            id
            name
            kill
            bossPercentage
            fightPercentage
            difficulty
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, { code: reportCode });
  const fights = data.reportData.report.fights || [];

  if (fights.length === 0) {
    return {
      totalPulls: 0,
      bossProg: "-",
      bestBoss: ""
    };
  }

  const bestFight = fights.reduce((best, fight) => {
    if (fight.kill) return fight;

    if (fight.bossPercentage < best.bossPercentage) {
      return fight;
    }

    return best;
  }, fights[0]);

  return {
    totalPulls: fights.length,
    bossProg: bestFight.kill ? "Kill" : `${bestFight.bossPercentage.toFixed(2)}%`,
    bestBoss: bestFight.name
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
    group.latestReport = reports[0]?.code || "";
    group.latestReportTitle = reports[0]?.title || "";

    if (group.latestReport) {
      const progress = await getReportProgress(token, group.latestReport);

      group.totalPulls = progress.totalPulls;
      group.bossProg = progress.bossProg;
      group.bestBoss = progress.bestBoss;
    } else {
      group.totalPulls = 0;
      group.bossProg = "-";
      group.bestBoss = "";
    }

    console.log(`${group.name}: ${group.totalPulls} pulls, ${group.bossProg} on ${group.bestBoss}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run();
