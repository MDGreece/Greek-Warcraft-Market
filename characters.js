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

const state = {
  characters: [],
  filteredCharacters: []
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeClassName(className) {
  return String(className || "")
    .trim()
    .replace(/\s+/g, "");
}

function getClassColor(className) {
  return CLASS_COLORS[normalizeClassName(className)] || "#FFFFFF";
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 1
  });
}

function getRaidProgressScore(progress, achievement) {
  const normalizedProgress = String(progress || "")
    .trim()
    .toUpperCase();

  const normalizedAchievement = String(achievement || "")
    .trim()
    .toUpperCase();

  if (normalizedAchievement === "CE") {
    return 10000;
  }

  const match = normalizedProgress.match(
    /^(\d+)\/(\d+)([MNH])$/
  );

  if (!match) {
    return normalizedAchievement === "AOTC"
      ? 2500
      : 0;
  }

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyBase = {
    M: 3000,
    H: 2000,
    N: 1000
  };

  return difficultyBase[difficulty] + kills;
}

function createExternalLink(url, label, className) {
  if (!url) {
    return "";
  }

  return `
    <a
      class="${className}"
      href="${escapeHtml(url)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function renderCharacters() {
  const tableBody =
    document.getElementById("charactersTableBody");

  const characterCount =
    document.getElementById("characterCount");

  if (!tableBody || !characterCount) {
    console.error(
      "Required character page elements were not found."
    );
    return;
  }

  tableBody.innerHTML = "";
  characterCount.textContent =
    state.filteredCharacters.length;

  if (state.filteredCharacters.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="characters-empty"
        >
          No characters found.
        </td>
      </tr>
    `;

    return;
  }

  for (const character of state.filteredCharacters) {
    const row = document.createElement("tr");

    const classColor =
      getClassColor(character.class);

    const raiderIoLink =
      createExternalLink(
        character.raiderIoUrl,
        "Raider.IO",
        "character-link character-link-raiderio"
      );

    const warcraftLogsLink =
      createExternalLink(
        character.warcraftLogsUrl,
        "Warcraft Logs",
        "character-link character-link-warcraftlogs"
      );

    const linkHtml = [
      raiderIoLink,
      warcraftLogsLink
    ]
      .filter(Boolean)
      .join("");

    row.innerHTML = `
      <td>
        <div class="character-name-cell">
          ${
            character.thumbnailUrl
              ? `
                <img
                  class="character-thumbnail"
                  src="${escapeHtml(character.thumbnailUrl)}"
                  alt="${escapeHtml(character.name || "Character")}"
                >
              `
              : ""
          }

          <div>
            <strong
              class="character-name"
              style="color: ${classColor};"
            >
              ${escapeHtml(character.name || "Unknown")}
            </strong>

            ${
              character.raidGroup &&
              character.raidGroup !== character.guild
                ? `
                  <span class="character-raid-group">
                    ${escapeHtml(character.raidGroup)}
                  </span>
                `
                : ""
            }
          </div>
        </div>
      </td>

      <td>
        <div class="character-class-spec">
          <span>
            ${escapeHtml(character.spec || "-")}
          </span>

          <small>
            ${escapeHtml(character.class || "-")}
          </small>
        </div>
      </td>

      <td>
        ${escapeHtml(character.realm || "-")}
      </td>

      <td>
        ${escapeHtml(character.guild || "-")}
      </td>

      <td>
        ${formatNumber(character.itemLevel)}
      </td>

      <td>
        ${formatNumber(character.mythicPlusScore)}
      </td>

      <td>
        ${escapeHtml(character.raidProgress || "-")}
      </td>

      <td>
        ${escapeHtml(character.achievement || "-")}
      </td>

      <td>
        <div class="character-links">
          ${linkHtml || "-"}
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  }
}

function populateFilters() {
  const guildFilter =
    document.getElementById("guildFilter");

  const classFilter =
    document.getElementById("classFilter");

  if (!guildFilter || !classFilter) {
    return;
  }

  guildFilter.innerHTML = `
    <option value="">
      All guilds
    </option>
  `;

  classFilter.innerHTML = `
    <option value="">
      All classes
    </option>
  `;

  const guilds = [
    ...new Set(
      state.characters
        .map(character => character.guild)
        .filter(Boolean)
    )
  ].sort((a, b) =>
    String(a).localeCompare(
      String(b),
      undefined,
      {
        sensitivity: "base"
      }
    )
  );

  const classes = [
    ...new Set(
      state.characters
        .map(character => character.class)
        .filter(Boolean)
    )
  ].sort((a, b) =>
    String(a).localeCompare(
      String(b),
      undefined,
      {
        sensitivity: "base"
      }
    )
  );

  for (const guild of guilds) {
    const option =
      document.createElement("option");

    option.value = guild;
    option.textContent = guild;

    guildFilter.appendChild(option);
  }

  for (const className of classes) {
    const option =
      document.createElement("option");

    option.value = className;
    option.textContent = className;

    classFilter.appendChild(option);
  }
}

function applyFilters() {
  const searchInput =
    document.getElementById("characterSearch");

  const guildFilter =
    document.getElementById("guildFilter");

  const classFilter =
    document.getElementById("classFilter");

  const sortCharacters =
    document.getElementById("sortCharacters");

  const searchValue =
    normalizeText(searchInput?.value);

  const guildValue =
    guildFilter?.value || "";

  const classValue =
    classFilter?.value || "";

  const sortValue =
    sortCharacters?.value || "alphabetical";

  state.filteredCharacters =
    state.characters.filter(character => {
      const searchableText = [
        character.name,
        character.guild,
        character.raidGroup,
        character.realm,
        character.class,
        character.spec
      ]
        .map(normalizeText)
        .join(" ");

      const matchesSearch =
        !searchValue ||
        searchableText.includes(searchValue);

      const matchesGuild =
        !guildValue ||
        character.guild === guildValue;

      const matchesClass =
        !classValue ||
        character.class === classValue;

      return (
        matchesSearch &&
        matchesGuild &&
        matchesClass
      );
    });

  state.filteredCharacters.sort((a, b) => {
    if (sortValue === "mythic-plus") {
      const scoreDifference =
        (Number(b.mythicPlusScore) || 0) -
        (Number(a.mythicPlusScore) || 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }
    }

    if (sortValue === "raid-progress") {
      const progressDifference =
        getRaidProgressScore(
          b.raidProgress,
          b.achievement
        ) -
        getRaidProgressScore(
          a.raidProgress,
          a.achievement
        );

      if (progressDifference !== 0) {
        return progressDifference;
      }
    }

    if (sortValue === "item-level") {
      const itemLevelDifference =
        (Number(b.itemLevel) || 0) -
        (Number(a.itemLevel) || 0);

      if (itemLevelDifference !== 0) {
        return itemLevelDifference;
      }
    }

    return String(a.name || "").localeCompare(
      String(b.name || ""),
      undefined,
      {
        sensitivity: "base"
      }
    );
  });

  renderCharacters();
}

function attachEvents() {
  const searchInput =
    document.getElementById("characterSearch");

  const guildFilter =
    document.getElementById("guildFilter");

  const classFilter =
    document.getElementById("classFilter");

  const sortCharacters =
    document.getElementById("sortCharacters");

  searchInput?.addEventListener(
    "input",
    applyFilters
  );

  guildFilter?.addEventListener(
    "change",
    applyFilters
  );

  classFilter?.addEventListener(
    "change",
    applyFilters
  );

  sortCharacters?.addEventListener(
    "change",
    applyFilters
  );
}

async function loadCharacters() {
  const tableBody =
    document.getElementById("charactersTableBody");

  try {
    console.log("Loading characters.json...");

    const response = await fetch(
      `./data/characters/characters.json?v=${Date.now()}`
    );

    if (!response.ok) {
      throw new Error(
        `Could not load characters.json: ${response.status}`
      );
    }

    const characters =
      await response.json();

    if (!Array.isArray(characters)) {
      throw new Error(
        "characters.json must contain a JSON array"
      );
    }

    console.log(
      `Loaded ${characters.length} characters`
    );

    state.characters = characters;
    state.filteredCharacters = [
      ...characters
    ];

    populateFilters();
    attachEvents();
    applyFilters();
  } catch (error) {
    console.error(
      "Could not load character data:",
      error
    );

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="9"
            class="characters-error"
          >
            Could not load character data.
          </td>
        </tr>
      `;
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  loadCharacters
);
