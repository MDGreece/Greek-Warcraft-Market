const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const outputPath = "data/warcraftlogs.json";

async function getAccessToken() {
  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("Failed to get Warcraft Logs token");
  }

  const data = await response.json();
  return data.access_token;
}

async function run() {
  const token = await getAccessToken();

  const query = `
    query {
      worldData {
        zones {
          id
          name
        }
      }
    }
  `;

  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error("Warcraft Logs API request failed");
  }

  const data = await response.json();

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Saved Warcraft Logs data to ${outputPath}`);
}

run();
