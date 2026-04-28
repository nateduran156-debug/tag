import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Give a user a bot role")
  .addUserOption((o) =>
    o.setName("user").setDescription("Discord user").setRequired(true),
  )
  .addStringOption((o) =>
    o
      .setName("role")
      .setDescription("Bot role to assign")
      .setRequired(true)
      .addChoices(
        { name: "elite", value: "elite" },
        { name: "tag_manager", value: "tag_manager" },
        { name: "owner", value: "owner" },
      ),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const role = interaction.options.getString("role", true);
  queries.addWhitelist.run(interaction.guildId, user.id, role);
  if (role === "owner") queries.addOwner.run(user.id);
  await interaction.reply({
    content: `${user} now has the **${role}** bot role.`,
    ephemeral: true,
  });
}
