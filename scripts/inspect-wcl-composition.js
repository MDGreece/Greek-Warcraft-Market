const fs = require("fs");

const CLIENT_ID =
  process.env.WARCRAFTLOGS_CLIENT_ID;

const CLIENT_SECRET =
  process.env.WARCRAFTLOGS_CLIENT_SECRET;

/*
 * Parent Disobedient guild
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
    const errorText =
      await response.text();

    throw new Error(
      "Token request failed: " +
      `${response.status} ${errorText}`
    );
  }

  const data =
    await response.json();

  if (!data.access_token) {
    throw new Error(
      "Warcraft Logs did not return an access token"
    );
  }

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

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "Warcraft Logs API request failed: " +
      `${response.status} ${errorText}`
    );
  }

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

  /*
   * Inspect the parent Disobedient guild.
   *
   * We want to see:
   *
   * - guild tags / raid teams
   * - attendance reports
   * - report codes
   * - players in each attendance entry
   *
   * The main goal is to determine whether
   * Group II and Group III can be identified
   * through tags while untagged attendance
   * represents Group I.
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
    "=== DISOBEDIENT PARENT ATTENDANCE INSPECTION ==="
  );

  console.log(
    JSON.stringify(
      data,
      null,
      2
    )
  );

  fs.writeFileSync(
    "data/wcl-disobedient-attendance.json",
    JSON.stringify(
      data,
      null,
      2
    ) + "\n"
  );

  console.log("");
  console.log(
    "Saved data/wcl-disobedient-attendance.json"
  );
}


run().catch(error => {
  console.error("");
  console.error(
    `Inspection failed: ${error.message}`
  );

  process.exit(1);
});
