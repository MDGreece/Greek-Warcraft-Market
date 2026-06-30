


Generated image: GitHub教程: Greek Warcraft Market

Edit


 is it supposed to look like this?

I want to change their color and make it more like buttons

Generated image: Dunkler Fantasy-Portal der griechischen Community


Edit


Generated image: Griechisches Warcraft Community Hub Design


Edit



Generated image: Dunkle Fantasy-Website für die griechische Community


Edit


the logo could be bigger

there is too much empty space on top and on the bottom of the header, i want it reduced

Generated image: Dunkles Fantasy-Guild-Dashboard Design


Edit


the awards broke, are uneven and vertical, pls fix

50e5ba81-ee9b-44f4-9baa-7731f16730a4.png
the logos are still uneven

Generated image: Tod und Ruhm: Teamprofil Übersicht


Edit


Generated image: Rangliste und Clan-Übersicht


Edit


Generated image: Medallien in Gold, Silber, Bronze


Edit


Generated image: Griechische Rangabzeichen in Metallic-Optik

Edit


How can i use this when i need a separate png for every award?

Generated image: Griechische Rangabzeichen in drei Varianten

Edit


I cant use what you are doing, give me the temporary solution

For now, don't spend more time trying to generate perfect logos. Here's a much easier temporary solution that professional web developers often use while building a site.

Option 1 (Recommended) – Use the original logos you already have
Since you already have:

rank1.png

rank2.png

rank3.png

Just make them the same size in CSS.

.award-card {
    width: 180px;
    text-align: center;
}

.award-card img {
    width: 120px;
    height: 120px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
}
This will make them appear much more uniform even if the artwork isn't identical.

Option 2 (Even Better for Now)
Forget the logos temporarily.

Use beautiful circles with the numbers.

<div class="award-card">
    <div class="award-badge gold">1</div>
    <div class="award-count">x0</div>
</div>

<div class="award-card">
    <div class="award-badge silver">2</div>
    <div class="award-count">x0</div>
</div>

<div class="award-card">
    <div class="award-badge bronze">3</div>
    <div class="award-count">x0</div>
</div>
CSS:

.award-badge{
    width:110px;
    height:110px;

    border-radius:50%;

    display:flex;
    justify-content:center;
    align-items:center;

    font-size:52px;
    font-weight:bold;

    margin:auto;
}

.gold{
    background:#d4af37;
    color:#07111f;
}

.silver{
    background:#b9bcc2;
    color:#07111f;
}

.bronze{
    background:#b87333;
    color:white;
}
This actually looks very clean and fits your site's style.

What I recommend
Don't waste time on the award icons right now.

You're building the functionality first:

✅ Guild pages

✅ Players

✅ Free agents

✅ News

✅ Raid Groups

✅ MDG Teams

✅ Transfers

Once the site is working, we can design a complete icon pack in one go:

Greek Rank 1

Greek Rank 2

Greek Rank 3

Hall of Fame

MDG Champion

Raider

Mythic+

PvP

Recruit

Free Agent

Veteran

Founder

All with the same style, same dimensions, and transparent PNGs or SVGs. That will give the entire site a consistent, polished look instead of mixing placeholder graphics.


Ok, I need the award logos bigger


not images. code

Just increase the image dimensions in your CSS.

Replace your awards CSS with this:

/* ========================= */
/* Guild Awards */
/* ========================= */

.guild-awards {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 80px;

    width: 100%;
    margin: 40px auto 50px;
}

.award-card {
    width: 220px;

    display: flex;
    flex-direction: column;
    align-items: center;
}

.award-card img {
    width: 180px;      /* Increase this */
    height: 180px;     /* Increase this */

    object-fit: contain;
    display: block;
}

.award-count {
    margin-top: 12px;

    font-size: 42px;
    font-weight: bold;

    color: #f0b90b;
    text-align: center;
}
Want them even larger?
Try:

.award-card img {
    width: 220px;
    height: 220px;
}
or even:

.award-card img {
    width: 250px;
    height: 250px;
}
If the size doesn't change...
Then the images themselves probably have a lot of transparent padding around them. That's common with PNGs: the actual artwork is small inside a large transparent canvas.

You can check by opening one of the PNGs in your browser. If you see lots of empty transparent space around the badge, that's the cause.

In that case, you'll need to crop the transparent borders from the PNGs. Once cropped, the same CSS will make them appear much larger without increasing the displayed dimensions.


they dont change at all

If they don't change at all, then the CSS is not the problem.

There are only three possible causes:

1. Another CSS rule is overriding it (most likely)
Press Ctrl + Shift + F in VS Code (or use GitHub's search) and search for:

.award-card img
or

img {
If you have another rule like:

img {
    width: 80px;
}
or

.guild-awards img {
    width: 90px;
}
it may be overriding your new rule.

2. The images have a huge transparent border
Open one of these files:

rank1.png
rank2.png
rank3.png
If the badge looks tiny inside a large transparent square, then increasing the CSS size won't make the visible badge much bigger—it just scales the whole transparent canvas.

3. Your HTML isn't using <img>
Please paste this section from your guild.html:

<section class="guild-awards">
through to

</section>
I think I know the issue
Since we've edited this page many times, there may be multiple .guild-awards or .award-card rules in style.css.

Can you paste:

Your entire guild-awards HTML (the awards section from guild.html).

Every CSS rule that mentions:

.guild-awards

.award-card

.award-count

.award-card img

I can tell you exactly which rule is taking precedence and give you the minimal fix.


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Guild Profile - Greek Warcraft Market</title>
  <link rel="stylesheet" href="style.css">
</head>

<body>

<header>
  <!-- You can copy your full header from index.html here later -->
</header>
<div class="breadcrumb">
    <a href="index.html">Home</a>
    <span>›</span>
    <a href="guilds.html">Guilds</a>
    <span>›</span>
    <span id="guildNameBreadcrumb">Loading...</span>
</div>
<main class="guild-profile-page">

  <section class="guild-profile-top">
    <h1 id="guildName">Loading guild...</h1>

    <div class="guild-logo-placeholder" id="guildLogo">
      <div class="placeholder-icon">🛡️</div>
      <p>Logo Placeholder</p>
    </div>

    <div class="guild-awards">
      <div class="award-card">
        <img src="./assets/medals/rank1.png" alt="Rank 1">
        <div class="award-count">x<span id="rank1Wins">0</span></div>
      </div>

      <div class="award-card">
        <img src="./assets/medals/rank2.png" alt="Rank 2">
        <div class="award-count">x<span id="rank2Wins">0</span></div>
      </div>

      <div class="award-card">
        <img src="./assets/medals/rank3.png" alt="Rank 3">
        <div class="award-count">x<span id="rank3Wins">0</span></div>
      </div>
    </div>
  </section>

  <section class="guild-info-grid">
    <div class="info-card">
      <h3>Est.</h3>
      <p id="guildEstablished">Date placeholder</p>
    </div>

    <div class="info-card">
      <h3>Weekly Schedule</h3>
      <p id="weeklySchedule">Days placeholder</p>
    </div>

    <div class="info-card">
      <h3>Raid Times</h3>
      <p id="RaidTimes">Time placeholder</p>
    </div>
  </section>

  <section class="expansions-section">
    <h2>Raid History</h2>

    <div class="expansion-grid" id="expansionGrid">
      <!-- Expansion boxes will load here -->
    </div>
  </section>

  <section class="guild-box">
    <h2>Roster</h2>

    <div class="roster-grid">
      <div class="roster-column">
        <h3>Tanks</h3>
        <ul id="tankRoster"></ul>
      </div>

      <div class="roster-column">
        <h3>Healers</h3>
        <ul id="healerRoster"></ul>
      </div>

      <div class="roster-column">
        <h3>DPS</h3>
        <ul id="dpsRoster"></ul>
      </div>
    </div>
  </section>

</main>
<script src="guild-profile.js"></script>

</body>
</html>

Your HTML is correct. So the issue is definitely CSS.

Add this at the very bottom of style.css so it overrides everything before it:

.guild-profile-top .guild-awards {
  display: flex !important;
  justify-content: center !important;
  align-items: flex-start !important;
  gap: 90px !important;
  margin: 40px auto 55px !important;
}

.guild-profile-top .award-card {
  width: 260px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.guild-profile-top .award-card img {
  width: 240px !important;
  height: 240px !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain !important;
  display: block !important;
}

.guild-profile-top .award-count {
  margin-top: 12px !important;
  font-size: 44px !important;
  font-weight: 900 !important;
  color: #f0b90b !important;
  text-align: center !important;
}
Then commit and refresh with Ctrl + F5.

If they still look small, the PNGs have too much transparent empty space around the actual logo.


body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #07111f;
  color: #f5f5f5;
}

header {
  background: #07111f;
  border-bottom: 2px solid #d4af37;
}

.top-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 40px; important;
    gap: 30px; important;
}

.logo {
    display: flex;
    align-items: center;
    gap: 18px;
}

.logo img {
    width: 130px;
    height: 130px;
    object-fit: contain;
}

.logo span {
    font-size: 42px;
    font-weight: 900;
    color: #F0B90B;
}

.search {
  flex: 1;
  max-width: 560px;
}

.search input {
  width: 100%;
  padding: 15px 18px;
  background: #0d1726;
  color: white;
  border: 1px solid #58677d;
  border-radius: 8px;
  font-size: 18px;
}

.header-links a {
  display: inline-block;
  padding: 14px 24px;
  color: white;
  text-decoration: none;
  margin-left: 14px;
  font-weight: bold;
  border: 1px solid #58677d;
  border-radius: 6px;
  background: #0d1726;
}

.header-links a:hover {
  background: #d4af37;
  color: #07111f;
}

nav {
  display: flex;
  justify-content: center;
  background: #0f1d30;
  border-top: 1px solid #263a59;
  border-bottom: 1px solid #d4af37;
}

nav a {
  padding: 20px 32px;
  color: white;
  text-decoration: none;
  font-weight: bold;
  border-left: 1px solid #263a59;
  transition: 0.25s;
}

nav a:last-child {
  border-right: 1px solid #263a59;
}

nav a:hover,
nav a.active {
  background: #d4af37;
  color: #07111f;
}

.ticker {
    display: flex;
    align-items: center;
    overflow: hidden;
    background: #d4af37;
    height: 64px;
    position: relative;
}

.ticker-title {
    position: relative;
    z-index: 10;

    display: flex;
    align-items: center;
    justify-content: center;

    min-width: 270px;
    height: 64px;

    background: #07111f;
    color: #f0b90b;

    font-size: 22px;
    font-weight: bold;
    text-transform: uppercase;

    border-right: 3px solid #d4af37;
}

.ticker-content {
    position: absolute;
    left: 270px;
    right: 0;

    display: flex;
    gap: 70px;

    white-space: nowrap;

    animation: scrollTicker 35s linear infinite;

    font-size: 18px;
    font-weight: bold;
}

@keyframes scrollTicker {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(-100%);
  }
}

