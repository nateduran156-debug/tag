import { SlashCommandBuilder } from "discord.js";
import {
  getRoleInGroup,
  getUserIdFromUsername,
  robloxConfigured,
} from "../lib/roblox.js";
import { getGuildGroupId } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("rolecheck")
  .setDescription("Check what role a Roblox user has in the group")
  .addStringOption((o) =>
    o.setName("username").setDescription("Roblox username").setRequired(true),
  )
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
    const role = await getRoleInGroup(groupId, userId);
    if (!role || role.rank === 0) {
      await interaction.editReply(`\`${username}\` isn't in the group.`);
      return;
    }
    await interaction.editReply(
      `\`${username}\` is currently **${role.name}** (rank ${role.rank}).`,
    );
  } catch (err) {
    await interaction.editReply(`Something went wrong: ${err.message}`);
  }
}
