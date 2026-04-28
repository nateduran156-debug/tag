import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { queries } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("setupticket")
  .setDescription("Post the tag-request ticket panel in a channel")
  .addChannelOption((o) =>
    o
      .setName("channel")
      .setDescription("Channel to post the ticket panel in")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction) {
  const channel = interaction.options.getChannel("channel", true);

  const embed = new EmbedBuilder()
    .setTitle("Request a Tag")
    .setDescription(
      "Click the **Tag** button below to request a tag.\nYou'll be asked for your Roblox username, then a private channel will open with our tag managers.",
    )
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:open")
      .setLabel("Tag")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🏷️"),
  );

  await channel.send({ embeds: [embed], components: [row] });
  queries.setPanelChannel.run(interaction.guildId, channel.id);

  await interaction.reply({
    content: `Ticket panel posted in ${channel}.`,
    ephemeral: true,
  });
}
