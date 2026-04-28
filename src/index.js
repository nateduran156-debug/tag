import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "./lib/config.js";
import { ensureGuildOwnerRecorded } from "./lib/db.js";
import {
  handleOpenButton,
  handleRankSelect,
  handleSetTagApply,
  handleSetTagSelect,
  handleUsernameModal,
} from "./handlers/ticket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

client.commands = new Collection();

async function loadCommands() {
  const dir = path.join(__dirname, "commands");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    if (mod?.data?.name && typeof mod.execute === "function") {
      client.commands.set(mod.data.name, mod);
    }
  }
  console.log(`Loaded ${client.commands.size} commands.`);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  for (const [, guild] of c.guilds.cache) {
    ensureGuildOwnerRecorded(guild.ownerId);
  }
});

client.on(Events.GuildCreate, (guild) => ensureGuildOwnerRecorded(guild.ownerId));

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      await cmd.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === "ticket:open") {
        await handleOpenButton(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "ticket:username") {
        await handleUsernameModal(interaction);
      } else if (interaction.customId.startsWith("settag:apply:")) {
        await handleSetTagApply(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("ticket:rank:")) {
        await handleRankSelect(interaction);
      } else if (interaction.customId === "settag:choose") {
        await handleSetTagSelect(interaction);
      }
      return;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    const reply = { content: `Error: ${err.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      try {
        await interaction.followUp(reply);
      } catch {}
    } else {
      try {
        await interaction.reply(reply);
      } catch {}
    }
  }
});

await loadCommands();
await client.login(config.token);
