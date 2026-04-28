import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("reset-cd")
  .setDescription("Reset a user's /set-tag cooldown (owners only)")
  .addUserOption((o) =>
    o.setName("user").setDescription("Discord user to reset").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

export async function execute(interaction) {
  const isOwner =
    interaction.user.id === interaction.guild.ownerId ||
    Boolean(queries.isOwner.get(interaction.user.id));
  if (!isOwner) {
    await interaction.reply({
      content: "Only the server owner can reset cooldowns.",
      ephemeral: true,
    });
    return;
  }
  const user = interaction.options.getUser("user", true);
  queries.resetCooldown.run(interaction.guildId, user.id);
  await interaction.reply({
    content: `Cooldown cleared for ${user}. They can use \`/set-tag\` again.`,
    ephemeral: true,
  });
}
