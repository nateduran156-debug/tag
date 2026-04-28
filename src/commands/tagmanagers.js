import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("tagmanagers")
  .setDescription("Manage which Discord roles get pinged in tag-request tickets")
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Add a role as a tag manager")
      .addRoleOption((o) =>
        o.setName("role").setDescription("Role to add").setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("remove")
      .setDescription("Remove a role from tag managers")
      .addRoleOption((o) =>
        o.setName("role").setDescription("Role to remove").setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s.setName("list").setDescription("List the current tag-manager roles"),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === "add") {
    const role = interaction.options.getRole("role", true);
    queries.addTagManagerRole.run(guildId, role.id);
    await interaction.reply({
      content: `${role} has been added as a tag manager. They'll be pinged on new tag requests.`,
      ephemeral: true,
    });
    return;
  }
  if (sub === "remove") {
    const role = interaction.options.getRole("role", true);
    queries.removeTagManagerRole.run(guildId, role.id);
    await interaction.reply({
      content: `${role} has been removed from tag managers.`,
      ephemeral: true,
    });
    return;
  }
  if (sub === "list") {
    const rows = queries.listTagManagerRoles.all(guildId);
    if (!rows.length) {
      await interaction.reply({
        content: "No tag-manager roles set up yet.",
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      content: `**Tag-manager roles:** ${rows.map((r) => `<@&${r.role_id}>`).join(" ")}`,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  }
}
