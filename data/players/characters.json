const fs = require("fs");
const path = require("path");

const guildFolder = "data/guilds";
const outputPath = "data/characters/characters.json";

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function normalizeRegion(region) {
  return String(region || "eu")
    .trim()
    .toLowerCase() || "eu";
}

/**
 * Creates the realm slug used for URLs and saved output.
 *
 * Examples:
 * Twisting Nether -> twisting-nether
 * twisting-nether -> twisting-nether
 */
function normalizeRealm(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Creates a realm identity used only for duplicate detection.
 *
 * This makes these equivalent:
 * TwistingNether
 * Twisting Nether
 * twisting-nether
 */
function normalizeRealmKey(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’\s_-]/g, "");
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
    normalizeRealmKey(character.realm),
    normalizeCharacterName(character.name)
  ].join(":");
}

function slugifyCharacterName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createCharacterId(name, realm) {
  return [
    normalizeRealm(realm),
    slugifyCharacterName(name)
  ]
    .filter(Boolean)
    .join("-");
}

function parseDate(value) {
  const timestamp = Date.parse(value || "");

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getNewestCharacter(first, second) {
  const firstDate = Math.max(
    parseDate(first.rosterUpdatedAt),
    parseDate(first.updatedAt),
    parseDate(first.raiderIoUpdatedAt)
  );

  const secondDate = Math.max(
    parseDate(second.rosterUpdatedAt),
    parseDate(second.updatedAt),
    parseDate(second.raiderIoUpdatedAt)
  );

  return secondDate > firstDate
    ? second
    : first;
}

function mergeCharacterRecords(oldRecord, newRecord) {
  const newest = getNewestCharacter(
    oldRecord,
    newRecord
  );

  const oldest = newest === oldRecord
    ? newRecord
    : oldRecord;

  return {
    ...oldest,
    ...newest,

    id:
      newest.id ||
      oldest.id ||
      createCharacterId(
        newest.name || oldest.name,
        newest.realm || oldest.realm
      ),

    name:
      newest.name ||
      oldest.name ||
      "",

    realm: normalizeRealm(
      newest.realm ||
      oldest.realm
    ),

    region: normalizeRegion(
      newest.region ||
      oldest.region
    ),

    class:
      newest.class ||
      oldest.class ||
      "",

    spec:
      newest.spec ||
      oldest.spec ||
      "",

    role:
      newest.role ||
      oldest.role ||
      "",

    guild:
      newest.guild ||
      oldest.guild ||
      "",

    raidGroup:
      newest.raidGroup ||
      oldest.raidGroup ||
      "",

    firstSeenAt:
      oldest.firstSeenAt ||
      newest.firstSeenAt ||
      "",

    lastSeenInRosterAt:
      newest.lastSeenInRosterAt ||
      oldest.lastSeenInRosterAt ||
      "",

    raiderIoUrl:
      newest.raiderIoUrl ||
      oldest.raiderIoUrl ||
      "",

    warcraftLogsUrl:
      newest.warcraftLogsUrl ||
      oldest.warcraftLogsUrl ||
      "",

    thumbnailUrl:
      newest.thumbnailUrl ||
      oldest.thumbnailUrl ||
      "",

    mythicPlusScore:
      newest.mythicPlusScore ??
      oldest.mythicPlusScore ??
      null,

    itemLevel:
      newest.itemLevel ??
      oldest.itemLevel ??
      null,

    raidProgress:
      newest.raidProgress ||
      oldest.raidProgress ||
      "-",

    achievement:
      newest.achievement ||
      oldest.achievement ||
      "-",

    inCurrentRoster:
      newest.inCurrentRoster === true ||
      oldest.inCurrentRoster === true
  };
}

function loadExistingCharacters() {
  const existingCharacters =
    readJson(outputPath);

  if (!Array.isArray(existingCharacters)) {
    return [];
  }

  const deduplicated = new Map();

  for (const character of existingCharacters) {
    if (!character?.name || !character?.realm) {
      continue;
    }

    const normalizedCharacter = {
      ...character,
      realm: normalizeRealm(character.realm),
      region: normalizeRegion(character.region),
      id:
        character.id ||
        createCharacterId(
          character.name,
          character.realm
        )
    };

    const key =
      createCharacterKey(normalizedCharacter);

    const existing =
      deduplicated.get(key);

    if (!existing) {
      deduplicated.set(
        key,
        normalizedCharacter
      );

      continue;
    }

    deduplicated.set(
      key,
      mergeCharacterRecords(
        existing,
        normalizedCharacter
      )
    );
  }

  return [...deduplicated.values()];
}

function collectCurrentRosterCharacters(now) {
  const guildFiles = fs
    .readdirSync(guildFolder)
    .filter(file =>
      file.toLowerCase().endsWith(".json")
    );

  const characters = new Map();

  for (const file of guildFiles) {
    const filePath =
      path.join(guildFolder, file);

    const guild =
      readJson(filePath);

    if (!guild) {
      continue;
    }

    const roster =
      guild.roster || {};

    const roles = [
      ["tank", roster.tanks || []],
      ["healer", roster.healers || []],
      ["dps", roster.dps || []]
    ];

    for (const [role, players] of roles) {
      if (!Array.isArray(players)) {
        continue;
      }

      for (const player of players) {
        if (!player?.name || !player?.realm) {
          continue;
        }

        const realm =
          normalizeRealm(player.realm);

        const character = {
          id: createCharacterId(
            player.name,
            realm
          ),

          name: String(player.name).trim(),
          realm,
          region: "eu",

          class: player.class || "",
          spec: player.spec || "",
          role,

          guild:
            guild.parentGuild ||
            guild.name ||
            "",

          raidGroup:
            guild.name || "",

          sourceGuildFile: file,
          rosterUpdatedAt:
            guild.rosterUpdatedAt || "",

          inCurrentRoster: true,
          firstSeenAt: now,
          lastSeenInRosterAt: now,

          raiderIoUrl: "",
          warcraftLogsUrl: "",
          thumbnailUrl: "",

          mythicPlusScore: null,
          itemLevel: null,
          raidProgress: "-",
          achievement: "-",

          updatedAt: now
        };

        const key =
          createCharacterKey(character);

        const existing =
          characters.get(key);

        if (!existing) {
          characters.set(
            key,
            character
          );

          continue;
        }

        characters.set(
          key,
          mergeCharacterRecords(
            existing,
            character
          )
        );
      }
    }
  }

  return characters;
}

function mergeCharacters(
  existingCharacters,
  rosterCharacters,
  now
) {
  const merged = new Map();

  for (const character of existingCharacters) {
    const normalizedCharacter = {
      ...character,
      realm: normalizeRealm(character.realm),
      region: normalizeRegion(character.region),
      inCurrentRoster: false,
      updatedAt: now
    };

    const key =
      createCharacterKey(normalizedCharacter);

    const existing =
      merged.get(key);

    if (!existing) {
      merged.set(
        key,
        normalizedCharacter
      );

      continue;
    }

    merged.set(
      key,
      mergeCharacterRecords(
        existing,
        normalizedCharacter
      )
    );
  }

  for (
    const [key, rosterCharacter]
    of rosterCharacters.entries()
  ) {
    const existing =
      merged.get(key);

    if (!existing) {
      merged.set(
        key,
        rosterCharacter
      );

      continue;
    }

    const combined =
      mergeCharacterRecords(
        existing,
        rosterCharacter
      );

    merged.set(key, {
      ...combined,

      id:
        existing.id ||
        rosterCharacter.id,

      firstSeenAt:
        existing.firstSeenAt ||
        rosterCharacter.firstSeenAt ||
        now,

      lastSeenInRosterAt: now,
      inCurrentRoster: true,

      raiderIoUrl:
        existing.raiderIoUrl ||
        rosterCharacter.raiderIoUrl ||
        "",

      warcraftLogsUrl:
        existing.warcraftLogsUrl ||
        rosterCharacter.warcraftLogsUrl ||
        "",

      thumbnailUrl:
        existing.thumbnailUrl ||
        rosterCharacter.thumbnailUrl ||
        "",

      mythicPlusScore:
        existing.mythicPlusScore ??
        rosterCharacter.mythicPlusScore ??
        null,

      itemLevel:
        existing.itemLevel ??
        rosterCharacter.itemLevel ??
        null,

      raidProgress:
        existing.raidProgress ||
        rosterCharacter.raidProgress ||
        "-",

      achievement:
        existing.achievement ||
        rosterCharacter.achievement ||
        "-",

      updatedAt: now
    });
  }

  return [...merged.values()]
    .sort((a, b) => {
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

function run() {
  if (!fs.existsSync(guildFolder)) {
    throw new Error(
      `Missing folder: ${guildFolder}`
    );
  }

  const now =
    new Date().toISOString();

  fs.mkdirSync(
    path.dirname(outputPath),
    {
      recursive: true
    }
  );

  const existingCharacters =
    loadExistingCharacters();

  const rosterCharacters =
    collectCurrentRosterCharacters(now);

  const characters =
    mergeCharacters(
      existingCharacters,
      rosterCharacters,
      now
    );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      characters,
      null,
      2
    )
  );

  const currentCount =
    characters.filter(
      character =>
        character.inCurrentRoster === true
    ).length;

  const historicalCount =
    characters.filter(
      character =>
        character.inCurrentRoster === false
    ).length;

  console.log(
    `Updated ${outputPath}`
  );

  console.log(
    `Unique characters: ${characters.length}`
  );

  console.log(
    `Current roster characters: ${currentCount}`
  );

  console.log(
    `Historical characters: ${historicalCount}`
  );
}

run();
