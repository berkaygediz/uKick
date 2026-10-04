// uKick — main

import { injectButtonStyles } from "./core/styles.js";
import { clearSearchHistory, debounce } from "./core/utils.js";
import { toggleActiveStats } from "./features/activeusers.js";
import {
  processCards,
  processCategoryCards,
  processCategoryPageHeader,
  removeBlockedCards,
  removeBlockedCategoryCards,
} from "./features/cards.js";
import {
  observeBlockedChatMessages,
  observeChatUsernames,
  stopChatBlocking,
} from "./features/chat.js";
import { processChatLayout } from "./features/chatlayout.js";
import { DanmakuEngine, processDanmaku } from "./features/danmaku.js";
import {
  startKeyboardVolume,
  stopKeyboardVolume,
} from "./features/keyboardvolume.js";
import { initPlatformRedirect } from "./features/platform.js";
import { initAutoQualityControl } from "./features/quality.js";
import {
  addBlockButtonOnChannelPage,
  processSidebarChannels,
  removeSidebarBlockedChannels,
} from "./features/sidebar.js";
import { processTagButtons } from "./features/tags.js";
import {
  applyPaletteTheme,
  setPaletteRunning,
  startWebsitePalette,
  stopWebsitePalette,
  themepalettes,
} from "./features/theme.js";
import {
  enableAudioContextOnUserGesture,
  setupAudioContext,
} from "./features/volume.js";

injectButtonStyles();
initAutoQualityControl();

async function startUIFeatures() {
  processChatLayout();
  try {
    await processDanmaku();
  } catch {}
}

async function startFilteringFeatures() {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  if (!enabled) return;

  setupAudioContext();
  await processCards();
  await processSidebarChannels();
  await processCategoryCards();
  await processCategoryPageHeader();
  await processTagButtons();
  await removeBlockedCards();
  await removeSidebarBlockedChannels();
  await removeBlockedCategoryCards();
  await addBlockButtonOnChannelPage();
  await observeBlockedChatMessages();
  await observeChatUsernames();
}

function extensionContextDead() {
  try {
    return !chrome.runtime || !chrome.runtime.id;
  } catch {
    return true;
  }
}

function restoreHiddenElements() {
  document
    .querySelectorAll(
      ".group\\/card, [data-testid^='sidebar-recommended-channel-'], div.flex.w-full.shrink-0.grow-0.flex-col",
    )
    .forEach((item) => (item.style.display = ""));
  const vp = document.getElementById("video-player");
  if (vp) vp.style.display = "";
}

async function updateBlockButtonsVisibility() {
  const { enabled = true, disableBlockButtons = false } =
    await chrome.storage.local.get(["enabled", "disableBlockButtons"]);
  document.documentElement.classList.toggle(
    "ukick-hide-block-buttons",
    !enabled || disableBlockButtons === true,
  );
}

async function updateBlockButtonMode() {
  const { blockButtonMode = "static" } =
    await chrome.storage.local.get("blockButtonMode");
  document.documentElement.classList.toggle(
    "ukick-buttons-hover",
    blockButtonMode === "hover",
  );
}

(async () => {
  if (await initPlatformRedirect()) return;

  const settings = await chrome.storage.local.get([
    "enabled",
    "disableSearchHistory",
    "disableActiveUsers",
    "enableKeyboardVolume",
    "disableWebsitePalette",
  ]);
  const {
    enabled = true,
    disableSearchHistory = false,
    disableActiveUsers = false,
    enableKeyboardVolume = false,
    disableWebsitePalette = false,
  } = settings;

  if (disableSearchHistory) clearSearchHistory();
  toggleActiveStats(!disableActiveUsers);
  if (enableKeyboardVolume) startKeyboardVolume();
  if (!disableWebsitePalette) startWebsitePalette();

  await updateBlockButtonsVisibility();
  await updateBlockButtonMode();

  const observer = new MutationObserver(
    debounce(async () => {
      if (extensionContextDead()) {
        observer.disconnect();
        return;
      }
      await startUIFeatures();
      await startFilteringFeatures();
    }, 50),
  );
  observer.observe(document.body, { childList: true, subtree: true });

  await startUIFeatures();
  if (enabled) await startFilteringFeatures();
  enableAudioContextOnUserGesture();
})();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if ("enabled" in changes) {
    if (changes.enabled.newValue) startFilteringFeatures();
    else restoreHiddenElements();
    updateBlockButtonsVisibility();
  }

  if ("disableBlockButtons" in changes) updateBlockButtonsVisibility();

  if ("blockButtonMode" in changes) updateBlockButtonMode();

  if (
    "disableSearchHistory" in changes &&
    changes.disableSearchHistory.newValue === true
  )
    clearSearchHistory();

  if ("enableDanmaku" in changes) {
    if (changes.enableDanmaku.newValue) processDanmaku();
    else DanmakuEngine.stop();
  }

  if ("disableActiveUsers" in changes)
    toggleActiveStats(!changes.disableActiveUsers.newValue);

  if ("enableChatBlocking" in changes) {
    if (changes.enableChatBlocking.newValue) {
      observeBlockedChatMessages();
      observeChatUsernames();
    } else {
      stopChatBlocking();
    }
  }

  if ("enableKeyboardVolume" in changes) {
    if (changes.enableKeyboardVolume.newValue) startKeyboardVolume();
    else stopKeyboardVolume();
  }

  if ("disableWebsitePalette" in changes) {
    if (changes.disableWebsitePalette.newValue) stopWebsitePalette();
    else startWebsitePalette();
  }

  if ("themePalette" in changes) {
    chrome.storage.local.get("disableWebsitePalette", (res) => {
      if (!(res.disableWebsitePalette ?? true)) {
        const colors =
          themepalettes[changes.themePalette.newValue || "original"] ||
          themepalettes.original;
        applyPaletteTheme(colors.bg, colors.text);
        setPaletteRunning(true);
      }
    });
  }
});
