const fs = require("fs");
const path = require("path");

const inputPath = "data/characters/characters.json";
const outputPath = "data/characters/characters.json";

const REQUEST_DELAY_MS = 350;
const MAX_RETRIES = 4;

/*
 * ============================================================
 * CURRENT SEASON / RAID
 * ============================================================
 *
 * Only The Venomous Abyss is considered current raid progress.
 *
 * Old Midnight T1 progress remains available from Raider.IO,
 * but it is intentionally ignored here.
 */
const CURRENT_RAID_KEY = "the-venomous-abyss";
const CURRENT_RAID_NAME = "The Venomous Abyss";
const CURRENT_TIER_TOTAL_BOSSES = 8;

const REALM_ALIASES = {
  twistingnether: "twisting-nether",
  tarrenmill: "tarren-mill",
  argentdawn: "argent-dawn",
  burninglegion: "burning-legion",
  chamberofaspects: "chamber-of-aspects",
  defiasbrotherhood: "defias-brotherhood",
  emeralddream: "emerald-dream",
  grimbatol: "grim-batol",
  lightningsblade: "lightnings-blade",
  ravencrest: "ravencrest",
  silvermoon: "silvermoon",
  stormscale: "stormscale",
  sylvanas: "sylvanas",
  draenor: "draenor",
  genjuros: "genjuros",
  kazzak: "kazzak"
};

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function sleep(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function normalizeRegion(region) {
  return (
    String(region || "eu")
      .trim()
      .toLowerCase() || "eu"
  );
}

function normalizeRealm(realm) {
  const original = String(realm || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "");

  const compact = original.replace(
    /[\s_-]+/g,
    ""
  );

  if (REALM_ALIASES[compact]) {
    return REALM_ALIASES[compact];
  }

  return original
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function encodePathPart(value) {
  return encodeURIComponent(
    String(value || "").trim()
  );
}

function createRaiderIoUrl(character) {
  const region = normalizeRegion(
    character.region
  );

  const realm = normalizeRealm(
    character.realm
  );

  const name = encodePathPart(
    character.name
  );

  return (
    `https://raider.io/characters/` +
    `${region}/${realm}/${name}`
  );
}

function createWarcraftLogsUrl(character) {
  const region = normalizeRegion(
    character.region
  );

  const realm = normalizeRealm(
    character.realm
  );

  const name = encodePathPart(
    character.name
  );

  return (
    `https://www.warcraftlogs.com/character/` +
    `${region}/${realm}/${name}`
  );
}

/*
 * Request:
 *
 * - current guild
 * - gear
 * - raid progression
 * - CURRENT Mythic+ season
 *
 * We deliberately use:
 *
 * mythic_plus_scores_by_season:current
 *
 * so a previous-season M+ score is not hardcoded.
 */
function createRaiderIoApiUrl(character) {
  const parameters = new URLSearchParams({
    region: normalizeRegion(
      character.region
    ),

    realm: normalizeRealm(
      character.realm
    ),

    name: String(
      character.name || ""
    ).trim(),

    fields: [
      "guild",
      "gear",
      "raid_progression",
      "mythic_plus_scores_by_season:current"
    ].join(",")
  });

  return (
    "https://raider.io/api/v1/characters/profile?" +
    parameters.toString()
  );
}

async function fetchJson(
  url,
  attempt = 1
) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Greek-Warcraft-Market/1.0"
    }
  });

  if (response.ok) {
    return response.json();
  }

  const responseText =
    await response.text();

  const retryable =
    response.status === 429 ||
    response.status >= 500;

  if (
    retryable &&
    attempt < MAX_RETRIES
  ) {
    const retryAfterHeader =
      response.headers.get(
        "retry-after"
      );

    const retryAfterSeconds =
      Number(retryAfterHeader);

    const retryDelay =
      Number.isFinite(
        retryAfterSeconds
      ) &&
      retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : REQUEST_DELAY_MS *
          Math.pow(2, attempt);

    console.log(
      `Raider.IO returned ${response.status}. ` +
      `Retrying in ${retryDelay} ms...`
    );

    await sleep(retryDelay);

    return fetchJson(
      url,
      attempt + 1
    );
  }

  const error = new Error(
    `Raider.IO request failed: ` +
    `${response.status} ${responseText}`
  );

  error.status = response.status;

  throw error;
}

/*
 * ============================================================
 * MYTHIC+
 * ============================================================
 */

function getCurrentSeasonScore(profile) {
  const seasons =
    profile.mythic_plus_scores_by_season;

  if (
    !Array.isArray(seasons) ||
    seasons.length === 0
  ) {
    return null;
  }

  const score =
    seasons[0]?.scores?.all;

  if (typeof score !== "number") {
    return null;
  }

  return (
    Math.round(score * 10) / 10
  );
}

