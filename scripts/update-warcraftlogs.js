


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

753daf04-cdfd-49bc-ada7-bdce79f19377.png
no warcraft logs here

Excellent! 🎉 That's exactly what we wanted.

Next step
Open:

data/warcraftlogs-inspect.json
Now copy the contents of that file and paste them here.

If it's very large:

Copy the first 100–200 lines, or

Upload the warcraftlogs-inspect.json file directly into this chat.

Once I can see the actual JSON returned by Warcraft Logs, I'll identify the exact fields for:

✅ World Rank

✅ Progress (CE, 8/9M, etc.)

✅ Boss progress (43.5% P3)

✅ Total pulls

Then we'll replace the temporary script with a proper importer that builds your leaderboard exactly like GuildRanking.io—without guessing the GraphQL fields anymore.


{
  "guildData": {
    "guild": {
      "id": 705280,
      "name": "Disobedient Group II",
      "server": {
        "name": "Twisting Nether",
        "region": {
          "name": "Europe"
        }
      }
    }
  },
  "reportData": {
    "reports": {
      "data": [
        {
          "code": "Vb7XTcKyfxDBdh8A",
          "title": "",
          "startTime": 1782930760501,
          "endTime": 1782930760501,
          "zone": null
        },
        {
          "code": "CgA1mHkKyd3x6Zfn",
          "title": "Lura",
          "startTime": 1782754614172,
          "endTime": 1782768862795,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "QBqaw91kY46cDpKz",
          "title": "Lura",
          "startTime": 1782754614172,
          "endTime": 1782762092539,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "zy1PMhVqfDrWZ2xd",
          "title": "Lura",
          "startTime": 1782325386380,
          "endTime": 1782336763031,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "1RQHgmfptdWcn2vP",
          "title": "Lura",
          "startTime": 1782152384508,
          "endTime": 1782163936456,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "PaJjkZLY6GMmcfqv",
          "title": "Sporefall",
          "startTime": 1781712799489,
          "endTime": 1781733298924,
          "zone": {
            "name": "Sporefall"
          }
        },
        {
          "code": "acBK9dDgTXGAQYZz",
          "title": "Lura",
          "startTime": 1781547138910,
          "endTime": 1781559189298,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "3Km6ayc2rwvDb9FW",
          "title": "Lura",
          "startTime": 1781115441694,
          "endTime": 1781127206257,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "Wc6pkF1ARJ7hCNqd",
          "title": "Lura",
          "startTime": 1780942796157,
          "endTime": 1780954506320,
          "zone": {
            "name": "VS / DR / MQD"
          }
        },
        {
          "code": "qT6t9MrPaNLvcnBf",
          "title": "Mythic",
          "startTime": 1780511043324,
          "endTime": 1780522411245,
          "zone": {
            "name": "VS / DR / MQD"
          }
        }
      ]
    }
  }
}

Thought for 4s
Good. This only shows reports, not the fights/boss attempts yet.

Next step: inspect one report’s fights.

Replace scripts/inspect-warcraftlogs.js with this:

const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

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
    throw new Error("GraphQL error");
  }

  return data.data;
}

