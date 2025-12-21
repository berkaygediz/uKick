document.getElementById("openOptionsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const { blockedChannels, blockedCategories, blockedTags } = await chrome.storage.local.get(
    ["blockedChannels", "blockedCategories", "blockedTags"]
  );

  const translations = {
    filteringLabel: chrome.i18n.getMessage("popup_filtering"),
    statusTitle: chrome.i18n.getMessage("popup_status"),
    channelsLabel: chrome.i18n.getMessage("popup_channels"),
    categoriesLabel: chrome.i18n.getMessage("popup_categories"),
    tagsLabel: chrome.i18n.getMessage("popup_tags"),
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
  const tags = JSON.parse(blockedTags || "[]");

  document.getElementById("channelCount").textContent = channels.length;
  document.getElementById("categoryCount").textContent = categories.length;
  document.getElementById("tagsCount").textContent = tags.length;

  // Enable toggle
  const enabled = (await chrome.storage.local.get("enabled")).enabled ?? true;
  const switchInput = document.getElementById("enableSwitch");
  switchInput.checked = enabled;

  switchInput.addEventListener("change", async () => {
    await chrome.storage.local.set({ enabled: switchInput.checked });
  });


  const qualityToggle = document.getElementById("qualityToggle");
  const qualitySelect = document.getElementById("qualitySelect");
  const volumeBoostSelect = document.getElementById("volumeBoostSelect");

  const DEFAULT_QUALITIES = ["160", "360", "480", "720", "1080", "1440", "2160"];

  const { autoQuality = false, preferredQuality = "1080" } =
    await chrome.storage.local.get(["autoQuality", "preferredQuality"]);

  qualityToggle.checked = autoQuality;
  qualitySelect.disabled = !autoQuality;
  volumeBoostSelect.disabled = !autoQuality;

  if (!qualitySelect.children.length) {
    for (const q of DEFAULT_QUALITIES) {
      const opt = document.createElement("option");
      opt.value = q;
      opt.textContent = q + "p";
      qualitySelect.appendChild(opt);
    }
  }

  if (DEFAULT_QUALITIES.includes(preferredQuality)) {
    qualitySelect.value = preferredQuality;
  }

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

  const promo = document.getElementById("bgEcosystemPromo");
  const btn = document.getElementById("bgPromoClose");

  // Storage'dan oku → gizle
  chrome.storage.local.get("hideBgPromo", ({ hideBgPromo }) => {
    if (hideBgPromo === true) {
      if (promo) promo.style.display = "none";
    }
  });

  // Butona tıklayınca kapat + kaydet
  if (btn && promo) {
    btn.addEventListener("click", () => {
      promo.style.display = "none";
      chrome.storage.local.set({ hideBgPromo: true });
    });
  }

});
