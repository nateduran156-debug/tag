import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("blacklist")
  .setDescription("Blacklist a Roblox username from getting tags")
  .addSubcommand((s) =>
    s
      .setName("add")
      .setDescription("Add a Roblox username to the blacklist")
      .addStringOption((o) =>
        o.setName("username").setDescription("Roblox username").setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("remove")
      .setDescription("Remove a Roblox username from the blacklist")
      .addStringOption((o) =>
        o.setName("username").setDescription("Roblox username").setRequired(true),
      ),
  )
  .addSubcommand((s) => s.setName("list").setDescription("Show the current blacklist"))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === "add") {
    const username = interaction.options.getString("username", true).toLowerCase();
    queries.addBlacklist.run(guildId, username, interaction.user.id, Date.now());
    await interaction.reply({
      content: `\`${username}\` has been added to the blacklist.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "remove") {
    const username = interaction.options.getString("username", true).toLowerCase();
    const result = queries.removeBlacklist.run(guildId, username);
    await interaction.reply({
      content:
        result.changes > 0
          ? `\`${username}\` has been removed from the blacklist.`
          : `\`${username}\` wasn't on the blacklist to begin with.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "list") {
    const rows = queries.listBlacklist.all(guildId);
    if (!rows.length) {
      await interaction.reply({ content: "The blacklist is empty.", ephemeral: true });
      return;
    }
    const lines = rows
      .map(
        (r) =>
          `• \`${r.roblox_username}\` — added by <@${r.added_by}> <t:${Math.floor(r.added_at / 1000)}:R>`,
      )
      .join("\n");
    await interaction.reply({
      content: `**Blacklist (${rows.length} user${rows.length === 1 ? "" : "s"}):**\n\n${lines.slice(0, 1900)}`,
      ephemeral: true,
    });
  }
}
