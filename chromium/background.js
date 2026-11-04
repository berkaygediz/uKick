// uKick - background (service worker)

const SYNC_ALARM_NAME = "syncRemoteLists";
const DEFAULT_SYNC_INTERVAL = 1440;

const alarmsAvailable = !!(chrome.alarms && chrome.alarms.onAlarm);

chrome.runtime.onInstalled.addListener(() => {
  initializeSync();
  syncStaleLists();
});

chrome.runtime.onStartup.addListener(() => {
  initializeSync();
  syncStaleLists();
});

initializeSync();

if (alarmsAvailable) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM_NAME) {
      syncAllLists();
    }
  });

  chrome.permissions.onAdded.addListener((permissions) => {
    if (permissions.permissions && permissions.permissions.includes("alarms")) {
      initializeSync();
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "syncUrl") {
    syncSingleList(request.url)
      .then((success) => sendResponse({ success }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "syncAll") {
    syncAllLists()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "setSyncInterval") {
    setupSyncAlarm(request.intervalMinutes);
    sendResponse({ success: true });
    return true;
  }
});

async function initializeSync() {
  if (!alarmsAvailable) return;
  const { syncIntervalMinutes } = await chrome.storage.local.get(
    "syncIntervalMinutes",
  );
  const stored = Number(syncIntervalMinutes);
  const interval = stored > 0 ? stored : DEFAULT_SYNC_INTERVAL;

  const existing = await chrome.alarms.get(SYNC_ALARM_NAME);
  if (!existing) {
    await setupSyncAlarm(interval);
  }
}

async function setupSyncAlarm(intervalMinutes) {
  if (!alarmsAvailable) return;
  const interval = Number(intervalMinutes);
  await chrome.alarms.clear(SYNC_ALARM_NAME);
  if (interval > 0) {
    await chrome.alarms.create(SYNC_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: interval,
    });
  }
}

async function syncStaleLists() {
  const { remoteSubscriptions, syncIntervalMinutes } =
    await chrome.storage.local.get([
      "remoteSubscriptions",
      "syncIntervalMinutes",
    ]);
  const subs = remoteSubscriptions || [];
  if (subs.length === 0) return;

  const stored = Number(syncIntervalMinutes);
  const intervalMs = (stored > 0 ? stored : DEFAULT_SYNC_INTERVAL) * 60_000;
  const now = Date.now();

  for (const sub of subs) {
    if (now - (sub.lastSync || 0) >= intervalMs) {
      await syncSingleList(sub.url);
    }
  }
}

async function syncSingleList(url) {
  const storage = await chrome.storage.local.get("remoteSubscriptions");
  const subscriptions = storage.remoteSubscriptions || [];
  const index = subscriptions.findIndex((sub) => sub.url === url);

  if (index === -1) return false;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`[uKick] ${url} -> HTTP ${response.status}`);
      return false;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error(
        `[uKick] ${url} -> beklenen: JSON dizisi, gelen: ${typeof data}`,
      );
      return false;
    }

    const clean = data.filter(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
    if (clean.length !== data.length) {
      console.warn(
        `[uKick] ${url} -> ${data.length - clean.length} geçersiz öğe atlandı`,
      );
    }

    subscriptions[index].data = clean;
    subscriptions[index].lastSync = Date.now();
    subscriptions[index].count = clean.length;

    await chrome.storage.local.set({ remoteSubscriptions: subscriptions });

    return true;
  } catch (error) {
    console.error(`[uKick] fetch hatası (${url}):`, error?.message || error);
    return false;
  }
}

async function syncAllLists() {
  const storage = await chrome.storage.local.get("remoteSubscriptions");
  const subscriptions = storage.remoteSubscriptions || [];

  if (subscriptions.length === 0) {
    return { success: true, total: 0 };
  }

  let successCount = 0;
  let failCount = 0;

  for (const sub of subscriptions) {
    const isSuccess = await syncSingleList(sub.url);
    if (isSuccess) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return {
    success: failCount === 0,
    total: subscriptions.length,
    successCount,
    failCount,
  };
}
