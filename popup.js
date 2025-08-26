document.getElementById("openOptionsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const { blockedChannels, blockedCategories } = await chrome.storage.local.get(
    ["blockedChannels", "blockedCategories"]
  );

  const channels = JSON.parse(blockedChannels || "[]");
  const categories = JSON.parse(blockedCategories || "[]");

  document.getElementById("channelCount").textContent = channels.length;
  document.getElementById("categoryCount").textContent = categories.length;

  const enabled = (await chrome.storage.local.get("enabled")).enabled ?? true;
  const switchInput = document.getElementById("enableSwitch");
  switchInput.checked = enabled;

  switchInput.addEventListener("change", async () => {
    await chrome.storage.local.set({ enabled: switchInput.checked });
  });

  const { autoQuality = false, preferredQuality = "1080" } =
    await chrome.storage.local.get(["autoQuality", "preferredQuality"]);

  qualityToggle.checked = autoQuality;
  qualitySelect.value = preferredQuality;
  qualitySelect.disabled = !autoQuality;

  qualityToggle.addEventListener("change", async () => {
    const isEnabled = qualityToggle.checked;
    qualitySelect.disabled = !isEnabled;
    volumeBoostSelect.disabled = !isEnabled;

    await chrome.storage.local.set({ autoQuality: isEnabled });

    notifyContentScript({ action: "updateQualitySettings" });
  });

  qualitySelect.addEventListener("change", async () => {
    const selectedQuality = qualitySelect.value;

    await chrome.storage.local.set({ preferredQuality: selectedQuality });

    notifyContentScript({ action: "setQuality", quality: selectedQuality });
  });

  const volumeBoostSelect = document.getElementById("volumeBoostSelect");

  const { volumeBoost = 1 } = await chrome.storage.local.get("volumeBoost");
  volumeBoostSelect.value = volumeBoost.toString();

  volumeBoostSelect.addEventListener("change", async () => {
    const boostAmount = Number(volumeBoostSelect.value);
    await chrome.storage.local.set({ volumeBoost: boostAmount });
  });

  function notifyContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id && tab.url?.includes("kick.com")) {
        chrome.tabs.sendMessage(tab.id, message);
      }
    });
  }
});
