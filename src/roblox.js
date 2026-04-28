import noblox from "noblox.js";
import { config, robloxConfigured } from "./config.js";

let loggedIn = false;
let loginPromise = null;

async function ensureLogin() {
  if (!robloxConfigured()) {
    throw new Error(
      "Roblox is not configured. Set ROBLOX_COOKIE and ROBLOX_GROUP_ID in your .env.",
    );
  }
  if (loggedIn) return;
  if (!loginPromise) {
    loginPromise = noblox
      .setCookie(config.roblox.cookie)
      .then((user) => {
        loggedIn = true;
        console.log(`[roblox] logged in as ${user.UserName} (${user.UserID})`);
      })
      .catch((err) => {
        loginPromise = null;
        throw err;
      });
  }
  await loginPromise;
}

export async function getUserIdFromUsername(username) {
  await ensureLogin();
  return noblox.getIdFromUsername(username);
}

export async function getUserInfo(userId) {
  await ensureLogin();
  return noblox.getPlayerInfo(userId);
}

export async function getThumbnailUrl(userId) {
  try {
    await ensureLogin();
    const result = await noblox.getPlayerThumbnail(userId, "150x150", "png", false, "headshot");
    return result?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

export async function getRolesInGroup(groupId) {
  await ensureLogin();
  return noblox.getRoles(groupId);
}

export async function getRankInGroup(groupId, userId) {
  await ensureLogin();
  return noblox.getRankInGroup(groupId, userId);
}

export async function getRoleInGroup(groupId, userId) {
  await ensureLogin();
  return noblox.getRoleInGroup(groupId, userId);
}

export async function setRankByNumber(groupId, userId, rankNumber) {
  await ensureLogin();
  return noblox.setRank(groupId, userId, rankNumber);
}

export async function exileUserFromGroup(groupId, userId) {
  await ensureLogin();
  return noblox.exile(groupId, userId);
}

export { robloxConfigured };
