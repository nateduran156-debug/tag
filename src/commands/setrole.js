import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("setrole")
  .setDescription("Add, remove, or list Roblox roles that can be used as tags")
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Register a Roblox role as a tag option")
      .addStringOption((o) =>
        o
          .setName("name")
          .setDescription("Display name shown in dropdowns")
          .setRequired(true)
          .setMaxLength(100),
      )
      .addIntegerOption((o) =>
        o
          .setName("id")
          .setDescription("The numeric Roblox role ID (rank number)")
          .setRequired(true)
          .setMinValue(1),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a registered tag role")
      .addIntegerOption((o) =>
        o
          .setName("id")
          .setDescription("Roblox role ID to remove")
          .setRequired(true)
          .setMinValue(1),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all registered tag roles"),
  );

export async function execute(interaction) {
  const isManager =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles) ||
    queries
      .listWhitelistFor.all(interaction.guildId, interaction.user.id)
      .some((r) => r.role_id === "tag_manager" || r.role_id === "owner");

  if (!isManager) {
    await interaction.reply({
      content: "You need Manage Roles (or be a tag manager) to use this.",
      ephemeral: true,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "add") {
    const name = interaction.options.getString("name").trim();
    const id = interaction.options.getInteger("id");
    queries.addGuildRole.run(interaction.guildId, name, id);
    await interaction.reply({
      content: `Got it! **${name}** (ID \`${id}\`) is now a tag option. It'll show up in \`/set-tag\` and tag request dropdowns.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "remove") {
    const id = interaction.options.getInteger("id");
    const info = queries.removeGuildRole.run(interaction.guildId, id);
    if (info.changes === 0) {
      await interaction.reply({
        content: `Couldn't find a registered role with ID \`${id}\`.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Role ID \`${id}\` has been removed from the tag options.`,
        ephemeral: true,
      });
    }
    return;
  }

  if (sub === "list") {
    const roles = queries.listGuildRoles.all(interaction.guildId);
    if (!roles.length) {
      await interaction.reply({
        content: "No tag roles registered yet. Use `/setrole add` to add some.",
        ephemeral: true,
      });
      return;
    }
    const lines = roles
      .map((r) => `• **${r.role_name}** — ID \`${r.roblox_role_id}\``)
      .join("\n");
    await interaction.reply({
      content: `**Registered Tag Roles:**\n\n${lines}`,
      ephemeral: true,
    });
  }
}
