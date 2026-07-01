const leaderboardFile = "./data/guildsio.json";

const CURRENT_RAID = "tier-mn-1";

fetch(leaderboardFile)
  .then(response => response.json())
  .then(guilds => {
    const tableBody = document.getElementById("guildTableBody");
    tableBody.innerHTML = "";

    guilds.sort((a, b) => {
      const rankA = a.rankings?.[CURRENT_RAID]?.mythic?.world || 999999;
      const rankB = b.rankings?.[CURRENT_RAID]?.mythic?.world || 999999;
      return rankA - rankB;
    });

    guilds.forEach((guild, index) => {
      const greekRank = index + 1;

      const raid = guild.progress?.[CURRENT_RAID];
      const summary = raid?.summary || "-";

      const mythicKills = raid?.mythic_bosses_killed || 0;
      const totalBosses = raid?.total_bosses || 9;

      const progressText =
        mythicKills === totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;

      const worldRank = guild.rankings?.[CURRENT_RAID]?.mythic?.world || "-";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${greekRank}</td>

        <td>
          <a class="guild-link" href="guild.html?id=${guild.id}">
            ${guild.name}
          </a>
        </td>

        <td class="${progressText === "CE" ? "progress-ce" : "progress-mythic"}">
          ${progressText}
        </td>

        <td>WR ${worldRank}</td>

        <td>-</td>
      `;

      tableBody.appendChild(row);
    });
  })
  .catch(error => {
    console.error("Could not load guildsio.json:", error);
  });