async function run() {
  const token = await getToken();

  const query = `
    query($code: String!) {
      reportData {
        report(code: $code) {
          code
          title
          startTime
          endTime
          zone {
            name
          }
          fights(killType: Encounters) {
            id
            name
            kill
            percentage
            difficulty
            startTime
            endTime
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, {
    code: "CgA1mHkKyd3x6Zfn"
  });

  fs.writeFileSync(
    "data/warcraftlogs-inspect.json",
    JSON.stringify(data, null, 2)
  );

  console.log("Saved report fight inspection");
}

run();
Then:

Commit.

Run the workflow again.

Open data/warcraftlogs-inspect.json.

Paste the new contents here.

This will show us the actual boss pulls, kills, percentages, and difficulty.


Run node scripts/inspect-warcraftlogs.js
[
  {
    "message": "Cannot query field \"percentage\" on type \"ReportFight\". Did you mean \"bossPercentage\" or \"fightPercentage\"?",
    "locations": [
      {
        "line": 16,
        "column": 13
      }
    ]
  }
]
/home/runner/work/Greek-Warcraft-Market/Greek-Warcraft-Market/scripts/inspect-warcraftlogs.js:37
    throw new Error("GraphQL error");
          ^

Error: GraphQL error
    at queryWarcraftLogs (/home/runner/work/Greek-Warcraft-Market/Greek-Warcraft-Market/scripts/inspect-warcraftlogs.js:37:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async run (/home/runner/work/Greek-Warcraft-Market/Greek-Warcraft-Market/scripts/inspect-warcraftlogs.js:71:16)

Node.js v24.17.0
Error: Process completed with exit code 1.

This is actually excellent news. 🎉

We just learned that the GraphQL schema is working, and Warcraft Logs is telling us the correct field names.

The important part is:

Cannot query field "percentage"
Did you mean
bossPercentage
or
fightPercentage
That means we are now exploring the real API instead of guessing.

Change this
Replace

percentage
with

bossPercentage
fightPercentage
so your fights query becomes:

fights(killType: Encounters) {
  id
  name
  kill
  bossPercentage
  fightPercentage
  difficulty
  startTime
  endTime
}
Run it again.

This is why I'm excited
We're now discovering the exact fields we need.

Soon we'll also query things like:

bossPercentage ✅

kill ✅

encounterID ✅

difficulty ✅

worldRank (if available)

total pulls

instead of guessing.

I think we should change our strategy
Now that we've confirmed the GraphQL API works, I recommend stopping the trial-and-error approach.

Instead, I'll build the importer from the official Warcraft Logs GraphQL schema so we can fetch:

CE / 8/9M

Boss %

Pull count

World rank

Every Raid/Mythic+ Team under every guild

exactly like GuildRanking.io.

It will take a bit more work up front, but you'll end up with a fully automatic leaderboard that requires almost no manual maintenance.


where is the thing i need to replace?

It's inside scripts/inspect-warcraftlogs.js.

Find this section (around line 55–70):

fights(killType: Encounters) {
  id
  name
  kill
  percentage
  difficulty
  startTime
  endTime
}
Replace it with:

fights(killType: Encounters) {
  id
  name
  kill
  bossPercentage
  fightPercentage
  difficulty
  startTime
  endTime
}
So the whole GraphQL query should become:

const query = `
  query($code: String!) {
    reportData {
      report(code: $code) {
        code
        title
        startTime
        endTime
        zone {
          name
        }
        fights(killType: Encounters) {
          id
          name
          kill
          bossPercentage
          fightPercentage
          difficulty
          startTime
          endTime
        }
      }
    }
  }
`;
Then:

Save the file.

Commit it.

Run the GitHub Action again.

Open data/warcraftlogs-inspect.json.

Paste the contents here.

One suggestion
We're now reverse-engineering the Warcraft Logs GraphQL schema field by field. That's workable, but it's slow.

I can instead use the official Warcraft Logs GraphQL schema to build the importer properly. That will let us fetch boss progress, world rank, pulls, and raid teams much faster and with fewer trial-and-error iterations. I think that's the better approach from here onward.


{
  "reportData": {
    "report": {
      "code": "CgA1mHkKyd3x6Zfn",
      "title": "Lura",
      "startTime": 1782754614172,
      "endTime": 1782768862795,
      "zone": {
        "name": "VS / DR / MQD"
      },
      "fights": [
        {
          "id": 6,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 92.21,
          "fightPercentage": 93.37,
          "difficulty": 5,
          "startTime": 3644366,
          "endTime": 3681664
        },
        {
          "id": 7,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 64.03,
          "fightPercentage": 69.42,
          "difficulty": 5,
          "startTime": 3794943,
          "endTime": 3996822
        },
        {
          "id": 8,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 69.75,
          "fightPercentage": 74.28,
          "difficulty": 5,
          "startTime": 4102967,
          "endTime": 4266645
        },
        {
          "id": 9,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 63.47,
          "fightPercentage": 68.94,
          "difficulty": 5,
          "startTime": 4328454,
          "endTime": 4534323
        },
        {
          "id": 10,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 98.04,
          "fightPercentage": 98.33,
          "difficulty": 5,
          "startTime": 4605964,
          "endTime": 4627818
        },
        {
          "id": 11,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 61.56,
          "fightPercentage": 67.32,
          "difficulty": 5,
          "startTime": 4767155,
          "endTime": 4983141
        },
        {
          "id": 12,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 52.95,
          "fightPercentage": 60,
          "difficulty": 5,
          "startTime": 5378065,
          "endTime": 5659606
        },
        {
          "id": 13,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 58.43,
          "fightPercentage": 64.66,
          "difficulty": 5,
          "startTime": 5807542,
          "endTime": 6051165
        },
        {
          "id": 14,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 62.07,
          "fightPercentage": 67.75,
          "difficulty": 5,
          "startTime": 6167182,
          "endTime": 6376614
        },
        {
          "id": 15,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 57.64,
          "fightPercentage": 63.99,
          "difficulty": 5,
          "startTime": 6450781,
          "endTime": 6702314
        },
        {
          "id": 16,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 60.67,
          "fightPercentage": 66.56,
          "difficulty": 5,
          "startTime": 6890859,
          "endTime": 7108143
        },
        {
          "id": 17,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 48.26,
          "fightPercentage": 56.02,
          "difficulty": 5,
          "startTime": 7175170,
          "endTime": 7478367
        },
        {
          "id": 18,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 70.29,
          "fightPercentage": 74.74,
          "difficulty": 5,
          "startTime": 7759190,
          "endTime": 7931822
        },
        {
          "id": 19,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 55.5,
          "fightPercentage": 62.17,
          "difficulty": 5,
          "startTime": 8019012,
          "endTime": 8280271
        },
        {
          "id": 20,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 43.45,
          "fightPercentage": 51.93,
          "difficulty": 5,
          "startTime": 8371168,
          "endTime": 8711198
        },
        {
          "id": 21,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 64.11,
          "fightPercentage": 69.49,
          "difficulty": 5,
          "startTime": 10194661,
          "endTime": 10398973
        },
        {
          "id": 22,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 82.54,
          "fightPercentage": 85.15,
          "difficulty": 5,
          "startTime": 10582353,
          "endTime": 10675987
        },
        {
          "id": 23,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 85.83,
          "fightPercentage": 87.95,
          "difficulty": 5,
          "startTime": 10746473,
          "endTime": 10827009
        },
        {
          "id": 24,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 60.72,
          "fightPercentage": 66.61,
          "difficulty": 5,
          "startTime": 10904987,
          "endTime": 11126713
        },
        {
          "id": 25,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 75.52,
          "fightPercentage": 79.19,
          "difficulty": 5,
          "startTime": 11218951,
          "endTime": 11359253
        },
        {
          "id": 26,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 63.05,
          "fightPercentage": 68.59,
          "difficulty": 5,
          "startTime": 11467862,
          "endTime": 11687898
        },
        {
          "id": 27,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 60.48,
          "fightPercentage": 66.4,
          "difficulty": 5,
          "startTime": 11760625,
          "endTime": 11979179
        },
        {
          "id": 28,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 57.26,
          "fightPercentage": 63.67,
          "difficulty": 5,
          "startTime": 12054260,
          "endTime": 12298359
        },
        {
          "id": 29,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 45.86,
          "fightPercentage": 53.98,
          "difficulty": 5,
          "startTime": 12380394,
          "endTime": 12703472
        },
        {
          "id": 30,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 43.63,
          "fightPercentage": 52.08,
          "difficulty": 5,
          "startTime": 12858243,
          "endTime": 13195841
        },
        {
          "id": 31,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 59.29,
          "fightPercentage": 65.39,
          "difficulty": 5,
          "startTime": 13374025,
          "endTime": 13596122
        },
        {
          "id": 32,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 72.28,
          "fightPercentage": 76.43,
          "difficulty": 5,
          "startTime": 13649192,
          "endTime": 13802682
        },
        {
          "id": 33,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 88.79,
          "fightPercentage": 90.47,
          "difficulty": 5,
          "startTime": 13868322,
          "endTime": 13930148
        },
        {
          "id": 34,
          "name": "Midnight Falls",
          "kill": false,
          "bossPercentage": 57.36,
          "fightPercentage": 63.75,
          "difficulty": 5,
          "startTime": 13991962,
          "endTime": 14248623
        }
      ]
    }
  }
}

Perfect. Now we have the data we need.

For this report:

total pulls = 29
best boss progress = 43.45%
boss = Midnight Falls
Next step: update update-warcraftlogs.js so it uses this automatically.

Replace your getPullsFromReport function with this:

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
Then replace this part:

if (group.latestReport) {
  group.totalPulls = await getPullsFromReport(token, group.latestReport);
} else {
  group.totalPulls = 0;
}
with:

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
Run the workflow again. Your warcraftlogs-groups.json should then show bossProg like:

"bossProg": "43.45%",
"bestBoss": "Midnight Falls",
"totalPulls": 29

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
        Buffer.from(${CLIENT_ID}:${CLIENT_SECRET}).toString("base64"),
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
      Authorization: Bearer ${token},
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
  const query = 
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
  ;

  const data = await queryWarcraftLogs(token, query, { guildId });
  return data.reportData.reports.data || [];
}

async function getPullsFromReport(token, reportCode) {
  const query = 
    query($code: String!) {
      reportData {
        report(code: $code) {
          fights(killType: Encounters) {
            id
            name
            kill
          }
        }
      }
    }
  ;

  const data = await queryWarcraftLogs(token, query, { code: reportCode });
  return data.reportData.report.fights.length || 0;
}

async function run() {
  const token = await getToken();

  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  for (const group of groups) {
    console.log(Fetching Warcraft Logs for ${group.name}...);

    const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);

    group.totalReports = reports.length;
    group.latestReport = reports[0]?.code || "";
    group.latestReportTitle = reports[0]?.title || "";

    if (group.latestReport) {
      group.totalPulls = await getPullsFromReport(token, group.latestReport);
    } else {
      group.totalPulls = 0;
    }

    console.log(${group.name}: ${group.totalPulls} pulls);
  }

  fs.writeFileSync(outputPath, JSON.stringify(groups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run();

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


