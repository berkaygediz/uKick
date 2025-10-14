document.getElementById("openOptionsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const { blockedChannels, blockedCategories } = await chrome.storage.local.get(
    ["blockedChannels", "blockedCategories"]
  );

  const translations = {
    filteringLabel: chrome.i18n.getMessage("popup_filtering"),
    statusTitle: chrome.i18n.getMessage("popup_status"),
    channelsLabel: chrome.i18n.getMessage("popup_channels"),
    categoriesLabel: chrome.i18n.getMessage("popup_categories"),
    adaptiveLabel: chrome.i18n.getMessage("popup_adaptive_stream"),
    qualityLabel: chrome.i18n.getMessage("popup_quality"),
    volumeBoostLabel: chrome.i18n.getMessage("popup_volume_boost"),
    openOptionsBtn: chrome.i18n.getMessage("popup_open_options"),
  };

  for (const [id, text] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el && text) {
      const bold = el.querySelector("b");
      if (bold) bold.textContent = text;
      else el.textContent = text;
    }
  }

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

  const quettaPromo = document.getElementById("quettaPromo");
  const hideQuettaBtn = document.getElementById("hideQuettaBtn");

  chrome.storage.local.get("hideQuettaPromo", ({ hideQuettaPromo = false }) => {
    if (hideQuettaPromo && quettaPromo) quettaPromo.style.display = "none";
  });

  if (hideQuettaBtn) {
    hideQuettaBtn.addEventListener("click", async () => {
      if (quettaPromo) quettaPromo.style.display = "none";
      await chrome.storage.local.set({ hideQuettaPromo: true });
    });
  }

});
