// uKick — tags

import { blockTag, getBlockedTags } from "../core/storage.js";
import { extractTagText, normalizeData, showToast } from "../core/utils.js";
import { removeBlockedCards } from "./cards.js";

export async function processTagButtons() {
  const blockedTags = await getBlockedTags();
  const blockedSet = new Set(blockedTags.map(normalizeData));
  const { disableBlockButtons = false } = await browser.storage.local.get(
    "disableBlockButtons",
  );
  if (disableBlockButtons) return;

  const tagPills = document.querySelectorAll(
    'a[class~="group/tag"], button[class~="group/tag"]',
  );

  tagPills.forEach((tagEl) => {
    const row = tagEl.parentElement;
    if (row instanceof HTMLElement && row.classList.contains("h-0")) {
      row.style.height = "auto";
      row.style.overflow = "visible";
      row.style.rowGap = "4px";
    }

    const rawText = extractTagText(tagEl);

    const existing = tagEl.querySelector(".tag-block-btn");
    if (existing) {
      if (existing.dataset.tag === rawText) {
        if (tagEl.tagName === "BUTTON") tagEl.disabled = false;
        return;
      }
      existing.remove();
    }

    if (!rawText) return;
    if (blockedSet.has(normalizeData(rawText))) return;

    const xBtn = document.createElement("span");
    xBtn.textContent = "✖";
    xBtn.title = "Block tag: " + rawText;
    xBtn.className = "ukick-x-btn ukick-btn-tag tag-block-btn";
    xBtn.dataset.tag = rawText;

    xBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await blockTag(rawText);
      showToast(`${rawText}`);
      await removeBlockedCards();
    });

    if (tagEl.tagName === "BUTTON" && tagEl.disabled) {
      tagEl.disabled = false;
      tagEl.removeAttribute("aria-disabled");
    }

    tagEl.style.display = "inline-flex";
    tagEl.style.alignItems = "center";
    tagEl.style.gap = "2px";
    tagEl.appendChild(xBtn);
  });

  document
    .querySelectorAll("a.focusable-leaf li[role='listitem']")
    .forEach((pill) => {
      const rawText = Array.from(pill.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (!rawText) return;

      const existing = pill.querySelector(".tag-block-btn");
      if (existing) {
        if (existing.dataset.tag === rawText) return;
        existing.remove();
      }

      if (blockedSet.has(normalizeData(rawText))) return;

      const list = pill.closest("ul");
      if (list) {
        list.style.maxHeight = "none";
        list.style.overflow = "visible";
      }

      const xBtn = document.createElement("span");
      xBtn.textContent = "✖";
      xBtn.title = "Block tag: " + rawText;
      xBtn.className = "ukick-x-btn ukick-btn-tag tag-block-btn";
      xBtn.dataset.tag = rawText;

      xBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await blockTag(rawText);
        showToast(`${rawText}`);
        await removeBlockedCards();
      });

      pill.style.display = "flex";
      pill.style.alignItems = "center";
      pill.style.gap = "2px";
      pill.appendChild(xBtn);
    });
}
