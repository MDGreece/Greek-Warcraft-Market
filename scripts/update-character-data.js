const fs = require("fs");
const path = require("path");

const inputPath = "data/characters/characters.json";
const outputPath = "data/characters/characters.json";

const REQUEST_DELAY_MS = 350;
const MAX_RETRIES = 4;

/*
 * Raider.IO allows up to 200 unauthenticated API requests per minute.
 * A small delay plus retry/backoff helps prevent HTTP 429 errors.
 */

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

/*
 * Produces a Raider.IO-compatible realm slug.
 *
 * Examples:
 * Twisting Nether -> twisting-nether
 * twistingnether  -> twisting-nether, using the aliases below
 */

const REALM_ALIASES = {
  twistingnether: "twisting-nether",
  tarrenmill: "tarren-mill",
  argentdawn: "argent-dawn",
  burninglegion: "burning-legion",
  chamberofaspects: "chamber-of-aspects",
  defiasbrotherhood: "defias-brotherhood",
  emeraldDream: "emerald-dream",
  grimBatol: "grim-batol",
  kazzak: "kazzak",
  lightningsblade: "lightnings-blade",
  ravencrest: "ravencrest",
  silvermoon: "silvermoon",
  stormscale: "stormscale",
  sylvanas: "sylvanas",
  draenor: "draenor",
  genjuros: "genjuros"
};

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

