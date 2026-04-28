import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} from "discord.js";
import { config } from "../lib/config.js";
import { queries } from "../lib/db.js";
import { robloxConfigured } from "../lib/roblox.js";

export const data = new SlashCommandBuilder()
  .setName("set-tag")
  .setDescription("Set your tag in the Roblox group (elites only)")
  .setDMPermission(false);

export async function execute(interaction) {
  if (!robloxConfigured()) {
    await interaction.reply({
      content: "Roblox isn't set up on this bot yet.",
      ephemeral: true,
    });
    return;
  }

  const isWhitelisted = queries
    .listWhitelistFor.all(interaction.guildId, interaction.user.id)
    .some((r) => r.role_id === "elite");
  if (!isWhitelisted) {
    await interaction.reply({
      content: "You have to be an elite to use `/set-tag`. Ask a staff member to whitelist you first.",
      ephemeral: true,
    });
    return;
  }

  const last = queries.getCooldown.get(interaction.guildId, interaction.user.id);
  if (last) {
    const elapsed = (Date.now() - last.last_used_at) / 1000;
    if (elapsed < config.setTagCooldownSeconds) {
      const ready = Math.floor(
        (last.last_used_at + config.setTagCooldownSeconds * 1000) / 1000,
      );
      await interaction.reply({
        content: `You're still on cooldown. You can use this again <t:${ready}:R>.`,
        ephemeral: true,
      });
      return;
    }
  }

  const guildRoles = queries.listGuildRoles.all(interaction.guildId);
  const options = guildRoles.map((r) => ({
    label: r.role_name,
    value: String(r.roblox_role_id),
  }));

  if (!options.length) {
    await interaction.reply({
      content: "No tag roles have been set up yet. Ask an admin to run `/setrole add` first.",
      ephemeral: true,
    });
    return;
  }

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("settag:choose")
      .setPlaceholder("Pick the tag you want")
      .addOptions(options),
  );
  await interaction.reply({ components: [row], ephemeral: true });
}
