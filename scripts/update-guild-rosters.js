const fs = require("fs");
const path = require("path");

const GUILD_DIRECTORY = "data/guilds";

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

/*
 * Active-raider settings
 *
 * A character must appear in at least MIN_REPORTS
 * separate reports during the last ACTIVE_DAYS.
 */
const ACTIVE_DAYS = 45;
const MIN_REPORTS = 1;
const MAX_REPORTS = 12;

/*
 * Warcraft Logs allows up to 100 guild members
 * per page.
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
  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
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
    .replace(/\s+/g, "")
    .replace(/['’]/g, "");
}

function makePlayerKey(name, realm) {
  return (
    `${normalize(name)}-` +
    `${normalize(realm)}`
  );
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing WARCRAFTLOGS_CLIENT_ID or " +
      "WARCRAFTLOGS_CLIENT_SECRET"
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
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      "Warcraft Logs authentication failed: " +
      `${response.status} ${errorText}`
    );
  }

  const data = await response.json();

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
      "Warcraft Logs API request failed: " +
      `${response.status} ${errorText}`
    );
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(
      "Warcraft Logs GraphQL error: " +
      JSON.stringify(result.errors)
    );
  }

  return result.data;
}

/*
 * Find the Warcraft Logs guild and return
 * its numeric guild ID.
 */
async function getGuildId(
  token,
  guildSettings
) {
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
            normalizedName
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
      "Warcraft Logs guild not found: " +
      `${guildSettings.guildName} / ` +
      `${guildSettings.realm} / ` +
      `${guildSettings.region}`
    );
  }

  console.log(
    `Found Warcraft Logs guild ID ${guild.id}.`
  );

  return guild.id;
}

/*
 * Download every verified current guild member.
 */