/*
 * ============================================================
 * RAID PROGRESSION
 * ============================================================
 */

function getCurrentRaid(profile) {
  const progression =
    profile.raid_progression;

  if (
    !progression ||
    typeof progression !== "object"
  ) {
    return null;
  }

  /*
   * Exact match only.
   *
   * This prevents:
   * - tier-mn-1
   * - Sporefall
   * - Tidebound Grotto
   * - old raids
   *
   * from being selected.
   */
  const raid =
    progression[CURRENT_RAID_KEY];

  if (!raid) {
    return null;
  }

  return {
    raidKey:
      CURRENT_RAID_KEY,

    raidName:
      raid.name ||
      CURRENT_RAID_NAME,

    totalBosses:
      Number(
        raid.total_bosses
      ) ||
      CURRENT_TIER_TOTAL_BOSSES,

    mythicKills:
      Number(
        raid.mythic_bosses_killed
      ) || 0,

    heroicKills:
      Number(
        raid.heroic_bosses_killed
      ) || 0,

    normalKills:
      Number(
        raid.normal_bosses_killed
      ) || 0
  };
}

function createEmptyRaidProgress() {
  return {
    raidKey:
      CURRENT_RAID_KEY,

    raidName:
      CURRENT_RAID_NAME,

    raidProgress:
      "-",

    achievement:
      "-",

    difficulty:
      "",

    kills:
      0,

    totalBosses:
      CURRENT_TIER_TOTAL_BOSSES
  };
}

function selectCurrentRaidProgress(
  profile
) {
  const raid =
    getCurrentRaid(profile);

  if (!raid) {
    return createEmptyRaidProgress();
  }

  const mythicKills =
    Math.min(
      Math.max(
        raid.mythicKills,
        0
      ),
      CURRENT_TIER_TOTAL_BOSSES
    );

  const heroicKills =
    Math.min(
      Math.max(
        raid.heroicKills,
        0
      ),
      CURRENT_TIER_TOTAL_BOSSES
    );

  const normalKills =
    Math.min(
      Math.max(
        raid.normalKills,
        0
      ),
      CURRENT_TIER_TOTAL_BOSSES
    );

  /*
   * Highest difficulty with at least
   * one kill is displayed.
   *
   * Example:
   *
   * 3/8M + 8/8H
   * -> 3/8M
   *
   * 0/8M + 8/8H
   * -> 8/8H + AotC
   */

  if (mythicKills > 0) {
    const hasCE =
      mythicKills ===
      CURRENT_TIER_TOTAL_BOSSES;

    return {
      raidKey:
        CURRENT_RAID_KEY,

      raidName:
        raid.raidName,

      raidProgress:
        `${mythicKills}/` +
        `${CURRENT_TIER_TOTAL_BOSSES}M`,

      achievement:
        hasCE
          ? "CE"
          : "-",

      difficulty:
        "Mythic",

      kills:
        mythicKills,

      totalBosses:
        CURRENT_TIER_TOTAL_BOSSES
    };
  }

  if (heroicKills > 0) {
    const hasAotC =
      heroicKills ===
      CURRENT_TIER_TOTAL_BOSSES;

    return {
      raidKey:
        CURRENT_RAID_KEY,

      raidName:
        raid.raidName,

      raidProgress:
        `${heroicKills}/` +
        `${CURRENT_TIER_TOTAL_BOSSES}H`,

      achievement:
        hasAotC
          ? "AotC"
          : "-",

      difficulty:
        "Heroic",

      kills:
        heroicKills,

      totalBosses:
        CURRENT_TIER_TOTAL_BOSSES
    };
  }

  if (normalKills > 0) {
    return {
      raidKey:
        CURRENT_RAID_KEY,

      raidName:
        raid.raidName,

      raidProgress:
        `${normalKills}/` +
        `${CURRENT_TIER_TOTAL_BOSSES}N`,

      achievement:
        "-",

      difficulty:
        "Normal",

      kills:
        normalKills,

      totalBosses:
        CURRENT_TIER_TOTAL_BOSSES
    };
  }

  return createEmptyRaidProgress();
}

/*
 * ============================================================
 * CURRENT GUILD
 * ============================================================
 */

function getCurrentGuild(profile) {
  if (
    profile?.guild &&
    typeof profile.guild === "object"
  ) {
    return (
      profile.guild.name || ""
    );
  }

  if (
    typeof profile?.guild === "string"
  ) {
    return profile.guild;
  }

  return "";
}

