// uKick — storage

import { normalizeData } from "./utils.js";

function readBlockedList(storageKey, subscriptionType) {
  return new Promise((resolve) => {
    browser.storage.local.get([storageKey, "remoteSubscriptions"], (result) => {
      try {
        const local = JSON.parse(result[storageKey] || "[]");
        const remote = (result.remoteSubscriptions || [])
          .filter((s) => s.type === subscriptionType && Array.isArray(s.data))
          .flatMap((s) => s.data);
        resolve([...new Set([...local, ...remote])].map(normalizeData));
      } catch {
        resolve([]);
      }
    });
  });
}

function writeBlockedList(storageKey, list) {
  return new Promise((resolve) => {
    browser.storage.local.set({ [storageKey]: JSON.stringify(list) }, resolve);
  });
}

async function addEntry(storageKey, subscriptionType, entry) {
  const list = await readBlockedList(storageKey, subscriptionType);
  const normalized = normalizeData(entry);
  if (!list.includes(normalized)) {
    list.push(normalized);
    await writeBlockedList(storageKey, list);
  }
}

export function getBlockedChannels() {
  return readBlockedList("blockedChannels", "channels");
}

export function getBlockedCategories() {
  return readBlockedList("blockedCategories", "categories");
}

export function getBlockedTags() {
  return readBlockedList("blockedTags", "tags");
}

export function saveBlockedChannels(list) {
  return writeBlockedList("blockedChannels", list);
}

export function saveBlockedCategories(list) {
  return writeBlockedList("blockedCategories", list);
}

export function blockChannel(username) {
  return addEntry("blockedChannels", "channels", username);
}

export function unblockChannel(username) {
  return (async () => {
    username = normalizeData(username);
    const list = await readBlockedList("blockedChannels", "channels");
    await writeBlockedList(
      "blockedChannels",
      list.filter((u) => u !== username),
    );
  })();
}

export function blockCategory(categoryName) {
  return addEntry("blockedCategories", "categories", categoryName);
}

export function blockTag(tagName) {
  return addEntry("blockedTags", "tags", tagName);
}