async function fetchJson(url, attempt = 1) {
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
      response.headers.get("retry-after");

    const retryAfterSeconds =
      Number(retryAfterHeader);

    const retryDelay =
      Number.isFinite(retryAfterSeconds) &&
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

function getCurrentSeasonScore(profile) {
  const seasons =
    profile.mythic_plus_scores_by_season;

  if (
    !Array.isArray(seasons) ||
    seasons.length === 0
  ) {
    return null;
  }

  const currentSeason =
    seasons[0];

  const score =
    currentSeason?.scores?.all;

  if (typeof score !== "number") {
    return null;
  }

  return Math.round(score * 10) / 10;
}

function getRaidEntries(profile) {
  const progression =
    profile.raid_progression;

  if (
    !progression ||
    typeof progression !== "object"
  ) {
    return [];
  }

  return Object.entries(progression)
    .map(([raidKey, raid]) => {
      const totalBosses =
        Number(raid?.total_bosses) || 0;

      const mythicKills =
        Number(
          raid?.mythic_bosses_killed
        ) || 0;

      const heroicKills =
        Number(
          raid?.heroic_bosses_killed
        ) || 0;

      const normalKills =
        Number(
          raid?.normal_bosses_killed
        ) || 0;

      return {
        raidKey,

        raidName:
          raid?.name ||
          raid?.summary ||
          raidKey,

        totalBosses,
        mythicKills,
        heroicKills,
        normalKills
      };
    })
    .filter(raid =>
      raid.totalBosses > 0
    );
}

function getRaidScore(raid) {
  if (
    raid.mythicKills >=
      raid.totalBosses &&
    raid.totalBosses > 0
  ) {
    return 400000;
  }

  if (raid.mythicKills > 0) {
    return (
      300000 +
      raid.mythicKills
    );
  }

  if (
    raid.heroicKills >=
      raid.totalBosses &&
    raid.totalBosses > 0
  ) {
    return 250000;
  }

  if (raid.heroicKills > 0) {
    return (
      200000 +
      raid.heroicKills
    );
  }

  if (raid.normalKills > 0) {
    return (
      100000 +
      raid.normalKills
    );
  }

  return 0;
}

function selectHighestRaidProgress(profile) {
  const raids =
    getRaidEntries(profile);

  if (raids.length === 0) {
    return {
      raidKey: "",
      raidName: "",
      raidProgress: "-",
      achievement: "-",
      difficulty: "",
      kills: 0,
      totalBosses: 0
    };
  }

  const sortedRaids = [...raids].sort(
    (a, b) =>
      getRaidScore(b) -
      getRaidScore(a)
  );

  const highestRaid =
    sortedRaids[0];

  const {
    raidKey,
    raidName,
    totalBosses,
    mythicKills,
    heroicKills,
    normalKills
  } = highestRaid;

  if (mythicKills > 0) {
    const earnedCE =
      mythicKills >= totalBosses;

    return {
      raidKey,
      raidName,

      raidProgress:
        `${mythicKills}/` +
        `${totalBosses}M`,

      achievement:
        earnedCE ? "CE" : "-",

      difficulty: "Mythic",
      kills: mythicKills,
      totalBosses
    };
  }

  if (heroicKills > 0) {
    const earnedAotC =
      heroicKills >= totalBosses;

    return {
      raidKey,
      raidName,

      raidProgress:
        `${heroicKills}/` +
        `${totalBosses}H`,

      achievement:
        earnedAotC ? "AotC" : "-",

      difficulty: "Heroic",
      kills: heroicKills,
      totalBosses
    };
  }

  if (normalKills > 0) {
    return {
      raidKey,
      raidName,

      raidProgress:
        `${normalKills}/` +
        `${totalBosses}N`,

      achievement: "-",
      difficulty: "Normal",
      kills: normalKills,
      totalBosses
    };
  }

  return {
    raidKey,
    raidName,
    raidProgress: "-",
    achievement: "-",
    difficulty: "",
    kills: 0,
    totalBosses
  };
}

function getCurrentGuild(profile) {
  if (
    profile?.guild &&
    typeof profile.guild === "object"
  ) {
    return profile.guild.name || "";
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

function buildUpdatedCharacter(
  character,
  profile
) {
  const raid =
    selectHighestRaidProgress(profile);

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

  const profileCharacter = {
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
     * This field is the character's current
     * Raider.IO/Blizzard guild.
     *
     * It intentionally replaces the old
     * roster guild, so build-free-agents.js
     * can determine whether the character
     * is still in a tracked Greek guild.
     */
    guild: currentGuild,

    /*
     * Keep the last roster/team source
     * separately.
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
      typeof profile.achievement_points ===
      "number"
        ? profile.achievement_points
        : character.achievementPoints ??
          null,

    itemLevel:
      typeof profile.gear
        ?.item_level_equipped ===
      "number"
        ? profile.gear
            .item_level_equipped
        : character.itemLevel ??
          null,

    mythicPlusScore:
      getCurrentSeasonScore(profile),

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

    dataStatus: "found",
    updateError: "",
    lastSuccessfulUpdateAt: now,
    updatedAt: now
  };

  return profileCharacter;
}

function buildMissingCharacter(
  character,
  error
) {
  const now =
    new Date().toISOString();

  const notFound =
    error?.status === 400 ||
    error?.status === 404;

  return {
    ...character,

    raiderIoUrl:
      character.raiderIoUrl ||
      createRaiderIoUrl(character),

    warcraftLogsUrl:
      character.warcraftLogsUrl ||
      createWarcraftLogsUrl(character),

    dataStatus:
      notFound
        ? "not-found"
        : "error",

    updateError:
      error?.message ||
      "Unknown error",

    lastFailedUpdateAt: now,
    updatedAt: now
  };
}

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
      createRaiderIoApiUrl(character);

    const profile =
      await fetchJson(apiUrl);

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
      `raid=${updatedCharacter.raidProgress}`
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

function sortCharacters(characters) {
  return characters.sort((a, b) => {
    const nameDifference =
      String(a.name || "")
        .localeCompare(
          String(b.name || ""),
          undefined,
          {
            sensitivity: "base"
          }
        );

    if (nameDifference !== 0) {
      return nameDifference;
    }

    return String(a.realm || "")
      .localeCompare(
        String(b.realm || ""),
        undefined,
        {
          sensitivity: "base"
        }
      );
  });
}

async function run() {
  console.log(
    "Starting Raider.IO character updater"
  );

  const characters =
    readJson(inputPath);

  if (!Array.isArray(characters)) {
    throw new Error(
      `${inputPath} must contain a JSON array`
    );
  }

  console.log(
    `Characters to update: ${characters.length}`
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
        dataStatus: "invalid",
        updateError:
          "Missing character name or realm",
        updatedAt:
          new Date().toISOString()
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

  sortCharacters(
    updatedCharacters
  );

  fs.mkdirSync(
    path.dirname(outputPath),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      updatedCharacters,
      null,
      2
    )
  );

  const found =
    updatedCharacters.filter(
      character =>
        character.dataStatus ===
        "found"
    ).length;

  const missing =
    updatedCharacters.filter(
      character =>
        character.dataStatus ===
        "not-found"
    ).length;

  const failed =
    updatedCharacters.filter(
      character =>
        character.dataStatus ===
        "error"
    ).length;

  const invalid =
    updatedCharacters.filter(
      character =>
        character.dataStatus ===
        "invalid"
    ).length;

  console.log("");
  console.log(
    "Character enrichment complete"
  );

  console.log(
    `Total: ${updatedCharacters.length}`
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
    `Updated ${outputPath}`
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
