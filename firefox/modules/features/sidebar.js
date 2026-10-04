// uKick — sidebar

import {
  blockChannel,
  getBlockedCategories,
  getBlockedChannels,
  unblockChannel,
} from "../core/storage.js";
import { normalizeData, showToast } from "../core/utils.js";

const ICON_BLOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const ICON_UNBLOCK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

export async function removeSidebarBlockedChannels() {
  const blockedChannels = (await getBlockedChannels()).map(normalizeData);
  const blockedCategories = (await getBlockedCategories()).map(normalizeData);

  document
    .querySelectorAll('[data-testid^="sidebar-recommended-channel-"]')
    .forEach((item) => {
      let hide = false;
      const anchor =
        item.querySelector('a[href^="/"]') || item.closest('a[href^="/"]');
      if (anchor) {
        const username = normalizeData(
          anchor.getAttribute("href").split("/")[1],
        );
        if (blockedChannels.includes(username)) hide = true;
      }

      const categoryEl = item.querySelector("span.text-xs.font-bold");
      if (
        categoryEl &&
        blockedCategories.includes(normalizeData(categoryEl.textContent))
      )
        hide = true;

      item.style.display = hide ? "none" : "";
    });
}

function renderChannelBlockBtn(btn, username, isBlocked) {
  btn.dataset.username = username;
  btn.dataset.blocked = isBlocked ? "1" : "0";
  btn.innerHTML = isBlocked ? ICON_UNBLOCK : ICON_BLOCK;
  btn.classList.toggle("ukick-unblock", isBlocked);
  btn.title = isBlocked
    ? browser.i18n.getMessage("btn_unblock_channel") || "Unblock channel"
    : browser.i18n.getMessage("btn_block_channel");
}

export async function addBlockButtonOnChannelPage() {
  const usernameEl = document.getElementById("channel-username");
  if (!usernameEl) return;

  const username = usernameEl.textContent.trim();
  const blocked = await getBlockedChannels();
  const isBlocked = blocked.includes(normalizeData(username));

  const parent = usernameEl.parentElement;

  let btn = document.getElementById("channelPageBlockBtn");

  if (btn && btn.parentElement !== parent) {
    btn.remove();
    btn = null;
  }

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "channelPageBlockBtn";
    btn.className = "ukick-x-btn ukick-btn-channel";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const currentUsername = btn.dataset.username;
      if (!currentUsername) return;

      const currentlyBlocked = (await getBlockedChannels()).includes(
        normalizeData(currentUsername),
      );

      if (currentlyBlocked) {
        await unblockChannel(currentUsername);
        showToast(
          browser.i18n.getMessage("alert_channel_unblocked", currentUsername) ||
            "Unblocked: " + currentUsername,
        );
        const vp = document.getElementById("video-player");
        if (vp) {
          vp.style.display = "";
          if (typeof vp.play === "function") vp.play().catch(() => {});
        }
        renderChannelBlockBtn(btn, currentUsername, false);
      } else {
        await blockChannel(currentUsername);
        showToast(
          browser.i18n.getMessage("alert_channel_blocked", currentUsername) ||
            currentUsername,
        );
        const vp = document.getElementById("video-player");
        if (vp) {
          vp.style.display = "none";
          if (typeof vp.pause === "function") vp.pause();
        }
        renderChannelBlockBtn(btn, currentUsername, true);
      }
    });

    parent.style.display = "inline-flex";
    parent.style.alignItems = "center";
    parent.appendChild(btn);
  }

  if (
    btn.dataset.blocked !== (isBlocked ? "1" : "0") ||
    btn.dataset.username !== username
  ) {
    renderChannelBlockBtn(btn, username, isBlocked);
  }

  const videoPlayer = document.getElementById("video-player");
  if (videoPlayer) {
    if (isBlocked) {
      videoPlayer.style.display = "none";
      if (typeof videoPlayer.pause === "function") videoPlayer.pause();
    } else {
      videoPlayer.style.display = "";
    }
  }
}

export async function processSidebarChannels() {
  const blocked = await getBlockedChannels();
  const { disableBlockButtons = false } = await browser.storage.local.get(
    "disableBlockButtons",
  );

  document
    .querySelectorAll('[data-testid^="sidebar-recommended-channel-"]')
    .forEach((anchor) => {
      const username = anchor.getAttribute("href")?.split("/")[1];
      if (!username) return;

      if (blocked.includes(normalizeData(username))) {
        anchor.style.display = "none";
        return;
      }

      if (disableBlockButtons || anchor.querySelector(".sidebar-block-btn"))
        return;

      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.className = "ukick-x-btn ukick-btn-sidebar sidebar-block-btn";
      btn.title = browser.i18n.getMessage("btn_block_channel");

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await blockChannel(username);
        await removeSidebarBlockedChannels();
        await processSidebarChannels();
      });

      anchor.style.position = "relative";
      anchor.addEventListener("mouseenter", () => {
        btn.style.display = "flex";
      });
      anchor.addEventListener("mouseleave", () => {
        btn.style.display = "none";
      });

      anchor.appendChild(btn);
    });
}
