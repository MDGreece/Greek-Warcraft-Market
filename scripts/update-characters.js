const fs = require("fs");
const path = require("path");

const guildFolder = "data/guilds";

const guildFiles = fs
  .readdirSync(guildFolder)
  .filter(file => file.endsWith(".json"));

console.log("Guild profile files found:");
console.log(guildFiles);

const guilds = guildFiles.map(file => {
  return JSON.parse(
    fs.readFileSync(path.join(guildFolder, file), "utf8")
  );
});

const characters = [];

guilds.forEach(guild => {
  if (!guild.roster) return;

  characters.push(...(guild.roster.tanks || []));
  characters.push(...(guild.roster.healers || []));
  characters.push(...(guild.roster.dps || []));
});

console.log(`Found ${characters.length} character entries.`);

console.table(
  characters.map(c => ({
    Name: c.name,
    Realm: c.realm,
    Class: c.class,
    Spec: c.spec
  }))
);
