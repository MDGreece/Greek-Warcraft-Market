const fs = require("fs");
const path = require("path");

const guildFolder = "data/guilds";
const outputPath =
  "data/characters/characters.json";

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function normalizeRealm(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, "-");
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function createCharacterKey(character) {
  return [
    String(
      character.region || "eu"
    ).toLowerCase(),

    normalizeRealm(character.realm),

    normalizeName(character.name)
  ].join(":");
}

function createCharacterId(name, realm) {
  const normalizedName =
    String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    `${normalizeRealm(realm)}-` +
    `${normalizedName}`
  );
}

function loadExistingCharacters() {
  const existing =
    readJson(outputPath);

  if (!Array.isArray(existing)) {
    return [];
  }

  return existing;
}

function collectCurrentRosterCharacters(now) {
  const guildFiles = fs
    .readdirSync(guildFolder)
    .filter(file =>
      file.endsWith(".json")
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

    const trackedGuildName =
      guild.parentGuild ||
      guild.name ||
      "";

    const raidGroupName =
      guild.name || "";

    const roles = [
      [
        "tank",
        Array.isArray(roster.tanks)
          ? roster.tanks
          : []
      ],
      [
        "healing",
        Array.isArray(roster.healers)
          ? roster.healers
          : []
      ],
      [
        "dps",
        Array.isArray(roster.dps)
          ? roster.dps
          : []
      ]
    ];

    for (const [role, players] of roles) {
      for (const player of players) {
        if (
          !player?.name ||
          !player?.realm
        ) {
          continue;
        }

        const character = {
          id: createCharacterId(
            player.name,
            player.realm
          ),

          name:
            player.name,

          realm:
            normalizeRealm(
              player.realm
            ),

          region:
            "eu",

          class:
            player.class || "",

          spec:
            player.spec || "",

          role,

          /*
           * This is the guild whose roster supplied
           * the character. It is not necessarily the
           * character's current Raider.IO guild.
           */
          trackedGuild:
            trackedGuildName,

          raidGroup:
            raidGroupName,

          sourceGuildFile:
            file,

          rosterUpdatedAt:
            guild.rosterUpdatedAt || "",

          inCurrentRoster:
            true,

          firstSeenAt:
            now,

          lastSeenInRosterAt:
            now,

          updatedAt:
            now
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

        const existingDate =
          Date.parse(
            existing.rosterUpdatedAt || 0
          );

        const currentDate =
          Date.parse(
            character.rosterUpdatedAt || 0
          );

        if (currentDate > existingDate) {
          characters.set(
            key,
            character
          );
        }
      }
    }
  }

  return characters;
}

function buildNewCharacter(
  currentCharacter,
  now
) {
  /*
   * A new character has not been enriched from
   * Raider.IO yet. Temporarily use the tracked guild.
   *
   * update-character-data.js runs next and replaces
   * this with the character's actual current guild.
   */
  return {
    ...currentCharacter,

    guild:
      currentCharacter.trackedGuild || "",

    raiderIoUrl:
      "",

    warcraftLogsUrl:
      "",

    mythicPlusScore:
      null,

    itemLevel:
      null,

    raidProgress:
      "-",

    achievement:
      "-",

    thumbnailUrl:
      "",

    dataStatus:
      "",

    updateError:
      "",

    firstSeenAt:
      currentCharacter.firstSeenAt ||
      now,

    lastSeenInRosterAt:
      now,

    inCurrentRoster:
      true,

    updatedAt:
      now
  };
}

function mergeExistingCharacter(
  existingCharacter,
  currentCharacter,
  now
) {
  /*
   * Preserve the actual guild returned by Raider.IO.
   *
   * Do not replace it with trackedGuild or raidGroup.
   */
  const actualGuild =
    existingCharacter.guild ?? "";

  return {
    ...existingCharacter,

    id:
      currentCharacter.id ||
      existingCharacter.id,

    name:
      currentCharacter.name ||
      existingCharacter.name,

    realm:
      currentCharacter.realm ||
      existingCharacter.realm,

    region:
      currentCharacter.region ||
      existingCharacter.region ||
      "eu",

    class:
      currentCharacter.class ||
      existingCharacter.class ||
      "",

    spec:
      currentCharacter.spec ||
      existingCharacter.spec ||
      "",

    role:
      currentCharacter.role ||
      existingCharacter.role ||
      "",

    /*
     * Keep Raider.IO's actual guild.
     */
    guild:
      actualGuild,

    /*
     * Keep roster-source information separately.
     */
    trackedGuild:
      currentCharacter.trackedGuild ||
      existingCharacter.trackedGuild ||
      "",

    raidGroup:
      currentCharacter.raidGroup ||
      existingCharacter.raidGroup ||
      "",

    sourceGuildFile:
      currentCharacter.sourceGuildFile ||
      existingCharacter.sourceGuildFile ||
      "",

    rosterUpdatedAt:
      currentCharacter.rosterUpdatedAt ||
      existingCharacter.rosterUpdatedAt ||
      "",

    firstSeenAt:
      existingCharacter.firstSeenAt ||
      currentCharacter.firstSeenAt ||
      now,

    lastSeenInRosterAt:
      now,

    inCurrentRoster:
      true,

    raiderIoUrl:
      existingCharacter.raiderIoUrl ||
      "",

    warcraftLogsUrl:
      existingCharacter.warcraftLogsUrl ||
      "",

    mythicPlusScore:
      existingCharacter
        .mythicPlusScore ?? null,

    raidProgress:
      existingCharacter
        .raidProgress || "-",

    achievement:
      existingCharacter
        .achievement || "-",

    itemLevel:
      existingCharacter
        .itemLevel ?? null,

    thumbnailUrl:
      existingCharacter
        .thumbnailUrl || "",

    dataStatus:
      existingCharacter
        .dataStatus || "",

    updateError:
      existingCharacter
        .updateError || "",

    updatedAt:
      now
  };
}

function mergeCharacters(
  existingCharacters,
  currentRosterCharacters,
  now
) {
  const merged = new Map();

  /*
   * Keep all historical characters, but mark them as
   * not currently present until a roster confirms them.
   */
  for (
    const existingCharacter
    of existingCharacters
  ) {
    const key =
      createCharacterKey(
        existingCharacter
      );

    merged.set(key, {
      ...existingCharacter,
      inCurrentRoster: false,
      updatedAt: now
    });
  }

  /*
   * Add or refresh characters found in current rosters.
   */
  for (
    const [key, currentCharacter]
    of currentRosterCharacters.entries()
  ) {
    const existingCharacter =
      merged.get(key);

    if (!existingCharacter) {
      merged.set(
        key,
        buildNewCharacter(
          currentCharacter,
          now
        )
      );

      continue;
    }

    merged.set(
      key,
      mergeExistingCharacter(
        existingCharacter,
        currentCharacter,
        now
      )
    );
  }

  return [...merged.values()]
    .sort((a, b) =>
      String(a.name || "")
        .localeCompare(
          String(b.name || ""),
          undefined,
          {
            sensitivity: "base"
          }
        )
    );
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

  const currentRosterCharacters =
    collectCurrentRosterCharacters(now);

  const characters =
    mergeCharacters(
      existingCharacters,
      currentRosterCharacters,
      now
    );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      characters,
      null,
      2
    ) + "\n"
  );

  const currentCount =
    characters.filter(
      character =>
        character.inCurrentRoster ===
        true
    ).length;

  const historicalCount =
    characters.filter(
      character =>
        character.inCurrentRoster ===
        false
    ).length;

  console.log(
    `Updated ${outputPath} with ` +
    `${characters.length} total characters`
  );

  console.log(
    `Current roster characters: ` +
    `${currentCount}`
  );

  console.log(
    `Characters no longer in a tracked roster: ` +
    `${historicalCount}`
  );
}

try {
  run();
} catch (error) {
  console.error(
    `Character update failed: ` +
    error.message
  );

  process.exit(1);
}
