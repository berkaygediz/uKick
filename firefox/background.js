browser.runtime.onInstalled.addListener(() => {
  initializeSync();
});

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
    browser.alarms.clear("syncRemoteLists");
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "enableSubscriptions") {
    initializeSync();
    sendResponse({ success: true });
    return true;
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncRemoteLists") {
    syncAllLists();
  }
});

async function initializeSync() {
  const data = await browser.storage.local.get([
    "syncIntervalMinutes",
    "enableSubscriptionsToggle",
  ]);

  if (!data.enableSubscriptionsToggle) {
    await browser.alarms.clear("syncRemoteLists");
    return;
  }

  if (data.syncIntervalMinutes) {
    await setupSyncAlarm(data.syncIntervalMinutes);
  }
}

async function setupSyncAlarm(intervalMinutes) {
  await browser.alarms.clear("syncRemoteLists");
  if (intervalMinutes > 0) {
    await browser.alarms.create("syncRemoteLists", {
      periodInMinutes: intervalMinutes,
    });
  }
}

async function syncSingleList(url) {
  const storage = await browser.storage.local.get("remoteSubscriptions");
  const subscriptions = storage.remoteSubscriptions || [];
  const index = subscriptions.findIndex((sub) => sub.url === url);

  if (index === -1) return false;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) throw new Error("HTTP Error");

    const data = await response.json();

    if (!Array.isArray(data)) return false;

    subscriptions[index].data = data;
    subscriptions[index].lastSync = Date.now();
    subscriptions[index].count = data.length;

    await browser.storage.local.set({ remoteSubscriptions: subscriptions });
    return true;
  } catch (error) {
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
    if (isSuccess) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return {
    success: true,
    total: subscriptions.length,
    successCount,
    failCount,
  };
}
