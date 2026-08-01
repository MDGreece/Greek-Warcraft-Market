const fs = require("fs");
const path = require("path");

const charactersPath =
  "data/characters/characters.json";

const leaderboardPath =
  "data/leaderboard.json";

const outputPath =
  "data/free-agents.json";

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getLeaderboardGuildNames(leaderboard) {
  const guildNames = new Set();

  for (const entry of leaderboard) {
    if (entry.type !== "guild") {
      continue;
    }

    if (entry.name) {
      guildNames.add(
        normalizeName(entry.name)
      );
    }
  }

  return guildNames;
}

function determineFreeAgentStatus(
  character,
  leaderboardGuildNames
) {
  const currentGuild =
    String(character.guild || "").trim();

  if (!currentGuild) {
    return {
      isFreeAgent: true,
      reason: "guildless"
    };
  }

  const normalizedGuild =
    normalizeName(currentGuild);

  if (
    !leaderboardGuildNames.has(
      normalizedGuild
    )
  ) {
    return {
      isFreeAgent: true,
      reason:
        "guild-not-on-greek-leaderboard"
    };
  }

  return {
    isFreeAgent: false,
    reason: ""
  };
}

function buildFreeAgent(
  character,
  reason,
  now
) {
  return {
    ...character,

    freeAgent: true,
    freeAgentReason: reason,

    previousTrackedGuild:
      character.raidGroup ||
      character.previousTrackedGuild ||
      "",

    freeAgentSince:
      character.freeAgentSince ||
      now,

    freeAgentUpdatedAt: now
  };
}

function run() {
  const characters =
    readJson(charactersPath);

  const leaderboard =
    readJson(leaderboardPath);

  if (!Array.isArray(characters)) {
    throw new Error(
      `${charactersPath} must contain an array`
    );
  }

  if (!Array.isArray(leaderboard)) {
    throw new Error(
      `${leaderboardPath} must contain an array`
    );
  }

  const leaderboardGuildNames =
    getLeaderboardGuildNames(leaderboard);

  const now =
    new Date().toISOString();

  const freeAgents = [];

  for (const character of characters) {
    const status =
      determineFreeAgentStatus(
        character,
        leaderboardGuildNames
      );

    if (!status.isFreeAgent) {
      continue;
    }

    freeAgents.push(
      buildFreeAgent(
        character,
        status.reason,
        now
      )
    );
  }

  freeAgents.sort((a, b) =>
    String(a.name || "").localeCompare(
      String(b.name || ""),
      undefined,
      {
        sensitivity: "base"
      }
    )
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
      freeAgents,
      null,
      2
    )
  );

  const guildlessCount =
    freeAgents.filter(
      character =>
        character.freeAgentReason ===
        "guildless"
    ).length;

  const outsideGuildCount =
    freeAgents.filter(
      character =>
        character.freeAgentReason ===
        "guild-not-on-greek-leaderboard"
    ).length;

  console.log(
    `Created ${outputPath}`
  );

  console.log(
    `Total free agents: ${freeAgents.length}`
  );

  console.log(
    `Guildless: ${guildlessCount}`
  );

  console.log(
    `Guild not on Greek leaderboard: ${outsideGuildCount}`
  );
}

run();
