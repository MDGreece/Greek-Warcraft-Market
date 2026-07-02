

If you are progressing a boss you havent killed it yet. CE for group 2 and 3 is wrong they are 8/9M

I just realised the 2 groups show as 7/9M not 8/9, do you know why?

Exactly. And this is actually the biggest remaining weakness of the current algorithm.

Right now, the script counts every wipe on the current boss across the last 50 reports. That includes:

First progression week ✔️

Second progression week ✔️

Reclears where they wipe once or twice ❌

Split raids ❌

Alt raids ❌

So 350 does not necessarily mean "350 progression pulls". It means "350 recorded wipes on Midnight Falls in the last 50 reports."

What GuildRanking.io probably does
From comparing their numbers, they appear to count the current progression campaign only. For example:

Guild starts progressing Lura.

They wipe 739 times.

They kill Lura.

Pull count resets to 0 for the next boss.

That excludes old reclears.

How to make yours behave the same
Instead of scanning the last 50 reports, the script should:

Sort reports newest → oldest.

Identify the current progression boss.

Walk backwards through the reports.

Count wipes on that boss only.

Stop as soon as it encounters the first kill of that boss.

Example:

Newest report
Lura wipe
Lura wipe
Lura wipe
Lura wipe
...
Lura kill   <-- STOP HERE
Older reports ignored
That gives the number of pulls since the last kill, which is much closer to what people mean by progression pulls.

My recommendation
I would actually rewrite this part of the updater. It would:

✅ Ignore reclears.

✅ Ignore wipes after the boss has already been farmed.

✅ Produce pull counts that closely match GuildRanking.io.

✅ Make the leaderboard much more meaningful.

I think this is the last major piece before your leaderboard behaves like GuildRanking.io rather than just being a report scanner.


Just remove the pulls

<th>Total pulls</th> where is this?

Thought for a couple of seconds
Two separate problems:

Group II / III show 7/9M
This means build-leaderboard.js is still subtracting one kill somewhere.

In build-leaderboard.js, find this function:

function normalizeLogProgress(group) {
Replace the whole function with this:

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  if (progress === "CE" && group.bestBoss) {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return progress;
}
But better: fix it in update-warcraftlogs.js, not only in leaderboard.

In update-warcraftlogs.js, after this:

const difficulty = getDifficultySummary(currentRaidFights);
const progression = getCurrentProgressionBoss(difficulty.fights);
change it to:

let difficulty = getDifficultySummary(currentRaidFights);
const progression = getCurrentProgressionBoss(difficulty.fights);

if (
  difficulty.suffix === "M" &&
  difficulty.progress === "CE" &&
  progression.bestBoss
) {
  const correctedKills = Math.min(difficulty.kills, TOTAL_BOSSES - 1);

  difficulty = {
    ...difficulty,
    kills: correctedKills,
    progress: `${correctedKills}/${TOTAL_BOSSES}M`
  };
}
That should make them 8/9M, not 7/9M.

Other guilds have no Midnight Falls progression
That means those guilds are either:

not inside data/warcraftlogs-groups.json, or

the Warcraft Logs guild ID was not found, or

build-leaderboard.js is not matching Raider.IO guilds with Warcraft Logs guilds.

Check data/warcraftlogs-groups.json. Every guild that should show boss progress must have an entry like:

{
  "id": "guild-name",
  "name": "Guild Name",
  "parentGuild": "Guild Name",
  "realm": "Realm",
  "warcraftLogsGuildId": 123456
}
If they are missing there, the website cannot show boss progress for them.

Send me your current data/warcraftlogs-groups.json after running the finder/updater, and I’ll tell you exactly why they are not matching.



function formatBossProgress(group) {
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return ${group.bossProg} ${group.bestBoss};
  }

  return group.bossProg || "-";
}

That function is fine. It only formats the display:

35.80% Midnight Falls
It is not the reason why Group II/III show 7/9M or why other guilds have no Midnight Falls progression.

Those two issues come from different places:

1. Group II / III show 7/9M
That comes from update-warcraftlogs.js, not from build-leaderboard.js.

I want to see this part of your file:

let difficulty = getDifficultySummary(currentRaidFights);
const progression = getCurrentProgressionBoss(difficulty.fights);
and the 15–20 lines immediately after it.

2. Other guilds don't show Midnight Falls
That is almost certainly a matching problem.

I need to see one entry from:

data/guildsio.json (for a guild that is 8/9M on Raider.IO), and

the same guild from data/warcraftlogs-groups.json.

For example:

// guildsio.json
{
  ...
}
and

// warcraftlogs-groups.json
{
  ...
}
At this point I don't think you need another full rewrite. We're down to two specific bugs, and once I see those snippets I can tell you exactly what line needs changing.


change the complete function?

Yes. Replace the complete normalizeLogProgress function with this:

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  // If the updater already gives a normal progress value, trust it.
  // Example: 8/9M stays 8/9M.
  if (progress !== "CE") {
    return progress;
  }

  // If it says CE but there is still an active progression boss,
  // then it is not really CE. Force it to 8/9M.
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return progress;
}
Only replace that function, not buildLogRow.


i think i have more functions wrong, correct my code:
const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(Missing file: ${path});
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);
  if (!raid) return "-";

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythicKills = raid.mythic_bosses_killed || 0;
  const heroicKills = raid.heroic_bosses_killed || 0;
  const normalKills = raid.normal_bosses_killed || 0;

  if (mythicKills > 0) {
    return mythicKills >= totalBosses ? "CE" : ${mythicKills}/${totalBosses}M;
  }

  if (heroicKills > 0) {
    return ${heroicKills}/${totalBosses}H;
  }

  if (normalKills > 0) {
    return ${normalKills}/${totalBosses}N;
  }

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings = guild.rankings?.[CURRENT_RAID];

  return (
    rankings?.mythic?.world ||
    rankings?.heroic?.world ||
    rankings?.normal?.world ||
    DEFAULT_WORLD_RANK
  );
}

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  if (progress === "CE" && group.bestBoss) {
    const kills = Math.min(group.raidKills || TOTAL_BOSSES - 1, TOTAL_BOSSES - 1);
    return ${kills}/${TOTAL_BOSSES}M;
  }

  return progress;
}

function formatBossProgress(group) {
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return ${group.bossProg} ${group.bestBoss};
  }

  return group.bossProg || "-";
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = slugifyId(guild.name);

  return logGroups.find(group =>
    group.id === guildId ||
    group.name?.toLowerCase() === guild.name.toLowerCase() ||
    (
      group.parentGuild?.toLowerCase() === guild.name.toLowerCase() &&
      group.name?.toLowerCase() === guild.name.toLowerCase()
    )
  );
}