.hero {
  min-height: 520px;
  background-image:
    linear-gradient(rgba(7, 17, 31, 0.25), rgba(7, 17, 31, 0.75)),
    url("./assets/wow-bg.png");
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-bottom: 1px solid #d4af37;
}

.hero-content {
  max-width: 1000px;
  padding: 40px;
}

.hero-content h2 {
  font-size: 54px;
  color: #f0b90b;
  margin-bottom: 18px;
  text-shadow: 0 4px 10px #000;
}

.hero-content p {
  font-size: 22px;
  color: white;
  text-shadow: 0 3px 8px #000;
}

.hero-buttons {
  margin-top: 34px;
}

.hero-buttons a {
  display: inline-block;
  padding: 18px 34px;
  margin: 8px;
  background: #d4af37;
  color: #07111f;
  text-decoration: none;
  font-weight: bold;
  border-radius: 8px;
  font-size: 18px;
  border: 2px solid #f5d76e;
}

.hero-buttons a:nth-child(2) {
  background: rgba(7, 17, 31, 0.85);
  color: white;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
  padding: 30px 40px;
  background: #07111f;
}

.stat-card {
  background: linear-gradient(180deg, #0f1d30, #07111f);
  border: 1px solid #d4af37;
  border-radius: 8px;
  text-align: center;
  padding: 32px 20px;
}

.stat-number {
  font-size: 42px;
  font-weight: 900;
  color: white;
}

.stat-label {
  color: #f0b90b;
  font-size: 20px;
  font-weight: bold;
  text-transform: uppercase;
}
.guild-table {
  max-width: 1400px;
  margin: 40px auto;
  padding: 20px;
}

.guild-table h1 {
  color: #f0b90b;
  margin-bottom: 25px;
}

.guild-table table {
  width: 100%;
  border-collapse: collapse;
  background: #101820;
}

.guild-table th {
  background: #d4af37;
  color: #07111f;
  padding: 18px;
  font-size: 18px;
}

.guild-table td {
  padding: 16px;
  border-bottom: 1px solid #263a59;
}

.guild-table tr:hover {
  background: #1b2b45;
}

.guild-table td:first-child {
  text-align: center;
  width: 80px;
  font-size: 24px;
  font-weight: bold;
}
.guild-profile-top {
  text-align: center;
  padding: 45px 20px;
}

.guild-profile-top h1 {
  font-size: 58px;
  color: #f0b90b;
  margin-bottom: 25px;
  text-shadow: 0 4px 10px #000;
}

.guild-logo-placeholder {
  width: 260px;
  height: 260px;
  margin: 0 auto 35px;
  border: 2px solid #d4af37;
  background: #101820;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guild-logo-placeholder img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

/* ========================= */
/* Guild Awards */
/* ========================= */

.guild-awards {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 80px;

    width: 100%;
    margin: 40px auto 50px;
}

.award-card {
    width: 220px;

    display: flex;
    flex-direction: column;
    align-items: center;
}

.award-card img {
    width: 180px;      /* Increase this */
    height: 180px;     /* Increase this */

    object-fit: contain;
    display: block;
}

.award-count {
    margin-top: 12px;

    font-size: 42px;
    font-weight: bold;

    color: #f0b90b;
    text-align: center;
  }

.guild-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin: 30px 0;
}

.info-card,
.expansion-card,
.guild-box {
  background: #101820;
  border: 1px solid #d4af37;
  border-radius: 10px;
  padding: 24px;
}

.info-card {
  text-align: center;
}

.info-card h3,
.expansions-section h2,
.guild-box h2 {
  color: #f0b90b;
  text-transform: uppercase;
}

.expansion-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
}

.expansion-card h3 {
  color: #f0b90b;
  margin-top: 0;
}

.raid-tier {
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #263a59;
}

.raid-name {
  color: white;
}

.raid-rank {
  color: #f0b90b;
  font-weight: bold;
  text-align: center;
}
.breadcrumb {
    max-width: 1200px;
    margin: 20px auto 10px;
    color: #b8c2cc;
    font-size: 15px;
}

.breadcrumb a {
    color: #f0b90b;
    text-decoration: none;
}

.breadcrumb a:hover {
    text-decoration: underline;
}

