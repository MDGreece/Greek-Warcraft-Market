const fs = require("fs");

const CLIENT_ID =
  process.env.WARCRAFTLOGS_CLIENT_ID;

const CLIENT_SECRET =
  process.env.WARCRAFTLOGS_CLIENT_SECRET;

/*
 * Use a report that you know belongs
 * to Disobedient Group III.
 */
const REPORT_CODE = "RfDVH8rwyFWx6dG3";

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing WARCRAFTLOGS_CLIENT_ID or " +
      "WARCRAFTLOGS_CLIENT_SECRET"
    );
  }

  const credentials =
    Buffer.from(
      `${CLIENT_ID}:${CLIENT_SECRET}`
    ).toString("base64");

  const response =
    await fetch(
      "https://www.warcraftlogs.com/oauth/token",
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${credentials}`,
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body:
          "grant_type=client_credentials"
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "Token request failed: " +
      `${response.status} ${errorText}`
    );
  }

  const data =
    await response.json();

  return data.access_token;
}

async function queryWarcraftLogs(
  token,
  query,
  variables = {}
) {
  const response =
    await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          query,
          variables
        })
      }
    );

  const result =
    await response.json();

  if (result.errors?.length) {
    console.error(
      JSON.stringify(
        result.errors,
        null,
        2
      )
    );

    throw new Error(
      "Warcraft Logs GraphQL error"
    );
  }

  return result.data;
}

async function run() {
  const token =
    await getToken();

  const query = `
    query InspectReport(
      $code: String!
    ) {
      reportData {
        report(code: $code) {
          code
          title
          startTime
          endTime

          zone {
            id
            name
          }

          guild {
            id
            name
            type

            parentGuild {
              id
              name
            }

            tags {
              id
              name
            }
          }
        }
      }
    }
  `;

  const data =
    await queryWarcraftLogs(
      token,
      query,
      {
        code: REPORT_CODE
      }
    );

  console.log("");
  console.log(
    "=== REPORT TAG INSPECTION ==="
  );

  console.log(
    JSON.stringify(
      data,
      null,
      2
    )
  );

  fs.writeFileSync(
    "data/wcl-report-tag.json",
    JSON.stringify(
      data,
      null,
      2
    ) + "\n"
  );

  console.log("");
  console.log(
    "Saved data/wcl-report-tag.json"
  );
}

run().catch(error => {
  console.error("");
  console.error(
    `Inspection failed: ${error.message}`
  );

  process.exit(1);
});
