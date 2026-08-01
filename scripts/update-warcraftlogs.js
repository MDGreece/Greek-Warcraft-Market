const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

const TOTAL_BOSSES = 9;
const REPORT_LIMIT = 50;
const CURRENT_RAID_KEY = "midnight-tier-1";

/*
 * Canonical encounter order.
 * The order is used only for display/fallback logic.
 * Kills are always counted from actual Warcraft Logs kill data.
 */
const CURRENT_RAID_BOSSES = [
  "Imperator Averzian",
  "Vorasius",
  "Vaelgor & Ezzorak",
  "Fallen-King Salhadaar",
  "Lightblinded Vanguard",
  "Crown of the Cosmos",
  "Chimaerus the Undreamt God",
  "Belo'ren, Child of Al'ar",
  "Midnight Falls"
];

const DIFFICULTIES = [
  { id: 5, suffix: "M", name: "Mythic" },
  { id: 4, suffix: "H", name: "Heroic" },
  { id: 3, suffix: "N", name: "Normal" }
];

/*
 * Normalizes punctuation and spacing so variations such as:
 *
 * Belo'ren
 * Belo’ren
 * Belo-ren
 *
 * can still match the same boss.
 */
function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const BOSS_NAME_MAP = new Map(
  CURRENT_RAID_BOSSES.map(name => [
    normalizeName(name),
    name
  ])
);

/*
 * Optional aliases for Warcraft Logs naming differences.
 */
const BOSS_ALIASES = {
  "vaelgor and ezzorak": "Vaelgor & Ezzorak",
  "fallen king salhadaar": "Fallen-King Salhadaar",
  "beloren child of alar": "Belo'ren, Child of Al'ar",
  "midnight falls": "Midnight Falls"
};

for (const [alias, canonicalName] of Object.entries(BOSS_ALIASES)) {
  BOSS_NAME_MAP.set(
    normalizeName(alias),
    canonicalName
  );
}

function getCanonicalBossName(name) {
  return BOSS_NAME_MAP.get(normalizeName(name)) || "";
}

