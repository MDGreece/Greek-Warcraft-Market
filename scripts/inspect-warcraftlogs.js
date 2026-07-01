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
