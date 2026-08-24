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


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


fetch("./data/leaderboard.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(
        `Could not load leaderboard: ${response.status}`
      );
    }

    return response.json();
  })

  .then(entries => {

    const tableBody =
      document.getElementById(
        "guildTableBody"
      );

    tableBody.innerHTML = "";


    entries.forEach(entry => {

      const row =
        document.createElement("tr");


      /*
       * Only show an image when the leaderboard
       * actually contains a logo.
       *
       * No fake icon / placeholder is created.
       */
      const logoHtml =
        entry.logo
          ? `
            <img
              class="guild-ranking-logo"
              src="${escapeHtml(entry.logo)}"
              alt="${escapeHtml(entry.name)} logo"
              loading="lazy"
            >
          `
          : "";


      /*
       * Pulls are INFORMATION ONLY.
       *
       * They have absolutely no effect on
       * leaderboard ranking or sorting.
       */
      const pulls =
        entry.pulls !== undefined &&
        entry.pulls !== null
          ? entry.pulls
          : "-";


      row.innerHTML = `

        <td>
          <span class="guild-rank">
            ${escapeHtml(entry.rank)}
          </span>
        </td>


        <td>

          <div class="guild-ranking-name">

            ${logoHtml}

            <a
              class="guild-link"
              href="guild.html?id=${encodeURIComponent(entry.id)}"
            >
              ${escapeHtml(entry.name)}
            </a>

          </div>

        </td>


        <td>

          <span
            class="guild-progress ${getProgressClass(entry.progress)}"
          >
            ${escapeHtml(entry.progress)}
          </span>

        </td>


        <td>

          <span class="guild-boss-progress">
            ${escapeHtml(entry.bossProg)}
          </span>

        </td>


        <td class="guild-pulls">
          ${escapeHtml(pulls)}
        </td>

      `;


      tableBody.appendChild(
        row
      );

    });

  })

  .catch(error => {

    console.error(
      "Could not load leaderboard:",
      error
    );

  });
