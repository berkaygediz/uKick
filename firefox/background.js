// uKick - background (firefox)

const SYNC_ALARM_NAME = "syncRemoteLists";
const DEFAULT_SYNC_INTERVAL = 1440;

browser.runtime.onInstalled.addListener(() => {
  initializeSync();
  syncStaleLists();
});

browser.runtime.onStartup.addListener(() => {
  initializeSync();
  syncStaleLists();
});

initializeSync();

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

  if (request.action === "disableSubscriptions") {
    browser.alarms.clear(SYNC_ALARM_NAME);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "enableSubscriptions") {
    initializeSync();
    syncStaleLists();
    sendResponse({ success: true });
    return true;
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    syncAllLists();
  }
});

async function initializeSync() {
  const { syncIntervalMinutes, enableSubscriptionsToggle } =
    await browser.storage.local.get([
      "syncIntervalMinutes",
      "enableSubscriptionsToggle",
    ]);

  if (enableSubscriptionsToggle === false) {
    await browser.alarms.clear(SYNC_ALARM_NAME);
    return;
  }

  const stored = Number(syncIntervalMinutes);
  const interval = stored > 0 ? stored : DEFAULT_SYNC_INTERVAL;

  const existing = await browser.alarms.get(SYNC_ALARM_NAME);
  if (!existing) {
    await setupSyncAlarm(interval);
  }
}

async function setupSyncAlarm(intervalMinutes) {
  const interval = Number(intervalMinutes);
  await browser.alarms.clear(SYNC_ALARM_NAME);
  if (interval > 0) {
    await browser.alarms.create(SYNC_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: interval,
    });
  }
}

async function syncStaleLists() {
  const {
    remoteSubscriptions,
    syncIntervalMinutes,
    enableSubscriptionsToggle,
  } = await browser.storage.local.get([
    "remoteSubscriptions",
    "syncIntervalMinutes",
    "enableSubscriptionsToggle",
  ]);

  if (enableSubscriptionsToggle === false) return;

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
  const storage = await browser.storage.local.get("remoteSubscriptions");
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

    subscriptions[index].data = clean;
    subscriptions[index].lastSync = Date.now();
    subscriptions[index].count = clean.length;

    await browser.storage.local.set({ remoteSubscriptions: subscriptions });

    return true;
  } catch (error) {
    console.error(`[uKick] fetch hatası (${url}):`, error?.message || error);
    return false;
  }
}

async function syncAllLists() {
  const storage = await browser.storage.local.get("remoteSubscriptions");
  const subscriptions = storage.remoteSubscriptions || [];

  if (subscriptions.length === 0) {
    return { success: true, total: 0 };
  }

  let successCount = 0;
  let failCount = 0;

  for (const sub of subscriptions) {
    const isSuccess = await syncSingleList(sub.url);
    if (isSuccess) successCount++;
    else failCount++;
  }

  return {
    success: failCount === 0,
    total: subscriptions.length,
    successCount,
    failCount,
  };
}
