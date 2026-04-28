import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../lib/config.js";
import {
  getUserIdFromUsername,
  setRankByNumber,
  robloxConfigured,
} from "../lib/roblox.js";
import { getGuildGroupId } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("strip-tag")
  .setDescription("Strip a tag from a Roblox user")
  .addStringOption((o) =>
    o.setName("username").setDescription("Roblox username").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false);

export async function execute(interaction) {
  if (!robloxConfigured()) {
    await interaction.reply({
      content: "Roblox isn't set up on this bot yet.",
      ephemeral: true,
    });
    return;
  }
  const groupId = getGuildGroupId(interaction.guildId);
  if (!groupId) {
    await interaction.reply({
      content: "No group ID set. Run `/id` first to link a Roblox group.",
      ephemeral: true,
    });
    return;
  }
  const username = interaction.options.getString("username", true);
  await interaction.deferReply({ ephemeral: true });
  try {
    const userId = await getUserIdFromUsername(username);
    if (!userId) {
      await interaction.editReply(`Couldn't find a Roblox user named \`${username}\`.`);
      return;
    }
    await setRankByNumber(groupId, userId, config.roblox.ranks.lowest);
    await interaction.editReply(
      `Done! \`${username}\`'s tag has been stripped — they're back to rank ${config.roblox.ranks.lowest}.`,
    );
  } catch (err) {
    await interaction.editReply(`Something went wrong: ${err.message}`);
  }
}
