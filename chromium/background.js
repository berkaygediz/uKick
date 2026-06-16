chrome.runtime.onInstalled.addListener(() => {
  initializeSync();
});

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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncRemoteLists") {
    syncAllLists();
  }
});

function initializeSync() {
  chrome.storage.local.get(["syncIntervalMinutes"], (data) => {
    if (data.syncIntervalMinutes) {
      setupSyncAlarm(data.syncIntervalMinutes);
    }
  });
}

function setupSyncAlarm(intervalMinutes) {
  chrome.alarms.clear("syncRemoteLists");
  if (intervalMinutes > 0) {
    chrome.alarms.create("syncRemoteLists", {
      periodInMinutes: intervalMinutes,
    });
  }
}

async function syncSingleList(url) {
  const storage = await chrome.storage.local.get("remoteSubscriptions");
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

    await chrome.storage.local.set({ remoteSubscriptions: subscriptions });
    return true;
  } catch (error) {
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
    success: true,
    total: subscriptions.length,
    successCount,
    failCount,
  };
}
