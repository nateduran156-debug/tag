import { SlashCommandBuilder } from "discord.js";
import { getRolesInGroup, robloxConfigured } from "../lib/roblox.js";
import { getGuildGroupId } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription("List all roles in the Roblox group")
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
  await interaction.deferReply({ ephemeral: true });
  try {
    const roles = await getRolesInGroup(groupId);
    const lines = roles
      .filter((r) => r.rank > 0)
      .sort((a, b) => a.rank - b.rank)
      .map((r) => `**${r.name}** — Rank ${r.rank}`)
      .join("\n");
    await interaction.editReply(
      `**Roles in group \`${groupId}\`:**\n\n${lines.slice(0, 1900) || "No roles found."}`,
    );
  } catch (err) {
    await interaction.editReply(`Something went wrong: ${err.message}`);
  }
}