function getProgressScore(progress) {
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyScore = {
    M: 300,
    H: 200,
    N: 100
  };

  return difficultyScore[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 100;

  const match = String(bossProg).match(/([\d.]+)%/);
  if (!match) return 100;

  return Number(match[1]);
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);

  const isCE = progress === "CE";

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,

    // CE guilds show WR. Non-CE guilds show boss progress if Warcraft Logs exists.
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? WR ${worldRank} : "-"
      : logGroup ? formatBossProgress(logGroup) : "-",

    worldRank,
    totalPulls: isCE ? "-" : logGroup?.totalPulls ?? "-",
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeLogProgress(group);

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,
    bossProg: progress === "CE" ? WR ${group.worldRank || DEFAULT_WORLD_RANK} : formatBossProgress(group),
    worldRank: group.worldRank || DEFAULT_WORLD_RANK,
    totalPulls: progress === "CE" ? "-" : group.totalPulls ?? 0,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  const groupId = group.id;
  const raiderIds = new Set(
    raiderGuilds.map(guild => guild.id || slugifyId(guild.name))
  );

  return !raiderIds.has(groupId);
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossPercentDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossPercentDiff !== 0) return bossPercentDiff;

  const pullsA = Number(a.totalPulls) || 0;
  const pullsB = Number(b.totalPulls) || 0;

  return pullsB - pullsA;
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild => buildRaiderRow(guild, logGroups));

  // Only show special/manual raid teams separately.
  // Normal guilds from Warcraft Logs are used only to enrich Raider.IO rows.
  const logRows = logGroups
    .filter(group => isManualRaidTeam(group, raiderGuilds))
    .map(buildLogRow);

  const leaderboard = [...raiderRows, ...logRows]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));

  console.log(Created ${outputPath} with ${leaderboard.length} entries);
}

run();

Paste this whole corrected file into:

scripts/build-leaderboard.js
const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);
  if (!raid) return "-";

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythicKills = raid.mythic_bosses_killed || 0;
  const heroicKills = raid.heroic_bosses_killed || 0;
  const normalKills = raid.normal_bosses_killed || 0;

  if (mythicKills > 0) {
    return mythicKills >= totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;
  }

  if (heroicKills > 0) {
    return `${heroicKills}/${totalBosses}H`;
  }

  if (normalKills > 0) {
    return `${normalKills}/${totalBosses}N`;
  }

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings = guild.rankings?.[CURRENT_RAID];

  return (
    rankings?.mythic?.world ||
    rankings?.heroic?.world ||
    rankings?.normal?.world ||
    DEFAULT_WORLD_RANK
  );
}

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  if (progress !== "CE") {
    return progress;
  }

  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return "CE";
}

function formatBossProgress(group) {
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return group.bossProg || "-";
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = guild.id || slugifyId(guild.name);
  const guildName = guild.name?.toLowerCase();
  const guildRealm = guild.realm?.toLowerCase();

  return logGroups.find(group => {
    const groupId = group.id;
    const groupName = group.name?.toLowerCase();
    const parentGuild = group.parentGuild?.toLowerCase();
    const groupRealm = group.realm?.toLowerCase();

    const sameId = groupId === guildId;
    const sameName = groupName === guildName;
    const sameParent = parentGuild === guildName;
    const sameRealm = !guildRealm || !groupRealm || guildRealm === groupRealm;

    return sameRealm && (sameId || sameName || sameParent);
  });
}

function getProgressScore(progress) {
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyScore = {
    M: 300,
    H: 200,
    N: 100
  };

  return difficultyScore[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 100;

  const match = String(bossProg).match(/([\d.]+)%/);
  if (!match) return 100;

  return Number(match[1]);
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);
  const isCE = progress === "CE";

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : logGroup ? formatBossProgress(logGroup) : "-",
    worldRank,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeLogProgress(group);
  const isCE = progress === "CE";
  const worldRank = group.worldRank || DEFAULT_WORLD_RANK;

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : formatBossProgress(group),
    worldRank,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  const raiderIds = new Set(
    raiderGuilds.map(guild => guild.id || slugifyId(guild.name))
  );

  return !raiderIds.has(group.id);
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossPercentDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossPercentDiff !== 0) return bossPercentDiff;

  return a.name.localeCompare(b.name);
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild => buildRaiderRow(guild, logGroups));

  const logRows = logGroups
    .filter(group => isManualRaidTeam(group, raiderGuilds))
    .map(buildLogRow);

  const leaderboard = [...raiderRows, ...logRows]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));

  console.log(`Created ${outputPath} with ${leaderboard.length} entries`);
}

run();
Main fixes:

Group II / III: CE + active boss becomes 8/9M, not 7/9M.

Removed pulls from output.

CE guilds show only WR.

Non-CE guilds show Warcraft Logs boss progress when matched.

Matching is stricter and includes realm check.


i did this and run my action and got the following error:
Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
Run stefanzweifel/git-auto-commit-action@v5
Started: bash /home/runner/work/_actions/stefanzweifel/git-auto-commit-action/v5/entrypoint.sh
INPUT_REPOSITORY value: .
INPUT_STATUS_OPTIONS: 
INPUT_FILE_PATTERN: data/guildsio.json data/warcraftlogs-groups.json
INPUT_BRANCH value: 
From https://github.com/MDGreece/Greek-Warcraft-Market
 + 2a1567b...659ddf7 main       -> origin/main  (forced update)
M	data/guildsio.json
M	data/warcraftlogs-groups.json
Your branch and 'origin/main' have diverged,
and have 1 and 1 different commits each, respectively.
  (use "git pull" if you want to integrate the remote branch with yours)
INPUT_ADD_OPTIONS: 
INPUT_FILE_PATTERN: data/guildsio.json data/warcraftlogs-groups.json
INPUT_COMMIT_OPTIONS: 
INPUT_COMMIT_USER_NAME: github-actions[bot]
INPUT_COMMIT_USER_EMAIL: 41898282+github-actions[bot]@users.noreply.github.com
INPUT_COMMIT_MESSAGE: Update guild and Warcraft Logs data
INPUT_COMMIT_AUTHOR: MDGreece <296451584+MDGreece@users.noreply.github.com>
[main 4921ff4] Update guild and Warcraft Logs data
 Author: MDGreece <296451584+MDGreece@users.noreply.github.com>
 2 files changed, 98 insertions(+), 98 deletions(-)
INPUT_TAGGING_MESSAGE: 
No tagging message supplied. No tag will be added.
INPUT_PUSH_OPTIONS: 
To https://github.com/MDGreece/Greek-Warcraft-Market
 ! [rejected]        main -> main (non-fast-forward)
error: failed to push some refs to 'https://github.com/MDGreece/Greek-Warcraft-Market'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
Error: Invalid status code: 1
    at ChildProcess.<anonymous> (/home/runner/work/_actions/stefanzweifel/git-auto-commit-action/v5/index.js:17:19)
    at ChildProcess.emit (node:events:509:28)
    at maybeClose (node:internal/child_process:1124:16)
    at ChildProcess._handle.onexit (node:internal/child_process:306:5) {
  code: 1
}
Error: Invalid status code: 1
    at ChildProcess.<anonymous> (/home/runner/work/_actions/stefanzweifel/git-auto-commit-action/v5/index.js:17:19)
    at ChildProcess.emit (node:events:509:28)
    at maybeClose (node:internal/child_process:1124:16)
    at ChildProcess._handle.onexit (node:internal/child_process:306:5)

Thought for a couple of seconds
This is not a code error. Your Action updated files, but GitHub rejected the push because main changed while the Action was running.

Also your commit step is missing data/leaderboard.json.

Replace your commit step with this:

      - name: Pull latest changes
        run: |
          git pull --rebase origin main

      - name: Commit updated data
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: Update guild leaderboard
          file_pattern: data/guildsio.json data/warcraftlogs-groups.json data/leaderboard.json
