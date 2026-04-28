import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { queries, getGuildGroupId } from "../lib/db.js";
import {
  getThumbnailUrl,
  getUserIdFromUsername,
  getUserInfo,
  robloxConfigured,
  setRankByNumber,
} from "../lib/roblox.js";

export async function handleOpenButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("ticket:username")
    .setTitle("Tag Request");
  const input = new TextInputBuilder()
    .setCustomId("username")
    .setLabel("Your Roblox username")
    .setPlaceholder("e.g. Builderman")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(64);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

export async function handleUsernameModal(interaction) {
  const username = interaction.fields.getTextInputValue("username").trim();
  if (!username) {
    await interaction.reply({ content: "You need to enter a username.", ephemeral: true });
    return;
  }

  if (queries.isBlacklisted.get(interaction.guildId, username.toLowerCase())) {
    await interaction.reply({
      content: `\`${username}\` is blacklisted and can't receive tags.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const count = queries.countTickets.get(interaction.guildId).n + 1;
  const channelName = `tag-request-${String(count).padStart(4, "0")}`;

  const tagManagerRoles = queries.listTagManagerRoles.all(interaction.guildId);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...tagManagerRoles.map((r) => ({
      id: r.role_id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: interaction.channel?.parentId ?? null,
      permissionOverwrites: overwrites,
      topic: `Tag request by ${interaction.user.tag} for ${username}`,
    });
  } catch (err) {
    await interaction.editReply(`Couldn't create the channel: ${err.message}`);
    return;
  }

  queries.insertTicket.run(
    interaction.guildId,
    channel.id,
    interaction.user.id,
    username,
    Date.now(),
  );

  let robloxId = null;
  let thumbnail = null;
  let displayName = username;
  if (robloxConfigured()) {
    try {
      robloxId = await getUserIdFromUsername(username);
      if (robloxId) {
        const info = await getUserInfo(robloxId);
        displayName = info?.username ?? username;
        thumbnail = await getThumbnailUrl(robloxId);
      }
    } catch {
      /* still open the ticket even if the lookup fails */
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`Tag Request — #${String(count).padStart(4, "0")}`)
    .setColor(0xff5252)
    .addFields(
      {
        name: "Discord",
        value: `${interaction.user} (\`${interaction.user.tag}\`)`,
        inline: false,
      },
      {
        name: "Roblox",
        value: robloxId
          ? `**${displayName}** • [\`${robloxId}\`](https://www.roblox.com/users/${robloxId}/profile)`
          : `**${displayName}**`,
        inline: false,
      },
    )
    .setTimestamp(new Date());
  if (thumbnail) embed.setThumbnail(thumbnail);

  const components = [];
  if (robloxId) {
    const guildRoles = queries.listGuildRoles.all(interaction.guildId);
    if (guildRoles.length) {
      const select = new StringSelectMenuBuilder()
        .setCustomId(`ticket:rank:${robloxId}:${channel.id}`)
        .setPlaceholder("Pick a tag to assign")
        .addOptions(
          guildRoles.slice(0, 25).map((r) => ({
            label: r.role_name.slice(0, 100),
            description: `Role ID ${r.roblox_role_id}`.slice(0, 100),
            value: String(r.roblox_role_id),
          })),
        );
      components.push(new ActionRowBuilder().addComponents(select));
    }
  }

  const pings = [
    `${interaction.user}`,
    ...tagManagerRoles.map((r) => `<@&${r.role_id}>`),
  ].join(" ");

  await channel.send({
    content: pings || `${interaction.user}`,
    embeds: [embed],
    components,
    allowedMentions: {
      users: [interaction.user.id],
      roles: tagManagerRoles.map((r) => r.role_id),
    },
  });

  await interaction.editReply(`Your ticket has been created: ${channel}`);
}

export async function handleRankSelect(interaction) {
  const [, , robloxIdStr, channelId] = interaction.customId.split(":");
  const robloxId = Number(robloxIdStr);
  const rankNumber = Number(interaction.values[0]);

  const isManager =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles) ||
    queries
      .listWhitelistFor.all(interaction.guildId, interaction.user.id)
      .some((r) => r.role_id === "tag_manager" || r.role_id === "owner");

  if (!isManager) {
    await interaction.reply({
      content: "You don't have permission to assign tags.",
      ephemeral: true,
    });
    return;
  }

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

  await interaction.deferReply();
  try {
    await setRankByNumber(groupId, robloxId, rankNumber);
    await interaction.editReply(
      `${interaction.user} set rank **${rankNumber}** on Roblox user \`${robloxId}\`.`,
    );
    if (channelId) {
      queries.closeTicket.run(Date.now(), channelId);
    }
  } catch (err) {
    await interaction.editReply(`Something went wrong: ${err.message}`);
  }
}

export async function handleSetTagSelect(interaction) {
  const rankNumber = Number(interaction.values[0]);
  if (!robloxConfigured()) {
    await interaction.reply({
      content: "Roblox isn't set up on this bot yet.",
      ephemeral: true,
    });
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId(`settag:apply:${rankNumber}`)
    .setTitle("Enter Your Roblox Username");
  const input = new TextInputBuilder()
    .setCustomId("username")
    .setLabel("Your Roblox username")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(64);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

export async function handleSetTagApply(interaction) {
  const rankNumber = Number(interaction.customId.split(":")[2]);
  const username = interaction.fields.getTextInputValue("username").trim();
  if (!username) {
    await interaction.reply({ content: "You need to enter a username.", ephemeral: true });
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

  // Look up the role name for the embed
  const guildRoles = queries.listGuildRoles.all(interaction.guildId);
  const matchedRole = guildRoles.find((r) => r.roblox_role_id === rankNumber);
  const roleName = matchedRole?.role_name ?? `Rank ${rankNumber}`;

  await interaction.deferReply();
  try {
    const robloxId = await getUserIdFromUsername(username);
    if (!robloxId) {
      await interaction.editReply({ content: `Couldn't find a Roblox user named \`${username}\`.`, ephemeral: true });
      return;
    }
    await setRankByNumber(groupId, robloxId, rankNumber);
    queries.setCooldown.run(interaction.guildId, interaction.user.id, Date.now());

    const embed = new EmbedBuilder()
      .setTitle("Tag Applied!")
      .setColor(0x57f287)
      .addFields(
        { name: "Roblox Username", value: `\`${username}\``, inline: true },
        { name: "Tag", value: roleName, inline: true },
        { name: "Applied By", value: `${interaction.user}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`Something went wrong: ${err.message}`);
  }
}
