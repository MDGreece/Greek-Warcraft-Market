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

function getClassColor(className) {
  const normalizedClass = String(className || "")
    .trim()
    .replace(/\s+/g, "");

  return CLASS_COLORS[normalizedClass] || "#FFFFFF";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeRosterPlayer(player) {
  if (typeof player === "string") {
    return {
      name: player,
      realm: "",
      class: "",
      spec: "",
      reports: null
    };
  }

  return {
    name: player?.name || "Unknown Player",
    realm: player?.realm || "",
    class: player?.class || "",
    spec: player?.spec || "",
    reports:
      typeof player?.reports === "number"
        ? player.reports
        : null
  };
}

function createRosterPlayerElement(player) {
  const normalizedPlayer = normalizeRosterPlayer(player);
  const listItem = document.createElement("li");

  listItem.className = "roster-player";

  const classColor = getClassColor(normalizedPlayer.class);
  const details = [];

  if (normalizedPlayer.spec) {
    details.push(normalizedPlayer.spec);
  }

  if (normalizedPlayer.class) {
    details.push(normalizedPlayer.class);
  }

  if (normalizedPlayer.realm) {
    details.push(normalizedPlayer.realm);
  }

  const detailText = details.join(" · ");

  const reportText =
    normalizedPlayer.reports !== null
      ? `${normalizedPlayer.reports} report${
          normalizedPlayer.reports === 1 ? "" : "s"
        }`
      : "";

  listItem.innerHTML = `
    <div class="roster-player-main">
      <span
        class="roster-player-name"
        style="color: ${classColor};"
      >
        ${escapeHtml(normalizedPlayer.name)}
      </span>

      ${
        detailText
          ? `
            <span class="roster-player-details">
              ${escapeHtml(detailText)}
            </span>
          `
          : ""
      }
    </div>

    ${
      reportText
        ? `
          <span class="roster-player-reports">
            ${escapeHtml(reportText)}
          </span>
        `
        : ""
    }
  `;

  return listItem;
}

function renderRosterList(elementId, players) {
  const rosterList = document.getElementById(elementId);

  if (!rosterList) {
    return;
  }

  rosterList.innerHTML = "";

  if (!Array.isArray(players) || players.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "roster-empty";
    emptyItem.textContent = "No active players found";

    rosterList.appendChild(emptyItem);
    return;
  }

  players.forEach(player => {
    rosterList.appendChild(
      createRosterPlayerElement(player)
    );
  });
}

function renderRoster(roster) {
  const safeRoster = roster || {};

  renderRosterList(
    "tankRoster",
    safeRoster.tanks || []
  );

  renderRosterList(
    "healerRoster",
    safeRoster.healers || []
  );

  renderRosterList(
    "dpsRoster",
    safeRoster.dps || []
  );
}

function showGuildNotFound() {
  const guildName =
    document.getElementById("guildName");

  const breadcrumb =
    document.getElementById(
      "guildNameBreadcrumb"
    );

  if (guildName) {
    guildName.textContent = "Guild Not Found";
  }

  if (breadcrumb) {
    breadcrumb.textContent = "Guild Not Found";
  }

  renderRoster({
    tanks: [],
    healers: [],
    dps: []
  });
}

if (!guildId) {
  showGuildNotFound();
} else {
  Promise.all([
    fetch(`./data/guilds/${guildId}.json`).then(
      response => {
        if (!response.ok) {
          throw new Error("Guild JSON not found");
        }

        return response.json();
      }
    ),

    fetch("./data/raid-tiers.json").then(
      response => {
        if (!response.ok) {
          throw new Error(
            "Raid tiers JSON not found"
          );
        }

        return response.json();
      }
    )
  ])
    .then(([guild, raidTiers]) => {
      document.getElementById(
        "guildName"
      ).textContent = guild.name;

      document.getElementById(
        "guildNameBreadcrumb"
      ).textContent = guild.name;

      document.getElementById(
        "rank1Wins"
      ).textContent = guild.rank1Wins ?? 0;

      document.getElementById(
        "rank2Wins"
      ).textContent = guild.rank2Wins ?? 0;

      document.getElementById(
        "rank3Wins"
      ).textContent = guild.rank3Wins ?? 0;

      document.getElementById(
        "guildEstablished"
      ).textContent =
        guild.established || "Date placeholder";

      document.getElementById(
        "weeklySchedule"
      ).textContent =
        guild.weeklySchedule || "Days placeholder";

      document.getElementById(
        "RaidTimes"
      ).textContent =
        guild.RaidTimes || "Time placeholder";

      const logoBox =
        document.getElementById("guildLogo");

      if (guild.logo && logoBox) {
        logoBox.innerHTML = `
          <img
            src="${escapeHtml(guild.logo)}"
            alt="${escapeHtml(guild.name)} logo"
          >
        `;
      }

      const expansionGrid =
        document.getElementById("expansionGrid");

      if (expansionGrid) {
        expansionGrid.innerHTML = "";

        raidTiers.forEach(expansion => {
          const card =
            document.createElement("div");

          card.className = "expansion-card";

          let tierRows = "";

          expansion.tiers.forEach(tier => {
            const tierRank =
  guild.tierRanks && guild.tierRanks[tier]
    ? guild.tierRanks[tier]
    : {
        progress: "-",
        WR: "-",
        GR: "-"
      };

const progress = tierRank.progress || "-";

let progressClass = "";

if (progress.endsWith("M")) {
  progressClass = "progress-mythic";
} else if (progress.endsWith("H")) {
  progressClass = "progress-heroic";
}

tierRows += `
<div class="raid-tier">

    <span class="raid-name">
        ${tier}
    </span>

    <span class="raid-progress ${getProgressClass(tierRank.progress)}">
        ${tierRank.progress}
    </span>

    <span class="raid-rank">
        WR: ${tierRank.WR}
    </span>

    <span class="raid-rank">
        GR: ${tierRank.GR}
    </span>

</div>
`;
          });

          card.innerHTML = `
            <h3>${escapeHtml(expansion.title)}</h3>
            ${tierRows}
          `;

          expansionGrid.appendChild(card);
        });
      }

      renderRoster(guild.roster);
    })
    .catch(error => {
      console.error(
        "Could not load guild profile:",
        error
      );

      showGuildNotFound();
    });
}
