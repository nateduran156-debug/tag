import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("id")
  .setDescription("Set or view the Roblox group ID this server manages")
  .setDMPermission(false)
  .addIntegerOption((o) =>
    o
      .setName("group_id")
      .setDescription("The numeric Roblox group ID — leave blank to check the current one")
      .setMinValue(1),
  );

export async function execute(interaction) {
  const isManager =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    queries
      .listWhitelistFor.all(interaction.guildId, interaction.user.id)
      .some((r) => r.role_id === "owner");

  const groupIdOption = interaction.options.getInteger("group_id");

  if (groupIdOption === null) {
    const row = queries.getGuildConfig.get(interaction.guildId);
    const current = row?.group_id ?? null;
    await interaction.reply({
      content: current
        ? `This server's Roblox group ID is set to \`${current}\`.`
        : "No group ID set yet. Use `/id group_id:<number>` to add one.",
      ephemeral: true,
    });
    return;
  }

  if (!isManager) {
    await interaction.reply({
      content: "You need Manage Server permission (or be an owner) to change the group ID.",
      ephemeral: true,
    });
    return;
  }

  queries.setGuildGroupId.run(interaction.guildId, groupIdOption);
  await interaction.reply({
    content: `Group ID set to \`${groupIdOption}\`. All rank operations will now target that group.`,
    ephemeral: true,
  });
}
