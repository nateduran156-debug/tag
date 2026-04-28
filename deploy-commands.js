import { REST, Routes } from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "./lib/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadCommands() {
  const dir = path.join(__dirname, "commands");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  const commands = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    if (mod.data) commands.push(mod.data.toJSON());
  }
  return commands;
}

async function main() {
  const commands = await loadCommands();
  const rest = new REST({ version: "10" }).setToken(config.token);

  if (config.guildId) {
    console.log(`Deploying ${commands.length} commands to guild ${config.guildId}…`);
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });
    console.log("Guild commands deployed.");
  } else {
    console.log(`Deploying ${commands.length} commands globally…`);
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log("Global commands deployed (may take up to 1 hour to appear).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
