const fs = require("fs");
const path = require("path");

const GUILD_DIRECTORY = "data/guilds";

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

/*
 * Active-raider rules
 */
const ACTIVE_DAYS = 30;
const MIN_REPORTS = 2;
const MAX_REPORTS = 12;

/*
 * Warcraft Logs allows up to 100 guild members per page.
 */
const MEMBERS_PER_PAGE = 100;

const TANK_SPECS = new Set([
  "Blood",
  "Vengeance",
  "Guardian",
  "Brewmaster",
  "Protection"
]);

const HEALER_SPECS = new Set([
  "Restoration",
  "Preservation",
  "Discipline",
  "Holy",
  "Mistweaver"
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + "\n"
  );
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function makePlayerKey(name, realm) {
  return `${normalize(name)}-${normalize(realm)}`;
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET"
    );
  }

  const credentials = Buffer.from(
    `${CLIENT_ID}:${CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://www.warcraftlogs.com/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Warcraft Logs authentication failed: ` +
      `${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(
      "Warcraft Logs authentication returned no access token"
    );
  }

  return data.access_token;
}

async function queryWarcraftLogs(
  token,
  query,
  variables = {}
) {
  const response = await fetch(
    "https://www.warcraftlogs.com/api/v2/client",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Warcraft Logs request failed: ` +
      `${response.status} ${errorText}`
    );
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(
      `Warcraft Logs GraphQL error: ` +
      JSON.stringify(result.errors)
    );
  }

  return result.data;
}

/*
 * Find the Warcraft Logs guild and return its numeric guild ID.
 */
