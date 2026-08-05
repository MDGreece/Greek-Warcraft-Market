const CLASS_COLORS = {
  DeathKnight: "#C41E3A",
  DemonHunter: "#A330C9",
  Druid: "#FF7D0A",
  Evoker: "#33937F",
  Hunter: "#AAD372",
  Mage: "#3FC7EB",
  Monk: "#00FF98",
  Paladin: "#F48CBA",
  Priest: "#FFFFFF",
  Rogue: "#FFF468",
  Shaman: "#0070DD",
  Warlock: "#8788EE",
  Warrior: "#C69B6D"
};

const TOP_LIMIT = 10;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeClassName(className) {
  return String(className || "")
    .trim()
    .replace(/\s+/g, "");
}

function getClassColor(className) {
  const normalizedClass =
    normalizeClassName(className);

  return (
    CLASS_COLORS[normalizedClass] ||
    "#FFFFFF"
  );
}

function normalizeGuildName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeRole(role) {
  const normalizedRole =
    String(role || "")
      .trim()
      .toLowerCase();

  if (
    normalizedRole === "tank" ||
    normalizedRole === "tanks"
  ) {
    return "tank";
  }

  if (
    normalizedRole === "healer" ||
    normalizedRole === "healers" ||
    normalizedRole === "healing" ||
    normalizedRole === "heal"
  ) {
    return "healer";
  }

  return "dps";
}

function getMythicPlusScore(character) {
  const score =
    Number(character.mythicPlusScore);

  return Number.isFinite(score)
    ? score
    : 0;
}

function formatScore(score) {
  const number =
    Number(score);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }
  );
}

function getGreekGuildNames(leaderboard) {
  return new Set(
    leaderboard
      .filter(entry =>
        entry.type === "guild"
      )
      .map(entry =>
        normalizeGuildName(entry.name)
      )
      .filter(Boolean)
  );
}

function isTrackedGreekCharacter(
  character,
  greekGuildNames
) {
  const guildName =
    normalizeGuildName(
      character.guild
    );

  return (
    character.inCurrentRoster === true &&
    guildName !== "" &&
    greekGuildNames.has(guildName)
  );
}

function compareCharacters(first, second) {
  const scoreDifference =
    getMythicPlusScore(second) -
    getMythicPlusScore(first);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const itemLevelDifference =
    (Number(second.itemLevel) || 0) -
    (Number(first.itemLevel) || 0);

  if (itemLevelDifference !== 0) {
    return itemLevelDifference;
  }

  return String(first.name || "")
    .localeCompare(
      String(second.name || ""),
      undefined,
      {
        sensitivity: "base"
      }
    );
}

function getRoleCharacters(
  characters,
  role
) {
  return characters
    .filter(character =>
      normalizeRole(character.role) === role
    )
    .filter(character =>
      getMythicPlusScore(character) > 0
    )
    .sort(compareCharacters)
    .slice(0, TOP_LIMIT);
}

function createRankDisplay(index) {
  if (index === 0) {
    return `
      <span class="mythic-plus-rank rank-first">
        1
      </span>
    `;
  }

  if (index === 1) {
    return `
      <span class="mythic-plus-rank rank-second">
        2
      </span>
    `;
  }

  if (index === 2) {
    return `
      <span class="mythic-plus-rank rank-third">
        3
      </span>
    `;
  }

  return `
    <span class="mythic-plus-rank">
      ${index + 1}
    </span>
  `;
}

function createCharacterLink(character) {
  const name =
    escapeHtml(
      character.name ||
      "Unknown"
    );

  if (!character.raiderIoUrl) {
    return `
      <span class="mythic-plus-character-name">
        ${name}
      </span>
    `;
  }

  return `
    <a
      class="mythic-plus-character-name"
      href="${escapeHtml(character.raiderIoUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      title="Open Raider.IO profile"
    >
      ${name}
    </a>
  `;
}

