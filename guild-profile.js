const params = new URLSearchParams(window.location.search);
const guildId = params.get("id");

if (!guildId) {
  document.getElementById("guildName").textContent = "Guild Not Found";
  document.getElementById("guildNameBreadcrumb").textContent = "Guild Not Found";
} else {
  Promise.all([
    fetch(`./data/guilds/${guildId}.json`).then(response => {
      if (!response.ok) throw new Error("Guild JSON not found");
      return response.json();
    }),
    fetch("./data/raid-tiers.json").then(response => {
      if (!response.ok) throw new Error("Raid tiers JSON not found");
      return response.json();
    })
  ])
    .then(([guild, raidTiers]) => {
      document.getElementById("guildName").textContent = guild.name;
      document.getElementById("guildNameBreadcrumb").textContent = guild.name;

      document.getElementById("rank1Wins").textContent = guild.rank1Wins ?? 0;
      document.getElementById("rank2Wins").textContent = guild.rank2Wins ?? 0;
      document.getElementById("rank3Wins").textContent = guild.rank3Wins ?? 0;

      document.getElementById("guildEstablished").textContent = guild.established || "Date placeholder";
      document.getElementById("weeklySchedule").textContent = guild.weeklySchedule || "Days placeholder";
      document.getElementById("RaidTimes").textContent = guild.RaidTimes || "Time placeholder";

      const logoBox = document.getElementById("guildLogo");
      if (guild.logo) {
        logoBox.innerHTML = `<img src="${guild.logo}" alt="${guild.name} logo">`;
      }

      const expansionGrid = document.getElementById("expansionGrid");
      expansionGrid.innerHTML = "";

      raidTiers.forEach(expansion => {
        const card = document.createElement("div");
        card.className = "expansion-card";

        let tierRows = "";

        expansion.tiers.forEach(tier => {
          const tierRank = guild.tierRanks && guild.tierRanks[tier]
            ? guild.tierRanks[tier]
            : { WR: "-", GR: "-" };

          tierRows += `
            <div class="raid-tier">
              <span class="raid-name">${tier}</span>
              <span class="raid-rank">WR: ${tierRank.WR}</span>
              <span class="raid-rank">GR: ${tierRank.GR}</span>
            </div>
          `;
        });

        card.innerHTML = `
          <h3>${expansion.title}</h3>
          ${tierRows}
        `;

        expansionGrid.appendChild(card);
      });
    })
    .catch(error => {
      console.error(error);
      document.getElementById("guildName").textContent = "Guild Not Found";
      document.getElementById("guildNameBreadcrumb").textContent = "Guild Not Found";
    });
}
