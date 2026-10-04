// uKick — cards

import {
  blockCategory,
  blockChannel,
  getBlockedCategories,
  getBlockedChannels,
  getBlockedTags,
} from "../core/storage.js";
import { extractTagText, normalizeData } from "../core/utils.js";
import { processSidebarChannels } from "./sidebar.js";

export async function processCategoryCards() {
  const blockedCategories = await getBlockedCategories();
  const { disableBlockButtons = false } = await chrome.storage.local.get(
    "disableBlockButtons",
  );

  document.querySelectorAll('[class*="group/card"]').forEach((card) => {
    const nameEl = card.querySelector('[data-testid^="category-"]');
    if (!nameEl) return;

    const categoryName = normalizeData(nameEl.textContent);
    if (blockedCategories.includes(categoryName)) {
      card.style.display = "none";
      return;
    }
    if (disableBlockButtons || card.querySelector(".category-block-btn"))
      return;

    const imageWrapper = card.querySelector(
      'a[href^="/category/"] > div.relative',
    );
    if (!imageWrapper) return;

    const btn = document.createElement("button");
    btn.textContent = "✖";
    btn.title =
      chrome.i18n.getMessage("btn_block_category") + ": " + nameEl.textContent;
    btn.className = "ukick-x-btn ukick-btn-cat category-block-btn";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await blockCategory(categoryName);
      card.style.display = "none";
    });

    imageWrapper.style.position = "relative";
    imageWrapper.appendChild(btn);
  });
}

export async function processCategoryPageHeader() {
  const nameEl = document.querySelector('h2[data-testid="category-name"]');
  if (!nameEl) return;

  let raw = "";
  for (const node of nameEl.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) raw += node.textContent;
  }
  const categoryName = normalizeData(raw.replace(/\s+/g, " ").trim());
  if (!categoryName) return;

  const container = nameEl.parentElement;
  if (!container) return;
  const dropsLink = container.querySelector('a[href$="/drops"]');
  const actionRow = dropsLink
    ? dropsLink.parentElement
    : container.lastElementChild;
  if (!actionRow) return;

  const { disableBlockButtons = false } = await chrome.storage.local.get(
    "disableBlockButtons",
  );

  let btn = actionRow.querySelector(".category-page-block-btn");

  if (disableBlockButtons) {
    if (btn) btn.remove();
    return;
  }

  const blocked = await getBlockedCategories();
  const isBlocked = blocked.includes(categoryName);

  if (!btn) {
    btn = document.createElement("button");
    btn.className = "ukick-x-btn ukick-btn-follow category-page-block-btn";
    btn.textContent = "✖";
    btn.style.marginLeft = "0";
    btn.style.alignSelf = "center";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const list = await getBlockedCategories();
      if (list.includes(categoryName)) {
        const filtered = list.filter((c) => normalizeData(c) !== categoryName);
        await chrome.storage.local.set({
          blockedCategories: JSON.stringify(filtered),
        });
      } else {
        await blockCategory(categoryName);
      }

      await processCategoryPageHeader();
    });

    actionRow.appendChild(btn);
  }

  btn.classList.toggle("ukick-unblock", isBlocked);
  btn.textContent = isBlocked ? "✓" : "✖";
  btn.title =
    chrome.i18n.getMessage("btn_block_category") + ": " + categoryName;
}

export async function removeBlockedCategoryCards() {
  const blockedCategories = await getBlockedCategories();

  document.querySelectorAll('[class*="group/card"]').forEach((card) => {
    const nameEl = card.querySelector('[data-testid^="category-"]');
    if (!nameEl) return;

    const categoryName = normalizeData(nameEl.textContent);
    card.style.display = blockedCategories.includes(categoryName) ? "none" : "";
  });
}

