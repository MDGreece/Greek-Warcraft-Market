const params = new URLSearchParams(window.location.search);
const guildId = params.get("id");

if (!guildId) {
  document.getElementById("guildName").textContent = "Guild Not Found";
} else {
  fetch(`./data/guilds/${guildId}.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Guild file not found");
      }
      return response.json();
    })
    .then(guild => {
      document.getElementById("guildName").textContent = guild.name;

      document.getElementById("rank1Wins").textContent = guild.rank1Wins;
      document.getElementById("rank2Wins").textContent = guild.rank2Wins;
      document.getElementById("rank3Wins").textContent = guild.rank3Wins;

      const logoBox = document.getElementById("guildLogo");

      if (guild.logo) {
        logoBox.innerHTML = `
          <img src="${guild.logo}" alt="${guild.name} logo">
        `;
      }
    })
    .catch(error => {
      document.getElementById("guildName").textContent = "Guild Not Found";
      console.error(error);
    });
}
