import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${name}: ${v}`);
  return n;
}

export const config = {
  token: required("DISCORD_BOT_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: process.env.DISCORD_GUILD_ID || null,
  roblox: {
    groupId: num("ROBLOX_GROUP_ID", 0),
    cookie: process.env.ROBLOX_COOKIE || "",
    ranks: {
      torn: num("ROBLOX_RANK_TORN", 0),
      torment: num("ROBLOX_RANK_TORMENT", 0),
      lowest: num("ROBLOX_RANK_LOWEST", 1),
    },
  },
  setTagCooldownSeconds: num("SET_TAG_COOLDOWN_SECONDS", 86400),
};

export function robloxConfigured() {
  return Boolean(config.roblox.cookie);
}
