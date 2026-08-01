const fs = require("fs");
const path = require("path");

const inputPath = "data/characters/characters.json";
const outputPath = "data/characters/characters.json";

const REQUEST_DELAY_MS = 350;
const MAX_RETRIES = 4;
const CURRENT_TIER_TOTAL_BOSSES = 9;

/*
 * Known possible Raider.IO keys/names for the combined
 * Midnight launch tier: VS / DR / MQD.
 *
 * The total-boss check provides an additional fallback if
 * Raider.IO changes the displayed name but still returns 9 bosses.
 */
const CURRENT_TIER_KEYS = new Set([
  "midnight-tier-1",
  "tier-mn-1",
  "mn-tier-1"
]);

const CURRENT_TIER_MARKERS = [
  "vs / dr / mqd",
  "vs/dr/mqd",
  "voidspire",
  "dreamrift",
  "march on quel",
  "midnight tier 1",
  "midnight-tier-1",
  "tier-mn-1"
];

const EXCLUDED_RAID_MARKERS = [
  "sporefall",
  "rotmire"
];

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

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "");
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
      "User-Agent": "Greek-Warcraft-Market/1.0"
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

  const score =
    seasons[0]?.scores?.all;

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

      return {
        raidKey,

        raidName:
          raid?.name ||
          raid?.summary ||
          raidKey,

        totalBosses,

        mythicKills:
          Number(
            raid?.mythic_bosses_killed
          ) || 0,

        heroicKills:
          Number(
            raid?.heroic_bosses_killed
          ) || 0,

        normalKills:
          Number(
            raid?.normal_bosses_killed
          ) || 0
      };
    })
    .filter(raid =>
      raid.totalBosses > 0
    );
}

function isExcludedRaid(raid) {
  const searchableText = normalizeText(
    `${raid.raidKey} ${raid.raidName}`
  );

  return EXCLUDED_RAID_MARKERS.some(
    marker => searchableText.includes(marker)
  );
}

function getCurrentTierMatchScore(raid) {
  if (isExcludedRaid(raid)) {
    return -1;
  }

  const normalizedKey =
    normalizeText(raid.raidKey);

  const searchableText =
    normalizeText(
      `${raid.raidKey} ${raid.raidName}`
    );

  let score = 0;

  if (CURRENT_TIER_KEYS.has(normalizedKey)) {
    score += 1000;
  }

  for (const marker of CURRENT_TIER_MARKERS) {
    if (searchableText.includes(marker)) {
      score += 200;
    }
  }

  if (
    raid.totalBosses ===
    CURRENT_TIER_TOTAL_BOSSES
  ) {
    score += 100;
  }

  /*
   * Avoid selecting unrelated older nine-boss raids solely
   * because they also contain nine encounters.
   *
   * A nine-boss fallback is accepted only when the raid has
   * some current character progress.
   */
  const hasProgress =
    raid.mythicKills > 0 ||
    raid.heroicKills > 0 ||
    raid.normalKills > 0;

  if (
    score === 100 &&
    !hasProgress
  ) {
    return 0;
  }

  return score;
}

function findCurrentTierRaid(profile) {
  const raids = getRaidEntries(profile);

  const candidates = raids
    .map(raid => ({
      raid,
      matchScore:
        getCurrentTierMatchScore(raid)
    }))
    .filter(candidate =>
      candidate.matchScore > 0
    )
    .sort((a, b) => {
      if (
        b.matchScore !==
        a.matchScore
      ) {
        return (
          b.matchScore -
          a.matchScore
        );
      }

      /*
       * If duplicate representations of the same tier exist,
       * prefer the entry with more Mythic, Heroic and Normal
       * progress in that order.
       */
      if (
        b.raid.mythicKills !==
        a.raid.mythicKills
      ) {
        return (
          b.raid.mythicKills -
          a.raid.mythicKills
        );
      }

      if (
        b.raid.heroicKills !==
        a.raid.heroicKills
      ) {
        return (
          b.raid.heroicKills -
          a.raid.heroicKills
        );
      }

      return (
        b.raid.normalKills -
        a.raid.normalKills
      );
    });

  return candidates[0]?.raid || null;
}

