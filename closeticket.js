import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("closeticket")
  .setDescription("Close the current tag-request ticket channel")
  .addStringOption((o) =>
    o
      .setName("reason")
      .setDescription("Optional reason for closing")
      .setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false);

export async function execute(interaction) {
  const ticket = queries.getTicketByChannel.get(interaction.channelId);
  if (!ticket) {
    await interaction.reply({
      content: "This channel isn't a ticket.",
      ephemeral: true,
    });
    return;
  }

  const isStaff =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    queries
      .listWhitelistFor.all(interaction.guildId, interaction.user.id)
      .some((r) => r.role_id === "tag_manager" || r.role_id === "owner");
  const isCreator = interaction.user.id === ticket.requester_id;

  if (!isStaff && !isCreator) {
    await interaction.reply({
      content: "You don't have permission to close this ticket.",
      ephemeral: true,
    });
    return;
  }

  const reason = interaction.options.getString("reason") || "No reason given";

  await interaction.reply(
    `Ticket closed by ${interaction.user}. Reason: **${reason}**\nThis channel will be deleted in 5 seconds.`,
  );

  queries.closeTicket.run(Date.now(), interaction.channelId);

  setTimeout(async () => {
    try {
      await interaction.channel.delete(`Closed by ${interaction.user.tag}: ${reason}`);
    } catch (err) {
      console.error("Failed to delete ticket channel:", err);
    }
  }, 5000);
}
