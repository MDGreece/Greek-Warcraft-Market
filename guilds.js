fetch("./data/leaderboard.json")
  .then(response => response.json())
  .then(entries => {
    const tableBody = document.getElementById("guildTableBody");
    tableBody.innerHTML = "";

    entries.forEach(entry => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${entry.rank}</td>

        <td>
          <a class="guild-link" href="guild.html?id=${entry.id}">
            ${entry.name}
          </a>
        </td>

        <td class="${entry.progress === "CE" ? "progress-ce" : "progress-mythic"}">
          ${entry.progress}
        </td>

        <td>${entry.bossProg}</td>

        <td>${entry.totalPulls}</td>
      `;

      tableBody.appendChild(row);
    });
  })
  .catch(error => {
    console.error("Could not load leaderboard:", error);
  });