function createCharacterRow(
  character,
  index
) {
  const classColor =
    getClassColor(character.class);

  const score =
    getMythicPlusScore(character);

  const rankDisplay =
    createRankDisplay(index);

  const characterLink =
    createCharacterLink(character);

  const thumbnail = character.thumbnailUrl
    ? `
      <img
        class="mythic-plus-character-image"
        src="${escapeHtml(character.thumbnailUrl)}"
        alt="${escapeHtml(character.name || "Character")}"
        loading="lazy"
      >
    `
    : `
      <div class="mythic-plus-character-placeholder">
        ?
      </div>
    `;

  return `
    <tr>
      <td class="mythic-plus-rank-cell">
        ${rankDisplay}
      </td>

      <td>
        <div class="mythic-plus-character">
          ${thumbnail}

          <div class="mythic-plus-character-info">
            <div style="color: ${classColor};">
              ${characterLink}
            </div>

            <span>
              ${escapeHtml(character.spec || "-")}
              ·
              ${escapeHtml(character.class || "-")}
            </span>

            <small>
              ${escapeHtml(character.realm || "-")}
            </small>
          </div>
        </div>
      </td>

      <td>
        <span class="mythic-plus-guild">
          ${escapeHtml(character.guild || "-")}
        </span>
      </td>

      <td>
        ${
          character.raiderIoUrl
            ? `
              <a
                class="mythic-plus-score"
                href="${escapeHtml(character.raiderIoUrl)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${formatScore(score)}
              </a>
            `
            : `
              <span class="mythic-plus-score">
                ${formatScore(score)}
              </span>
            `
        }
      </td>
    </tr>
  `;
}

function renderRanking(
  elementId,
  characters
) {
  const tableBody =
    document.getElementById(elementId);

  if (!tableBody) {
    return;
  }

  if (
    !Array.isArray(characters) ||
    characters.length === 0
  ) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="mythic-plus-empty"
        >
          No ranked characters found.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML =
    characters
      .map((character, index) =>
        createCharacterRow(
          character,
          index
        )
      )
      .join("");
}

async function fetchJson(filePath) {
  const separator =
    filePath.includes("?")
      ? "&"
      : "?";

  const response = await fetch(
    `${filePath}${separator}v=${Date.now()}`
  );

  if (!response.ok) {
    throw new Error(
      `Could not load ${filePath}: ` +
      `${response.status}`
    );
  }

  return response.json();
}

async function loadMythicPlusRankings() {
  const loadingMessage =
    document.getElementById(
      "mythicPlusLoading"
    );

  const errorMessage =
    document.getElementById(
      "mythicPlusError"
    );

  const leaderboards =
    document.getElementById(
      "mythicPlusLeaderboards"
    );

  const rankedCharacterCount =
    document.getElementById(
      "rankedCharacterCount"
    );

  try {
    const [
      characters,
      leaderboard
    ] = await Promise.all([
      fetchJson(
        "./data/characters/characters.json"
      ),

      fetchJson(
        "./data/leaderboard.json"
      )
    ]);

    if (!Array.isArray(characters)) {
      throw new Error(
        "characters.json must contain an array"
      );
    }

    if (!Array.isArray(leaderboard)) {
      throw new Error(
        "leaderboard.json must contain an array"
      );
    }

    const greekGuildNames =
      getGreekGuildNames(leaderboard);

    const eligibleCharacters =
      characters.filter(character =>
        isTrackedGreekCharacter(
          character,
          greekGuildNames
        )
      );

    const tanks =
      getRoleCharacters(
        eligibleCharacters,
        "tank"
      );

    const healers =
      getRoleCharacters(
        eligibleCharacters,
        "healer"
      );

    const dps =
      getRoleCharacters(
        eligibleCharacters,
        "dps"
      );

    renderRanking(
      "tankRankingBody",
      tanks
    );

    renderRanking(
      "healerRankingBody",
      healers
    );

    renderRanking(
      "dpsRankingBody",
      dps
    );

    if (rankedCharacterCount) {
      rankedCharacterCount.textContent =
        eligibleCharacters.filter(
          character =>
            getMythicPlusScore(character) > 0
        ).length;
    }

    if (loadingMessage) {
      loadingMessage.hidden = true;
    }

    if (errorMessage) {
      errorMessage.hidden = true;
    }

    if (leaderboards) {
      leaderboards.hidden = false;
    }

    console.log(
      `Mythic+ rankings loaded: ` +
      `${tanks.length} tanks, ` +
      `${healers.length} healers, ` +
      `${dps.length} DPS`
    );
  } catch (error) {
    console.error(
      "Could not load Mythic+ rankings:",
      error
    );

    if (loadingMessage) {
      loadingMessage.hidden = true;
    }

    if (leaderboards) {
      leaderboards.hidden = true;
    }

    if (errorMessage) {
      errorMessage.hidden = false;
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  loadMythicPlusRankings
);