.breadcrumb span {
    margin: 0 6px;
}
.news-page {
  max-width: 1000px;
  margin: 40px auto;
  padding: 20px;
}

.news-page h1 {
  color: #f0b90b;
  text-align: center;
  margin-bottom: 30px;
}

.news-card {
  background: #101820;
  border-left: 5px solid #d4af37;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 18px;
}

.news-type {
  display: inline-block;
  background: #d4af37;
  color: #07111f;
  padding: 5px 12px;
  border-radius: 999px;
  font-weight: bold;
  margin-bottom: 10px;
}

.news-card h2 {
  color: #f0b90b;
  margin: 5px 0;
}

.news-date {
  color: #9aa4b2;
  font-size: 14px;
  margin-bottom: 12px;
}

.news-card p {
  font-size: 17px;
  line-height: 1.6;
}

Your CSS is fine. The problem is probably the PNGs have too much transparent padding.

Use this stronger CSS at the very bottom of style.css:

/* Force award logo size */
.guild-profile-top .award-card img {
  width: 280px !important;
  height: 280px !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: cover !important;
}

.guild-profile-top .award-card {
  width: 280px !important;
}

.guild-profile-top .guild-awards {
  gap: 40px !important;
}
If they still look small after this, the actual badge inside the PNG is small because of empty transparent space around it. Then the fix is to crop the PNG files, not CSS.


2c2dab51-e0fe-443c-a9b6-2595baeb48df.png
how can i remove the link underline from the guild names?

That's just the browser's default styling for links.

Add this to your style.css:

.guild-link {
    color: white;
    text-decoration: none;
    font-weight: bold;
    transition: 0.2s;
}

.guild-link:hover {
    color: #f0b90b;
}
Then, in your JavaScript where you create the guild name, make sure the link has that class.

Instead of:

<a href="guild.html?id=${guild.id}">${guild.name}</a>
use:

<a class="guild-link" href="guild.html?id=${guild.id}">
    ${guild.name}
</a>
If you don't want any links on the entire site to be underlined
You can use:

a {
    text-decoration: none;
}
and optionally:

a:hover {
    text-decoration: none;
}
However, I recommend using the .guild-link class instead, because you may want links like "View Guild →" on the News page or other pages to have a different style later. That gives you more flexibility as the site grows.


nothing changed

From the screenshot, I can tell the CSS isn't the issue. The links are still using the browser's default blue + underlined style, which means the generated <a> elements don't have the class or your selector doesn't match them.

Let's find it properly.

1. Show me the code that creates the guild links
Please paste the part of your guilds.js (or whatever JavaScript builds the guild table) that contains something like:

row.innerHTML = ...
or

<a href="guild.html?id=...
That's where the styling needs to be applied.

2. Temporary fix that will definitely work
Add this to the very bottom of your style.css:

.guild-table a {
    color: white !important;
    text-decoration: none !important;
    font-weight: bold;
}

.guild-table a:hover {
    color: #f0b90b !important;
    text-decoration: none !important;
}
If that still doesn't work, then the links are probably not inside an element with the guild-table class.

In that case, add this instead:

td a {
    color: white !important;
    text-decoration: none !important;
}

td a:hover {
    color: #f0b90b !important;
}
If it still doesn't change, paste your guilds.js. I'm confident I can spot the exact cause in a minute.


If i want to change the date for the Death and Glory, where should I type?

Since you're using the Raider.IO-style system we built, every guild has its own JSON file.

For Death and Glory, open:

data/guilds/death-and-glory.json
Inside you'll have something like:

{
  "name": "Death and Glory",
  "logo": "./assets/guilds/death-and-glory.png",

  "rank1Wins": 0,
  "rank2Wins": 0,
  "rank3Wins": 0,

  "established": "01.01.2020",
  "weeklySchedule": "Tuesday, Thursday, Sunday",
  "hourlySchedule": "20:00 - 23:00"
}
To change the established date, simply edit:

"established": "01.01.2020"
For example:

"established": "15.08.2016"
One thing I noticed
In your guild-profile.js, you currently have:

document.getElementById("hourlySchedule").textContent =
    guild.hourlySchedule || "Time placeholder";
But in your HTML you showed me, the element is:

<p id="RaidTimes">Time placeholder</p>
Those IDs don't match.

You have:

JavaScript: hourlySchedule

HTML: RaidTimes

They need to be the same.

Either change the HTML to:

<p id="hourlySchedule">Time placeholder</p>
or change the JavaScript to:

document.getElementById("RaidTimes").textContent =
    guild.hourlySchedule || "Time placeholder";
Otherwise your raid times won't update from the JSON.


