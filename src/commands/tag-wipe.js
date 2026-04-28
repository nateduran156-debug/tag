import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../lib/config.js";
import {
  getUserIdFromUsername,
  getRankInGroup,
  setRankByNumber,
  robloxConfigured,
} from "../lib/roblox.js";
import { getGuildGroupId } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("tag-wipe")
  .setDescription("Wipe any tag from a Roblox user (sets them to the lowest rank)")
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
    const currentRank = await getRankInGroup(groupId, userId);
    if (currentRank === 0) {
      await interaction.editReply(`\`${username}\` isn't even in the group.`);
      return;
    }
    await setRankByNumber(groupId, userId, config.roblox.ranks.lowest);
    await interaction.editReply(
      `Done! Wiped \`${username}\`'s tag — they went from rank ${currentRank} down to ${config.roblox.ranks.lowest}.`,
    );
  } catch (err) {
    await interaction.editReply(`Something went wrong: ${err.message}`);
  }
}
