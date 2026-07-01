


Generated image: GitHub教程: Greek Warcraft Market

Edit


 is it supposed to look like this?

I want to change their color and make it more like buttons

Generated image: Dunkler Fantasy-Portal der griechischen Community


Edit


Generated image: Griechisches Warcraft Community Hub Design


Edit



Generated image: Dunkle Fantasy-Website für die griechische Community


Edit


the logo could be bigger

there is too much empty space on top and on the bottom of the header, i want it reduced

Generated image: Dunkles Fantasy-Guild-Dashboard Design


Edit


the awards broke, are uneven and vertical, pls fix

the logos are still uneven

Generated image: Tod und Ruhm: Teamprofil Übersicht


Edit


Generated image: Rangliste und Clan-Übersicht


Edit


Generated image: Medallien in Gold, Silber, Bronze


Edit


Generated image: Griechische Rangabzeichen in Metallic-Optik

Edit


Generated image: Griechische Rangabzeichen in drei Varianten

Edit


how can i remove the link underline from the guild names?

now the page is empty:

I want to change my guild leaderboard, to take data from Raider.IO like the site below:
https://guildranking.io/guilds/greek


Pasted text.txt
Document
thats my guildsio.json
I dont mind changing my leaderboard data according to what guildsio.json has

now that i have the secrets and the Raider.io data, how can i make my table look like this?


 my table is completely broken, the guilds are not showing the progress and the disobedient groups are  only showing some pulls.
This is what I shoed you

no warcraft logs here

Replace your full scripts/update-warcraftlogs.js with this:

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
    return fight.bossPercentage < best.bossPercentage ? fight : best;
  }, fights[0]);

  return {
    totalPulls: fights.length,
    bossProg: bestFight.kill
      ? "Kill"
      : `${bestFight.bossPercentage.toFixed(2)}%`,
    bestBoss: bestFight.name
  };
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
Then commit and run the workflow again.


Run node scripts/update-warcraftlogs.js
/home/runner/work/Greek-Warcraft-Market/Greek-Warcraft-Market/scripts/update-warcraftlogs.js:4
Generated image: GitHub教程: Greek Warcraft Market
          ^^^^^

SyntaxError: Unexpected identifier 'image'
    at wrapSafe (node:internal/modules/cjs/loader:1787:18)
    at Module._compile (node:internal/modules/cjs/loader:1828:20)
    at Object..js (node:internal/modules/cjs/loader:1985:10)
    at Module.load (node:internal/modules/cjs/loader:1577:32)
    at Module._load (node:internal/modules/cjs/loader:1379:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47

Node.js v24.17.0
Error: Process completed with exit code 1.

Your update-warcraftlogs.js file has accidental text inside it:

Generated image: GitHub教程: Greek Warcraft Market
That is not JavaScript, so Node crashes.

Open:

scripts/update-warcraftlogs.js
Delete everything inside it, then paste only the JavaScript code I gave you.

The file must start with:

const fs = require("fs");
Not with:

Generated image...
After saving, commit and run the workflow again.


scripts/update-warcraftlogs.js is empty

Paste this into the empty scripts/update-warcraftlogs.js:

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
    return { totalPulls: 0, bossProg: "-", bestBoss: "" };
  }

  const bestFight = fights.reduce((best, fight) => {
    if (fight.kill) return fight;
    return fight.bossPercentage < best.bossPercentage ? fight : best;
  }, fights[0]);

  return {
    totalPulls: fights.length,
    bossProg: bestFight.kill ? "Kill" : `${bestFight.bossPercentage.toFixed(2)}%`,
    bestBoss: bestFight.name
  };
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

    console.log(`${group.name}: ${group.totalPulls} pulls, ${group.bossProg}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run();
Then commit and run the workflow again.


