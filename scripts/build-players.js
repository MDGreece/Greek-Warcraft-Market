const fs = require("fs");
const path = require("path");

const charactersPath = "data/characters/characters.json";
const identitiesPath = "data/players/player-identities.json";
const outputPath = "data/players/players.json";

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeRegion(region) {
  return String(region || "eu")
    .trim()
    .toLowerCase() || "eu";
}

function normalizeRealm(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[\s_-]+/g, "");
}

function normalizeCharacterName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

function createCharacterKey(character) {
  return [
    normalizeRegion(character.region),
    normalizeRealm(character.realm),
    normalizeCharacterName(character.name)
  ].join(":");
}

function normalizeBattleTag(battleTag) {
  return String(battleTag || "")
    .trim()
    .toLowerCase();
}

function isValidBattleTag(battleTag) {
  return /^[^#\s]{3,12}#[0-9]{4,10}$/i.test(
    String(battleTag || "").trim()
  );
}

function slugifyBattleTag(battleTag) {
  return String(battleTag || "")
    .trim()
    .toLowerCase()
    .replace("#", "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getHighestMythicPlusScore(characters) {
  const scores = characters
    .map(character => Number(character.mythicPlusScore))
    .filter(Number.isFinite);

  return scores.length > 0
    ? Math.max(...scores)
    : null;
}

function getRaidScore(character) {
  const achievement = String(
    character.achievement || ""
  ).toUpperCase();

  if (achievement === "CE") {
    return 10000;
  }

  const progress = String(
    character.raidProgress || ""
  ).toUpperCase();

  const match = progress.match(
    /^(\d+)\/(\d+)([MNH])$/
  );

  if (!match) {
    return achievement === "AOTC" ? 2500 : 0;
  }

  const kills = Number(match[1]);
  const difficulty = match[3];

  const base = {
    M: 3000,
    H: 2000,
    N: 1000
  };

  return base[difficulty] + kills;
}

function getBestRaidCharacter(characters) {
  return [...characters].sort(
    (a, b) => getRaidScore(b) - getRaidScore(a)
  )[0] || null;
}

function findMappedCharacters(
  identity,
  charactersByKey
) {
  const matched = [];

  for (const reference of identity.characters || []) {
    const key = createCharacterKey(reference);
    const character = charactersByKey.get(key);

    if (!character) {
      console.log(
        `Character not found for ${identity.battleTag}: ` +
        `${reference.name}-${reference.realm}`
      );

      continue;
    }

    matched.push(character);
  }

  return matched.sort((a, b) =>
    String(a.name || "").localeCompare(
      String(b.name || ""),
      undefined,
      { sensitivity: "base" }
    )
  );
}

function buildPlayer(identity, matchedCharacters, now) {
  const bestRaidCharacter =
    getBestRaidCharacter(matchedCharacters);

  return {
    id: slugifyBattleTag(identity.battleTag),

    battleTag: identity.battleTag,

    displayName:
      identity.displayName ||
      identity.battleTag.split("#")[0],

    characters: matchedCharacters,

    characterCount: matchedCharacters.length,

    highestMythicPlusScore:
      getHighestMythicPlusScore(matchedCharacters),

    bestRaidProgress:
      bestRaidCharacter?.raidProgress || "-",

    bestAchievement:
      bestRaidCharacter?.achievement || "-",

    mainCharacter:
      identity.mainCharacter || "",

    discord:
      identity.discord || "",

    profileImage:
      identity.profileImage || "",

    createdAt:
      identity.createdAt || now,

    updatedAt: now
  };
}

function run() {
  const characters = readJson(charactersPath);
  const identities = readJson(identitiesPath);

  if (!Array.isArray(characters)) {
    throw new Error(
      `${charactersPath} must contain an array`
    );
  }

  if (!Array.isArray(identities)) {
    throw new Error(
      `${identitiesPath} must contain an array`
    );
  }

  const charactersByKey = new Map();

  for (const character of characters) {
    if (!character?.name || !character?.realm) {
      continue;
    }

    charactersByKey.set(
      createCharacterKey(character),
      character
    );
  }

  const seenBattleTags = new Set();
  const players = [];
  const now = new Date().toISOString();

  for (const identity of identities) {
    if (!isValidBattleTag(identity.battleTag)) {
      console.log(
        `Skipped invalid BattleTag: ${identity.battleTag || "(empty)"}`
      );

      continue;
    }

    const normalizedBattleTag =
      normalizeBattleTag(identity.battleTag);

    if (seenBattleTags.has(normalizedBattleTag)) {
      console.log(
        `Skipped duplicate BattleTag: ${identity.battleTag}`
      );

      continue;
    }

    seenBattleTags.add(normalizedBattleTag);

    const matchedCharacters =
      findMappedCharacters(
        identity,
        charactersByKey
      );

    if (matchedCharacters.length === 0) {
      console.log(
        `Skipped ${identity.battleTag}: no characters matched`
      );

      continue;
    }

    players.push(
      buildPlayer(
        identity,
        matchedCharacters,
        now
      )
    );
  }

  players.sort((a, b) =>
    String(a.displayName).localeCompare(
      String(b.displayName),
      undefined,
      { sensitivity: "base" }
    )
  );

  fs.mkdirSync(
    path.dirname(outputPath),
    { recursive: true }
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(players, null, 2)
  );

  console.log(
    `Created ${outputPath} with ${players.length} player profiles`
  );

  console.log(
    `Linked characters: ${players.reduce(
      (total, player) =>
        total + player.characterCount,
      0
    )}`
  );
}

run();
