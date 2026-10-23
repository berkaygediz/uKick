// uKick - quality

import { sleep } from "../core/utils.js";

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
      getQualitySettings().then((s) => {
        if (s.autoQuality && isKickStreamUrl(currentUrl))
          waitForPlayerAndApply(s.preferredQuality, false);
      });
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

function getPlayerVideo() {
  return (
    Array.from(document.querySelectorAll("video")).find(
      (v) => v.getBoundingClientRect().width > 100,
    ) || document.querySelector("video")
  );
}

function persistSessionQuality(pref) {
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }
  if (!pref) return;

  try {
    sessionStorage.setItem("stream_quality", String(pref));
  } catch (e) {}

  const start = Date.now();
  const maxMs = 10_000;
  persistTimer = setInterval(() => {
    if (Date.now() - start > maxMs || getPlayerVideo()) {
      clearInterval(persistTimer);
      persistTimer = null;
    }
  }, 400);
}

async function waitForPlayerAndApply(preferredQuality, shouldReload) {
  const maxWait = 15000;
  const start = Date.now();
  persistSessionQuality(preferredQuality);

  while (Date.now() - start < maxWait) {
    if (getPlayerVideo()) break;
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

  /*

  if (!getPlayerVideo()) {
    triggerReloadIfNeeded(shouldReload);
    return;
  }

  let qualitySet = false;
  let attempt = 0;
  const maxAttempts = 10;

  while (!qualitySet && attempt < maxAttempts) {
    attempt++;

    if (findAuthModal()) {
      dismissAuthModal();
      return;
    }

    const settingsBtn = findSettingsButton();

    if (!settingsBtn) {
      await sleep(500);
      continue;
    }

    smartClick(settingsBtn);
    await sleep(600);

    if (findAuthModal()) {
      dismissAuthModal();
      return;
    }

    const parsed = parseQualityMenu();

    if (!parsed.length) {
      smartClick(settingsBtn);
      await sleep(500);
      continue;
    }

    const available = parsed
      .filter((p) => !p.gated)
      .map((p) => p.num)
      .sort((a, b) => b - a);

    if (!available.length) {
      smartClick(settingsBtn);
      await sleep(500);
      continue;
    }

    const target =
      available.find((q) => q <= pref) || available[available.length - 1];

    const checked = parsed.find(
      (p) => p.el.getAttribute("aria-checked") === "true",
    );

    if (checked && checked.num === target) {
      sessionStorage.setItem("stream_quality", String(target));
      lastAppliedQuality = String(target);
      qualitySet = true;
      smartClick(settingsBtn);
      break;
    }

    const targetP = parsed.find((p) => p.num === target && !p.gated);

    if (targetP && !isLoggedOut() && target === pref) {
      smartClick(targetP.el);
      sessionStorage.setItem("stream_quality", String(target));
      lastAppliedQuality = String(target);
      qualitySet = true;
    } else {
      qualitySet = true;
      smartClick(settingsBtn);
    }
  }

  */

  triggerReloadIfNeeded(shouldReload);
}

/*

function parseQualityMenu() {
  return Array.from(
    document.querySelectorAll(
      '[data-testid="player-quality-option"], [role="menuitemradio"]',
    ),
  )
    .map((el) => {
      const span = el.querySelector("span");
      const label = ((span && span.textContent) || el.textContent || "").trim();
      const gated = span
        ? (el.textContent || "").trim() !== label
        : false;
      const m = label.match(/(\d{3,4})/);
      return { el, gated, num: m ? parseInt(m[1], 10) : null };
    })
    .filter((p) => p.num > 0);
}

function findSettingsButton() {
  const video = getPlayerVideo();
  if (!video) return null;

  for (const svg of document.querySelectorAll(
    'svg[data-ds-icon="Settings"]',
  )) {
    const btn = svg.closest("button");
    if (!btn) continue;
    let col = video.parentElement;
    while (col) {
      if (col.contains(btn)) return btn;
      if (col.tagName === "MAIN") break;
      col = col.parentElement;
    }
  }
  return null;
}

function findAuthModal() {
  return (
    Array.from(
      document.querySelectorAll('[role="dialog"], [aria-modal="true"]'),
    ).find(
      (d) =>
        d.querySelector('input[type="password"]') &&
        d.getBoundingClientRect().width > 100,
    ) || null
  );
}

function dismissAuthModal() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function smartClick(element) {
  if (!element) return false;
  try {
    const r = element.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      clientX: r.x + r.width / 2 || 100,
      clientY: r.y + r.height / 2 || 100,
      pointerId: 1,
      pointerType: "mouse",
    };
    try {
      element.dispatchEvent(new PointerEvent("pointerdown", opts));
      element.dispatchEvent(new PointerEvent("pointerup", opts));
    } catch (e) {}
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
}

function isLoggedOut() {
  return !!document.querySelector('[data-testid="login"]');
}

*/

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
