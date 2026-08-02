const tableBody =
  document.getElementById(
    "freeAgentsTableBody"
  );

const countElement =
  document.getElementById(
    "freeAgentCount"
  );

const classFilter =
  document.getElementById(
    "classFilter"
  );

const sortSelect =
  document.getElementById(
    "sortFreeAgents"
  );

const searchInput =
  document.querySelector(
    ".search input"
  );

let allFreeAgents = [];

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeClassName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function getClassColor(className) {
  return (
    CLASS_COLORS[
      normalizeClassName(className)
    ] || "#FFFFFF"
  );
}

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toLocaleString(
    undefined,
    {
      maximumFractionDigits: 1
    }
  );
}

function getRaidScore(character) {
  const achievement =
    String(
      character.achievement || ""
    ).toUpperCase();

  if (achievement === "CE") {
    return 10000;
  }

  const progress =
    String(
      character.raidProgress || ""
    )
      .trim()
      .toUpperCase();

  const match = progress.match(
    /^(\d+)\/(\d+)([MNH])$/
  );

  if (!match) {
    return achievement === "AOTC"
      ? 2500
      : 0;
  }

  const kills = Number(match[1]);
  const difficulty = match[3];

  const bases = {
    M: 3000,
    H: 2000,
    N: 1000
  };

  return (
    (bases[difficulty] || 0) +
    kills
  );
}

function populateClassFilter() {
  const classes = [
    ...new Set(
      allFreeAgents
        .map(character =>
          String(
            character.class || ""
          ).trim()
        )
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(
      b,
      undefined,
      {
        sensitivity: "base"
      }
    )
  );

  for (const className of classes) {
    const option =
      document.createElement(
        "option"
      );

    option.value = className;
    option.textContent = className;

    classFilter.appendChild(option);
  }
}

function createLinks(character) {
  const links = [];

  if (character.raiderIoUrl) {
    links.push(`
      <a
        href="${escapeHtml(
          character.raiderIoUrl
        )}"
        target="_blank"
        rel="noopener noreferrer"
        class="character-link raiderio-link"
      >
        Raider.IO
      </a>
    `);
  }

  if (character.warcraftLogsUrl) {
    links.push(`
      <a
        href="${escapeHtml(
          character.warcraftLogsUrl
        )}"
        target="_blank"
        rel="noopener noreferrer"
        class="character-link warcraftlogs-link"
      >
        Warcraft Logs
      </a>
    `);
  }

  return links.length > 0
    ? links.join("")
    : "-";
}

function renderFreeAgents(characters) {
  tableBody.innerHTML = "";

  countElement.textContent =
    characters.length;

  if (characters.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="characters-loading"
        >
          No free agents found
        </td>
      </tr>
    `;

    return;
  }

  for (const character of characters) {
    const row =
      document.createElement("tr");

    const classColor =
      getClassColor(
        character.class
      );

    const thumbnail =
      character.thumbnailUrl
        ? `
          <img
            src="${escapeHtml(
              character.thumbnailUrl
            )}"
            alt=""
            class="character-thumbnail"
          >
        `
        : "";

    row.innerHTML = `
      <td>
        <div class="character-name-cell">
          ${thumbnail}

          <div>
            <strong
              style="color: ${classColor};"
            >
              ${escapeHtml(
                character.name || "-"
              )}
            </strong>

            ${
              character.trackedGuild
                ? `
                  <small>
                    ${escapeHtml(
                      character.trackedGuild
                    )}
                  </small>
                `
                : ""
            }
          </div>
        </div>
      </td>

      <td>
        <strong>
          ${escapeHtml(
            character.spec || "-"
          )}
        </strong>

        <small>
          ${escapeHtml(
            character.class || "-"
          )}
        </small>
      </td>

      <td>
        ${escapeHtml(
          character.realm || "-"
        )}
      </td>

      <td>
        ${escapeHtml(
          character.guild ||
          "Guildless"
        )}
      </td>

      <td>
        ${formatNumber(
          character.itemLevel
        )}
      </td>

      <td>
        ${formatNumber(
          character.mythicPlusScore
        )}
      </td>

      <td>
        ${escapeHtml(
          character.raidProgress ||
          "-"
        )}
      </td>

      <td>
        ${escapeHtml(
          character.achievement ||
          "-"
        )}
      </td>

      <td>
        <div class="character-links">
          ${createLinks(character)}
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  }
}

function updateDisplay() {
  const searchValue =
    String(
      searchInput?.value || ""
    )
      .trim()
      .toLowerCase();

  const selectedClass =
    classFilter?.value || "";

  const sortValue =
    sortSelect?.value ||
    "alphabetical";

  let visibleCharacters =
    allFreeAgents.filter(
      character => {
        const matchesClass =
          !selectedClass ||
          character.class ===
            selectedClass;

        const searchableText = [
          character.name,
          character.realm,
          character.guild,
          character.trackedGuild,
          character.class,
          character.spec
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !searchValue ||
          searchableText.includes(
            searchValue
          );

        return (
          matchesClass &&
          matchesSearch
        );
      }
    );

  visibleCharacters =
    [...visibleCharacters];

  if (sortValue === "mythic-plus") {
    visibleCharacters.sort(
      (a, b) =>
        Number(
          b.mythicPlusScore || 0
        ) -
        Number(
          a.mythicPlusScore || 0
        )
    );
  } else if (
    sortValue === "raid-progress"
  ) {
    visibleCharacters.sort(
      (a, b) =>
        getRaidScore(b) -
        getRaidScore(a)
    );
  } else if (
    sortValue === "item-level"
  ) {
    visibleCharacters.sort(
      (a, b) =>
        Number(b.itemLevel || 0) -
        Number(a.itemLevel || 0)
    );
  } else {
    visibleCharacters.sort(
      (a, b) =>
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

  renderFreeAgents(
    visibleCharacters
  );
}

fetch("./data/free-agents.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(
        `Could not load free agents: ${response.status}`
      );
    }

    return response.json();
  })
  .then(data => {
    if (!Array.isArray(data)) {
      throw new Error(
        "free-agents.json must contain an array"
      );
    }

    allFreeAgents = data;

    populateClassFilter();
    updateDisplay();
  })
  .catch(error => {
    console.error(
      "Free Agents page error:",
      error
    );

    countElement.textContent = "0";

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="characters-loading"
        >
          Could not load free agents
        </td>
      </tr>
    `;
  });

classFilter?.addEventListener(
  "change",
  updateDisplay
);

sortSelect?.addEventListener(
  "change",
  updateDisplay
);

searchInput?.addEventListener(
  "input",
  updateDisplay
);