I need to change the json, i laso changed hourlyschdule to RaidTimes
{
  "id": "death-and-glory",
  "name": "Death and Glory",
  "logo": "./assets/guilds/death-and-glory.png",

  "rank1Wins": 0,
  "rank2Wins": 0,
  "rank3Wins": 0,
  
  "raidingDays": {
    "mon": "",
    "tue": "",
    "wed": "",
    "thu": "",
    "fri": "",
    "sat": "",
    "sun": ""
  },

  "raidHistory": [
    { "tier": "The War Within", "worldRank": "323" },
    { "tier": "Dragonflight", "worldRank": "-" },
    { "tier": "Shadowlands", "worldRank": "-" },
    { "tier": "Battle for Azeroth", "worldRank": "-" },
    { "tier": "Legion", "worldRank": "-" },
    { "tier": "Warlords of Draenor", "worldRank": "-" },
    { "tier": "Mists of Pandaria", "worldRank": "-" },
    { "tier": "Cataclysm", "worldRank": "-" },
    { "tier": "Wrath of the Lich King", "worldRank": "-" },
    { "tier": "The Burning Crusade", "worldRank": "-" },
    { "tier": "Classic", "worldRank": "-" }
  ],

  "roster": {
    "tanks": [],
    "healers": [],
    "dps": []
  }
}

Use this updated death-and-glory.json:

{
  "id": "death-and-glory",
  "name": "Death and Glory",
  "logo": "./assets/guilds/death-and-glory.png",

  "rank1Wins": 0,
  "rank2Wins": 0,
  "rank3Wins": 0,

  "established": "Date placeholder",
  "weeklySchedule": "Days placeholder",
  "RaidTimes": "Time placeholder",

  "raidingDays": {
    "mon": "",
    "tue": "",
    "wed": "",
    "thu": "",
    "fri": "",
    "sat": "",
    "sun": ""
  },

  "roster": {
    "tanks": [],
    "healers": [],
    "dps": []
  }
}
Then in guild-profile.js, make sure this line is:

document.getElementById("RaidTimes").textContent = guild.RaidTimes || "Time placeholder";
So the three info boxes read:

document.getElementById("guildEstablished").textContent = guild.established || "Date placeholder";
document.getElementById("weeklySchedule").textContent = guild.weeklySchedule || "Days placeholder";
document.getElementById("RaidTimes").textContent = guild.RaidTimes || "Time placeholder";
You don’t need raidHistory anymore if you use shared data/raid-tiers.json.


this is completely missing the tiers

Correct — because we moved the tiers into the shared file:

data/raid-tiers.json
So death-and-glory.json should not contain all tiers anymore.

Use this for death-and-glory.json:

{
  "id": "death-and-glory",
  "name": "Death and Glory",
  "logo": "./assets/guilds/death-and-glory.png",

  "rank1Wins": 0,
  "rank2Wins": 0,
  "rank3Wins": 0,

  "established": "Date placeholder",
  "weeklySchedule": "Days placeholder",
  "RaidTimes": "Time placeholder",

  "tierRanks": {
    "Highmaul": { "WR": "-", "GR": "-" },
    "BRF": { "WR": "-", "GR": "-" },
    "HFC": { "WR": "-", "GR": "-" },

    "EN": { "WR": "-", "GR": "-" },
    "ToV": { "WR": "-", "GR": "-" },
    "NH": { "WR": "-", "GR": "-" },
    "ToS": { "WR": "-", "GR": "-" },
    "Antorus": { "WR": "-", "GR": "-" },

    "Uldir": { "WR": "-", "GR": "-" },
    "BoD": { "WR": "-", "GR": "-" },
    "CoS": { "WR": "-", "GR": "-" },
    "EP": { "WR": "-", "GR": "-" },
    "Ny'alotha": { "WR": "-", "GR": "-" },

    "CN": { "WR": "-", "GR": "-" },
    "SoD": { "WR": "-", "GR": "-" },
    "SotFO": { "WR": "-", "GR": "-" },

    "Vault": { "WR": "-", "GR": "-" },
    "Aberrus": { "WR": "-", "GR": "-" },
    "Amirdrassil": { "WR": "-", "GR": "-" },

    "NP": { "WR": "323", "GR": "1" },
    "LoU": { "WR": "-", "GR": "-" },
    "MO": { "WR": "-", "GR": "-" },

    "T1 (DR, VS, MoQ)": { "WR": "-", "GR": "-" }
  },

  "roster": {
    "tanks": [],
    "healers": [],
    "dps": []
  }
}
Then in guild-profile.js, replace the raid-tier row with:

const tierRank = guild.tierRanks?.[tier] || { WR: "-", GR: "-" };

return `
  <div class="raid-tier">
    <span class="raid-name">${tier}</span>
    <span class="raid-rank">WR: ${tierRank.WR}</span>
    <span class="raid-rank">GR: ${tierRank.GR}</span>
  </div>
`;
This way:

raid-tiers.json controls the same expansion/tier layout for every guild

each guild JSON controls only that guild’s WR/GR results


const params = new URLSearchParams(window.location.search);
const guildId = params.get("id");

