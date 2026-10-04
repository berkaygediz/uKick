// uKick — quality

import { sleep } from "../core/utils.js";

const SETTINGS_LABELS = [
  "Settings", // English
  "Ajustes", // Spanish
  "Configurações", // Portuguese
  "Paramètres", // French
  "Einstellungen", // German
  "Impostazioni", // Italian
  "Ayarlar", // Turkish
  "Pengaturan", // Indonesian
  "设置", // Chinese
  "設定", // Japanese
  "설정", // Korean
  "إعدادات", // Arabic
  "Asetukset", // Finnish
  "Ustawienia", // Polish
  "Настройки", // Russian
  "Cài đặt", // Vietnamese
  "Nastavení", // Czech
  "הגדרות", // Hebrew
];

let lastKickUrl = location.href;
let lastAppliedQuality = null;
let persistTimer = null;

let qualityInitialized = false;

export async function initAutoQualityControl() {
  sessionStorage.removeItem("quality_reload_done");

  const settings = await getQualitySettings();

  if (
    settings.autoQuality &&
    settings.preferredQuality &&
    String(settings.preferredQuality) !== "0"
  ) {
    persistSessionQuality(String(settings.preferredQuality));
    lastAppliedQuality = String(settings.preferredQuality);
  } else if (!settings.autoQuality) {
    try {
      sessionStorage.removeItem("stream_quality");
    } catch (e) {}
  }

  if (settings.autoQuality && isKickStreamUrl(location.href)) {
    waitForPlayerAndApply(settings.preferredQuality, false);
  }

  if (qualityInitialized) return;
  qualityInitialized = true;

  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastKickUrl) {
      lastKickUrl = currentUrl;
      if (settings.autoQuality && isKickStreamUrl(currentUrl)) {
        waitForPlayerAndApply(settings.preferredQuality, false);
      }
    }
  }).observe(document, { subtree: true, childList: true });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "setQuality") location.reload();
    if (request.action === "updateQualitySettings") {
      getQualitySettings().then((s) => {
        if (s.autoQuality && isKickStreamUrl(location.href))
          waitForPlayerAndApply(s.preferredQuality, false);
      });
    }
  });
}

function isKickStreamUrl(url) {
  return /^https:\/\/(www\.)?kick\.com\/[^\/?#]+/.test(url);
}

function persistSessionQuality(pref) {
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }
  if (!pref) return;

  const setQuality = () => {
    try {
      sessionStorage.setItem("stream_quality", String(pref));
    } catch (e) {}
  };

  setQuality();

  const start = Date.now();
  const maxMs = 10_000;
  persistTimer = setInterval(() => {
    if (Date.now() - start > maxMs) {
      clearInterval(persistTimer);
      persistTimer = null;
      return;
    }
    const cur = sessionStorage.getItem("stream_quality");
    const video = document.querySelector("video");
    const qualityEls = document.querySelectorAll(
      '[data-testid="player-quality-option"], [role="menuitemradio"], [role="menuitem"]',
    );
    if (cur === String(pref) && (video || qualityEls.length > 0)) {
      clearInterval(persistTimer);
      persistTimer = null;
      return;
    }
    setQuality();
  }, 400);
}

async function waitForPlayerAndApply(preferredQuality, shouldReload) {
  const maxWait = 15000;
  const start = Date.now();
  persistSessionQuality(preferredQuality);

  while (Date.now() - start < maxWait) {
    if (document.querySelector("video")) break;
    await sleep(300);
  }
  applyKickQuality(preferredQuality, shouldReload);
}

async function applyKickQuality(preferredQuality, shouldReload) {
  if (!preferredQuality || String(preferredQuality) === "0") return;

  const pref = parseInt(String(preferredQuality).replace(/\D/g, ""), 10);
  if (isNaN(pref) || pref === 0) return;

  sessionStorage.setItem("stream_quality", String(pref));
  persistSessionQuality(pref);
  lastAppliedQuality = String(pref);

  const video =
    document.querySelector("video") || document.getElementById("video-player");

  if (!video) {
    triggerReloadIfNeeded(shouldReload);
    return;
  }

  const safeClick = (element) => {
    if (!element) return false;
    try {
      element.click();
      return true;
    } catch (e) {
      try {
        element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      } catch (err) {
        return false;
      }
    }
  };

  const r = video.getBoundingClientRect();
  ["mouseenter", "mouseover", "mousemove"].forEach((t) => {
    video.dispatchEvent(
      new MouseEvent(t, {
        bubbles: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      }),
    );
  });

  await sleep(700);

  let qualitySet = false;
  let attempt = 0;
  const maxAttempts = 10;

  while (!qualitySet && attempt < maxAttempts) {
    attempt++;
    const settingsBtn = findSettingsButton();

    if (!settingsBtn) {
      await sleep(500);
      continue;
    }

    safeClick(settingsBtn);
    await sleep(600);

    const qualityEls = Array.from(
      document.querySelectorAll(
        '[data-testid="player-quality-option"], [role="menuitemradio"], [role="menuitem"], li, div[class*="option"]',
      ),
    ).filter((el) => /^\d+/.test((el.textContent || "").trim()));

    const available = qualityEls
      .map((el) => (el.textContent || "").toLowerCase().trim())
      .map((t) => t.replace(/auto|fps|p60|p|source/g, "").trim())
      .filter((t) => /^\d+$/.test(t))
      .map((t) => parseInt(t, 10));

    if (!available.length) {
      safeClick(settingsBtn);
      await sleep(500);
      continue;
    }
    available.sort((a, b) => b - a);

    const target =
      available.find((q) => q <= pref) || available[available.length - 1];

    if (lastAppliedQuality === String(target)) {
      sessionStorage.setItem("stream_quality", String(target));
      qualitySet = true;
      safeClick(video);
      break;
    }

    const targetEl = qualityEls.find((el) =>
      (el.textContent || "").toLowerCase().includes(String(target)),
    );

    if (targetEl) {
      safeClick(targetEl);
      sessionStorage.setItem("stream_quality", String(target));
      lastAppliedQuality = String(target);
      qualitySet = true;
    } else {
      safeClick(settingsBtn);
      await sleep(500);
    }
  }
  triggerReloadIfNeeded(shouldReload);
}

function findSettingsButton() {
  for (const btn of document.querySelectorAll("button[aria-label]")) {
    if (
      SETTINGS_LABELS.some((l) =>
        (btn.getAttribute("aria-label") || "")
          .toLowerCase()
          .includes(l.toLowerCase()),
      )
    )
      return btn;
  }
  return (
    document.querySelector(
      'button[class*="settings"], button[class*="cog"], .vjs-icon-cog',
    ) || document.querySelector('button[class*="settings"]')
  );
}

function triggerReloadIfNeeded(shouldReload) {
  if (shouldReload && !sessionStorage.getItem("quality_reload_done")) {
    sessionStorage.setItem("quality_reload_done", "true");
    location.reload();
  }
}

function getQualitySettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["autoQuality", "preferredQuality"], (data) => {
      resolve({
        autoQuality: data.autoQuality ?? false,
        preferredQuality: data.preferredQuality ?? "1080",
      });
    });
  });
}
