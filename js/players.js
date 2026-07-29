const PLAYERS_URL = "./data/players/players.json";
const CHARACTERS_URL = "./data/players/characters.json";

let allPlayers = [];
let allCharacters = [];

document.addEventListener("DOMContentLoaded", initializePlayersPage);

async function initializePlayersPage() {
  try {
    const [playersResponse, charactersResponse] = await Promise.all([
      fetch(PLAYERS_URL),
      fetch(CHARACTERS_URL)
    ]);

    if (!playersResponse.ok) {
      throw new Error(
        `Could not load players.json: ${playersResponse.status}`
      );
    }

    if (!charactersResponse.ok) {
      throw new Error(
        `Could not load characters.json: ${charactersResponse.status}`
      );
    }

    allPlayers = await playersResponse.json();
    allCharacters = await charactersResponse.json();

    updateSummary();
    setupFilters();
    applyFilters();
  } catch (error) {
    console.error("Players page error:", error);
    showLoadError();
  }
}

function setupFilters() {
  const playerSearch = document.getElementById("player-search");
  const roleFilter = document.getElementById("role-filter");
  const recruitmentFilter = document.getElementById(
    "recruitment-filter"
  );

  if (playerSearch) {
    playerSearch.addEventListener("input", applyFilters);
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", applyFilters);
  }

  if (recruitmentFilter) {
    recruitmentFilter.addEventListener("change", applyFilters);
  }
}

function applyFilters() {
  const searchValue = document
    .getElementById("player-search")
    ?.value
    .trim()
    .toLowerCase() || "";

  const selectedRole =
    document.getElementById("role-filter")?.value || "";

  const selectedRecruitmentStatus =
    document.getElementById("recruitment-filter")?.value || "";

  const filteredPlayers = allPlayers.filter((player) => {
    const playerCharacters = getPlayerCharacters(player.id);

    const searchableValues = [
      player.displayName,
      player.bio,
      player.recruitmentStatus,
      ...(player.roles || []),
      ...(player.languages || []),
      ...playerCharacters.flatMap((character) => [
        character.name,
        character.slug,
        character.realm,
        character.class,
        character.activeSpec,
        character.role,
        character.guild?.name
      ])
    ];

    const searchableText = searchableValues
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchValue || searchableText.includes(searchValue);

    const matchesRole =
      !selectedRole ||
      (player.roles || []).includes(selectedRole);

    const matchesRecruitmentStatus =
      !selectedRecruitmentStatus ||
      player.recruitmentStatus === selectedRecruitmentStatus;

    return (
      matchesSearch &&
      matchesRole &&
      matchesRecruitmentStatus
    );
  });

  renderPlayers(filteredPlayers);
}

function renderPlayers(players) {
  const tableBody = document.getElementById("players-table-body");
  const resultCount = document.getElementById(
    "players-result-count"
  );

  if (!tableBody) {
    return;
  }

  if (resultCount) {
    resultCount.textContent = `${players.length} ${
      players.length === 1 ? "player" : "players"
    } found`;
  }

  if (players.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="players-message">
          No players matched your search.
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = players
    .map((player) => createPlayerRow(player))
    .join("");
}

function createPlayerRow(player) {
  const playerCharacters = getPlayerCharacters(player.id);

  const mainCharacter =
    allCharacters.find(
      (character) => character.id === player.mainCharacterId
    ) ||
    playerCharacters.find((character) => character.isMain) ||
    playerCharacters[0] ||
    null;

  const playerProfileUrl =
    `player.html?id=${encodeURIComponent(player.id)}`;

  const mainCharacterUrl = mainCharacter
    ? `character.html?id=${encodeURIComponent(mainCharacter.id)}`
    : null;

  const playerName = escapeHtml(
    player.displayName || "Unknown Player"
  );

  const mainCharacterName = mainCharacter
    ? escapeHtml(mainCharacter.name)
    : "—";

  const mainCharacterClass = mainCharacter?.class
    ? escapeHtml(mainCharacter.class)
    : "Unknown class";

  const realm = mainCharacter?.realm
    ? escapeHtml(mainCharacter.realm)
    : "—";

  const guildName = mainCharacter?.guild?.name
    ? escapeHtml(mainCharacter.guild.name)
    : "No guild";

  const roles = Array.isArray(player.roles)
    ? player.roles
    : [];

  const roleBadges =
    roles.length > 0
      ? roles
          .map(
            (role) => `
              <span class="player-role-badge">
                ${escapeHtml(role)}
              </span>
            `
          )
          .join("")
      : `<span class="secondary-text">Unknown</span>`;

  const recruitmentStatus = formatRecruitmentStatus(
    player.recruitmentStatus
  );

  const recruitmentClass = getRecruitmentClass(
    player.recruitmentStatus
  );

  return `
    <tr>
      <td>
        <a
          href="${playerProfileUrl}"
          class="player-name-link"
        >
          ${playerName}
        </a>
      </td>

      <td>
        ${
          mainCharacterUrl
            ? `
              <a
                href="${mainCharacterUrl}"
                class="main-character-link"
              >
                <span class="main-character-name">
                  ${mainCharacterName}
                </span>

                <span class="main-character-class">
                  ${mainCharacterClass}
                </span>
              </a>
            `
            : "—"
        }
      </td>

      <td>${realm}</td>

      <td>${guildName}</td>

      <td>
        <div class="player-role-list">
          ${roleBadges}
        </div>
      </td>

      <td>
        <span class="character-count">
          ${playerCharacters.length}
        </span>
      </td>

      <td>
        <span class="recruitment-badge ${recruitmentClass}">
          ${recruitmentStatus}
        </span>
      </td>
    </tr>
  `;
}

function getPlayerCharacters(playerId) {
  return allCharacters.filter(
    (character) => character.playerId === playerId
  );
}

function updateSummary() {
  const playersCount = document.getElementById("players-count");
  const charactersCount = document.getElementById(
    "characters-count"
  );

  if (playersCount) {
    playersCount.textContent = String(allPlayers.length);
  }

  if (charactersCount) {
    charactersCount.textContent = String(allCharacters.length);
  }
}

function formatRecruitmentStatus(status) {
  const labels = {
    "looking-for-guild": "Looking for guild",
    "open-to-offers": "Open to offers",
    "looking-for-mythic-plus": "Looking for Mythic+ team",
    "not-looking": "Not looking",
    unknown: "Unknown"
  };

  return labels[status] || labels.unknown;
}

function getRecruitmentClass(status) {
  const classes = {
    "looking-for-guild": "status-looking",
    "open-to-offers": "status-open",
    "looking-for-mythic-plus": "status-mythic-plus",
    "not-looking": "status-closed",
    unknown: "status-unknown"
  };

  return classes[status] || classes.unknown;
}

function showLoadError() {
  const tableBody = document.getElementById("players-table-body");
  const resultCount = document.getElementById(
    "players-result-count"
  );

  if (resultCount) {
    resultCount.textContent = "Players could not be loaded";
  }

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="players-message players-error">
          The player data could not be loaded. Check the browser
          console and confirm that the JSON file paths are correct.
        </td>
      </tr>
    `;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
