import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "..", "data.sqlite");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    ticket_panel_channel_id TEXT,
    group_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS tag_manager_roles (
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    closed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    guild_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, roblox_username)
  );

  CREATE TABLE IF NOT EXISTS whitelist (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS set_tag_cooldowns (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    last_used_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS owners (
    user_id TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS guild_roles (
    guild_id TEXT NOT NULL,
    role_name TEXT NOT NULL,
    roblox_role_id INTEGER NOT NULL,
    PRIMARY KEY (guild_id, roblox_role_id)
  );
`);

// Migration: add group_id column to guild_config for existing databases
try {
  db.exec("ALTER TABLE guild_config ADD COLUMN group_id INTEGER");
} catch {
  // Column already exists — no-op
}

export const queries = {
  setPanelChannel: db.prepare(
    `INSERT INTO guild_config (guild_id, ticket_panel_channel_id) VALUES (?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET ticket_panel_channel_id = excluded.ticket_panel_channel_id`,
  ),
  getPanelChannel: db.prepare(
    `SELECT ticket_panel_channel_id FROM guild_config WHERE guild_id = ?`,
  ),
  getGuildConfig: db.prepare(
    `SELECT * FROM guild_config WHERE guild_id = ?`,
  ),
  setGuildGroupId: db.prepare(
    `INSERT INTO guild_config (guild_id, group_id) VALUES (?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET group_id = excluded.group_id`,
  ),

  addTagManagerRole: db.prepare(
    `INSERT OR IGNORE INTO tag_manager_roles (guild_id, role_id) VALUES (?, ?)`,
  ),
  removeTagManagerRole: db.prepare(
    `DELETE FROM tag_manager_roles WHERE guild_id = ? AND role_id = ?`,
  ),
  listTagManagerRoles: db.prepare(
    `SELECT role_id FROM tag_manager_roles WHERE guild_id = ?`,
  ),

  insertTicket: db.prepare(
    `INSERT INTO tickets (guild_id, channel_id, requester_id, roblox_username, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ),
  countTickets: db.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE guild_id = ?`),
  closeTicket: db.prepare(`UPDATE tickets SET closed_at = ? WHERE channel_id = ?`),
  getTicketByChannel: db.prepare(`SELECT * FROM tickets WHERE channel_id = ?`),

  addBlacklist: db.prepare(
    `INSERT OR REPLACE INTO blacklist (guild_id, roblox_username, added_by, added_at)
     VALUES (?, ?, ?, ?)`,
  ),
  removeBlacklist: db.prepare(
    `DELETE FROM blacklist WHERE guild_id = ? AND roblox_username = ?`,
  ),
  isBlacklisted: db.prepare(
    `SELECT 1 AS one FROM blacklist WHERE guild_id = ? AND roblox_username = ?`,
  ),
  listBlacklist: db.prepare(
    `SELECT roblox_username, added_by, added_at FROM blacklist WHERE guild_id = ?`,
  ),

  addWhitelist: db.prepare(
    `INSERT OR IGNORE INTO whitelist (guild_id, user_id, role_id) VALUES (?, ?, ?)`,
  ),
  removeWhitelistAll: db.prepare(
    `DELETE FROM whitelist WHERE guild_id = ? AND user_id = ?`,
  ),
  listWhitelistFor: db.prepare(
    `SELECT role_id FROM whitelist WHERE guild_id = ? AND user_id = ?`,
  ),

  setCooldown: db.prepare(
    `INSERT OR REPLACE INTO set_tag_cooldowns (guild_id, user_id, last_used_at)
     VALUES (?, ?, ?)`,
  ),
  getCooldown: db.prepare(
    `SELECT last_used_at FROM set_tag_cooldowns WHERE guild_id = ? AND user_id = ?`,
  ),
  resetCooldown: db.prepare(
    `DELETE FROM set_tag_cooldowns WHERE guild_id = ? AND user_id = ?`,
  ),

  addOwner: db.prepare(`INSERT OR IGNORE INTO owners (user_id) VALUES (?)`),
  isOwner: db.prepare(`SELECT 1 AS one FROM owners WHERE user_id = ?`),

  addGuildRole: db.prepare(
    `INSERT INTO guild_roles (guild_id, role_name, roblox_role_id) VALUES (?, ?, ?)
     ON CONFLICT(guild_id, roblox_role_id) DO UPDATE SET role_name = excluded.role_name`,
  ),
  removeGuildRole: db.prepare(
    `DELETE FROM guild_roles WHERE guild_id = ? AND roblox_role_id = ?`,
  ),
  listGuildRoles: db.prepare(
    `SELECT role_name, roblox_role_id FROM guild_roles WHERE guild_id = ? ORDER BY roblox_role_id`,
  ),
};

export function ensureGuildOwnerRecorded(guildOwnerId) {
  if (guildOwnerId) queries.addOwner.run(guildOwnerId);
}

/**
 * Returns the Roblox group ID configured for a guild via /id,
 * falling back to the ROBLOX_GROUP_ID env var if none is set.
 * Returns 0 if neither is available.
 */
export function getGuildGroupId(guildId) {
  const row = queries.getGuildConfig.get(guildId);
  if (row?.group_id) return row.group_id;
  // Lazy import to avoid circular deps — config is a plain object
  return Number(process.env.ROBLOX_GROUP_ID ?? 0) || 0;
}