function normalizeRole(role) {
  const normalized =
    String(role || "")
      .trim()
      .toLowerCase();

  if (
    normalized === "tank" ||
    normalized === "healer" ||
    normalized === "dps"
  ) {
    return normalized;
  }

  return normalized || "";
}

/*
 * ============================================================
 * BUILD CHARACTER
 * ============================================================
 */

function buildUpdatedCharacter(
  character,
  profile
) {
  const raid =
    selectCurrentRaidProgress(
      profile
    );

  const now =
    new Date().toISOString();

  const region =
    normalizeRegion(
      profile.region ||
      character.region
    );

  const realm =
    normalizeRealm(
      profile.realm ||
      character.realm
    );

  const currentGuild =
    getCurrentGuild(profile);

  return {
    ...character,

    name:
      profile.name ||
      character.name,

    realm,

    region,

    class:
      profile.class ||
      character.class ||
      "",

    spec:
      profile.active_spec_name ||
      character.spec ||
      "",

    role:
      normalizeRole(
        profile.active_spec_role ||
        character.role
      ),

    /*
     * Current live guild according
     * to Raider.IO.
     *
     * build-free-agents.js uses this.
     */
    guild:
      currentGuild,

    /*
     * Preserve where we originally
     * collected this character.
     */
    trackedGuild:
      character.trackedGuild ||
      character.guild ||
      "",

    raidGroup:
      character.raidGroup ||
      "",

    faction:
      profile.faction ||
      character.faction ||
      "",

    race:
      profile.race ||
      character.race ||
      "",

    gender:
      profile.gender ||
      character.gender ||
      "",

    achievementPoints:
      typeof profile
        .achievement_points ===
        "number"
        ? profile.achievement_points
        : character
            .achievementPoints ??
          null,

    itemLevel:
      typeof profile.gear
        ?.item_level_equipped ===
        "number"
        ? profile.gear
            .item_level_equipped
        : character.itemLevel ??
          null,

    /*
     * CURRENT Mythic+ season only.
     *
     * If Raider.IO has no current
     * season score yet this becomes null,
     * rather than preserving the old score.
     */
    mythicPlusScore:
      getCurrentSeasonScore(
        profile
      ),

    /*
     * CURRENT RAID ONLY.
     */
    raidKey:
      raid.raidKey,

    raidName:
      raid.raidName,

    raidProgress:
      raid.raidProgress,

    raidDifficulty:
      raid.difficulty,

    raidKills:
      raid.kills,

    raidTotalBosses:
      raid.totalBosses,

    achievement:
      raid.achievement,

    raiderIoUrl:
      profile.profile_url ||
      createRaiderIoUrl({
        ...character,
        region,
        realm
      }),

    warcraftLogsUrl:
      createWarcraftLogsUrl({
        ...character,
        region,
        realm
      }),

    thumbnailUrl:
      profile.thumbnail_url ||
      character.thumbnailUrl ||
      "",

    raiderIoUpdatedAt:
      profile.last_crawled_at ||
      "",

    dataStatus:
      "found",

    updateError:
      "",

    lastSuccessfulUpdateAt:
      now,

    updatedAt:
      now
  };
}

/*
 * ============================================================
 * FAILED / MISSING CHARACTERS
 * ============================================================
 */

function buildMissingCharacter(
  character,
  error
) {
  const now =
    new Date().toISOString();

  const notFound =
    error?.status === 400 ||
    error?.status === 404;

  /*
   * IMPORTANT:
   *
   * Do not preserve old-season M+ / raid
   * progression when Raider.IO cannot
   * update the character.
   *
   * Identity/roster information is kept,
   * but current-season statistics are reset.
   */
  return {
    ...character,

    mythicPlusScore:
      null,

    raidKey:
      CURRENT_RAID_KEY,

    raidName:
      CURRENT_RAID_NAME,

    raidProgress:
      "-",

    raidDifficulty:
      "",

    raidKills:
      0,

    raidTotalBosses:
      CURRENT_TIER_TOTAL_BOSSES,

    achievement:
      "-",

    raiderIoUrl:
      character.raiderIoUrl ||
      createRaiderIoUrl(
        character
      ),

    warcraftLogsUrl:
      character.warcraftLogsUrl ||
      createWarcraftLogsUrl(
        character
      ),

    dataStatus:
      notFound
        ? "not-found"
        : "error",

    updateError:
      error?.message ||
      "Unknown error",

    lastFailedUpdateAt:
      now,

    updatedAt:
      now
  };
}

/*
 * ============================================================
 * UPDATE CHARACTER
 * ============================================================
 */

