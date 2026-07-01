const leaderboardFile = "./data/guildsio.json";

fetch(leaderboardFile)
  .then(response => response.json())
  .then(guilds => {
    const tableBody = document.getElementById("guildTableBody");
    tableBody.innerHTML = "";

    const currentRaid = "tier-mn-1";

    guilds.sort((a, b) => {
      const rankA = a.rankings?.[currentRaid]?.mythic?.world || 999999;
      const rankB = b.rankings?.[currentRaid]?.mythic?.world || 999999;
      return rankA - rankB;
    });

    guilds.forEach((guild, index) => {
      const greekRank = index + 1;

      let rankDisplay = greekRank;
      if (greekRank === 1) rankDisplay = "🥇";
      if (greekRank === 2) rankDisplay = "🥈";
      if (greekRank === 3) rankDisplay = "🥉";

      const worldRank = guild.rankings?.[currentRaid]?.mythic?.world || "-";

      const mainProgress = guild.progress?.["tier-mn-1"]?.summary || "-";
      const miniProgress = guild.progress?.["sporefall"]?.summary || "-";
      const lastProgress = guild.progress?.["the-venomous-abyss"]?.summary || "-";

      const progress = `${mainProgress} • ${miniProgress} • ${lastProgress}`;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${rankDisplay}</td>
        <td>
          <a class="guild-link" href="guild.html?id=${guild.id}">
            ${guild.name}
          </a>
        </td>
        <td>${worldRank}</td>
        <td>${progress}</td>
      `;

      tableBody.appendChild(row);
    });
  })
  .catch(error => {
    console.error("Could not load guildsio.json:", error);
  });