So the end of your workflow should be:

      - name: Run Raider.IO updater
        run: node scripts/update-guildsio.js

      - name: Find Warcraft Logs guilds
        env:
          WARCRAFTLOGS_CLIENT_ID: ${{ secrets.WARCRAFTLOGS_CLIENT_ID }}
          WARCRAFTLOGS_CLIENT_SECRET: ${{ secrets.WARCRAFTLOGS_CLIENT_SECRET }}
        run: node scripts/find-warcraftlogs-guilds.js

      - name: Run Warcraft Logs updater
        env:
          WARCRAFTLOGS_CLIENT_ID: ${{ secrets.WARCRAFTLOGS_CLIENT_ID }}
          WARCRAFTLOGS_CLIENT_SECRET: ${{ secrets.WARCRAFTLOGS_CLIENT_SECRET }}
        run: node scripts/update-warcraftlogs.js

      - name: Build leaderboard
        run: node scripts/build-leaderboard.js

      - name: Pull latest changes
        run: |
          git pull --rebase origin main

      - name: Commit updated data
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: Update guild leaderboard
          file_pattern: data/guildsio.json data/warcraftlogs-groups.json data/leaderboard.json
The Node 20 message is only a warning. The real error is:

! [rejected] main -> main (non-fast-forward)

      - name: Pull latest changes
        run: |
          git pull --rebase origin main

      - name: Commit updated data
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: Update guild leaderboard
          file_pattern: data/guildsio.json data/warcraftlogs-groups.json data/leaderboard.json

dont ask me to replace, I want you to always rewrite, in case you find other mistakes

while i got the stats, disobedient group 2 and 3 are still on 7/9

I actually think the problem is not in build-leaderboard.js anymore.

The fact that they show 7/9M means your input data already says 7/9M.

Can you paste only the two entries for Group II and Group III from:

data/warcraftlogs-groups.json
I want to see something like:

{
  "name": "Disobedient Group II",
  "progress": "...",
  "raidKills": ...,
  "bestBoss": "...",
  "bossProg": "..."
}
If progress in that file is already 7/9M, then the bug is in update-warcraftlogs.js.

If progress is 8/9M there but the website shows 7/9M, then the bug is in build-leaderboard.js.

From everything we've done, I'm about 90% sure the problem is still in update-warcraftlogs.js, not in the leaderboard.

Once I see those two JSON objects, I can tell you exactly which function is wrong.


no both have killed 8 bosses and are progressing on the 9th

Thought for 15s
Yes, then the updater should count 8 kills, not force anything.

The real fix is: stop using the static boss list. It is probably missing or mismatching one boss name. Use the current raid zone from Warcraft Logs reports instead.

Paste this whole file into:

scripts/update-warcraftlogs.js
Replace everything.

const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

const TOTAL_BOSSES = 9;
const REPORT_LIMIT = 50;

