const params = new URLSearchParams(window.location.search);
const guildId = params.get("id");

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

function normalizeClassName(className) {
  return String(className || "")
    .trim()
    .replace(/\s+/g, "");
}

function getClassColor(className) {
  return CLASS_COLORS[
    normalizeClassName(className)
  ] || "#FFFFFF";
}

function getProgressClass(progress) {
  const normalizedProgress = String(progress || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  if (
    !normalizedProgress ||
    normalizedProgress === "-"
  ) {
    return "";
  }

  if (
    normalizedProgress === "CE" ||
    normalizedProgress.endsWith("M")
  ) {
    return "progress-mythic";
  }

  if (normalizedProgress.endsWith("H")) {
    return "progress-heroic";
  }

  return "";
}

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
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeRealm(value) {
  return normalizeText(value)
    .replace(/-/g, "");
}

function createCharacterKey(
  name,
  realm
) {
  return (
    normalizeText(name) +
    "|" +
    normalizeRealm(realm)
  );
}

function createExternalLink(
  url,
  label,
  className
) {
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

function normalizeRosterPlayer(player) {
  if (typeof player === "string") {
    return {
      name: player,
      realm: "",
      class: "",
      spec: ""
    };
  }

  return {
    name:
      player?.name ||
      "Unknown Player",

    realm:
      player?.realm ||
      "",

    class:
      player?.class ||
      "",

    spec:
      player?.spec ||
      ""
  };
}

function createCharacterLookup(characters) {
  const lookup = new Map();

  for (const character of characters) {
    const key =
      createCharacterKey(
        character.name,
        character.realm
      );

    lookup.set(
      key,
      character
    );
  }

  return lookup;
}

function findCharacter(
  rosterPlayer,
  characterLookup,
  characters
) {
  const exactKey =
    createCharacterKey(
      rosterPlayer.name,
      rosterPlayer.realm
    );

  const exactMatch =
    characterLookup.get(exactKey);

  if (exactMatch) {
    return exactMatch;
  }

  /*
   * Fallback:
   * try unique name match if realm formatting differs.
   */
  const normalizedName =
    normalizeText(
      rosterPlayer.name
    );

  const matches =
    characters.filter(
      character =>
        normalizeText(character.name) ===
        normalizedName
    );

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

function createRosterPlayerElement(
  player,
  characterLookup,
  characters
) {
  const rosterPlayer =
    normalizeRosterPlayer(player);

  const character =
    findCharacter(
      rosterPlayer,
      characterLookup,
      characters
    );

  /*
   * Prefer characters.json data.
   * Fall back to guild roster JSON.
   */
  const name =
    character?.name ||
    rosterPlayer.name;

  const className =
    character?.class ||
    rosterPlayer.class;

  const spec =
    character?.spec ||
    rosterPlayer.spec;

  const thumbnailUrl =
    character?.thumbnailUrl ||
    "";

  const raiderIoUrl =
    character?.raiderIoUrl ||
    "";

  const warcraftLogsUrl =
    character?.warcraftLogsUrl ||
    "";

  const classColor =
    getClassColor(
      className
    );

  const raiderIoLink =
    createExternalLink(
      raiderIoUrl,
      "Raider.IO",
      "character-link character-link-raiderio"
    );

  const warcraftLogsLink =
    createExternalLink(
      warcraftLogsUrl,
      "Warcraft Logs",
      "character-link character-link-warcraftlogs"
    );

  const links =
    [
      raiderIoLink,
      warcraftLogsLink
    ]
      .filter(Boolean)
      .join("");

  const listItem =
    document.createElement("li");

  listItem.className =
    "guild-roster-character";

  listItem.innerHTML = `
    <div class="guild-roster-character-row">

      <div class="character-name-cell">

        ${
          thumbnailUrl
            ? `
              <img
                class="character-thumbnail"
                src="${escapeHtml(thumbnailUrl)}"
                alt="${escapeHtml(name)}"
                loading="lazy"
              >
            `
            : `
              <div
                class="character-thumbnail character-thumbnail-placeholder"
              ></div>
            `
        }

        <strong
          class="character-name"
          style="color: ${classColor};"
        >
          ${escapeHtml(name)}
        </strong>

      </div>

      <div class="character-class-spec">

        <span>
          ${escapeHtml(spec || "-")}
        </span>

        <small>
          ${escapeHtml(className || "-")}
        </small>

      </div>

      <div class="character-links">
        ${
          links ||
          `<span class="roster-no-links">-</span>`
        }
      </div>

    </div>
  `;

  return listItem;
}

function renderRosterList(
  elementId,
  players,
  characterLookup,
  characters
) {
  const rosterList =
    document.getElementById(
      elementId
    );

  if (!rosterList) {
    return;
  }

  rosterList.innerHTML = "";

  if (
    !Array.isArray(players) ||
    players.length === 0
  ) {
    const emptyItem =
      document.createElement("li");

    emptyItem.className =
      "roster-empty";

    emptyItem.textContent =
      "No active players found";

    rosterList.appendChild(
      emptyItem
    );

    return;
  }

  players.forEach(player => {
    rosterList.appendChild(
      createRosterPlayerElement(
        player,
        characterLookup,
        characters
      )
    );
  });
}

function renderRoster(
  roster,
  characters
) {
  const safeRoster =
    roster || {};

  const safeCharacters =
    Array.isArray(characters)
      ? characters
      : [];

  const characterLookup =
    createCharacterLookup(
      safeCharacters
    );

  renderRosterList(
    "tankRoster",
    safeRoster.tanks || [],
    characterLookup,
    safeCharacters
  );

  renderRosterList(
    "healerRoster",
    safeRoster.healers || [],
    characterLookup,
    safeCharacters
  );

  renderRosterList(
    "dpsRoster",
    safeRoster.dps || [],
    characterLookup,
    safeCharacters
  );
}

function showGuildNotFound() {
  const guildName =
    document.getElementById(
      "guildName"
    );

  const breadcrumb =
    document.getElementById(
      "guildNameBreadcrumb"
    );

  if (guildName) {
    guildName.textContent =
      "Guild Not Found";
  }

  if (breadcrumb) {
    breadcrumb.textContent =
      "Guild Not Found";
  }

  renderRoster(
    {
      tanks: [],
      healers: [],
      dps: []
    },
    []
  );
}

if (!guildId) {

  showGuildNotFound();

} else {

  Promise.all([

    fetch(
      `./data/guilds/${guildId}.json?v=${Date.now()}`
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(
            "Guild JSON not found"
          );
        }

        return response.json();
      }),

    fetch(
      `./data/raid-tiers.json?v=${Date.now()}`
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(
            "Raid tiers JSON not found"
          );
        }

        return response.json();
      }),

    /*
     * Same character database used
     * by the Characters page.
     */
    fetch(
      `./data/characters/characters.json?v=${Date.now()}`
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(
            "characters.json not found"
          );
        }

        return response.json();
      })

  ])
    .then(
      ([
        guild,
        raidTiers,
        characters
      ]) => {

        document.getElementById(
          "guildName"
        ).textContent =
          guild.name;

        document.getElementById(
          "guildNameBreadcrumb"
        ).textContent =
          guild.name;

        document.getElementById(
          "rank1Wins"
        ).textContent =
          guild.rank1Wins ?? 0;

        document.getElementById(
          "rank2Wins"
        ).textContent =
          guild.rank2Wins ?? 0;

        document.getElementById(
          "rank3Wins"
        ).textContent =
          guild.rank3Wins ?? 0;

        document.getElementById(
          "guildEstablished"
        ).textContent =
          guild.established ||
          "Date placeholder";

        document.getElementById(
          "weeklySchedule"
        ).textContent =
          guild.weeklySchedule ||
          "Days placeholder";

        document.getElementById(
          "RaidTimes"
        ).textContent =
          guild.RaidTimes ||
          "Time placeholder";

        const logoBox =
          document.getElementById(
            "guildLogo"
          );

        if (
          guild.logo &&
          logoBox
        ) {
          logoBox.innerHTML = `
            <img
              src="${escapeHtml(guild.logo)}"
              alt="${escapeHtml(guild.name)} logo"
            >
          `;
        }

        const expansionGrid =
          document.getElementById(
            "expansionGrid"
          );

        if (expansionGrid) {
          expansionGrid.innerHTML = "";

          raidTiers.forEach(
            expansion => {

              const card =
                document.createElement(
                  "div"
                );

              card.className =
                "expansion-card";

              let tierRows = "";

              expansion.tiers.forEach(
                tier => {

                  const tierRank =
                    guild.tierRanks &&
                    guild.tierRanks[tier]
                      ? guild.tierRanks[tier]
                      : {
                          progress: "-",
                          WR: "-",
                          GR: "-"
                        };

                  const progress =
                    tierRank.progress ||
                    "-";

                  tierRows += `
                    <div class="raid-history-row">

                      <span class="raid-history-name">
                        ${escapeHtml(tier)}
                      </span>

                      <span
                        class="raid-history-progress ${getProgressClass(progress)}"
                      >
                        ${escapeHtml(progress)}
                      </span>

                      <span class="raid-history-rank">
                        ${escapeHtml(tierRank.WR)}
                      </span>

                      <span class="raid-history-rank">
                        ${escapeHtml(tierRank.GR)}
                      </span>

                    </div>
                  `;
                }
              );

              card.innerHTML = `
                <h3>
                  ${escapeHtml(expansion.title)}
                </h3>

                <div class="raid-history-table">

                  <div class="raid-history-header">
                    <span>Raid</span>
                    <span>Progress</span>
                    <span>WR</span>
                    <span>GR</span>
                  </div>

                  ${tierRows}

                </div>
              `;

              expansionGrid.appendChild(
                card
              );
            }
          );
        }

        /*
         * Roster now receives the same
         * characters.json data used by
         * the Characters page.
         */
        renderRoster(
          guild.roster,
          characters
        );
      }
    )
    .catch(error => {

      console.error(
        "Could not load guild profile:",
        error
      );

      showGuildNotFound();

    });
}