async function getGuildMembers(
  token,
  guildId
) {
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
                normalizedName
              }
            }
            current_page
            last_page
            has_more_pages
          }
        }
      }
    }
  `;

  const membersByFullKey = new Set();
  const membersByName = new Map();

  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(
      `Reading guild-member page ${page}...`
    );

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
        "No guild-member data returned for " +
        `guild ID ${guildId}`
      );
    }

    for (const character of members.data || []) {
      if (!character?.name) {
        continue;
      }

      const realm =
        character.server?.slug ||
        character.server?.normalizedName ||
        "";

      const fullKey = makePlayerKey(
        character.name,
        realm
      );

      membersByFullKey.add(fullKey);

      const normalizedName =
        normalize(character.name);

      if (!membersByName.has(normalizedName)) {
        membersByName.set(
          normalizedName,
          new Set()
        );
      }

      membersByName
        .get(normalizedName)
        .add(fullKey);
    }

    hasMorePages =
      members.has_more_pages === true;

    page += 1;

    if (page > 50) {
      throw new Error(
        "Guild-member pagination exceeded " +
        `50 pages for guild ID ${guildId}`
      );
    }
  }

  return {
    membersByFullKey,
    membersByName
  };
}

/*
 * Read recent reports belonging to the guild.
 */
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
          limit: $limit,
          page: 1
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
          current_page
          last_page
          has_more_pages
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

  return (
    data.reportData?.reports?.data || []
  );
}

/*
 * Read all player actors and encounter fights
 * from one report.
 */
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

          fights(
            killType: Encounters,
            translate: true
          ) {
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
 * Match report participants against the verified
 * Warcraft Logs guild-member list.
 *
 * Full character-name + realm matching is preferred.
 *
 * Name-only matching is allowed only when the name
 * appears exactly once in the guild roster. This handles
 * realm slug/normalized-name differences without accepting
 * an ambiguous character.
 */
function createGuildMemberMatcher(
  guildMemberData
) {
  const {
    membersByFullKey,
    membersByName
  } = guildMemberData;

  return function isGuildMember(
    name,
    realm
  ) {
    const fullKey = makePlayerKey(
      name,
      realm
    );

    if (membersByFullKey.has(fullKey)) {
      return true;
    }

    const normalizedName =
      normalize(name);

    const matchingMembers =
      membersByName.get(normalizedName);

    return (
      matchingMembers?.size === 1
    );
  };
}

/*
 * Find the guild members who participated in
 * encounters in one report.
 *
 * A character is counted only once per report,
 * regardless of how many pulls they joined.
 */
function collectReportPlayers(
  report,
  isGuildMember
) {
  const actors =
    report.masterData?.actors || [];

  const fights =
    report.fights || [];

  const actorsById = new Map();

  for (const actor of actors) {
    if (actor?.id == null) {
      continue;
    }

    actorsById.set(
      actor.id,
      actor
    );
  }

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
        actorsById.get(playerIds[index]);

      if (!actor?.name) {
        continue;
      }

      /*
       * Exclude pugs and guests who are not in
       * the current verified guild-member list.
       */
      if (
        !isGuildMember(
          actor.name,
          actor.server || ""
        )
      ) {
        continue;
      }

      const spec =
        specs[index] || "";

      const key = makePlayerKey(
        actor.name,
        actor.server || ""
      );

      const existing =
        playersInReport.get(key);

      if (!existing) {
        playersInReport.set(
          key,
          {
            name: actor.name,
            realm: actor.server || "",
            class: actor.subType || "",
            spec
          }
        );

        continue;
      }

      /*
       * Prefer a detected spec over an empty spec.
       */
      if (!existing.spec && spec) {
        existing.spec = spec;
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

/*
 * Combine attendance from all checked reports.
 */
function buildRoster(reportRosters) {
  const attendance = new Map();

  for (const players of reportRosters) {
    for (const player of players) {
      const key = makePlayerKey(
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

      if (!entry.class && player.class) {
        entry.class = player.class;
      }
    }
  }

  const roster = {
    tanks: [],
    healers: [],
    dps: []
  };

  for (const player of attendance.values()) {
    if (player.reports < MIN_REPORTS) {
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

  for (const role of Object.keys(roster)) {
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

  console.log("");
  console.log(
    `Fetching active roster for ${profile.name}...`
  );

  const guildId =
    await getGuildId(
      token,
      settings
    );

  const guildMemberData =
    await getGuildMembers(
      token,
      guildId
    );

  const verifiedMemberCount =
    guildMemberData.membersByFullKey.size;

  console.log(
    `Found ${verifiedMemberCount} ` +
    "verified guild members."
  );

  if (verifiedMemberCount === 0) {
    console.log(
      "No verified guild members were returned. " +
      "Existing roster was preserved."
    );

    return;
  }

  const reports =
    await getRecentReports(
      token,
      guildId
    );

  console.log(
    `Found ${reports.length} recent guild reports.`
  );

  if (reports.length === 0) {
    console.log(
      `No reports found during the last ` +
      `${ACTIVE_DAYS} days. ` +
      "Existing roster was preserved."
    );

    return;
  }

  const isGuildMember =
    createGuildMemberMatcher(
      guildMemberData
    );

  const reportRosters = [];

  for (const report of reports) {
    console.log(
      `Reading report: ${report.title} ` +
      `(${report.code})`
    );

    const reportData =
      await getReportRoster(
        token,
        report.code
      );

    if (!reportData) {
      console.log(
        `No report data returned for ${report.code}.`
      );

      continue;
    }

    const players =
      collectReportPlayers(
        reportData,
        isGuildMember
      );

    console.log(
      `${players.length} verified guild ` +
      "players found in this report."
    );

    reportRosters.push(players);
  }

  const roster =
    buildRoster(reportRosters);

  const totalPlayers =
    countRosterPlayers(roster);

  console.log(
    `${totalPlayers} characters met the ` +
    `${MIN_REPORTS}-report requirement.`
  );

  /*
   * Safety rule:
   *
   * Never erase an existing roster because of an
   * empty or unexpected API response.
   */
  if (totalPlayers === 0) {
    console.log(
      "No qualifying active guild raiders found. " +
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
      verifiedMemberCount
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
  console.log(
    "=== Starting active guild roster update ==="
  );

  if (!fs.existsSync(GUILD_DIRECTORY)) {
    throw new Error(
      `Missing directory: ${GUILD_DIRECTORY}`
    );
  }

  const profileFiles = fs
    .readdirSync(GUILD_DIRECTORY)
    .filter(
      fileName =>
        fileName.endsWith(".json")
    );

  console.log(
    `Found ${profileFiles.length} guild profile files.`
  );

  if (profileFiles.length === 0) {
    throw new Error(
      `No JSON files found in ${GUILD_DIRECTORY}`
    );
  }

  const token =
    await getAccessToken();

  let successfulGuilds = 0;
  let failedGuilds = 0;

  for (const fileName of profileFiles) {
    const profilePath = path.join(
      GUILD_DIRECTORY,
      fileName
    );

    try {
      await updateGuildRoster(
        token,
        profilePath
      );

      successfulGuilds += 1;
    } catch (error) {
      failedGuilds += 1;

      console.error(
        `Failed to update ${fileName}: ` +
        error.message
      );
    }
  }

  console.log("");
  console.log(
    "=== Finished active guild roster update ==="
  );

  console.log(
    `Processed: ${successfulGuilds}, ` +
    `failed: ${failedGuilds}`
  );

  /*
   * Fail the workflow when a configured guild produced
   * an error. This prevents hidden API/code failures.
   */
  if (failedGuilds > 0) {
    process.exitCode = 1;
  }
}

run().catch(error => {
  console.error(
    `Roster updater failed: ${error.message}`
  );

  process.exit(1);
});
