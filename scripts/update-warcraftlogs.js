const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

async function getToken() {
  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("Could not get Warcraft Logs token");
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

async function run() {
  const token = await getToken();

  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  for (const group of groups) {
    console.log(`Fetching Warcraft Logs for ${group.name}...`);

    const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);

    group.totalReports = reports.length;
    group.latestReport = reports[0]?.code || "";
    group.latestReportTitle = reports[0]?.title || "";

    // Temporary until we add fight/pull parsing
    group.totalPulls = group.totalPulls || 0;
  }

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run();
