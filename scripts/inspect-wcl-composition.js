const fs = require("fs");

const CLIENT_ID =
  process.env.WARCRAFTLOGS_CLIENT_ID;

const CLIENT_SECRET =
  process.env.WARCRAFTLOGS_CLIENT_SECRET;

/*
 * Disobedient Group III
 */
const GUILD_ID = 555159;

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
    throw new Error(
      `Token request failed: ${response.status}`
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

        body:
          JSON.stringify({
            query,
            variables
          })
      }
    );

  const result =
    await response.json();

  if (result.errors) {
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

  /*
   * First test:
   *
   * Ask Warcraft Logs for the Group III
   * attendance table.
   *
   * PlayerAttendance officially exposes:
   *
   * name
   * type
   * presence
   */
  const query = `
    query InspectAttendance(
      $guildId: Int!
    ) {
      guildData {
        guild(id: $guildId) {
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

          attendance(
            limit: 25,
            page: 1
          ) {
            current_page
            last_page
            has_more_pages
            total

            data {
              code
              startTime

              zone {
                id
                name
              }

              players {
                name
                type
                presence
              }
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
        guildId: GUILD_ID
      }
    );

  console.log("");
  console.log(
    "=== GROUP III ATTENDANCE INSPECTION ==="
  );

  console.log(
    JSON.stringify(
      data,
      null,
      2
    )
  );

  fs.writeFileSync(
    "data/wcl-group3-attendance.json",
    JSON.stringify(
      data,
      null,
      2
    ) + "\n"
  );

  console.log("");
  console.log(
    "Saved data/wcl-group3-attendance.json"
  );
}


run().catch(error => {
  console.error("");
  console.error(
    `Inspection failed: ${error.message}`
  );

  process.exit(1);
});