export async function removeBlockedCards() {
  const blockedChannels = (await getBlockedChannels()).map(normalizeData);
  const blockedCategories = await getBlockedCategories();
  const blockedTags = await getBlockedTags();

  document.querySelectorAll(".group\\/card").forEach((card) => {
    let shouldHide = false;

    const channelLink = card
      .querySelector('a[href^="/"]:not([href^="/category/"]) img.rounded-full')
      ?.closest("a");
    if (channelLink) {
      const username = normalizeData(channelLink.getAttribute("href").slice(1));
      if (blockedChannels.includes(username)) shouldHide = true;
    }

    if (!shouldHide) {
      const categoryLink = card.querySelector('a[href^="/category/"]');
      if (categoryLink) {
        const categoryText =
          categoryLink.querySelector("span")?.textContent ||
          categoryLink.textContent;
        if (blockedCategories.includes(normalizeData(categoryText)))
          shouldHide = true;
      }
    }

    if (!shouldHide && blockedTags.length > 0) {
      const tagElements = card.querySelectorAll(
        'a[class~="group/tag"], button[class~="group/tag"]',
      );
      for (const tag of tagElements) {
        const tagName = extractTagText(tag);
        if (!tagName) continue;
        if (blockedTags.includes(normalizeData(tagName))) {
          shouldHide = true;
          break;
        }
      }
    }

    card.style.display = shouldHide ? "none" : "";
  });

  document
    .querySelectorAll("div.flex.flex-row.items-center")
    .forEach((item) => {
      const anchor = item.querySelector(
        'a[href^="/"]:not([href^="/category/"])',
      );
      if (!anchor) return;

      const username = normalizeData(anchor.getAttribute("href").slice(1));
      if (blockedChannels.includes(username)) {
        const outer = item.closest("div.flex.w-full.shrink-0.grow-0.flex-col");
        (outer || item).style.display = "none";
      }
    });

  const usernameEl = document.getElementById("channel-username");
  if (usernameEl) {
    const currentUsername = normalizeData(usernameEl.textContent);
    const videoPlayer = document.getElementById("video-player");
    if (videoPlayer && blockedChannels.includes(currentUsername)) {
      videoPlayer.style.display = "none";
      if (typeof videoPlayer.pause === "function") videoPlayer.pause();
    } else if (videoPlayer) {
      videoPlayer.style.display = "";
    }
  }

  document.querySelectorAll("a.focusable-leaf").forEach((card) => {
    const href = card.getAttribute("href") || "";
    if (!href.startsWith("/") || href.startsWith("/category")) return;
    if (!card.querySelector("img")) return;

    let shouldHide = false;
    const username = normalizeData(href.split("/")[1]);
    if (blockedChannels.includes(username)) shouldHide = true;

    if (!shouldHide && blockedTags.length > 0) {
      for (const pill of card.querySelectorAll('li[role="listitem"]')) {
        let tagName = "";
        for (const node of pill.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) tagName += node.textContent;
        }
        tagName = tagName.replace(/\s+/g, " ").trim();
        if (tagName && blockedTags.includes(normalizeData(tagName))) {
          shouldHide = true;
          break;
        }
      }
    }

    (card.parentElement || card).style.display = shouldHide ? "none" : "";
  });
}

export async function processCards() {
  const { disableBlockButtons = false } = await chrome.storage.local.get(
    "disableBlockButtons",
  );

  document.querySelectorAll('[class*="group/card"]').forEach((card) => {
    if (
      disableBlockButtons ||
      card.querySelector(".block-btn") ||
      card.querySelector('[data-testid^="category-"]')
    )
      return;

    const anchor = card.querySelector('a[href^="/"]');
    if (!anchor) return;

    const username = anchor.getAttribute("href").split("/")[1];

    const followBtn = card.querySelector('button[data-testid="follow-button"]');

    if (followBtn) {
      const btn = createInlineBlockButton(username);
      btn.classList.add("block-btn");
      btn.style.marginLeft = "8px";
      followBtn.insertAdjacentElement("afterend", btn);
    } else {
      const btn = createThumbnailBlockButton(username);
      btn.classList.add("block-btn");

      const titleEl = card.querySelector("a[title]");
      if (titleEl) {
        titleEl.parentElement.appendChild(btn);
      } else {
        if (getComputedStyle(card).position === "static")
          card.style.position = "relative";
        card.appendChild(btn);
      }
    }
  });

  document.querySelectorAll("a.focusable-leaf").forEach((card) => {
    if (
      disableBlockButtons ||
      card.querySelector(".block-btn") ||
      card.querySelector('[data-testid^="category-"]')
    )
      return;

    const href = card.getAttribute("href") || "";
    if (!href.startsWith("/") || href.startsWith("/category")) return;
    if (!card.querySelector("img")) return;

    const username = href.split("/")[1];
    const btn = createThumbnailBlockButton(username);
    btn.classList.add("block-btn");

    const mediaBox = card.querySelector("div.relative");
    if (mediaBox) mediaBox.appendChild(btn);
    else card.appendChild(btn);
  });
}

function createInlineBlockButton(username) {
  const btn = document.createElement("button");
  btn.textContent = "✕";
  btn.title = chrome.i18n.getMessage("btn_block_channel");
  btn.className = "ukick-x-btn ukick-btn-follow";

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await blockChannel(username);
    await removeBlockedCards();
    await processCards();
    await processSidebarChannels();
  });

  return btn;
}

function createThumbnailBlockButton(username) {
  const btn = document.createElement("button");
  btn.textContent = "✕";
  btn.title = chrome.i18n.getMessage("btn_block_channel");
  btn.className = "ukick-x-btn ukick-btn-thumb";

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await blockChannel(username);
    await removeBlockedCards();
    await processCards();
    await processSidebarChannels();
  });

  return btn;
}
