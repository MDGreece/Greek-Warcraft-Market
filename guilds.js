function getProgressClass(progress) {
  if (!progress || progress === "-") {
    return "";
  }

  if (progress === "CE") {
    return "progress-ce";
  }

  if (progress.endsWith("M")) {
    return "progress-mythic";
  }

  if (progress.endsWith("H")) {
    return "progress-heroic";
  }

  if (progress.endsWith("N")) {
    return "progress-normal";
  }

  return "";
}

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

        <td class="${getProgressClass(entry.progress)}">
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
