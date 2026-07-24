document.getElementById("openOptionsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const translations = {
    filteringLabel: chrome.i18n.getMessage("popup_filtering"),
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

  const data = await chrome.storage.local.get([
    "blockedChannels",
    "blockedCategories",
    "blockedTags",
    "remoteSubscriptions",
  ]);

  const localChannels = JSON.parse(data.blockedChannels || "[]");
  const localCategories = JSON.parse(data.blockedCategories || "[]");
  const localTags = JSON.parse(data.blockedTags || "[]");
  const subs = data.remoteSubscriptions || [];

  let remoteChannels = [],
    remoteCategories = [],
    remoteTags = [];

  try {
    remoteChannels = subs
      .filter((s) => s.type === "channels" && Array.isArray(s.data))
      .flatMap((s) => s.data);
    remoteCategories = subs
      .filter((s) => s.type === "categories" && Array.isArray(s.data))
      .flatMap((s) => s.data);
    remoteTags = subs
      .filter((s) => s.type === "tags" && Array.isArray(s.data))
      .flatMap((s) => s.data);
  } catch (e) {
    console.error("Popup remote list parse error:", e);
  }

  document.getElementById("channelCount").textContent = new Set([
    ...localChannels,
    ...remoteChannels,
  ]).size;

  document.getElementById("categoryCount").textContent = new Set([
    ...localCategories,
    ...remoteCategories,
  ]).size;

  document.getElementById("tagsCount").textContent = new Set([
    ...localTags,
    ...remoteTags,
  ]).size;

  const enabled = (await chrome.storage.local.get("enabled")).enabled ?? true;
  const switchInput = document.getElementById("enableSwitch");
  switchInput.checked = enabled;

  switchInput.addEventListener("change", async () => {
    await chrome.storage.local.set({ enabled: switchInput.checked });
  });

  const qualityToggle = document.getElementById("qualityToggle");
  const qualitySelect = document.getElementById("qualitySelect");
  const volumeBoostSelect = document.getElementById("volumeBoostSelect");

  const DEFAULT_QUALITIES = [
    "160",
    "360",
    "480",
    "720",
    "1080",
    "1440",
    "2160",
  ];

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

  async function notifyContentScript(message) {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (tab?.id && tab.url) {
      try {
        const hostname = new URL(tab.url).hostname;
        if (hostname === "kick.com" || hostname.endsWith(".kick.com")) {
          browser.tabs.sendMessage(tab.id, message);
        }
      } catch (e) {}
    }
  }

  const promo = document.getElementById("bgEcosystemPromo");
  const btn = document.getElementById("bgPromoClose");

  chrome.storage.local.get("hideBgPromo", ({ hideBgPromo }) => {
    if (hideBgPromo === true) {
      if (promo) promo.style.display = "none";
    }
  });

  if (btn && promo) {
    btn.addEventListener("click", () => {
      promo.style.display = "none";
      chrome.storage.local.set({ hideBgPromo: true });
    });
  }
});
