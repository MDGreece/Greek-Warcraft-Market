const fs = require("fs");
const path = require("path");

const guildFolder = "data/guilds";
const outputPath = "data/characters/characters.json";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeRealm(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function createCharacterKey(character) {
  return [
    "eu",
    normalizeRealm(character.realm),
    String(character.name || "").trim().toLowerCase()
  ].join(":");
}

function collectCharacters() {
  const guildFiles = fs
    .readdirSync(guildFolder)
    .filter(file => file.endsWith(".json"));

  const characters = new Map();

  for (const file of guildFiles) {
    const filePath = path.join(guildFolder, file);
    const guild = readJson(filePath);

    const roster = guild.roster || {};

    const roles = [
      ["tank", roster.tanks || []],
      ["healer", roster.healers || []],
      ["dps", roster.dps || []]
    ];

    for (const [role, players] of roles) {
      for (const player of players) {
        if (!player?.name || !player?.realm) {
          continue;
        }

        const character = {
          id: `${normalizeRealm(player.realm)}-${String(player.name)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}`,

          name: player.name,
          realm: normalizeRealm(player.realm),
          region: "eu",
          class: player.class || "",
          spec: player.spec || "",
          role,

          guild: guild.parentGuild || guild.name || "",
          raidGroup: guild.name || "",

          raiderIoUrl: "",
          warcraftLogsUrl: "",

          mythicPlusScore: null,
          raidProgress: "-",
          achievement: "-",

          sourceGuildFile: file,
          rosterUpdatedAt: guild.rosterUpdatedAt || "",
          updatedAt: new Date().toISOString()
        };

        const key = createCharacterKey(character);

        const existing = characters.get(key);

        if (!existing) {
          characters.set(key, character);
          continue;
        }

        const existingDate = Date.parse(existing.rosterUpdatedAt || 0);
        const currentDate = Date.parse(character.rosterUpdatedAt || 0);

        if (currentDate > existingDate) {
          characters.set(key, character);
        }
      }
    }
  }

  return [...characters.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      sensitivity: "base"
    })
  );
}

function run() {
  if (!fs.existsSync(guildFolder)) {
    throw new Error(`Missing folder: ${guildFolder}`);
  }

  fs.mkdirSync(path.dirname(outputPath), {
    recursive: true
  });

  const characters = collectCharacters();

  fs.writeFileSync(
    outputPath,
    JSON.stringify(characters, null, 2)
  );

  console.log(
    `Created ${outputPath} with ${characters.length} unique characters`
  );
}

run();
