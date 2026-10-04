document.getElementById("openOptionsBtn").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const translations = {
    filteringLabel: browser.i18n.getMessage("popup_filtering"),
    channelsLabel: browser.i18n.getMessage("popup_channels"),
    categoriesLabel: browser.i18n.getMessage("popup_categories"),
    tagsLabel: browser.i18n.getMessage("popup_tags"),
    hideBlockButtonsLabel: browser.i18n.getMessage("options_hide_block_buttons"),
    hoverBlockButtonsLabel: browser.i18n.getMessage(
      "options_hover_block_buttons",
    ),
    adaptiveLabel: browser.i18n.getMessage("popup_adaptive_stream"),
    qualityLabel: browser.i18n.getMessage("popup_quality"),
    volumeBoostLabel: browser.i18n.getMessage("popup_volume_boost"),
    openOptionsBtn: browser.i18n.getMessage("popup_open_options"),
  };

  for (const [id, text] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el && text) {
      const bold = el.querySelector("b");
      if (bold) bold.textContent = text;
      else el.textContent = text;
    }
  }

  const data = await browser.storage.local.get([
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

  const enabled = (await browser.storage.local.get("enabled")).enabled ?? true;
  const switchInput = document.getElementById("enableSwitch");
  switchInput.checked = enabled;

  switchInput.addEventListener("change", async () => {
    await browser.storage.local.set({ enabled: switchInput.checked });
  });

  const hideBlockButtonsToggle = document.getElementById(
    "hideBlockButtonsToggle",
  );
  const { disableBlockButtons = false } = await browser.storage.local.get(
    "disableBlockButtons",
  );
  hideBlockButtonsToggle.checked = disableBlockButtons;

  hideBlockButtonsToggle.addEventListener("change", async () => {
    await browser.storage.local.set({
      disableBlockButtons: hideBlockButtonsToggle.checked,
    });
  });

  const hoverBlockButtonsToggle = document.getElementById(
    "hoverBlockButtonsToggle",
  );
  const { blockButtonMode = "static" } =
    await browser.storage.local.get("blockButtonMode");
  hoverBlockButtonsToggle.checked = blockButtonMode === "hover";

  hoverBlockButtonsToggle.addEventListener("change", async () => {
    await browser.storage.local.set({
      blockButtonMode: hoverBlockButtonsToggle.checked ? "hover" : "static",
    });
  });

  const qualityToggle = document.getElementById("qualityToggle");
  const qualitySelect = document.getElementById("qualitySelect");
  const volumeBoostSelect = document.getElementById("volumeBoostSelect");

  const { autoQuality = false, preferredQuality = "1080" } =
    await browser.storage.local.get(["autoQuality", "preferredQuality"]);

  qualityToggle.checked = autoQuality;
  qualitySelect.disabled = !autoQuality;
  volumeBoostSelect.disabled = !autoQuality;

  qualitySelect.value = preferredQuality;

  qualityToggle.addEventListener("change", async () => {
    const isEnabled = qualityToggle.checked;

    qualitySelect.disabled = !isEnabled;
    volumeBoostSelect.disabled = !isEnabled;

    await browser.storage.local.set({ autoQuality: isEnabled });

    notifyContentScript({ action: "updateQualitySettings" });
  });

  qualitySelect.addEventListener("change", async () => {
    await browser.storage.local.set({ preferredQuality: qualitySelect.value });
    notifyContentScript({ action: "setQuality", quality: qualitySelect.value });
  });

  const { volumeBoost = 1 } = await browser.storage.local.get("volumeBoost");
  volumeBoostSelect.value = volumeBoost.toString();

  volumeBoostSelect.addEventListener("change", async () => {
    await browser.storage.local.set({
      volumeBoost: Number(volumeBoostSelect.value),
    });
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
          browser.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      } catch (e) {}
    }
  }

  const promo = document.getElementById("bgEcosystemPromo");
  const btn = document.getElementById("bgPromoClose");

  browser.storage.local.get("hideBgPromo", ({ hideBgPromo }) => {
    if (hideBgPromo === true) {
      if (promo) promo.style.display = "none";
    }
  });

  if (btn && promo) {
    btn.addEventListener("click", () => {
      promo.style.display = "none";
      browser.storage.local.set({ hideBgPromo: true });
    });
  }
});
