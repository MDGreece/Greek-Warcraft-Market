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

function getRaidProgressScore(progress) {
  if (!progress || progress === "-") {
    return 0;
  }

  const normalized = String(progress)
    .trim()
    .toUpperCase();

  if (normalized === "CE") {
    return 10000;
  }

  const match = normalized.match(/^(\d+)\/(\d+)([MNH])$/);

  if (!match) {
    return 0;
  }

  const kills = Number(match[1]);
  const difficulty = match[3];

  const baseScore = {
    M: 3000,
    H: 2000,
    N: 1000
  };

  return baseScore[difficulty] + kills;
}

function formatNumber(value) {
  if (typeof value !== "number") {
    return "-";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 1
  });
}

function createLink(url, label, className) {
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
  const tableBody = document.getElementById("charactersTableBody");
  const characterCount = document.getElementById("characterCount");

  tableBody.innerHTML = "";

  characterCount.textContent = state.filteredCharacters.length;

  if (state.filteredCharacters.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="characters-empty">
          No characters found.
        </td>
      </tr>
    `;

    return;
  }

  state.filteredCharacters.forEach(character => {
    const row = document.createElement("tr");

    const classColor = getClassColor(character.class);

    const raiderIoLink = createLink(
      character.raiderIoUrl,
      "Raider.IO",
      "character-link character-link-raiderio"
    );

    const warcraftLogsLink = createLink(
      character.warcraftLogsUrl,
      "Warcraft Logs",
      "character-link character-link-warcraftlogs"
    );

    const links = [raiderIoLink, warcraftLogsLink]
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
                  alt="${escapeHtml(character.name)}"
                >
              `
              : ""
          }

          <div>
            <strong
              class="character-name"
              style="color: ${classColor};"
            >
              ${escapeHtml(character.name)}
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
          ${links || "-"}
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function populateFilters() {
  const guildFilter = document.getElementById("guildFilter");
  const classFilter = document.getElementById("classFilter");

  const guilds = [...new Set(
    state.characters
      .map(character => character.guild)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: "base"
    })
  );

  const classes = [...new Set(
    state.characters
      .map(character => character.class)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: "base"
    })
  );

  guilds.forEach(guild => {
    const option = document.createElement("option");
    option.value = guild;
    option.textContent = guild;
    guildFilter.appendChild(option);
  });

  classes.forEach(className => {
    const option = document.createElement("option");
    option.value = className;
    option.textContent = className;
    classFilter.appendChild(option);
  });
}

function applyFilters() {
  const searchValue = normalizeText(
    document.getElementById("characterSearch").value
  );

  const guildValue = document.getElementById("guildFilter").value;
  const classValue = document.getElementById("classFilter").value;
  const sortValue = document.getElementById("sortCharacters").value;

  state.filteredCharacters = state.characters.filter(character => {
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

    return matchesSearch && matchesGuild && matchesClass;
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
        getRaidProgressScore(b.raidProgress) -
        getRaidProgressScore(a.raidProgress);

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

    return String(a.name).localeCompare(
      String(b.name),
      undefined,
      {
        sensitivity: "base"
      }
    );
  });

  renderCharacters();
}

function attachEvents() {
  document
    .getElementById("characterSearch")
    .addEventListener("input", applyFilters);

  document
    .getElementById("guildFilter")
    .addEventListener("change", applyFilters);

  document
    .getElementById("classFilter")
    .addEventListener("change", applyFilters);

  document
    .getElementById("sortCharacters")
    .addEventListener("change", applyFilters);
}

fetch(`./data/characters/characters.json?v=${Date.now()}`)
  .then(response => {
    if (!response.ok) {
      throw new Error(
        `Could not load characters: ${response.status}`
      );
    }

    return response.json();
  })
  .then(characters => {
    state.characters = Array.isArray(characters)
      ? characters
      : [];

    state.filteredCharacters = [...state.characters];

    populateFilters();
    attachEvents();
    applyFilters();
  })
  .catch(error => {
    console.error(error);

    document.getElementById("charactersTableBody").innerHTML = `
      <tr>
        <td colspan="9" class="characters-error">
          Could not load character data.
        </td>
      </tr>
    `;
  });
