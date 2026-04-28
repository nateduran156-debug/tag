import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("unwhitelist")
  .setDescription("Remove all bot roles from a user")
  .addUserOption((o) =>
    o.setName("user").setDescription("Discord user").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const result = queries.removeWhitelistAll.run(interaction.guildId, user.id);
  await interaction.reply({
    content:
      result.changes > 0
        ? `Removed all bot roles from ${user}.`
        : `${user} didn't have any bot roles to remove.`,
    ephemeral: true,
  });
}