if (!guildId) {
  document.getElementById("guildName").textContent = "Guild Not Found";
  document.getElementById("guildNameBreadcrumb").textContent = guild.name;
} else {
  Promise.all([
    fetch(./data/guilds/${guildId}.json).then(response => response.json()),
    fetch("./data/raid-tiers.json").then(response => response.json())
  ])
    .then(([guild, raidTiers]) => {
      document.getElementById("guildName").textContent = guild.name;

      document.getElementById("rank1Wins").textContent = guild.rank1Wins || 0;
      document.getElementById("rank2Wins").textContent = guild.rank2Wins || 0;
      document.getElementById("rank3Wins").textContent = guild.rank3Wins || 0;

      const logoBox = document.getElementById("guildLogo");

      if (guild.logo) {
        logoBox.innerHTML = 
          <img src="${guild.logo}" alt="${guild.name} logo">
        ;
      }

      document.getElementById("guildEstablished").textContent = guild.established || "Date placeholder";
      document.getElementById("weeklySchedule").textContent = guild.weeklySchedule || "Days placeholder";
      document.getElementById("RaidTimes").textContent = guild.RaidTimes || "Time placeholder";

      const expansionGrid = document.getElementById("expansionGrid");
      expansionGrid.innerHTML = "";

      raidTiers.forEach(expansion => {
        const card = document.createElement("div");
        card.classList.add("expansion-card");

        card.innerHTML = 
          <h3>${expansion.title}</h3>
          ${expansion.tiers.map(tier => 
         <div class="raid-tier">
  <span class="raid-name">${tier}</span>
  <span class="raid-rank">WR: -</span>
  <span class="raid-rank">GR: -</span>
</div>
          ).join("")}
        ;

        expansionGrid.appendChild(card);
      });
    })
    .catch(error => {
      document.getElementById("guildName").textContent = "Guild Not Found";
      console.error(error);
    });
}

Replace your full guild-profile.js with this fixed version:

const params = new URLSearchParams(window.location.search);
const guildId = params.get("id");

if (!guildId) {
  document.getElementById("guildName").textContent = "Guild Not Found";
  document.getElementById("guildNameBreadcrumb").textContent = "Guild Not Found";
} else {
  Promise.all([
    fetch(`./data/guilds/${guildId}.json`).then(response => response.json()),
    fetch("./data/raid-tiers.json").then(response => response.json())
  ])
    .then(([guild, raidTiers]) => {
      document.getElementById("guildName").textContent = guild.name;
      document.getElementById("guildNameBreadcrumb").textContent = guild.name;

      document.getElementById("rank1Wins").textContent = guild.rank1Wins || 0;
      document.getElementById("rank2Wins").textContent = guild.rank2Wins || 0;
      document.getElementById("rank3Wins").textContent = guild.rank3Wins || 0;

      const logoBox = document.getElementById("guildLogo");

      if (guild.logo) {
        logoBox.innerHTML = `
          <img src="${guild.logo}" alt="${guild.name} logo">
        `;
      }

      document.getElementById("guildEstablished").textContent =
        guild.established || "Date placeholder";

      document.getElementById("weeklySchedule").textContent =
        guild.weeklySchedule || "Days placeholder";

      document.getElementById("RaidTimes").textContent =
        guild.RaidTimes || "Time placeholder";

      const expansionGrid = document.getElementById("expansionGrid");
      expansionGrid.innerHTML = "";

      raidTiers.forEach(expansion => {
        const card = document.createElement("div");
        card.classList.add("expansion-card");

        card.innerHTML = `
          <h3>${expansion.title}</h3>
          ${expansion.tiers.map(tier => {
            const tierRank = guild.tierRanks?.[tier] || { WR: "-", GR: "-" };

            return `
              <div class="raid-tier">
                <span class="raid-name">${tier}</span>
                <span class="raid-rank">WR: ${tierRank.WR}</span>
                <span class="raid-rank">GR: ${tierRank.GR}</span>
              </div>
            `;
          }).join("")}
        `;

        expansionGrid.appendChild(card);
      });
    })
    .catch(error => {
      document.getElementById("guildName").textContent = "Guild Not Found";
      document.getElementById("guildNameBreadcrumb").textContent = "Guild Not Found";
      console.error(error);
    });
}
The main fixes are:

removed guild.name from the if (!guildId) block, because guild does not exist there

added breadcrumb update inside the successful guild load

replaced WR: - / GR: - with values from guild.tierRanks


the data in death and glory for tiers are not showing. Onlz the names

This means the tier names in raid-tiers.json and the keys in death-and-glory.json do not match exactly.

They must be identical.

Example:

In raid-tiers.json:

"tiers": ["NP", "LoU", "MO"]
Then in death-and-glory.json it must be:

"tierRanks": {
  "NP": { "WR": "323", "GR": "1" },
  "LoU": { "WR": "-", "GR": "-" },
  "MO": { "WR": "-", "GR": "-" }
}
Not:

"Nerub-ar Palace": ...
"NP ": ...
"np": ...
Use this quick test: change death-and-glory.json to include:

"tierRanks": {
  "NP": { "WR": "323", "GR": "1" }
}
Then refresh guild.html?id=death-and-glory with Ctrl + F5.

Also make sure your JS has this exact part:

const tierRank = guild.tierRanks?.[tier] || { WR: "-", GR: "-" };
If it still shows -, paste your death-and-glory.json and raid-tiers.json.


