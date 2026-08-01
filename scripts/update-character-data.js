const fs = require("fs");
const path = require("path");

const inputPath = "data/characters/characters.json";
const outputPath = "data/characters/characters.json";

const REQUEST_DELAY_MS = 250;
const MAX_RETRIES = 3;

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sleep(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function normalizeRealm(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, "-");
}

function normalizeRegion(region) {
  const normalized = String(region || "eu")
    .trim()
    .toLowerCase();

  return normalized || "eu";
}

function encodePathPart(value) {
  return encodeURIComponent(String(value || "").trim());
}

function createRaiderIoUrl(character) {
  const region = normalizeRegion(character.region);
  const realm = normalizeRealm(character.realm);
  const name = encodePathPart(character.name);

  return `https://raider.io/characters/${region}/${realm}/${name}`;
}

function createWarcraftLogsUrl(character) {
  const region = normalizeRegion(character.region);
  const realm = normalizeRealm(character.realm);
  const name = encodePathPart(character.name);

  return `https://www.warcraftlogs.com/character/${region}/${realm}/${name}`;
}

function createRaiderIoApiUrl(character) {
  const region = normalizeRegion(character.region);
  const realm = normalizeRealm(character.realm);
  const name = String(character.name || "").trim();

  const parameters = new URLSearchParams({
    region,
    realm,
    name,
    fields: [
      "guild",
      "gear",
      "raid_progression",
      "mythic_plus_scores_by_season:current"
    ].join(",")
  });

  return `https://raider.io/api/v1/characters/profile?${parameters.toString()}`;
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

  const responseText = await response.text();

  if (
    (response.status === 429 || response.status >= 500) &&
    attempt < MAX_RETRIES
  ) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = Number(retryAfterHeader);

    const retryDelay = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : REQUEST_DELAY_MS * attempt * 4;

    console.log(
      `Request failed with ${response.status}. Retrying in ${retryDelay} ms...`
    );

    await sleep(retryDelay);

    return fetchJson(url, attempt + 1);
  }

  const error = new Error(
    `Raider.IO request failed: ${response.status} ${responseText}`
  );

  error.status = response.status;
  throw error;
}

function getCurrentSeasonScore(profile) {
  const seasons = profile.mythic_plus_scores_by_season;

  if (!Array.isArray(seasons) || seasons.length === 0) {
    return null;
  }

  const currentSeason = seasons[0];
  const score = currentSeason?.scores?.all;

  return typeof score === "number"
    ? Math.round(score * 10) / 10
    : null;
}

function getRaidEntries(profile) {
  const progression = profile.raid_progression;

  if (!progression || typeof progression !== "object") {
    return [];
  }

  return Object.entries(progression)
    .map(([raidKey, raid]) => {
      const totalBosses = Number(raid?.total_bosses) || 0;
      const mythicKills =
        Number(raid?.mythic_bosses_killed) || 0;
      const heroicKills =
        Number(raid?.heroic_bosses_killed) || 0;
      const normalKills =
        Number(raid?.normal_bosses_killed) || 0;

      return {
        raidKey,
        raidName:
          raid?.summary ||
          raid?.name ||
          raidKey,
        totalBosses,
        mythicKills,
        heroicKills,
        normalKills
      };
    })
    .filter(raid => raid.totalBosses > 0);
}

function getRaidScore(raid) {
  if (raid.mythicKills > 0) {
    return 300000 + raid.mythicKills;
  }

  if (raid.heroicKills > 0) {
    return 200000 + raid.heroicKills;
  }

  if (raid.normalKills > 0) {
    return 100000 + raid.normalKills;
  }

  return 0;
}

