# Tag Bot

A Discord bot that handles tag requests through tickets and lets staff manage tags on a Roblox group. Everything is done with slash commands.

## What it does

### Ticket system
- `/setupticket channel:#channel` posts a panel in the channel you pick. The panel has a **Tag** button.
- When a user clicks the button, a popup asks for their Roblox username.
- After they submit it, the bot makes a private channel called `tag-request-####`, pings the tag manager roles, and posts an embed with a dropdown to pick the rank.
- A tag manager picks a rank from the dropdown and the bot sets it on Roblox.
- `/closeticket` deletes the ticket channel when you're done.

### Slash commands
- `/setupticket` — set up the ticket panel in a channel.
- `/closeticket` — close the current ticket channel.
- `/tagmanagers add | remove | list` — pick which Discord roles get pinged in tickets and can use the rank dropdown.
- `/set-tag` — pick your rank from the configured tag list (has a cooldown).
- `/strip-tag` — remove a tag from a Roblox username.
- `/tag-wipe` — wipe any tag from a Roblox username.
- `/blacklist add | remove | list` — block a Roblox username from getting tags.
- `/unrole` — set a Roblox user to the lowest rank in the group.
- `/whitelist` — give a stored bot role to a Discord user.
- `/unwhitelist` — remove all stored bot roles from a Discord user.
- `/rolecheck` — check what role a Roblox user has in the group.
- `/roles` — list all roles in the Roblox group.
- `/reset-cd` — reset the `/set-tag` cooldown for a user (owners only).

The bot only uses slash commands. There are no prefix commands.

## Setup

1. Install Node.js 18 or higher.
2. Open the `discord-bot` folder in a terminal and run `npm install`.
3. Copy `.env.example` to `.env` and fill it in.
4. Make a Discord application at https://discord.com/developers/applications
   - Go to the **Bot** tab, hit Reset Token, and put it in `DISCORD_BOT_TOKEN`.
   - The Application ID from the General Information page goes in `DISCORD_CLIENT_ID`.
   - On the Bot tab, turn on **Server Members Intent**.
   - Invite the bot to your server using the `applications.commands` and `bot` scopes. Give it these permissions: **Manage Channels**, **Manage Roles**, **Send Messages**, and **Embed Links**.
5. Roblox setup (only needed if you want the tag commands to actually work):
   - `ROBLOX_GROUP_ID` is the number in your group's URL.
   - `ROBLOX_COOKIE` is the `.ROBLOSECURITY` cookie of an account that can rank people in the group. Use a separate bot account, not your main one.
   - `ROBLOX_RANK_TORN`, `ROBLOX_RANK_TORMENT`, and `ROBLOX_RANK_LOWEST` are the rank numbers (0–255) that match your group ranks.
6. Register the slash commands with `npm run deploy`. If you put a server ID in `DISCORD_GUILD_ID` they show up right away in that server. Leave it blank to deploy them globally (this can take up to an hour to show up).
7. Start the bot with `npm start`.

## Setting things up in your server

Once the bot is in your server:
- Run `/setupticket channel:#some-channel` to post the ticket panel.
- Run `/tagmanagers add role:@YourTagManagerRole` to pick which roles get pinged when a ticket opens. Anyone with one of those roles can also use the rank dropdown.

## Saving data

The bot stores tickets, the blacklist, the whitelist, and cooldowns in `data.sqlite` in the same folder. If you want to wipe everything, just delete that file.

## Note about the Roblox commands

If you don't fill in `ROBLOX_COOKIE` and `ROBLOX_GROUP_ID`, the commands that touch Roblox will reply with a message saying Roblox isn't configured. The ticket system, whitelist, and blacklist all still work without Roblox.