{
  "id": "death-and-glory",
  "name": "Death and Glory",
  "logo": "./assets/guilds/death-and-glory.png",

  "rank1Wins": 0,
  "rank2Wins": 0,
  "rank3Wins": 0,

  "established": "2007",
  "weeklySchedule": "Τετάρτη-Πέμπτη-Δευτέρα",
  "RaidTimes": "20:00-23:30 Ελλάδας",

  "tierRanks": {
    "Highmaul": { "WR": "-", "GR": "-" },
    "BRF": { "WR": "-", "GR": "-" },
    "HFC": { "WR": "-", "GR": "-" },

    "EN": { "WR": "-", "GR": "-" },
    "ToV": { "WR": "-", "GR": "-" },
    "NH": { "WR": "-", "GR": "-" },
    "ToS": { "WR": "876", "GR": "-" },
    "Antorus": { "WR": "1170", "GR": "-" },

    "Uldir": { "WR": "945", "GR": "-" },
    "BoD": { "WR": "657", "GR": "-" },
    "CoS": { "WR": "-", "GR": "-" },
    "EP": { "WR": "628", "GR": "-" },
    "Ny'alotha": { "WR": "683", "GR": "-" },

    "CN": { "WR": "458", "GR": "-" },
    "SoD": { "WR": "662", "GR": "-" },
    "SotFO": { "WR": "221", "GR": "-" },

    "Vault": { "WR": "416", "GR": "-" },
    "Aberrus": { "WR": "773", "GR": "-" },
    "Amirdrassil": { "WR": "603", "GR": "-" },

    "NP": { "WR": "443", "GR": "1" },
    "LoU": { "WR": "484", "GR": "1" },
    "MO": { "WR": "450", "GR": "1" },

    "T1 (DR, VS, MoQ)": { "WR": "322", "GR": "1" }
  },

  "roster": {
    "tanks": [],
    "healers": [],
    "dps": []
  }
}

Your death-and-glory.json looks correct.

So the problem is almost certainly in data/raid-tiers.json.

Make sure it uses exactly the same tier names:

[
  {
    "title": "Draenor",
    "tiers": ["Highmaul", "BRF", "HFC"]
  },
  {
    "title": "Legion",
    "tiers": ["EN", "ToV", "NH", "ToS", "Antorus"]
  },
  {
    "title": "BFA",
    "tiers": ["Uldir", "BoD", "CoS", "EP", "Ny'alotha"]
  },
  {
    "title": "Shadowlands",
    "tiers": ["CN", "SoD", "SotFO"]
  },
  {
    "title": "Dragonflight",
    "tiers": ["Vault", "Aberrus", "Amirdrassil"]
  },
  {
    "title": "TWW",
    "tiers": ["NP", "LoU", "MO"]
  },
  {
    "title": "Midnight",
    "tiers": ["T1 (DR, VS, MoQ)"]
  }
]
Also in guild-profile.js, this part must be exactly:

const tierRank = guild.tierRanks?.[tier] || { WR: "-", GR: "-" };
Then refresh with Ctrl + F5.


[
  {
    "title": "Draenor",
    "tiers": ["Highmaul", "BRF", "HFC"]
  },
  {
    "title": "Legion",
    "tiers": ["EN", "ToV", "NH", "ToS", "Antorus"]
  },
  {
    "title": "BFA",
    "tiers": ["Uldir", "BoD", "CoS", "EP", "Ny'alotha"]
  },
  {
    "title": "Shadowlands",
    "tiers": ["CN", "SoD", "SotFO"]
  },
  {
    "title": "Dragonflight",
    "tiers": ["Vault", "Aberrus", "Amirdrassil"]
  },
  {
    "title": "TWW",
    "tiers": ["NP", "LoU", "MO"]
  },
  {
    "title": "Midnight",
    "tiers": ["T1 (DR, VS, MoQ)"]
  }
]

Both JSON files are correct, which means the issue is not the data. It's in the JavaScript.

I noticed something else in your previous guild-profile.js. Let's debug it properly.

Step 1: Add a debug line
Right before:

raidTiers.forEach(expansion => {
add:

console.log(guild.tierRanks);
Then press F12 → Console and tell me if you see your tierRanks object.

Step 2: Add another debug line
Inside the map() function, replace:

const tierRank = guild.tierRanks?.[tier] || { WR: "-", GR: "-" };
with:

const tierRank = guild.tierRanks?.[tier];

console.log(tier, tierRank);
If everything is working, you should see output like:

Highmaul {WR: "-", GR: "-"}
BRF {WR: "-", GR: "-"}
HFC {WR: "-", GR: "-"}
...
NP {WR: "443", GR: "1"}
If instead you see:

Highmaul undefined
BRF undefined
...
then guild.tierRanks isn't being read correctly.

Step 3: Check the Network tab
Open your browser's developer tools (F12) → Network tab → reload the page.

Click on:

death-and-glory.json
Verify that the response actually contains:

"tierRanks": {
  ...
}
Sometimes GitHub Pages or the browser serves an older cached version of the file, even after you've updated it.

My suspicion
I think the problem is not your JSON. It's likely one of these:

guild-profile.js is loading an older cached version.

death-and-glory.json is cached.

guild-profile.js is still rendering hardcoded WR: - / GR: - values instead of using tierRank.

Can you paste your current guild-profile.js exactly as it is now? Since we've edited it a few times, I want to verify that the latest version is actually the one running. I'm confident we can spot the issue quickly.


maybe here:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Guild Profile - Greek Warcraft Market</title>
  <link rel="stylesheet" href="style.css">
</head>

<body>

<header>
  <!-- You can copy your full header from index.html here later -->
</header>
<div class="breadcrumb">
    <a href="index.html">Home</a>
    <span>›</span>
    <a href="guilds.html">Guilds</a>
    <span>›</span>
    <span id="guildNameBreadcrumb">Loading...</span>
</div>
<main class="guild-profile-page">

  <section class="guild-profile-top">
    <h1 id="guildName">Loading guild...</h1>

    <div class="guild-logo-placeholder" id="guildLogo">
      <div class="placeholder-icon">🛡️</div>
      <p>Logo Placeholder</p>
    </div>

    <div class="guild-awards">
      <div class="award-card">
        <img src="./assets/medals/rank1.png" alt="Rank 1">
        <div class="award-count">x<span id="rank1Wins">0</span></div>
      </div>

      <div class="award-card">
        <img src="./assets/medals/rank2.png" alt="Rank 2">
        <div class="award-count">x<span id="rank2Wins">0</span></div>
      </div>

      <div class="award-card">
        <img src="./assets/medals/rank3.png" alt="Rank 3">
        <div class="award-count">x<span id="rank3Wins">0</span></div>
      </div>
    </div>
  </section>

  <section class="guild-info-grid">
    <div class="info-card">
      <h3>Est.</h3>
      <p id="guildEstablished">Date placeholder</p>
    </div>

    <div class="info-card">
      <h3>Weekly Schedule</h3>
      <p id="weeklySchedule">Days placeholder</p>
    </div>

    <div class="info-card">
      <h3>Raid Times</h3>
      <p id="RaidTimes">Time placeholder</p>
    </div>
  </section>

  <section class="expansions-section">
    <h2>Raid History</h2>

    <div class="expansion-grid" id="expansionGrid">
      <!-- Expansion boxes will load here -->
    </div>
  </section>

  <section class="guild-box">
    <h2>Roster</h2>

    <div class="roster-grid">
      <div class="roster-column">
        <h3>Tanks</h3>
        <ul id="tankRoster"></ul>
      </div>

      <div class="roster-column">
        <h3>Healers</h3>
        <ul id="healerRoster"></ul>
      </div>

      <div class="roster-column">
        <h3>DPS</h3>
        <ul id="dpsRoster"></ul>
      </div>
    </div>
  </section>

</main>
<script src="guild-profile.js"></script>

</body>
</html>

Your guild.html looks fine. The problem is almost certainly still in guild-profile.js.

Replace the whole guild-profile.js with this exact version:

const params = new URLSearchParams(window.location.search);
const guildId = params.get("id");

if (!guildId) {
  document.getElementById("guildName").textContent = "Guild Not Found";
  document.getElementById("guildNameBreadcrumb").textContent = "Guild Not Found";
} else {
  Promise.all([
    fetch(`./data/guilds/${guildId}.json`).then(response => response.json()),
    fetch("./data/raid-tiers.json").then(response => response.json())
  ])
    .then(([guild, raidTiers]) => {
      document.getElementById("guildName").textContent = guild.name;
      document.getElementById("guildNameBreadcrumb").textContent = guild.name;

      document.getElementById("rank1Wins").textContent = guild.rank1Wins || 0;
      document.getElementById("rank2Wins").textContent = guild.rank2Wins || 0;
      document.getElementById("rank3Wins").textContent = guild.rank3Wins || 0;

      document.getElementById("guildEstablished").textContent =
        guild.established || "Date placeholder";

      document.getElementById("weeklySchedule").textContent =
        guild.weeklySchedule || "Days placeholder";

      document.getElementById("RaidTimes").textContent =
        guild.RaidTimes || "Time placeholder";

      const logoBox = document.getElementById("guildLogo");

      if (guild.logo) {
        logoBox.innerHTML = `
          <img src="${guild.logo}" alt="${guild.name} logo">
        `;
      }

      const expansionGrid = document.getElementById("expansionGrid");
      expansionGrid.innerHTML = "";

      raidTiers.forEach(expansion => {
        const card = document.createElement("div");
        card.classList.add("expansion-card");

        const tierRows = expansion.tiers.map(tier => {
          const tierRank = guild.tierRanks && guild.tierRanks[tier]
            ? guild.tierRanks[tier]
            : { WR: "-", GR: "-" };

          return `
            <div class="raid-tier">
              <span class="raid-name">${tier}</span>
              <span class="raid-rank">WR: ${tierRank.WR}</span>
              <span class="raid-rank">GR: ${tierRank.GR}</span>
            </div>
          `;
        }).join("");

        card.innerHTML = `
          <h3>${expansion.title}</h3>
          ${tierRows}
        `;

        expansionGrid.appendChild(card);
      });
    })
    .catch(error => {
      document.getElementById("guildName").textContent = "Guild Not Found";
      document.getElementById("guildNameBreadcrumb").textContent = "Guild Not Found";
      console.error(error);
    });
}
Then Commit changes and refresh with Ctrl + F5.