function createEmptyRaidProgress() {
  return {
    raidKey: "",
    raidName: "",
    raidProgress: "-",
    achievement: "-",
    difficulty: "",
    kills: 0,
    totalBosses:
      CURRENT_TIER_TOTAL_BOSSES
  };
}

function selectCurrentTierProgress(profile) {
  const raid =
    findCurrentTierRaid(profile);

  if (!raid) {
    return createEmptyRaidProgress();
  }

  const mythicKills = Math.min(
    Math.max(raid.mythicKills, 0),
    CURRENT_TIER_TOTAL_BOSSES
  );

  const heroicKills = Math.min(
    Math.max(raid.heroicKills, 0),
    CURRENT_TIER_TOTAL_BOSSES
  );

  const normalKills = Math.min(
    Math.max(raid.normalKills, 0),
    CURRENT_TIER_TOTAL_BOSSES
  );

  /*
   * Always use the highest difficulty with at least one kill.
   *
   * 5/9M plus 9/9H displays 5/9M.
   * 0/9M plus 9/9H displays 9/9H and AotC.
   */
  if (mythicKills > 0) {
    const hasLuraKill =
      mythicKills ===
      CURRENT_TIER_TOTAL_BOSSES;

    return {
      raidKey: raid.raidKey,
      raidName: raid.raidName,

      raidProgress:
        `${mythicKills}/` +
        `${CURRENT_TIER_TOTAL_BOSSES}M`,

      achievement:
        hasLuraKill ? "CE" : "-",

      difficulty: "Mythic",
      kills: mythicKills,

      totalBosses:
        CURRENT_TIER_TOTAL_BOSSES
    };
  }

  if (heroicKills > 0) {
    const hasAotC =
      heroicKills ===
      CURRENT_TIER_TOTAL_BOSSES;

    return {
      raidKey: raid.raidKey,
      raidName: raid.raidName,

      raidProgress:
        `${heroicKills}/` +
        `${CURRENT_TIER_TOTAL_BOSSES}H`,

      achievement:
        hasAotC ? "AotC" : "-",

      difficulty: "Heroic",
      kills: heroicKills,

      totalBosses:
        CURRENT_TIER_TOTAL_BOSSES
    };
  }

  if (normalKills > 0) {
    return {
      raidKey: raid.raidKey,
      raidName: raid.raidName,

      raidProgress:
        `${normalKills}/` +
        `${CURRENT_TIER_TOTAL_BOSSES}N`,

      achievement: "-",
      difficulty: "Normal",
      kills: normalKills,

      totalBosses:
        CURRENT_TIER_TOTAL_BOSSES
    };
  }

  return {
    raidKey: raid.raidKey,
    raidName: raid.raidName,
    raidProgress: "-",
    achievement: "-",
    difficulty: "",
    kills: 0,

    totalBosses:
      CURRENT_TIER_TOTAL_BOSSES
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
  const normalized = String(role || "")
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
    selectCurrentTierProgress(profile);

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
     * Current live guild from Raider.IO.
     * This is used by build-free-agents.js.
     */
    guild: currentGuild,

    /*
     * Preserve the original tracked roster guild separately.
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
    `${character.name}-${character.realm}`;

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

  console.log(
    "Raid filter: current 9-boss Midnight tier only"
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

  const ceCount =
    updatedCharacters.filter(
      character =>
        character.achievement === "CE"
    ).length;

  const aotcCount =
    updatedCharacters.filter(
      character =>
        character.achievement === "AotC"
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
    `CE characters: ${ceCount}`
  );

  console.log(
    `AotC characters: ${aotcCount}`
  );

  console.log(
    `Updated ${outputPath}`
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