async function getGuildId(token, guildSettings) {
  const query = `
    query FindGuild(
      $name: String!,
      $serverSlug: String!,
      $serverRegion: String!
    ) {
      guildData {
        guild(
          name: $name,
          serverSlug: $serverSlug,
          serverRegion: $serverRegion
        ) {
          id
          name
          type
          server {
            slug
            region {
              slug
            }
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(
    token,
    query,
    {
      name: guildSettings.guildName,
      serverSlug: guildSettings.realm,
      serverRegion: guildSettings.region
    }
  );

  const guild = data.guildData?.guild;

  if (!guild) {
    throw new Error(
      `Warcraft Logs guild not found: ` +
      `${guildSettings.guildName} / ` +
      `${guildSettings.realm} / ` +
      `${guildSettings.region}`
    );
  }

  return guild.id;
}

/*
 * Download all current verified guild members.
 *
 * The result is a Set containing:
 * charactername-realm
 */
async function getGuildMembers(token, guildId) {
  const query = `
    query GuildMembers(
      $guildId: Int!,
      $page: Int!,
      $limit: Int!
    ) {
      guildData {
        guild(id: $guildId) {
          members(
            page: $page,
            limit: $limit
          ) {
            data {
              id
              name
              server {
                slug
              }
            }
            hasMorePages
          }
        }
      }
    }
  `;

  const guildMembers = new Set();
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const data = await queryWarcraftLogs(
      token,
      query,
      {
        guildId,
        page,
        limit: MEMBERS_PER_PAGE
      }
    );

    const members =
      data.guildData?.guild?.members;

    if (!members) {
      throw new Error(
        `No guild-member data returned for guild ID ${guildId}`
      );
    }

    for (const character of members.data || []) {
      if (!character?.name) {
        continue;
      }

      guildMembers.add(
        makePlayerKey(
          character.name,
          character.server?.slug || ""
        )
      );
    }

    hasMorePages =
      members.hasMorePages === true;

    page += 1;

    /*
     * Emergency safeguard against unexpected pagination.
     */
    if (page > 50) {
      throw new Error(
        `Guild-member pagination exceeded 50 pages for guild ${guildId}`
      );
    }
  }

  return guildMembers;
}

async function getRecentReports(
  token,
  guildId
) {
  const endTime = Date.now();

  const startTime =
    endTime -
    ACTIVE_DAYS *
      24 *
      60 *
      60 *
      1000;

  const query = `
    query RecentReports(
      $guildId: Int!,
      $startTime: Float!,
      $endTime: Float!,
      $limit: Int!
    ) {
      reportData {
        reports(
          guildID: $guildId,
          startTime: $startTime,
          endTime: $endTime,
          limit: $limit
        ) {
          data {
            code
            title
            startTime
            endTime
            zone {
              id
              name
            }
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(
    token,
    query,
    {
      guildId,
      startTime,
      endTime,
      limit: MAX_REPORTS
    }
  );

  return data.reportData?.reports?.data || [];
}

async function getReportRoster(
  token,
  reportCode
) {
  const query = `
    query ReportRoster($code: String!) {
      reportData {
        report(code: $code) {
          code

          masterData(translate: true) {
            actors(type: "Player") {
              id
              name
              server
              subType
              type
            }
          }

          fights(killType: Encounters) {
            id
            encounterID
            difficulty
            friendlyPlayers
            friendlySpecs
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(
    token,
    query,
    {
      code: reportCode
    }
  );

  return data.reportData?.report || null;
}

function determineRole(spec) {
  if (TANK_SPECS.has(spec)) {
    return "tanks";
  }

  if (HEALER_SPECS.has(spec)) {
    return "healers";
  }

  return "dps";
}

/*
 * Warcraft Logs sometimes uses a normalized realm name
 * in report actors and a slug in the guild roster.
 *
 * Compare both:
 *   Name-Realm
 * and, as a fallback, character name alone.
 */
function createGuildMemberMatcher(
  guildMembers
) {
  const namesOnly = new Set();

  for (const memberKey of guildMembers) {
    const separatorPosition =
      memberKey.lastIndexOf("-");

    const characterName =
      separatorPosition >= 0
        ? memberKey.slice(
            0,
            separatorPosition
          )
        : memberKey;

    namesOnly.add(characterName);
  }

  return function isGuildMember(
    name,
    realm
  ) {
    const completeKey =
      makePlayerKey(name, realm);

    if (guildMembers.has(completeKey)) {
      return true;
    }

    /*
     * Safe fallback for connected-realm formatting differences.
     *
     * A name is only accepted when that character name exists
     * in the current guild-member roster.
     */
    return namesOnly.has(normalize(name));
  };
}

function collectReportPlayers(
  report,
  isGuildMember
) {
  const actors =
    report.masterData?.actors || [];

  const fights = report.fights || [];

  const actorsById = new Map();

  for (const actor of actors) {
    if (actor?.id) {
      actorsById.set(
        actor.id,
        actor
      );
    }
  }

  /*
   * Count a character only once per report.
   */
  const playersInReport = new Map();

  for (const fight of fights) {
    if (
      !fight.encounterID ||
      fight.encounterID === 0
    ) {
      continue;
    }

    const playerIds =
      fight.friendlyPlayers || [];

    const specs =
      fight.friendlySpecs || [];

    for (
      let index = 0;
      index < playerIds.length;
      index += 1
    ) {
      const actor =
        actorsById.get(
          playerIds[index]
        );

      if (!actor?.name) {
        continue;
      }

      /*
       * This is the important pug filter.
       */
      if (
        !isGuildMember(
          actor.name,
          actor.server
        )
      ) {
        continue;
      }

      const spec =
        specs[index] || "";

      const key =
        makePlayerKey(
          actor.name,
          actor.server
        );

      const existing =
        playersInReport.get(key);

      if (
        !existing ||
        (!existing.spec && spec)
      ) {
        playersInReport.set(
          key,
          {
            name: actor.name,
            realm: actor.server || "",
            class: actor.subType || "",
            spec
          }
        );
      }
    }
  }

  return [
    ...playersInReport.values()
  ];
}

function getPreferredSpec(specCounts) {
  const sortedSpecs =
    Object.entries(specCounts)
      .sort(
        (first, second) =>
          second[1] - first[1]
      );

  return sortedSpecs[0]?.[0] || "";
}

function buildRoster(
  reportRosters
) {
  const attendance = new Map();

  for (const players of reportRosters) {
    for (const player of players) {
      const key =
        makePlayerKey(
          player.name,
          player.realm
        );

      if (!attendance.has(key)) {
        attendance.set(
          key,
          {
            name: player.name,
            realm: player.realm,
            class: player.class,
            reports: 0,
            specs: {}
          }
        );
      }

      const entry =
        attendance.get(key);

      entry.reports += 1;

      if (player.spec) {
        entry.specs[player.spec] =
          (entry.specs[player.spec] || 0) +
          1;
      }
    }
  }

  const roster = {
    tanks: [],
    healers: [],
    dps: []
  };

  for (
    const player of attendance.values()
  ) {
    if (
      player.reports < MIN_REPORTS
    ) {
      continue;
    }

    const preferredSpec =
      getPreferredSpec(player.specs);

    const role =
      determineRole(preferredSpec);

    roster[role].push({
      name: player.name,
      realm: player.realm,
      class: player.class,
      spec: preferredSpec,
      reports: player.reports
    });
  }

  for (
    const role of Object.keys(roster)
  ) {
    roster[role].sort(
      (first, second) =>
        first.name.localeCompare(
          second.name
        )
    );
  }

  return roster;
}

function countRosterPlayers(roster) {
  return (
    roster.tanks.length +
    roster.healers.length +
    roster.dps.length
  );
}

async function updateGuildRoster(
  token,
  profilePath
) {
  const profile =
    readJson(profilePath);

  const settings =
    profile.warcraftLogs;

  if (
    !settings?.guildName ||
    !settings?.realm ||
    !settings?.region
  ) {
    console.log(
      `Skipping ${profile.name}: ` +
      "no Warcraft Logs settings"
    );

    return;
  }

  console.log(
    `Fetching guild roster for ${profile.name}...`
  );

  const guildId =
    await getGuildId(
      token,
      settings
    );

  const guildMembers =
    await getGuildMembers(
      token,
      guildId
    );

  if (guildMembers.size === 0) {
    console.log(
      `No verified guild members returned for ${profile.name}. ` +
      "Existing roster was preserved."
    );

    return;
  }

  console.log(
    `Found ${guildMembers.size} verified guild members.`
  );

  const reports =
    await getRecentReports(
      token,
      guildId
    );

  if (reports.length === 0) {
    console.log(
      `No recent reports found for ${profile.name}. ` +
      "Existing roster was preserved."
    );

    return;
  }

  const isGuildMember =
    createGuildMemberMatcher(
      guildMembers
    );

  const reportRosters = [];

  for (const report of reports) {
    console.log(
      `Reading report: ` +
      `${report.title} (${report.code})`
    );

    const reportData =
      await getReportRoster(
        token,
        report.code
      );

    if (!reportData) {
      continue;
    }

    const players =
      collectReportPlayers(
        reportData,
        isGuildMember
      );

    reportRosters.push(players);
  }

  const roster =
    buildRoster(
      reportRosters
    );

  const totalPlayers =
    countRosterPlayers(roster);

  /*
   * Never erase a working roster because of an empty
   * or unexpected API response.
   */
  if (totalPlayers === 0) {
    console.log(
      `No qualifying active guild raiders found for ${profile.name}. ` +
      "Existing roster was preserved."
    );

    return;
  }

  profile.roster = roster;

  profile.rosterUpdatedAt =
    new Date().toISOString();

  profile.rosterSource = {
    provider: "Warcraft Logs",
    guildId,
    activeDays: ACTIVE_DAYS,
    minimumReports: MIN_REPORTS,
    reportsChecked: reports.length,
    verifiedGuildMembers:
      guildMembers.size
  };

  writeJson(
    profilePath,
    profile
  );

  console.log(
    `Updated ${profile.name}: ` +
    `${roster.tanks.length} tanks, ` +
    `${roster.healers.length} healers, ` +
    `${roster.dps.length} DPS`
  );
}

async function run() {
  if (
    !fs.existsSync(GUILD_DIRECTORY)
  ) {
    throw new Error(
      `Missing directory: ${GUILD_DIRECTORY}`
    );
  }

  const token =
    await getAccessToken();

  const profileFiles = fs
    .readdirSync(GUILD_DIRECTORY)
    .filter(
      fileName =>
        fileName.endsWith(".json")
    );

  for (
    const fileName of profileFiles
  ) {
    const profilePath =
      path.join(
        GUILD_DIRECTORY,
        fileName
      );

    try {
      await updateGuildRoster(
        token,
        profilePath
      );
    } catch (error) {
      console.error(
        `Failed to update ${fileName}: ` +
        error.message
      );

      /*
       * Continue with the next guild instead
       * of stopping the entire workflow.
       */
    }
  }

  console.log(
    "Finished updating active guild rosters."
  );
}

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
