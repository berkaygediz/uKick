// uKick - cards

import {
  blockCategory,
  blockChannel,
  getBlockedCategories,
  getBlockedChannels,
  getBlockedTags,
} from "../core/storage.js";
import { extractTagText, normalizeData } from "../core/utils.js";
import { processSidebarChannels } from "./sidebar.js";

const blockCache = { channels: [], categories: [], tags: [] };

export async function refreshBlockCache() {
  blockCache.channels = await getBlockedChannels();
  blockCache.categories = await getBlockedCategories();
  blockCache.tags = await getBlockedTags();
}

let listVersion = 0;

export function invalidateCardScan() {
  listVersion++;
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    "blockedChannels" in changes ||
    "blockedCategories" in changes ||
    "blockedTags" in changes ||
    "disableBlockButtons" in changes
  ) {
    invalidateCardScan();
    refreshBlockCache();
  }
  if ("blockedChannels" in changes) refreshCardHiderCss();
});

let cardHiderStyle = null;

function refreshCardHiderCss() {
  getBlockedChannels().then((channels) => {
    if (!cardHiderStyle) {
      cardHiderStyle = document.createElement("style");
      cardHiderStyle.id = "ukick-card-hider";
      document.head.appendChild(cardHiderStyle);
    }
    const rules = channels.map((u) => {
      const name = String(u).replace(/["\\]/g, "");
      return `div:has(> div.group\\/card:has(a[href="/${name}" i])), div.group\\/card:has(a[href="/${name}" i]), a.focusable-leaf[href="/${name}" i] { display: none !important; }`;
    });
    cardHiderStyle.textContent = rules.join("\n");
  });
}
refreshCardHiderCss();

function hideCard(card) {
  const parent = card.parentElement;
  if (
    parent &&
    !parent.classList.contains("group/card") &&
    !Array.from(parent.children).some(
      (ch) =>
        ch !== card &&
        ch instanceof HTMLElement &&
        ch.classList.contains("group/card") &&
        !ch.classList.contains("pointer-events-none"),
    )
  ) {
    parent.dataset.ukickShell = "1";
    parent.style.display = "none";
    return;
  }
  card.style.display = "none";
}

function showCard(card) {
  card.style.display = "";
  const shell = card.closest("[data-ukick-shell]");
  if (shell) {
    delete shell.dataset.ukickShell;
    shell.style.display = "";
  }
}

export async function processCategoryCards() {
  const blockedSet = new Set(blockCache.categories);
  const { disableBlockButtons = false } = await browser.storage.local.get(
    "disableBlockButtons",
  );
  const v = String(listVersion);

  document.querySelectorAll('[class*="group/card"]').forEach((card) => {
    if (card.dataset.ukScan === v) return;

    const nameEl = card.querySelector('[data-testid^="category-"]');
    if (!nameEl) return;

    const categoryName = normalizeData(nameEl.textContent);
    if (blockedSet.has(categoryName)) {
      hideCard(card);
      card.dataset.ukCat = v;
      card.dataset.ukScan = v;
      return;
    }
    if (disableBlockButtons) {
      card.dataset.ukScan = v;
      return;
    }
    if (card.querySelector(".category-block-btn")) {
      card.dataset.ukScan = v;
      return;
    }

    const imageWrapper = card.querySelector(
      'a[href^="/category/"] > div.relative',
    );
    if (!imageWrapper) return;

    const btn = document.createElement("button");
    btn.textContent = "✖";
    btn.title =
      browser.i18n.getMessage("btn_block_category") + ": " + nameEl.textContent;
    btn.className = "ukick-x-btn ukick-btn-cat category-block-btn";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await blockCategory(categoryName);
      hideCard(card);
    });

    imageWrapper.style.position = "relative";
    imageWrapper.appendChild(btn);
    card.dataset.ukScan = v;
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

  const { disableBlockButtons = false } = await browser.storage.local.get(
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
        await browser.storage.local.set({
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
    browser.i18n.getMessage("btn_block_category") + ": " + categoryName;
}

export async function removeBlockedCategoryCards() {
  const blockedSet = new Set(blockCache.categories);
  const v = String(listVersion);

  document.querySelectorAll('[class*="group/card"]').forEach((card) => {
    if (card.dataset.ukScan === v) return;

    const nameEl = card.querySelector('[data-testid^="category-"]');
    if (!nameEl) return;

    const categoryName = normalizeData(nameEl.textContent);
    if (blockedSet.has(categoryName)) {
      if (card.dataset.ukCat !== v) {
        hideCard(card);
        card.dataset.ukCat = v;
        card.dataset.ukScan = v;
      }
    } else if (card.dataset.ukCat) {
      showCard(card);
      delete card.dataset.ukCat;
      delete card.dataset.ukScan;
    }
  });
}

export async function removeBlockedCards() {
  const chanSet = new Set(blockCache.channels);
  const catSet = new Set(blockCache.categories);
  const blockedTags = blockCache.tags;
  const tagSet = new Set(blockedTags);
  const v = String(listVersion);

  document.querySelectorAll(".group\\/card").forEach((card) => {
    if (card.dataset.ukScan === v) return;

    let shouldHide = false;

    const channelLink = card
      .querySelector('a[href^="/"]:not([href^="/category/"]) img.rounded-full')
      ?.closest("a");
    if (channelLink) {
      const username = normalizeData(channelLink.getAttribute("href").slice(1));
      if (chanSet.has(username)) shouldHide = true;
    }

    if (!shouldHide) {
      const categoryLink = card.querySelector('a[href^="/category/"]');
      if (categoryLink) {
        const categoryText =
          categoryLink.querySelector("span")?.textContent ||
          categoryLink.textContent;
        if (catSet.has(normalizeData(categoryText))) shouldHide = true;
      }
    }

    if (!shouldHide && blockedTags.length > 0) {
      const tagElements = card.querySelectorAll(
        'a[class~="group/tag"], button[class~="group/tag"]',
      );
      for (const tag of tagElements) {
        const tagName = extractTagText(tag);
        if (!tagName) continue;
        if (tagSet.has(normalizeData(tagName))) {
          shouldHide = true;
          break;
        }
      }
    }

    if (shouldHide) {
      hideCard(card);
      card.dataset.ukChan = v;
      card.dataset.ukScan = v;
    } else if (card.dataset.ukChan) {
      showCard(card);
      delete card.dataset.ukChan;
      delete card.dataset.ukScan;
    }
  });

  document
    .querySelectorAll("div.flex.flex-row.items-center")
    .forEach((item) => {
      const anchor = item.querySelector(
        'a[href^="/"]:not([href^="/category/"])',
      );
      if (!anchor) return;

      const username = normalizeData(anchor.getAttribute("href").slice(1));
      if (chanSet.has(username)) {
        const outer = item.closest("div.flex.w-full.shrink-0.grow-0.flex-col");
        (outer || item).style.display = "none";
      }
    });

  const usernameEl = document.getElementById("channel-username");
  if (usernameEl) {
    const currentUsername = normalizeData(usernameEl.textContent);
    const videoPlayer = document.getElementById("video-player");
    if (videoPlayer && chanSet.has(currentUsername)) {
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
    if (chanSet.has(username)) shouldHide = true;

    if (!shouldHide && blockedTags.length > 0) {
      for (const pill of card.querySelectorAll('li[role="listitem"]')) {
        let tagName = "";
        for (const node of pill.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) tagName += node.textContent;
        }
        tagName = tagName.replace(/\s+/g, " ").trim();
        if (tagName && tagSet.has(normalizeData(tagName))) {
          shouldHide = true;
          break;
        }
      }
    }

    (card.parentElement || card).style.display = shouldHide ? "none" : "";
  });
}

export async function processCards() {
  const { disableBlockButtons = false } = await browser.storage.local.get(
    "disableBlockButtons",
  );
  const v = String(listVersion);

  document.querySelectorAll('[class*="group/card"]').forEach((card) => {
    if (card.dataset.ukScan === v) return;

    if (disableBlockButtons) {
      card.dataset.ukScan = v;
      return;
    }
    if (card.querySelector('[data-testid^="category-"]')) return;
    if (card.querySelector(".block-btn")) {
      card.dataset.ukScan = v;
      return;
    }

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
    card.dataset.ukScan = v;
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
  btn.title = browser.i18n.getMessage("btn_block_channel");
  btn.className = "ukick-x-btn ukick-btn-follow";

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await blockChannel(username);
    await refreshBlockCache();
    await removeBlockedCards();
    await processCards();
    await processSidebarChannels();
  });

  return btn;
}

function createThumbnailBlockButton(username) {
  const btn = document.createElement("button");
  btn.textContent = "✕";
  btn.title = browser.i18n.getMessage("btn_block_channel");
  btn.className = "ukick-x-btn ukick-btn-thumb";

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await blockChannel(username);
    await refreshBlockCache();
    await removeBlockedCards();
    await processCards();
    await processSidebarChannels();
  });

  return btn;
}