function selectHighestRaidProgress(profile) {
  const raids = getRaidEntries(profile);

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

  const highestRaid = raids.sort((a, b) => {
    return getRaidScore(b) - getRaidScore(a);
  })[0];

  const {
    raidKey,
    raidName,
    totalBosses,
    mythicKills,
    heroicKills,
    normalKills
  } = highestRaid;

  if (mythicKills > 0) {
    const isCE = mythicKills >= totalBosses;

    return {
      raidKey,
      raidName,
      raidProgress: `${mythicKills}/${totalBosses}M`,
      achievement: isCE ? "CE" : "-",
      difficulty: "Mythic",
      kills: mythicKills,
      totalBosses
    };
  }

  if (heroicKills > 0) {
    const hasAotC = heroicKills >= totalBosses;

    return {
      raidKey,
      raidName,
      raidProgress: `${heroicKills}/${totalBosses}H`,
      achievement: hasAotC ? "AotC" : "-",
      difficulty: "Heroic",
      kills: heroicKills,
      totalBosses
    };
  }

  if (normalKills > 0) {
    return {
      raidKey,
      raidName,
      raidProgress: `${normalKills}/${totalBosses}N`,
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

function getGuildName(profile, fallbackCharacter) {
  return (
    profile?.guild?.name ||
    fallbackCharacter.guild ||
    ""
  );
}

function buildUpdatedCharacter(character, profile) {
  const raid = selectHighestRaidProgress(profile);

  return {
    ...character,

    name: profile.name || character.name,
    realm: normalizeRealm(
      profile.realm || character.realm
    ),
    region: normalizeRegion(
      profile.region || character.region
    ),

    class:
      profile.class ||
      character.class ||
      "",

    spec:
      profile.active_spec_name ||
      character.spec ||
      "",

    role:
      profile.active_spec_role ||
      character.role ||
      "",

    guild: getGuildName(profile, character),

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
      typeof profile.achievement_points === "number"
        ? profile.achievement_points
        : null,

    itemLevel:
      typeof profile.gear?.item_level_equipped === "number"
        ? profile.gear.item_level_equipped
        : null,

    mythicPlusScore:
      getCurrentSeasonScore(profile),

    raidKey: raid.raidKey,
    raidName: raid.raidName,
    raidProgress: raid.raidProgress,
    raidDifficulty: raid.difficulty,
    raidKills: raid.kills,
    raidTotalBosses: raid.totalBosses,
    achievement: raid.achievement,

    raiderIoUrl:
      profile.profile_url ||
      createRaiderIoUrl(character),

    warcraftLogsUrl:
      createWarcraftLogsUrl(character),

    thumbnailUrl:
      profile.thumbnail_url ||
      "",

    raiderIoUpdatedAt:
      profile.last_crawled_at ||
      "",

    dataStatus: "found",
    updateError: "",
    updatedAt: new Date().toISOString()
  };
}

function buildMissingCharacter(character, error) {
  return {
    ...character,

    raiderIoUrl:
      character.raiderIoUrl ||
      createRaiderIoUrl(character),

    warcraftLogsUrl:
      character.warcraftLogsUrl ||
      createWarcraftLogsUrl(character),

    dataStatus:
      error?.status === 400 || error?.status === 404
        ? "not-found"
        : "error",

    updateError: error?.message || "Unknown error",
    updatedAt: new Date().toISOString()
  };
}

async function updateCharacter(character, index, total) {
  const label =
    `${character.name}-${character.realm}`;

  console.log(
    `[${index + 1}/${total}] Fetching ${label}...`
  );

  try {
    const apiUrl = createRaiderIoApiUrl(character);
    const profile = await fetchJson(apiUrl);

    const updatedCharacter =
      buildUpdatedCharacter(character, profile);

    console.log(
      `Found ${updatedCharacter.name}: ` +
      `${updatedCharacter.spec} ${updatedCharacter.class}, ` +
      `${updatedCharacter.mythicPlusScore ?? "-"} M+, ` +
      `${updatedCharacter.raidProgress} ` +
      `${updatedCharacter.achievement !== "-"
        ? updatedCharacter.achievement
        : ""}`
    );

    return updatedCharacter;
  } catch (error) {
    console.error(
      `Could not update ${label}: ${error.message}`
    );

    return buildMissingCharacter(character, error);
  }
}

async function run() {
  console.log("Starting Raider.IO character updater");

  const characters = readJson(inputPath);

  if (!Array.isArray(characters)) {
    throw new Error(
      `${inputPath} must contain a JSON array`
    );
  }

  const updatedCharacters = [];

  for (let index = 0; index < characters.length; index += 1) {
    const updatedCharacter = await updateCharacter(
      characters[index],
      index,
      characters.length
    );

    updatedCharacters.push(updatedCharacter);

    if (index < characters.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  updatedCharacters.sort((a, b) => {
    return String(a.name).localeCompare(
      String(b.name),
      undefined,
      {
        sensitivity: "base"
      }
    );
  });

  fs.mkdirSync(path.dirname(outputPath), {
    recursive: true
  });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(updatedCharacters, null, 2)
  );

  const found = updatedCharacters.filter(
    character => character.dataStatus === "found"
  ).length;

  const missing = updatedCharacters.filter(
    character => character.dataStatus === "not-found"
  ).length;

  const failed = updatedCharacters.filter(
    character => character.dataStatus === "error"
  ).length;

  console.log("");
  console.log("Character update complete");
  console.log(`Total: ${updatedCharacters.length}`);
  console.log(`Found: ${found}`);
  console.log(`Not found: ${missing}`);
  console.log(`Errors: ${failed}`);
  console.log(`Updated ${outputPath}`);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