function isCurrentRaidBoss(name) {
  return Boolean(getCanonicalBossName(name));
}

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET"
    );
  }

  const response = await fetch(
    "https://www.warcraftlogs.com/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64"),

        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Could not get Warcraft Logs token: ` +
      `${response.status} ${text}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(
      "Warcraft Logs returned no access token"
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Warcraft Logs HTTP error: ` +
      `${response.status} ${JSON.stringify(data)}`
    );
  }

  if (data.errors?.length) {
    console.error(
      JSON.stringify(data.errors, null, 2)
    );

    throw new Error(
      "Warcraft Logs GraphQL error"
    );
  }

  return data.data;
}

async function getReportsForGuild(
  token,
  guildId
) {
  const query = `
    query ReportsForGuild(
      $guildId: Int!,
      $limit: Int!
    ) {
      reportData {
        reports(
          guildID: $guildId,
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
      limit: REPORT_LIMIT
    }
  );

  const reports =
    data?.reportData?.reports?.data || [];

  /*
   * Ensure newest reports are processed first.
   */
  return reports.sort(
    (first, second) =>
      Number(second.startTime || 0) -
      Number(first.startTime || 0)
  );
}

async function getFightsFromReport(
  token,
  report
) {
  const query = `
    query ReportFights($code: String!) {
      reportData {
        report(code: $code) {
          fights(
            killType: Encounters,
            translate: true
          ) {
            id
            encounterID
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

  const data = await queryWarcraftLogs(
    token,
    query,
    {
      code: report.code
    }
  );

  const fights =
    data?.reportData?.report?.fights || [];

  return fights.map(fight => {
    const canonicalBossName =
      getCanonicalBossName(fight.name);

    return {
      ...fight,

      canonicalBossName,

      reportCode: report.code,
      reportTitle: report.title || "",
      reportStartTime:
        Number(report.startTime || 0),
      reportEndTime:
        Number(report.endTime || 0),
      zoneName: report.zone?.name || ""
    };
  });
}

function getFightTimestamp(fight) {
  return (
    Number(fight.reportStartTime || 0) +
    Number(fight.startTime || 0)
  );
}

function countUniqueKills(fights) {
  return new Set(
    fights
      .filter(
        fight =>
          fight.kill &&
          fight.canonicalBossName
      )
      .map(
        fight =>
          fight.canonicalBossName
      )
  ).size;
}

function getKilledBosses(fights) {
  return new Set(
    fights
      .filter(
        fight =>
          fight.kill &&
          fight.canonicalBossName
      )
      .map(
        fight =>
          fight.canonicalBossName
      )
  );
}

function getDifficultySummary(allFights) {
  const currentRaidFights =
    allFights.filter(
      fight =>
        Boolean(fight.canonicalBossName)
    );

  const summaries =
    DIFFICULTIES.map(difficulty => {
      const fights =
        currentRaidFights.filter(
          fight =>
            Number(fight.difficulty) ===
            difficulty.id
        );

      const kills =
        countUniqueKills(fights);

      return {
        ...difficulty,
        fights,
        kills,
        hasFights: fights.length > 0
      };
    });

  const mythic =
    summaries.find(
      difficulty =>
        difficulty.suffix === "M"
    );

  const heroic =
    summaries.find(
      difficulty =>
        difficulty.suffix === "H"
    );

  const normal =
    summaries.find(
      difficulty =>
        difficulty.suffix === "N"
    );

  /*
   * Mythic takes priority whenever Mythic activity exists.
   */
  if (mythic.hasFights || mythic.kills > 0) {
    return {
      ...mythic,

      progress:
        mythic.kills >= TOTAL_BOSSES
          ? "CE"
          : `${mythic.kills}/${TOTAL_BOSSES}M`
    };
  }

  if (heroic.hasFights || heroic.kills > 0) {
    return {
      ...heroic,
      progress:
        `${heroic.kills}/${TOTAL_BOSSES}H`
    };
  }

  if (normal.hasFights || normal.kills > 0) {
    return {
      ...normal,
      progress:
        `${normal.kills}/${TOTAL_BOSSES}N`
    };
  }

  return {
    id: null,
    suffix: "",
    name: "",
    fights: [],
    kills: 0,
    hasFights: false,
    progress: "-"
  };
}

function getLatestFight(fights) {
  if (!fights.length) {
    return null;
  }

  return [...fights].sort(
    (first, second) =>
      getFightTimestamp(second) -
      getFightTimestamp(first)
  )[0];
}

function getCompletionDetails(fights) {
  const finalBossName =
    CURRENT_RAID_BOSSES[
      CURRENT_RAID_BOSSES.length - 1
    ];

  const finalBossKills =
    fights.filter(
      fight =>
        fight.kill &&
        fight.canonicalBossName ===
          finalBossName
    );

  const latestKill =
    getLatestFight(finalBossKills);

  if (!latestKill) {
    return null;
  }

  return {
    bestBoss: finalBossName,
    bossProg: "CE",
    latestReport:
      latestKill.reportCode || "",
    latestReportTitle:
      latestKill.reportTitle || "",
    zoneName:
      latestKill.zoneName || ""
  };
}

function getCurrentProgressionBoss(fights) {
  const currentRaidFights =
    fights.filter(
      fight =>
        Boolean(fight.canonicalBossName)
    );

  const killedBosses =
    getKilledBosses(currentRaidFights);

  /*
   * Only consider wipes on bosses that have not been killed.
   */
  const wipes =
    currentRaidFights.filter(
      fight =>
        !fight.kill &&
        fight.canonicalBossName &&
        typeof fight.bossPercentage ===
          "number" &&
        fight.bossPercentage > 0 &&
        !killedBosses.has(
          fight.canonicalBossName
        )
    );

  if (wipes.length === 0) {
    return {
      bestBoss: "",
      bossProg: "-",
      latestReport: "",
      latestReportTitle: "",
      zoneName: ""
    };
  }

  const bosses = new Map();

  for (const fight of wipes) {
    const bossName =
      fight.canonicalBossName;

    if (!bosses.has(bossName)) {
      bosses.set(
        bossName,
        {
          name: bossName,
          bestPercent: 100,
          latestTimestamp: 0,
          latestReport: "",
          latestReportTitle: "",
          zoneName: ""
        }
      );
    }

    const boss =
      bosses.get(bossName);

    if (
      fight.bossPercentage <
      boss.bestPercent
    ) {
      boss.bestPercent =
        fight.bossPercentage;
    }

    const timestamp =
      getFightTimestamp(fight);

    if (
      timestamp >
      boss.latestTimestamp
    ) {
      boss.latestTimestamp =
        timestamp;

      boss.latestReport =
        fight.reportCode || "";

      boss.latestReportTitle =
        fight.reportTitle || "";

      boss.zoneName =
        fight.zoneName || "";
    }
  }

  /*
   * The most recently attempted undefeated boss
   * is considered the current progression boss.
   */
  const currentBoss =
    [...bosses.values()].sort(
      (first, second) =>
        second.latestTimestamp -
        first.latestTimestamp
    )[0];

  return {
    bestBoss:
      currentBoss.name,

    bossProg:
      `${currentBoss.bestPercent.toFixed(2)}%`,

    latestReport:
      currentBoss.latestReport,

    latestReportTitle:
      currentBoss.latestReportTitle,

    zoneName:
      currentBoss.zoneName
  };
}

function countCurrentRaidReports(fights) {
  return new Set(
    fights
      .filter(
        fight =>
          Boolean(fight.canonicalBossName)
      )
      .map(
        fight =>
          fight.reportCode
      )
      .filter(Boolean)
  ).size;
}

async function updateGroup(
  token,
  group
) {
  console.log(
    `Fetching Warcraft Logs for ${group.name}...`
  );

  if (!group.warcraftLogsGuildId) {
    console.log(
      `${group.name}: no Warcraft Logs guild ID`
    );

    return {
      ...group,
      progress: group.progress || "-",
      bossProg: group.bossProg || "-",
      bestBoss: group.bestBoss || "",
      totalReports: 0,
      currentRaidReports: 0,
      updatedAt: new Date().toISOString()
    };
  }

  const reports =
    await getReportsForGuild(
      token,
      group.warcraftLogsGuildId
    );

  let allFights = [];

  for (const report of reports) {
    const fights =
      await getFightsFromReport(
        token,
        report
      );

    allFights.push(...fights);
  }

  const difficulty =
    getDifficultySummary(allFights);

  let progress =
    difficulty.progress;

  let raidKills =
    difficulty.kills;

  let progression;

  /*
   * When all nine Mythic bosses are actually found as kills,
   * show CE and use the final kill report.
   */
  if (
    difficulty.suffix === "M" &&
    difficulty.kills >= TOTAL_BOSSES
  ) {
    progress = "CE";
    raidKills = TOTAL_BOSSES;

    progression =
      getCompletionDetails(
        difficulty.fights
      ) || {
        bestBoss: "Midnight Falls",
        bossProg: "CE",
        latestReport: "",
        latestReportTitle: "",
        zoneName: ""
      };
  } else {
    progression =
      getCurrentProgressionBoss(
        difficulty.fights
      );
  }

  /*
   * Never downgrade a confirmed CE result during the same raid.
   * This protects against temporary report visibility/API issues.
   */
  if (
    group.raidKey === CURRENT_RAID_KEY &&
    group.progress === "CE" &&
    progress !== "CE"
  ) {
    console.warn(
      `${group.name}: Warcraft Logs returned ${progress}, ` +
      "but the stored result is already CE. Preserving CE."
    );

    progress = "CE";
    raidKills = TOTAL_BOSSES;

    if (
      !progression.bestBoss
    ) {
      progression = {
        bestBoss: "Midnight Falls",
        bossProg: "CE",
        latestReport:
          group.latestReport || "",
        latestReportTitle:
          group.latestReportTitle || "",
        zoneName:
          group.raidZone || ""
      };
    }
  }

  const updatedGroup = {
    ...group,

    raidKey: CURRENT_RAID_KEY,

    progress,

    raidDifficulty:
      difficulty.name,

    raidDifficultySuffix:
      difficulty.suffix,

    raidKills,

    totalReports:
      reports.length,

    currentRaidReports:
      countCurrentRaidReports(
        allFights
      ),

    bossProg:
      progression.bossProg,

    bestBoss:
      progression.bestBoss,

    latestReport:
      progression.latestReport,

    latestReportTitle:
      progression.latestReportTitle,

    raidZone:
      progression.zoneName || "",

    updatedAt:
      new Date().toISOString()
  };

  delete updatedGroup.totalPulls;
  delete updatedGroup.updateError;

  console.log(
    `${updatedGroup.name}: ` +
    `${updatedGroup.progress}, ` +
    `${updatedGroup.bossProg} ` +
    `${updatedGroup.bestBoss}, ` +
    `${updatedGroup.raidKills} Mythic kills`
  );

  return updatedGroup;
}

async function run() {
  console.log(
    "Running Warcraft Logs updater for Midnight VS / DR / MQD"
  );

  const token =
    await getToken();

  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Missing input file: ${inputPath}`
    );
  }

  const groups =
    JSON.parse(
      fs.readFileSync(
        inputPath,
        "utf8"
      )
    );

  if (!Array.isArray(groups)) {
    throw new Error(
      `${inputPath} must contain a JSON array`
    );
  }

  const updatedGroups = [];

  for (const group of groups) {
    try {
      const updatedGroup =
        await updateGroup(
          token,
          group
        );

      updatedGroups.push(
        updatedGroup
      );
    } catch (error) {
      console.error(
        `Failed updating ${group.name}:`,
        error.message
      );

      updatedGroups.push({
        ...group,
        updateError:
          error.message,
        updatedAt:
          new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      updatedGroups,
      null,
      2
    ) + "\n"
  );

  console.log(
    `Updated ${outputPath}`
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