async function updateCharacter(
  character,
  index,
  total
) {
  const label =
    `${character.name}-` +
    `${character.realm}`;

  console.log(
    `[${index + 1}/${total}] ` +
    `Fetching ${label}...`
  );

  try {
    const apiUrl =
      createRaiderIoApiUrl(
        character
      );

    const profile =
      await fetchJson(
        apiUrl
      );

    const updatedCharacter =
      buildUpdatedCharacter(
        character,
        profile
      );

    console.log(
      `Found ${updatedCharacter.name}: ` +
      `${updatedCharacter.spec || "-"} ` +
      `${updatedCharacter.class || "-"}, ` +
      `guild=${updatedCharacter.guild || "Guildless"}, ` +
      `M+=${updatedCharacter.mythicPlusScore ?? "-"}, ` +
      `raid=${updatedCharacter.raidProgress}, ` +
      `achievement=${updatedCharacter.achievement}`
    );

    return updatedCharacter;
  } catch (error) {
    console.error(
      `Could not update ${label}: ` +
      error.message
    );

    return buildMissingCharacter(
      character,
      error
    );
  }
}

/*
 * ============================================================
 * DEDUPLICATION
 * ============================================================
 */

function normalizeCharacterKeyName(
  name
) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

function createCharacterKey(
  character
) {
  return [
    normalizeRegion(
      character.region
    ),

    normalizeRealm(
      character.realm
    ).replace(
      /[\s_-]+/g,
      ""
    ),

    normalizeCharacterKeyName(
      character.name
    )
  ].join(":");
}

function getLatestTimestamp(
  character
) {
  const dates = [
    character
      .lastSuccessfulUpdateAt,

    character
      .raiderIoUpdatedAt,

    character
      .rosterUpdatedAt,

    character
      .lastSeenInRosterAt,

    character
      .updatedAt
  ];

  return Math.max(
    ...dates.map(value => {
      const timestamp =
        Date.parse(
          value || ""
        );

      return Number.isFinite(
        timestamp
      )
        ? timestamp
        : 0;
    })
  );
}

function mergeDuplicateCharacters(
  first,
  second
) {
  const firstTimestamp =
    getLatestTimestamp(first);

  const secondTimestamp =
    getLatestTimestamp(second);

  const newest =
    secondTimestamp >
    firstTimestamp
      ? second
      : first;

  const older =
    newest === first
      ? second
      : first;

  return {
    ...older,
    ...newest,

    id:
      newest.id ||
      older.id,

    name:
      newest.name ||
      older.name,

    region:
      normalizeRegion(
        newest.region ||
        older.region
      ),

    realm:
      normalizeRealm(
        newest.realm ||
        older.realm
      ),

    class:
      newest.class ||
      older.class ||
      "",

    spec:
      newest.spec ||
      older.spec ||
      "",

    role:
      newest.role ||
      older.role ||
      "",

    guild:
      newest.guild ||
      older.guild ||
      "",

    trackedGuild:
      newest.trackedGuild ||
      older.trackedGuild ||
      "",

    raidGroup:
      newest.raidGroup ||
      older.raidGroup ||
      "",

    raiderIoUrl:
      newest.raiderIoUrl ||
      older.raiderIoUrl ||
      "",

    warcraftLogsUrl:
      newest.warcraftLogsUrl ||
      older.warcraftLogsUrl ||
      "",

    thumbnailUrl:
      newest.thumbnailUrl ||
      older.thumbnailUrl ||
      "",

    firstSeenAt:
      older.firstSeenAt ||
      newest.firstSeenAt ||
      "",

    lastSeenInRosterAt:
      newest.lastSeenInRosterAt ||
      older.lastSeenInRosterAt ||
      "",

    inCurrentRoster:
      newest.inCurrentRoster === true ||
      older.inCurrentRoster === true
  };
}

function deduplicateCharacters(
  characters
) {
  const uniqueCharacters =
    new Map();

  for (
    const character of characters
  ) {
    if (
      !character?.name ||
      !character?.realm
    ) {
      continue;
    }

    const key =
      createCharacterKey(
        character
      );

    const existing =
      uniqueCharacters.get(key);

    if (!existing) {
      uniqueCharacters.set(
        key,
        character
      );

      continue;
    }

    uniqueCharacters.set(
      key,
      mergeDuplicateCharacters(
        existing,
        character
      )
    );
  }

  return [
    ...uniqueCharacters.values()
  ];
}

