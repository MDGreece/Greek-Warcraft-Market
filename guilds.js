fetch("./data/guilds.json")
  .then(response => response.json())
  .then(guilds => {
    const tableBody = document.getElementById("guildTableBody");

    guilds.forEach(guild => {
      let rankDisplay = guild.rank;

      if (guild.rank === 1) rankDisplay = "🥇";
      if (guild.rank === 2) rankDisplay = "🥈";
      if (guild.rank === 3) rankDisplay = "🥉";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${rankDisplay}</td>
        <td>
          <a class="guild-link" href="guild.html?id=${guild.id}">
            ${guild.name}
          </a>
        </td>
        <td>${guild.worldRank}</td>
        <td>${guild.progress}</td>
      `;

      tableBody.appendChild(row);
    });
  });
