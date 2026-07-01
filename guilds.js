const raiderFile = "./data/guildsio.json";
const logsFile = "./data/warcraftlogs-groups.json";

const CURRENT_RAID = "tier-mn-1";

Promise.all([
  fetch(raiderFile).then(response => response.json()),
  fetch(logsFile).then(response => response.json())
])
  .then(([guilds, logGroups]) => {
    const tableBody = document.getElementById("guildTableBody");
    tableBody.innerHTML = "";

    const raiderRows = guilds.map(guild => {
      const raid = guild.progress?.[CURRENT_RAID];

      const mythicKills = raid?.mythic_bosses_killed || 0;
      const totalBosses = raid?.total_bosses || 9;

      const progressText =
        mythicKills === totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;

      const worldRank =
        guild.rankings?.[CURRENT_RAID]?.mythic?.world || 999999;

      return {
        id: guild.id,
        name: guild.name,
        progress: progressText,
        worldRank: worldRank,
        totalPulls: "-"
      };
    });

    const groupRows = logGroups.map(group => {
      return {
        id: group.id,
        name: group.name,
        progress: group.progress || "-",
        worldRank: group.worldRank || 999999,
        totalPulls: group.totalPulls || 0
      };
    });

    const allRows = [...raiderRows, ...groupRows];

    allRows.sort((a, b) => a.worldRank - b.worldRank);

    allRows.forEach((entry, index) => {
      const greekRank = index + 1;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${greekRank}</td>

        <td>
          <a class="guild-link" href="guild.html?id=${entry.id}">
            ${entry.name}
          </a>
        </td>

        <td class="${entry.progress === "CE" ? "progress-ce" : "progress-mythic"}">
          ${entry.progress}
        </td>

        <td>${entry.worldRank === 999999 ? "-" : "WR " + entry.worldRank}</td>

        <td>${entry.totalPulls}</td>
      `;

      tableBody.appendChild(row);
    });
  })
  .catch(error => {
    console.error("Could not load leaderboard data:", error);
  });