function sortCharacters(
  characters
) {
  return characters.sort(
    (a, b) => {
      const nameDifference =
        String(a.name || "")
          .localeCompare(
            String(
              b.name || ""
            ),
            undefined,
            {
              sensitivity:
                "base"
            }
          );

      if (
        nameDifference !== 0
      ) {
        return nameDifference;
      }

      return String(
        a.realm || ""
      ).localeCompare(
        String(
          b.realm || ""
        ),
        undefined,
        {
          sensitivity:
            "base"
        }
      );
    }
  );
}

/*
 * ============================================================
 * MAIN
 * ============================================================
 */

async function run() {
  console.log(
    "Starting Raider.IO character updater"
  );

  console.log(
    `Current raid: ${CURRENT_RAID_NAME}`
  );

  console.log(
    `Raid key: ${CURRENT_RAID_KEY}`
  );

  console.log(
    `Raid bosses: ${CURRENT_TIER_TOTAL_BOSSES}`
  );

  console.log(
    "Mythic+: Raider.IO current season"
  );

  const characters =
    readJson(inputPath);

  if (
    !Array.isArray(
      characters
    )
  ) {
    throw new Error(
      `${inputPath} must contain a JSON array`
    );
  }

  console.log(
    `Characters to update: ` +
    `${characters.length}`
  );

  const updatedCharacters = [];

  for (
    let index = 0;
    index < characters.length;
    index += 1
  ) {
    const character =
      characters[index];

    if (
      !character?.name ||
      !character?.realm
    ) {
      console.log(
        `[${index + 1}/${characters.length}] ` +
        "Skipped invalid character record"
      );

      updatedCharacters.push({
        ...character,

        /*
         * Reset season-specific values
         * even for invalid records.
         */
        mythicPlusScore:
          null,

        raidKey:
          CURRENT_RAID_KEY,

        raidName:
          CURRENT_RAID_NAME,

        raidProgress:
          "-",

        raidDifficulty:
          "",

        raidKills:
          0,

        raidTotalBosses:
          CURRENT_TIER_TOTAL_BOSSES,

        achievement:
          "-",

        dataStatus:
          "invalid",

        updateError:
          "Missing character name or realm",

        updatedAt:
          new Date()
            .toISOString()
      });

      continue;
    }

    const updatedCharacter =
      await updateCharacter(
        character,
        index,
        characters.length
      );

    updatedCharacters.push(
      updatedCharacter
    );

    if (
      index <
      characters.length - 1
    ) {
      await sleep(
        REQUEST_DELAY_MS
      );
    }
  }

  const deduplicatedCharacters =
    deduplicateCharacters(
      updatedCharacters
    );

  sortCharacters(
    deduplicatedCharacters
  );

  fs.mkdirSync(
    path.dirname(
      outputPath
    ),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      deduplicatedCharacters,
      null,
      2
    ) + "\n"
  );

  const found =
    deduplicatedCharacters.filter(
      character =>
        character.dataStatus ===
        "found"
    ).length;

  const missing =
    deduplicatedCharacters.filter(
      character =>
        character.dataStatus ===
        "not-found"
    ).length;

  const failed =
    deduplicatedCharacters.filter(
      character =>
        character.dataStatus ===
        "error"
    ).length;

  const invalid =
    deduplicatedCharacters.filter(
      character =>
        character.dataStatus ===
        "invalid"
    ).length;

  const ceCount =
    deduplicatedCharacters.filter(
      character =>
        character.achievement ===
        "CE"
    ).length;

  const aotcCount =
    deduplicatedCharacters.filter(
      character =>
        character.achievement ===
        "AotC"
    ).length;

  const scoredCharacters =
    deduplicatedCharacters.filter(
      character =>
        typeof character
          .mythicPlusScore ===
          "number" &&
        character
          .mythicPlusScore > 0
    ).length;

  const duplicatesRemoved =
    updatedCharacters.length -
    deduplicatedCharacters.length;

  console.log("");
  console.log(
    "Character enrichment complete"
  );

  console.log(
    `Total: ` +
    `${deduplicatedCharacters.length}`
  );

  console.log(
    `Duplicates removed: ` +
    `${duplicatesRemoved}`
  );

  console.log(
    `Found: ${found}`
  );

  console.log(
    `Not found: ${missing}`
  );

  console.log(
    `Errors: ${failed}`
  );

  console.log(
    `Invalid records: ${invalid}`
  );

  console.log(
    `Current-season M+ scores: ` +
    `${scoredCharacters}`
  );

  console.log(
    `Venomous Abyss CE characters: ` +
    `${ceCount}`
  );

  console.log(
    `Venomous Abyss AotC characters: ` +
    `${aotcCount}`
  );

  console.log(
    `Updated ${outputPath}`
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