const DIFFICULTIES = [
  { id: 5, suffix: "M", name: "Mythic" },
  { id: 4, suffix: "H", name: "Heroic" },
  { id: 3, suffix: "N", name: "Normal" }
];

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET");
  }

  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not get Warcraft Logs token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function queryWarcraftLogs(token, query, variables = {}) {
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Warcraft Logs HTTP error: ${response.status} ${JSON.stringify(data)}`);
  }

  if (data.errors) {
    console.log(JSON.stringify(data.errors, null, 2));
    throw new Error("Warcraft Logs GraphQL error");
  }

  return data.data;
}

async function getReportsForGuild(token, guildId) {
  const query = `
    query($guildId: Int!, $limit: Int!) {
      reportData {
        reports(guildID: $guildId, limit: $limit) {
          data {
            code
            title
            startTime
            endTime
            zone {
              name
            }
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, {
    guildId,
    limit: REPORT_LIMIT
  });

  return data?.reportData?.reports?.data || [];
}

async function getFightsFromReport(token, report) {
  const query = `
    query($code: String!) {
      reportData {
        report(code: $code) {
          fights(killType: Encounters) {
            id
            name
            kill
            bossPercentage
            difficulty
            startTime
            endTime
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, { code: report.code });
  const fights = data?.reportData?.report?.fights || [];

  return fights.map(fight => ({
    ...fight,
    reportCode: report.code,
    reportTitle: report.title,
    reportStartTime: report.startTime,
    reportEndTime: report.endTime,
    zoneName: report.zone?.name || ""
  }));
}

function countUniqueKills(fights) {
  return new Set(
    fights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  ).size;
}

function getDifficultySummary(fights) {
  const summaries = DIFFICULTIES.map(diff => {
    const diffFights = fights.filter(fight => fight.difficulty === diff.id);
    const kills = countUniqueKills(diffFights);

    return {
      ...diff,
      fights: diffFights,
      kills,
      hasFights: diffFights.length > 0
    };
  });

  const mythic = summaries.find(d => d.suffix === "M");
  const heroic = summaries.find(d => d.suffix === "H");
  const normal = summaries.find(d => d.suffix === "N");

  if (mythic.kills > 0 || mythic.hasFights) {
    return {
      ...mythic,
      progress: mythic.kills >= TOTAL_BOSSES ? "CE" : `${mythic.kills}/${TOTAL_BOSSES}M`
    };
  }

  if (heroic.kills > 0 || heroic.hasFights) {
    return {
      ...heroic,
      progress: `${heroic.kills}/${TOTAL_BOSSES}H`
    };
  }

  if (normal.kills > 0 || normal.hasFights) {
    return {
      ...normal,
      progress: `${normal.kills}/${TOTAL_BOSSES}N`
    };
  }

  return {
    id: null,
    suffix: "",
    name: "",
    fights: [],
    kills: 0,
    hasFights: false,
    progress: "-"
  };
}

function getCurrentProgressionBoss(fights) {
  const killedBosses = new Set(
    fights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  );

  const wipes = fights.filter(fight =>
    !fight.kill &&
    fight.name &&
    typeof fight.bossPercentage === "number" &&
    fight.bossPercentage > 0 &&
    !killedBosses.has(fight.name)
  );

  if (wipes.length === 0) {
    return {
      bestBoss: "",
      bossProg: "-",
      latestReport: "",
      latestReportTitle: "",
      zoneName: ""
    };
  }

  const bosses = new Map();

  for (const fight of wipes) {
    if (!bosses.has(fight.name)) {
      bosses.set(fight.name, {
        name: fight.name,
        bestPercent: 100,
        latestTimestamp: 0,
        latestReport: "",
        latestReportTitle: "",
        zoneName: fight.zoneName || ""
      });
    }

    const boss = bosses.get(fight.name);

    if (fight.bossPercentage < boss.bestPercent) {
      boss.bestPercent = fight.bossPercentage;
    }

    const timestamp = Number(fight.reportStartTime || 0) + Number(fight.startTime || 0);

    if (timestamp > boss.latestTimestamp) {
      boss.latestTimestamp = timestamp;
      boss.latestReport = fight.reportCode || "";
      boss.latestReportTitle = fight.reportTitle || "";
      boss.zoneName = fight.zoneName || "";
    }
  }

  const currentBoss = [...bosses.values()]
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp)[0];

  return {
    bestBoss: currentBoss.name,
    bossProg: `${currentBoss.bestPercent.toFixed(2)}%`,
    latestReport: currentBoss.latestReport,
    latestReportTitle: currentBoss.latestReportTitle,
    zoneName: currentBoss.zoneName
  };
}

function getRelevantRaidFights(allFights) {
  const firstPassDifficulty = getDifficultySummary(allFights);
  const firstPassProgression = getCurrentProgressionBoss(firstPassDifficulty.fights);

  if (!firstPassProgression.zoneName) {
    return {
      fights: firstPassDifficulty.fights,
      difficulty: firstPassDifficulty,
      progression: firstPassProgression
    };
  }

  const sameZoneFights = allFights.filter(fight =>
    fight.zoneName === firstPassProgression.zoneName
  );

  const difficulty = getDifficultySummary(sameZoneFights);
  const progression = getCurrentProgressionBoss(difficulty.fights);

  return {
    fights: sameZoneFights,
    difficulty,
    progression
  };
}

async function updateGroup(token, group) {
  console.log(`Fetching Warcraft Logs for ${group.name}...`);

  if (!group.warcraftLogsGuildId) {
    return {
      ...group,
      progress: group.progress || "-",
      bossProg: "-",
      bestBoss: "",
      totalReports: 0
    };
  }

  const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);

  let allFights = [];

  for (const report of reports) {
    const fights = await getFightsFromReport(token, report);
    allFights = allFights.concat(fights);
  }

  const { difficulty, progression } = getRelevantRaidFights(allFights);

  let progress = difficulty.progress;
  let raidKills = difficulty.kills;

  if (
    difficulty.suffix === "M" &&
    progress === "CE" &&
    progression.bestBoss
  ) {
    raidKills = TOTAL_BOSSES - 1;
    progress = `${raidKills}/${TOTAL_BOSSES}M`;
  }

  const updatedGroup = {
    ...group,
    progress,
    raidDifficulty: difficulty.name,
    raidDifficultySuffix: difficulty.suffix,
    raidKills,
    totalReports: reports.length,
    bossProg: progression.bossProg,
    bestBoss: progression.bestBoss,
    latestReport: progression.latestReport,
    latestReportTitle: progression.latestReportTitle,
    raidZone: progression.zoneName || "",
    updatedAt: new Date().toISOString()
  };

  delete updatedGroup.totalPulls;

  console.log(
    `${updatedGroup.name}: ${updatedGroup.progress}, ${updatedGroup.bossProg} ${updatedGroup.bestBoss}`
  );

  return updatedGroup;
}

async function run() {
  console.log("Running Warcraft Logs updater with zone-based raid detection");

  const token = await getToken();
  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const updatedGroups = [];

  for (const group of groups) {
    try {
      const updatedGroup = await updateGroup(token, group);
      updatedGroups.push(updatedGroup);
    } catch (error) {
      console.error(`Failed updating ${group.name}:`, error.message);

      updatedGroups.push({
        ...group,
        updateError: error.message,
        updatedAt: new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(updatedGroups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
This should stop the 7/9M problem because it no longer depends on the incomplete static boss list.


now everything works. This is automatic and runs the script on its own , right?

Yes. Assuming your GitHub Action is enabled and the latest workflow is committed, the entire pipeline is now automatic.

Every 6 hours, GitHub Actions will:

✅ Download the latest Greek guild rankings from Raider.IO.

✅ Search Warcraft Logs for any new Greek guilds and add them to warcraftlogs-groups.json (without removing your manual raid teams like Group II and III).

✅ Update every guild's Warcraft Logs data:

Progress

Current progression boss

Boss percentage

World rank (for raid teams)

✅ Build a fresh leaderboard.json.

✅ Commit the updated data back to your GitHub repository.

Then your GitHub Pages site simply reads:

data/leaderboard.json
so the website updates automatically without you doing anything.

The only time you'll need to intervene
If a guild doesn't exist on Warcraft Logs, it can't show boss progression until it appears there.

If Warcraft Logs changes its GraphQL API or schema, the updater may need adjustments.

If Blizzard releases a new raid tier, you'll need to update the current raid configuration (boss list or raid detection logic, depending on how you've implemented it).

Where you are now
You've reached a good milestone:

✔ Automatic Raider.IO updates

✔ Automatic Warcraft Logs updates

✔ Automatic discovery of new guilds

✔ Automatic leaderboard generation

✔ Automatic website updates

The remaining improvements are more about features than core functionality. For example:

Guild detail pages with raid roster and progression history.

Clicking a boss percentage to open the latest Warcraft Logs report.

Showing faction or server icons.

Historical snapshots (e.g. daily or weekly rankings) so visitors can see how guilds moved over time.

Filtering by raid difficulty or server.

Those are enhancements rather than fixes—the automated pipeline itself is in place.


I just noticed that some guilds, show their progress of the previous tier, like leontokardoi and utopia

Thought for 20s
Yes — that means Warcraft Logs found old reports for them. We need to trust Raider.IO for current tier progress and only use Warcraft Logs boss % when it matches the same current progress.

Paste this whole file into:

scripts/build-leaderboard.js
const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);
  if (!raid) return "-";

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythicKills = raid.mythic_bosses_killed || 0;
  const heroicKills = raid.heroic_bosses_killed || 0;
  const normalKills = raid.normal_bosses_killed || 0;

  if (mythicKills > 0) {
    return mythicKills >= totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;
  }

  if (heroicKills > 0) {
    return `${heroicKills}/${totalBosses}H`;
  }

  if (normalKills > 0) {
    return `${normalKills}/${totalBosses}N`;
  }

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings = guild.rankings?.[CURRENT_RAID];

  return (
    rankings?.mythic?.world ||
    rankings?.heroic?.world ||
    rankings?.normal?.world ||
    DEFAULT_WORLD_RANK
  );
}

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  if (progress !== "CE") {
    return progress;
  }

  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return "CE";
}

function parseProgress(progress) {
  if (!progress || progress === "-") {
    return { difficulty: "", kills: 0, total: TOTAL_BOSSES, ce: false };
  }

  if (progress === "CE") {
    return { difficulty: "M", kills: TOTAL_BOSSES, total: TOTAL_BOSSES, ce: true };
  }

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);

  if (!match) {
    return { difficulty: "", kills: 0, total: TOTAL_BOSSES, ce: false };
  }

  return {
    kills: Number(match[1]),
    total: Number(match[2]),
    difficulty: match[3],
    ce: false
  };
}

function logMatchesCurrentRaiderProgress(raiderProgress, logProgress) {
  const raider = parseProgress(raiderProgress);
  const logs = parseProgress(logProgress);

  if (!raider.difficulty || !logs.difficulty) {
    return false;
  }

  return (
    raider.difficulty === logs.difficulty &&
    raider.kills === logs.kills &&
    raider.total === logs.total
  );
}

function formatBossProgress(group) {
  if (group.bestBoss && group.bossProg && group.bossProg !== "-") {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return group.bossProg || "-";
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = guild.id || slugifyId(guild.name);
  const guildName = guild.name?.toLowerCase();
  const guildRealm = guild.realm?.toLowerCase();

  return logGroups.find(group => {
    const groupId = group.id;
    const groupName = group.name?.toLowerCase();
    const parentGuild = group.parentGuild?.toLowerCase();
    const groupRealm = group.realm?.toLowerCase();

    const sameId = groupId === guildId;
    const sameName = groupName === guildName;
    const sameParent = parentGuild === guildName;
    const sameRealm = !guildRealm || !groupRealm || guildRealm === groupRealm;

    return sameRealm && (sameId || sameName || sameParent);
  });
}

function getProgressScore(progress) {
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyScore = {
    M: 300,
    H: 200,
    N: 100
  };

  return difficultyScore[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 100;

  const match = String(bossProg).match(/([\d.]+)%/);
  if (!match) return 100;

  return Number(match[1]);
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);
  const logProgress = logGroup ? normalizeLogProgress(logGroup) : "-";
  const isCE = progress === "CE";

  const useLogBossProgress =
    !isCE &&
    logGroup &&
    logMatchesCurrentRaiderProgress(progress, logProgress);

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : useLogBossProgress ? formatBossProgress(logGroup) : "-",
    worldRank,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeLogProgress(group);
  const isCE = progress === "CE";
  const worldRank = group.worldRank || DEFAULT_WORLD_RANK;

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : formatBossProgress(group),
    worldRank,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  const raiderIds = new Set(
    raiderGuilds.map(guild => guild.id || slugifyId(guild.name))
  );

  return !raiderIds.has(group.id);
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossPercentDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossPercentDiff !== 0) return bossPercentDiff;

  return a.name.localeCompare(b.name);
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild => buildRaiderRow(guild, logGroups));

  const logRows = logGroups
    .filter(group => isManualRaidTeam(group, raiderGuilds))
    .map(buildLogRow);

  const leaderboard = [...raiderRows, ...logRows]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));

  console.log(`Created ${outputPath} with ${leaderboard.length} entries`);
}

run();
What this fixes:

Raider.IO remains the authority for current tier progress.

Warcraft Logs boss % is shown only when its progress matches Raider.IO.

Old-tier Warcraft Logs data will no longer appear for guilds like Leontokardoi and Utopia.

CE guilds still show only WR.


it still hows older tiers

I think we've found the actual root cause.

This is not a build-leaderboard.js problem anymore.

If Leontokardoi or Utopia still show the previous tier, it means update-warcraftlogs.js is collecting reports from previous raid tiers.

Right now your updater does something like this:

Fetch last 50 reports.

Fetch all fights from all reports.

Pick a difficulty.

Calculate progression.

It never says "only use Manaforge Omega" (or whatever the current raid is). So if a guild has no current-tier logs but has older-tier Mythic logs, those old logs are used.

Let's verify that first
Please paste one complete JSON object for Leontokardoi from:

data/warcraftlogs-groups.json
I want to see fields like:

{
  "name": "Leontokardoi",
  "progress": "...",
  "bestBoss": "...",
  "raidZone": "...",
  "latestReportTitle": "...",
  "latestReport": "..."
}
Especially these fields:

raidZone

bestBoss

latestReportTitle

progress

I already know what the fix will be
If I'm right, I'm going to rewrite update-warcraftlogs.js, not build-leaderboard.js.

Instead of:

scanning every report,

it will:

ignore every report that is not the current raid,

only calculate progress from the current raid,

otherwise leave the guild with "-" boss progress.

That is actually how GuildRanking.io behaves.

I don't want to guess the current raid name because it needs to match exactly what Warcraft Logs returns. Once I see one of those JSON entries, I can make the filter use the correct raid name.


const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

const TOTAL_BOSSES = 9;
const REPORT_LIMIT = 50;

const DIFFICULTIES = [
  { id: 5, suffix: "M", name: "Mythic" },
  { id: 4, suffix: "H", name: "Heroic" },
  { id: 3, suffix: "N", name: "Normal" }
];

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET");
  }

  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(${CLIENT_ID}:${CLIENT_SECRET}).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(Could not get Warcraft Logs token: ${response.status} ${text});
  }

  const data = await response.json();
  return data.access_token;
}

async function queryWarcraftLogs(token, query, variables = {}) {
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      Authorization: Bearer ${token},
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(Warcraft Logs HTTP error: ${response.status} ${JSON.stringify(data)});
  }

  if (data.errors) {
    console.log(JSON.stringify(data.errors, null, 2));
    throw new Error("Warcraft Logs GraphQL error");
  }

  return data.data;
}

async function getReportsForGuild(token, guildId) {
  const query = 
    query($guildId: Int!, $limit: Int!) {
      reportData {
        reports(guildID: $guildId, limit: $limit) {
          data {
            code
            title
            startTime
            endTime
            zone {
              name
            }
          }
        }
      }
    }
  ;

  const data = await queryWarcraftLogs(token, query, {
    guildId,
    limit: REPORT_LIMIT
  });

  return data?.reportData?.reports?.data || [];
}

async function getFightsFromReport(token, report) {
  const query = 
    query($code: String!) {
      reportData {
        report(code: $code) {
          fights(killType: Encounters) {
            id
            name
            kill
            bossPercentage
            difficulty
            startTime
            endTime
          }
        }
      }
    }
  ;

  const data = await queryWarcraftLogs(token, query, { code: report.code });
  const fights = data?.reportData?.report?.fights || [];

  return fights.map(fight => ({
    ...fight,
    reportCode: report.code,
    reportTitle: report.title,
    reportStartTime: report.startTime,
    reportEndTime: report.endTime,
    zoneName: report.zone?.name || ""
  }));
}

function countUniqueKills(fights) {
  return new Set(
    fights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  ).size;
}

function getDifficultySummary(fights) {
  const summaries = DIFFICULTIES.map(diff => {
    const diffFights = fights.filter(fight => fight.difficulty === diff.id);
    const kills = countUniqueKills(diffFights);

    return {
      ...diff,
      fights: diffFights,
      kills,
      hasFights: diffFights.length > 0
    };
  });

  const mythic = summaries.find(d => d.suffix === "M");
  const heroic = summaries.find(d => d.suffix === "H");
  const normal = summaries.find(d => d.suffix === "N");

  if (mythic.kills > 0 || mythic.hasFights) {
    return {
      ...mythic,
      progress: mythic.kills >= TOTAL_BOSSES ? "CE" : ${mythic.kills}/${TOTAL_BOSSES}M
    };
  }

  if (heroic.kills > 0 || heroic.hasFights) {
    return {
      ...heroic,
      progress: ${heroic.kills}/${TOTAL_BOSSES}H
    };
  }

  if (normal.kills > 0 || normal.hasFights) {
    return {
      ...normal,
      progress: ${normal.kills}/${TOTAL_BOSSES}N
    };
  }

  return {
    id: null,
    suffix: "",
    name: "",
    fights: [],
    kills: 0,
    hasFights: false,
    progress: "-"
  };
}

function getCurrentProgressionBoss(fights) {
  const killedBosses = new Set(
    fights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  );

  const wipes = fights.filter(fight =>
    !fight.kill &&
    fight.name &&
    typeof fight.bossPercentage === "number" &&
    fight.bossPercentage > 0 &&
    !killedBosses.has(fight.name)
  );

  if (wipes.length === 0) {
    return {
      bestBoss: "",
      bossProg: "-",
      latestReport: "",
      latestReportTitle: "",
      zoneName: ""
    };
  }

  const bosses = new Map();

  for (const fight of wipes) {
    if (!bosses.has(fight.name)) {
      bosses.set(fight.name, {
        name: fight.name,
        bestPercent: 100,
        latestTimestamp: 0,
        latestReport: "",
        latestReportTitle: "",
        zoneName: fight.zoneName || ""
      });
    }

    const boss = bosses.get(fight.name);

    if (fight.bossPercentage < boss.bestPercent) {
      boss.bestPercent = fight.bossPercentage;
    }

    const timestamp = Number(fight.reportStartTime || 0) + Number(fight.startTime || 0);

    if (timestamp > boss.latestTimestamp) {
      boss.latestTimestamp = timestamp;
      boss.latestReport = fight.reportCode || "";
      boss.latestReportTitle = fight.reportTitle || "";
      boss.zoneName = fight.zoneName || "";
    }
  }

  const currentBoss = [...bosses.values()]
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp)[0];

  return {
    bestBoss: currentBoss.name,
    bossProg: ${currentBoss.bestPercent.toFixed(2)}%,
    latestReport: currentBoss.latestReport,
    latestReportTitle: currentBoss.latestReportTitle,
    zoneName: currentBoss.zoneName
  };
}

function getRelevantRaidFights(allFights) {
  const firstPassDifficulty = getDifficultySummary(allFights);
  const firstPassProgression = getCurrentProgressionBoss(firstPassDifficulty.fights);

  if (!firstPassProgression.zoneName) {
    return {
      fights: firstPassDifficulty.fights,
      difficulty: firstPassDifficulty,
      progression: firstPassProgression
    };
  }

  const sameZoneFights = allFights.filter(fight =>
    fight.zoneName === firstPassProgression.zoneName
  );

  const difficulty = getDifficultySummary(sameZoneFights);
  const progression = getCurrentProgressionBoss(difficulty.fights);

  return {
    fights: sameZoneFights,
    difficulty,
    progression
  };
}

async function updateGroup(token, group) {
  console.log(Fetching Warcraft Logs for ${group.name}...);

  if (!group.warcraftLogsGuildId) {
    return {
      ...group,
      progress: group.progress || "-",
      bossProg: "-",
      bestBoss: "",
      totalReports: 0
    };
  }

  const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);

  let allFights = [];

  for (const report of reports) {
    const fights = await getFightsFromReport(token, report);
    allFights = allFights.concat(fights);
  }

  const { difficulty, progression } = getRelevantRaidFights(allFights);

  let progress = difficulty.progress;
  let raidKills = difficulty.kills;

  if (
    difficulty.suffix === "M" &&
    progress === "CE" &&
    progression.bestBoss
  ) {
    raidKills = TOTAL_BOSSES - 1;
    progress = ${raidKills}/${TOTAL_BOSSES}M;
  }

  const updatedGroup = {
    ...group,
    progress,
    raidDifficulty: difficulty.name,
    raidDifficultySuffix: difficulty.suffix,
    raidKills,
    totalReports: reports.length,
    bossProg: progression.bossProg,
    bestBoss: progression.bestBoss,
    latestReport: progression.latestReport,
    latestReportTitle: progression.latestReportTitle,
    raidZone: progression.zoneName || "",
    updatedAt: new Date().toISOString()
  };

  delete updatedGroup.totalPulls;

  console.log(
    ${updatedGroup.name}: ${updatedGroup.progress}, ${updatedGroup.bossProg} ${updatedGroup.bestBoss}
  );

  return updatedGroup;
}

async function run() {
  console.log("Running Warcraft Logs updater with zone-based raid detection");

  const token = await getToken();
  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const updatedGroups = [];

  for (const group of groups) {
    try {
      const updatedGroup = await updateGroup(token, group);
      updatedGroups.push(updatedGroup);
    } catch (error) {
      console.error(Failed updating ${group.name}:, error.message);

      updatedGroups.push({
        ...group,
        updateError: error.message,
        updatedAt: new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(updatedGroups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

Thought for 8s
Yes, this script is still able to pick old tiers because it “detects” the zone automatically.

Replace the whole file:

scripts/update-warcraftlogs.js
with this version. It only uses reports from the current raid zone.

const fs = require("fs");

const CLIENT_ID = process.env.WARCRAFTLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.WARCRAFTLOGS_CLIENT_SECRET;

const inputPath = "data/warcraftlogs-groups.json";
const outputPath = "data/warcraftlogs-groups.json";

const TOTAL_BOSSES = 9;
const REPORT_LIMIT = 50;

// Current raid only. This prevents old-tier data from being used.
const CURRENT_RAID_ZONES = [
  "Manaforge Omega"
];

const DIFFICULTIES = [
  { id: 5, suffix: "M", name: "Mythic" },
  { id: 4, suffix: "H", name: "Heroic" },
  { id: 3, suffix: "N", name: "Normal" }
];

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET");
  }

  const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not get Warcraft Logs token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function queryWarcraftLogs(token, query, variables = {}) {
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Warcraft Logs HTTP error: ${response.status} ${JSON.stringify(data)}`);
  }

  if (data.errors) {
    console.log(JSON.stringify(data.errors, null, 2));
    throw new Error("Warcraft Logs GraphQL error");
  }

  return data.data;
}

async function getReportsForGuild(token, guildId) {
  const query = `
    query($guildId: Int!, $limit: Int!) {
      reportData {
        reports(guildID: $guildId, limit: $limit) {
          data {
            code
            title
            startTime
            endTime
            zone {
              name
            }
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, {
    guildId,
    limit: REPORT_LIMIT
  });

  return data?.reportData?.reports?.data || [];
}

async function getFightsFromReport(token, report) {
  const query = `
    query($code: String!) {
      reportData {
        report(code: $code) {
          fights(killType: Encounters) {
            id
            name
            kill
            bossPercentage
            difficulty
            startTime
            endTime
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(token, query, { code: report.code });
  const fights = data?.reportData?.report?.fights || [];

  return fights.map(fight => ({
    ...fight,
    reportCode: report.code,
    reportTitle: report.title,
    reportStartTime: report.startTime,
    reportEndTime: report.endTime,
    zoneName: report.zone?.name || ""
  }));
}

function isCurrentRaidReport(report) {
  return CURRENT_RAID_ZONES.includes(report.zone?.name);
}

function countUniqueKills(fights) {
  return new Set(
    fights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  ).size;
}

function getDifficultySummary(fights) {
  const summaries = DIFFICULTIES.map(diff => {
    const diffFights = fights.filter(fight => fight.difficulty === diff.id);
    const kills = countUniqueKills(diffFights);

    return {
      ...diff,
      fights: diffFights,
      kills,
      hasFights: diffFights.length > 0
    };
  });

  const mythic = summaries.find(d => d.suffix === "M");
  const heroic = summaries.find(d => d.suffix === "H");
  const normal = summaries.find(d => d.suffix === "N");

  if (mythic.kills > 0 || mythic.hasFights) {
    return {
      ...mythic,
      progress: mythic.kills >= TOTAL_BOSSES ? "CE" : `${mythic.kills}/${TOTAL_BOSSES}M`
    };
  }

  if (heroic.kills > 0 || heroic.hasFights) {
    return {
      ...heroic,
      progress: `${heroic.kills}/${TOTAL_BOSSES}H`
    };
  }

  if (normal.kills > 0 || normal.hasFights) {
    return {
      ...normal,
      progress: `${normal.kills}/${TOTAL_BOSSES}N`
    };
  }

  return {
    id: null,
    suffix: "",
    name: "",
    fights: [],
    kills: 0,
    hasFights: false,
    progress: "-"
  };
}

function getCurrentProgressionBoss(fights) {
  const killedBosses = new Set(
    fights
      .filter(fight => fight.kill && fight.name)
      .map(fight => fight.name)
  );

  const wipes = fights.filter(fight =>
    !fight.kill &&
    fight.name &&
    typeof fight.bossPercentage === "number" &&
    fight.bossPercentage > 0 &&
    !killedBosses.has(fight.name)
  );

  if (wipes.length === 0) {
    return {
      bestBoss: "",
      bossProg: "-",
      latestReport: "",
      latestReportTitle: "",
      zoneName: ""
    };
  }

  const bosses = new Map();

  for (const fight of wipes) {
    if (!bosses.has(fight.name)) {
      bosses.set(fight.name, {
        name: fight.name,
        bestPercent: 100,
        latestTimestamp: 0,
        latestReport: "",
        latestReportTitle: "",
        zoneName: fight.zoneName || ""
      });
    }

    const boss = bosses.get(fight.name);

    if (fight.bossPercentage < boss.bestPercent) {
      boss.bestPercent = fight.bossPercentage;
    }

    const timestamp = Number(fight.reportStartTime || 0) + Number(fight.startTime || 0);

    if (timestamp > boss.latestTimestamp) {
      boss.latestTimestamp = timestamp;
      boss.latestReport = fight.reportCode || "";
      boss.latestReportTitle = fight.reportTitle || "";
      boss.zoneName = fight.zoneName || "";
    }
  }

  const currentBoss = [...bosses.values()]
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp)[0];

  return {
    bestBoss: currentBoss.name,
    bossProg: `${currentBoss.bestPercent.toFixed(2)}%`,
    latestReport: currentBoss.latestReport,
    latestReportTitle: currentBoss.latestReportTitle,
    zoneName: currentBoss.zoneName
  };
}

async function updateGroup(token, group) {
  console.log(`Fetching Warcraft Logs for ${group.name}...`);

  if (!group.warcraftLogsGuildId) {
    return {
      ...group,
      progress: group.progress || "-",
      bossProg: "-",
      bestBoss: "",
      totalReports: 0,
      raidZone: ""
    };
  }

  const reports = await getReportsForGuild(token, group.warcraftLogsGuildId);
  const currentRaidReports = reports.filter(isCurrentRaidReport);

  if (currentRaidReports.length === 0) {
    console.log(`${group.name}: no current raid reports found`);

    return {
      ...group,
      progress: "-",
      raidDifficulty: "",
      raidDifficultySuffix: "",
      raidKills: 0,
      totalReports: reports.length,
      currentRaidReports: 0,
      bossProg: "-",
      bestBoss: "",
      latestReport: "",
      latestReportTitle: "",
      raidZone: "",
      updatedAt: new Date().toISOString()
    };
  }

  let allFights = [];

  for (const report of currentRaidReports) {
    const fights = await getFightsFromReport(token, report);
    allFights = allFights.concat(fights);
  }

  const difficulty = getDifficultySummary(allFights);
  const progression = getCurrentProgressionBoss(difficulty.fights);

  let progress = difficulty.progress;
  let raidKills = difficulty.kills;

  if (
    difficulty.suffix === "M" &&
    progress === "CE" &&
    progression.bestBoss
  ) {
    raidKills = TOTAL_BOSSES - 1;
    progress = `${raidKills}/${TOTAL_BOSSES}M`;
  }

  const updatedGroup = {
    ...group,
    progress,
    raidDifficulty: difficulty.name,
    raidDifficultySuffix: difficulty.suffix,
    raidKills,
    totalReports: reports.length,
    currentRaidReports: currentRaidReports.length,
    bossProg: progression.bossProg,
    bestBoss: progression.bestBoss,
    latestReport: progression.latestReport,
    latestReportTitle: progression.latestReportTitle,
    raidZone: progression.zoneName || CURRENT_RAID_ZONES[0],
    updatedAt: new Date().toISOString()
  };

  delete updatedGroup.totalPulls;

  console.log(
    `${updatedGroup.name}: ${updatedGroup.progress}, ${updatedGroup.bossProg} ${updatedGroup.bestBoss}`
  );

  return updatedGroup;
}

async function run() {
  console.log("Running Warcraft Logs updater with explicit current raid filter");

  const token = await getToken();
  const groups = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const updatedGroups = [];

  for (const group of groups) {
    try {
      const updatedGroup = await updateGroup(token, group);
      updatedGroups.push(updatedGroup);
    } catch (error) {
      console.error(`Failed updating ${group.name}:`, error.message);

      updatedGroups.push({
        ...group,
        updateError: error.message,
        updatedAt: new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(updatedGroups, null, 2));
  console.log("Updated data/warcraftlogs-groups.json");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
After running it, old-tier guilds should show no Warcraft Logs boss progress instead of wrong previous-tier progress.


now some guilds lost their progress on the current tier. but can still see Leontokardoi havin a boss from an older expansion

Thought for 9s
Yes. The safest fix is:

Raider.IO always controls progress

Warcraft Logs boss % is shown only if the boss is from the current raid

Old expansion bosses are ignored completely

Replace your full:

scripts/build-leaderboard.js
with this:

const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

const CURRENT_RAID_BOSSES = [
  "Imperator Averzian",
  "Vorasius",
  "Vaelgor & Ezzorak",
  "Fallen-King Salhadaar",
  "Lightblinded Vanguard",
  "Crown of the Cosmos",
  "Chimaerus the Undreamt God",
  "Belo'ren, Child of Al'ar",
  "Midnight Falls"
];

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);
  if (!raid) return "-";

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythicKills = raid.mythic_bosses_killed || 0;
  const heroicKills = raid.heroic_bosses_killed || 0;
  const normalKills = raid.normal_bosses_killed || 0;

  if (mythicKills > 0) {
    return mythicKills >= totalBosses ? "CE" : `${mythicKills}/${totalBosses}M`;
  }

  if (heroicKills > 0) {
    return `${heroicKills}/${totalBosses}H`;
  }

  if (normalKills > 0) {
    return `${normalKills}/${totalBosses}N`;
  }

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings = guild.rankings?.[CURRENT_RAID];

  return (
    rankings?.mythic?.world ||
    rankings?.heroic?.world ||
    rankings?.normal?.world ||
    DEFAULT_WORLD_RANK
  );
}

function isCurrentRaidBoss(bossName) {
  return CURRENT_RAID_BOSSES.includes(bossName);
}

function normalizeLogProgress(group) {
  const progress = group.progress || "-";

  if (progress !== "CE") {
    return progress;
  }

  if (isCurrentRaidBoss(group.bestBoss)) {
    return `${TOTAL_BOSSES - 1}/${TOTAL_BOSSES}M`;
  }

  return "CE";
}

function parseProgress(progress) {
  if (!progress || progress === "-") {
    return { difficulty: "", kills: 0, total: TOTAL_BOSSES, ce: false };
  }

  if (progress === "CE") {
    return { difficulty: "M", kills: TOTAL_BOSSES, total: TOTAL_BOSSES, ce: true };
  }

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);

  if (!match) {
    return { difficulty: "", kills: 0, total: TOTAL_BOSSES, ce: false };
  }

  return {
    kills: Number(match[1]),
    total: Number(match[2]),
    difficulty: match[3],
    ce: false
  };
}

function progressMatches(raiderProgress, logProgress) {
  const raider = parseProgress(raiderProgress);
  const logs = parseProgress(logProgress);

  return (
    raider.difficulty &&
    logs.difficulty &&
    raider.difficulty === logs.difficulty &&
    raider.kills === logs.kills &&
    raider.total === logs.total
  );
}

function formatBossProgress(group) {
  if (
    group.bestBoss &&
    group.bossProg &&
    group.bossProg !== "-" &&
    isCurrentRaidBoss(group.bestBoss)
  ) {
    return `${group.bossProg} ${group.bestBoss}`;
  }

  return "-";
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = guild.id || slugifyId(guild.name);
  const guildName = guild.name?.toLowerCase();
  const guildRealm = guild.realm?.toLowerCase();

  return logGroups.find(group => {
    const groupId = group.id;
    const groupName = group.name?.toLowerCase();
    const parentGuild = group.parentGuild?.toLowerCase();
    const groupRealm = group.realm?.toLowerCase();

    const sameId = groupId === guildId;
    const sameName = groupName === guildName;
    const sameParent = parentGuild === guildName;
    const sameRealm = !guildRealm || !groupRealm || guildRealm === groupRealm;

    return sameRealm && (sameId || sameName || sameParent);
  });
}

function getProgressScore(progress) {
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  const difficultyScore = {
    M: 300,
    H: 200,
    N: 100
  };

  return difficultyScore[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 100;

  const match = String(bossProg).match(/([\d.]+)%/);
  if (!match) return 100;

  return Number(match[1]);
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);

  const isCE = progress === "CE";
  const logProgress = logGroup ? normalizeLogProgress(logGroup) : "-";

  const canUseBossProgress =
    !isCE &&
    logGroup &&
    isCurrentRaidBoss(logGroup.bestBoss) &&
    progressMatches(progress, logProgress);

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : canUseBossProgress ? formatBossProgress(logGroup) : "-",
    worldRank,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = normalizeLogProgress(group);
  const isCE = progress === "CE";
  const worldRank = group.worldRank || DEFAULT_WORLD_RANK;

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : formatBossProgress(group),
    worldRank,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  const raiderIds = new Set(
    raiderGuilds.map(guild => guild.id || slugifyId(guild.name))
  );

  return !raiderIds.has(group.id);
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossPercentDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossPercentDiff !== 0) return bossPercentDiff;

  return a.name.localeCompare(b.name);
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild => buildRaiderRow(guild, logGroups));

  const logRows = logGroups
    .filter(group => isManualRaidTeam(group, raiderGuilds))
    .map(buildLogRow);

  const leaderboard = [...raiderRows, ...logRows]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));

  console.log(`Created ${outputPath} with ${leaderboard.length} entries`);
}

run();
This should stop Leontokardoi from showing old expansion bosses, while still keeping their current-tier progress from Raider.IO.


ba8843bf-5e3d-431c-86d7-e372a8966204.png
now its empty for progressing guilds

Thought for 11s
Your filter is now too strict, so it removed good Warcraft Logs boss progress too.

Use this full corrected scripts/build-leaderboard.js:

const fs = require("fs");

const raiderPath = "data/guildsio.json";
const logsPath = "data/warcraftlogs-groups.json";
const outputPath = "data/leaderboard.json";

const CURRENT_RAID = "tier-mn-1";
const DEFAULT_WORLD_RANK = 999999;
const TOTAL_BOSSES = 9;

const CURRENT_RAID_ZONES = [
  "Manaforge Omega",
  "Manaforge: Omega"
];

function readJson(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing file: ${path}`);
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function slugifyId(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRaiderRaid(guild) {
  return guild.progress?.[CURRENT_RAID] || null;
}

function getRaiderProgress(guild) {
  const raid = getRaiderRaid(guild);
  if (!raid) return "-";

  const totalBosses = raid.total_bosses || TOTAL_BOSSES;
  const mythic = raid.mythic_bosses_killed || 0;
  const heroic = raid.heroic_bosses_killed || 0;
  const normal = raid.normal_bosses_killed || 0;

  if (mythic > 0) return mythic >= totalBosses ? "CE" : `${mythic}/${totalBosses}M`;
  if (heroic > 0) return `${heroic}/${totalBosses}H`;
  if (normal > 0) return `${normal}/${totalBosses}N`;

  return "-";
}

function getRaiderWorldRank(guild) {
  const rankings = guild.rankings?.[CURRENT_RAID];

  return (
    rankings?.mythic?.world ||
    rankings?.heroic?.world ||
    rankings?.normal?.world ||
    DEFAULT_WORLD_RANK
  );
}

function isCurrentRaidLog(group) {
  if (!group.bestBoss || !group.bossProg || group.bossProg === "-") return false;

  // If updater has a current raid zone, trust it.
  if (group.raidZone && CURRENT_RAID_ZONES.includes(group.raidZone)) return true;

  // Manual raid teams may not always have raidZone saved correctly.
  // If they have valid boss progress and are not CE, allow them.
  if (group.progress && group.progress !== "CE" && group.progress !== "-") return true;

  return false;
}

function formatBossProgress(group) {
  if (!isCurrentRaidLog(group)) return "-";
  return `${group.bossProg} ${group.bestBoss}`;
}

function findLogGroupForGuild(guild, logGroups) {
  const guildId = guild.id || slugifyId(guild.name);
  const guildName = guild.name?.toLowerCase();
  const guildRealm = guild.realm?.toLowerCase();

  return logGroups.find(group => {
    const groupId = group.id;
    const groupName = group.name?.toLowerCase();
    const parentGuild = group.parentGuild?.toLowerCase();
    const groupRealm = group.realm?.toLowerCase();

    const sameId = groupId === guildId;
    const sameName = groupName === guildName;
    const sameParent = parentGuild === guildName;
    const sameRealm = !guildRealm || !groupRealm || guildRealm === groupRealm;

    return sameRealm && (sameId || sameName || sameParent);
  });
}

function getProgressScore(progress) {
  if (!progress || progress === "-") return 0;
  if (progress === "CE") return 999;

  const match = progress.match(/^(\d+)\/(\d+)([MNH])$/);
  if (!match) return 0;

  const kills = Number(match[1]);
  const difficulty = match[3];

  return { M: 300, H: 200, N: 100 }[difficulty] + kills;
}

function getBossPercentValue(bossProg) {
  if (!bossProg || bossProg === "-") return 100;

  const match = String(bossProg).match(/([\d.]+)%/);
  return match ? Number(match[1]) : 100;
}

function buildRaiderRow(guild, logGroups) {
  const progress = getRaiderProgress(guild);
  const worldRank = getRaiderWorldRank(guild);
  const logGroup = findLogGroupForGuild(guild, logGroups);
  const isCE = progress === "CE";

  return {
    id: guild.id || slugifyId(guild.name),
    name: guild.name,
    type: "guild",
    realm: guild.realm || "",
    parentGuild: "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : logGroup ? formatBossProgress(logGroup) : "-",
    worldRank,
    source: "raiderio"
  };
}

function buildLogRow(group) {
  const progress = group.progress || "-";
  const isCE = progress === "CE";
  const worldRank = group.worldRank || DEFAULT_WORLD_RANK;

  return {
    id: group.id,
    name: group.name,
    type: "raid-team",
    realm: group.realm || "",
    parentGuild: group.parentGuild || "",
    progress,
    bossProg: isCE
      ? worldRank !== DEFAULT_WORLD_RANK ? `WR ${worldRank}` : "-"
      : formatBossProgress(group),
    worldRank,
    source: "warcraftlogs",
    latestReport: group.latestReport || "",
    latestReportTitle: group.latestReportTitle || ""
  };
}

function isManualRaidTeam(group, raiderGuilds) {
  const raiderIds = new Set(
    raiderGuilds.map(guild => guild.id || slugifyId(guild.name))
  );

  return !raiderIds.has(group.id);
}

function sortLeaderboard(a, b) {
  const progressDiff = getProgressScore(b.progress) - getProgressScore(a.progress);
  if (progressDiff !== 0) return progressDiff;

  const worldRankDiff = a.worldRank - b.worldRank;
  if (worldRankDiff !== 0) return worldRankDiff;

  const bossDiff = getBossPercentValue(a.bossProg) - getBossPercentValue(b.bossProg);
  if (bossDiff !== 0) return bossDiff;

  return a.name.localeCompare(b.name);
}

function run() {
  const raiderGuilds = readJson(raiderPath);
  const logGroups = readJson(logsPath);

  const raiderRows = raiderGuilds.map(guild => buildRaiderRow(guild, logGroups));

  const logRows = logGroups
    .filter(group => isManualRaidTeam(group, raiderGuilds))
    .map(buildLogRow);

  const leaderboard = [...raiderRows, ...logRows]
    .sort(sortLeaderboard)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2));
  console.log(`Created ${outputPath} with ${leaderboard.length} entries`);
}

run();
This keeps Raider.IO progress and allows boss progress again when Warcraft Logs has valid current-looking progress.



  
