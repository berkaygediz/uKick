// uKick — chat

import { blockChannel, getBlockedChannels } from "../core/storage.js";
import { debounceRAF } from "../core/utils.js";
import { removeBlockedCards } from "./cards.js";

let chatBlockObserver = null;
let chatBlockContainer = null;
let chatUsernameObserver = null;
let chatUsernameContainer = null;
let refreshBlockedUsers = null;
let chatButtonsDisabled = false;
let chatSweepTimer = null;
let chatUsernameSetupRunning = false;
let chatHideSweep = null;
let chatButtonSweep = null;

function getActiveChatContainer() {
  const all = document.querySelectorAll("#chatroom-messages");
  if (all.length <= 1) return all[0] || null;
  for (const c of all) {
    if (c.getClientRects().length > 0 && c.querySelector("[data-index]"))
      return c;
  }
  return null;
}

function waitForChatContainer(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const container = getActiveChatContainer();
      if (container) return resolve(container);
      if (Date.now() - started > timeoutMs) return resolve(null);
      requestAnimationFrame(check);
    };
    check();
  });
}

function ensureChatSweep() {
  if (chatSweepTimer) return;
  chatSweepTimer = setInterval(() => {
    const current = getActiveChatContainer();
    if (!current) return;

    if (current !== chatUsernameContainer) observeChatUsernames();
    else chatButtonSweep?.();

    if (current !== chatBlockContainer) observeBlockedChatMessages();
    else chatHideSweep?.();
  }, 500);
}
ensureChatSweep();

export function stopChatBlocking() {
  chatBlockObserver?.disconnect();
  chatBlockObserver = null;
  chatBlockContainer = null;
  chatUsernameObserver?.disconnect();
  chatUsernameObserver = null;
  chatUsernameContainer = null;
  refreshBlockedUsers = null;
  if (chatSweepTimer) {
    clearInterval(chatSweepTimer);
    chatSweepTimer = null;
  }
  chatHideSweep = null;
  chatButtonSweep = null;

  document.querySelectorAll(".username-block-btn").forEach((b) => b.remove());
  document.querySelectorAll("[data-hidden-user]").forEach((content) => {
    content.querySelector(".blocked-overlay")?.remove();
    Array.from(content.children).forEach((child) => (child.style.display = ""));
    delete content.dataset.hiddenUser;
    content.style.opacity = "";
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    "blockedChannels" in changes ||
    "blockedTags" in changes ||
    "blockedCategories" in changes
  ) {
    refreshBlockedUsers?.();
  }
  if ("disableBlockButtons" in changes) {
    chatButtonsDisabled = changes.disableBlockButtons.newValue === true;
  }
});

function collectChatRows(mutationsList) {
  const nodes = new Set();
  for (const mutation of mutationsList) {
    if (mutation.type === "attributes") {
      const target = mutation.target;
      if (target instanceof HTMLElement && target.hasAttribute("data-index"))
        nodes.add(target);
      continue;
    }
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.hasAttribute("data-index")) {
        nodes.add(node);
      } else {
        const inner = node.querySelectorAll("[data-index]");
        if (inner.length) inner.forEach((n) => nodes.add(n));
        else {
          const host = node.closest("[data-index]");
          if (host) nodes.add(host);
        }
      }
    });
  }
  return nodes;
}

export async function observeBlockedChatMessages() {
  const { enableChatBlocking = false } =
    await chrome.storage.local.get("enableChatBlocking");
  if (!enableChatBlocking) return;

  if (
    chatBlockObserver &&
    chatBlockContainer &&
    getActiveChatContainer() === chatBlockContainer
  )
    return;

  if (chatBlockObserver) chatBlockObserver.disconnect();

  const blockedSet = new Set(
    (await getBlockedChannels()).map((u) => u.trim().toLowerCase()),
  );

  function hideChatMessage(node, username) {
    const content = node.querySelector('div[class*="betterhover"]');
    if (!content) return;

    content.dataset.hiddenUser = username;
    content.style.opacity = "0.3";
    Array.from(content.children).forEach((child) => {
      if (!child.classList.contains("blocked-overlay"))
        child.style.display = "none";
    });

    let overlay = content.querySelector(".blocked-overlay");
    if (!overlay) {
      overlay = document.createElement("span");
      overlay.className = "blocked-overlay";
      overlay.style.cssText = "color: gray; font-style: italic;";
      content.appendChild(overlay);
    }
    overlay.textContent = `[${username}]`;
  }

  function unhideChatMessage(node) {
    const content = node.querySelector('div[class*="betterhover"]');
    if (!content || !content.dataset.hiddenUser) return;

    content.querySelector(".blocked-overlay")?.remove();
    Array.from(content.children).forEach((child) => (child.style.display = ""));

    delete content.dataset.hiddenUser;
    content.style.opacity = "";
  }

  function processChatNode(node) {
    const userButton = node.querySelector("button[data-prevent-expand]");
    if (!userButton) return;

    const usernameChatter = userButton.textContent.trim();
    if (blockedSet.has(usernameChatter.toLowerCase())) {
      hideChatMessage(node, usernameChatter);
    } else {
      unhideChatMessage(node);
    }
  }

  const chatContainer = await waitForChatContainer();
  if (!chatContainer) return;

  const observer = new MutationObserver(
    debounceRAF((mutationsList) => {
      collectChatRows(mutationsList).forEach(processChatNode);
    }),
  );
  chatBlockObserver = observer;
  chatBlockContainer = chatContainer;
  observer.observe(chatContainer, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-index"],
  });

  setTimeout(() => {
    if (getActiveChatContainer() === chatContainer)
      chatContainer.querySelectorAll("[data-index]").forEach(processChatNode);
  }, 1000);

  refreshBlockedUsers = async () => {
    const freshList = await getBlockedChannels();
    blockedSet.clear();
    freshList.forEach((u) => blockedSet.add(u.trim().toLowerCase()));
    const current = getActiveChatContainer();
    if (current)
      current.querySelectorAll("[data-index]").forEach(processChatNode);
  };

  chatHideSweep = () => {
    const current = getActiveChatContainer();
    if (!current || current !== chatBlockContainer) return;
    current.querySelectorAll("[data-index]").forEach(processChatNode);
  };

  ensureChatSweep();
}

export async function observeChatUsernames() {
  if (chatUsernameSetupRunning) return;
  chatUsernameSetupRunning = true;
  try {
    const { enableChatBlocking = false } =
      await chrome.storage.local.get("enableChatBlocking");
    if (!enableChatBlocking) return;

    if (
      chatUsernameObserver &&
      chatUsernameContainer &&
      getActiveChatContainer() === chatUsernameContainer
    )
      return;

    if (chatUsernameObserver) chatUsernameObserver.disconnect();

    try {
      const res = await chrome.storage.local.get("disableBlockButtons");
      chatButtonsDisabled = res.disableBlockButtons ?? false;
    } catch (e) {}

    const chatContainer = await waitForChatContainer();
    if (!chatContainer) return;

    async function addBlockButtonsToNodes(nodes) {
      try {
        for (const msg of nodes) {
          if (chatButtonsDisabled) return;

          const userButton = msg.querySelector("button[data-prevent-expand]");
          if (!userButton) continue;

          const usernameChatter = userButton.textContent.trim();

          const existingBtn = msg.querySelector(".username-block-btn");
          if (existingBtn) {
            if (existingBtn.dataset.username === usernameChatter) continue;
            existingBtn.remove();
          }

          const btn = document.createElement("button");
          btn.textContent = "✕";
          btn.title = chrome.i18n
            ? chrome.i18n.getMessage("btn_block_channel")
            : "Block";
          btn.className = "ukick-x-btn ukick-btn-chat username-block-btn";
          btn.dataset.username = usernameChatter;

          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
              await blockChannel(usernameChatter);
              if (refreshBlockedUsers) await refreshBlockedUsers();
              await removeBlockedCards();
            } catch (err) {
              console.error("Block action failed:", err);
            }
          });

          userButton.parentElement.appendChild(btn);
        }
      } catch (err) {
        console.error("Error adding block buttons:", err);
      }
    }

    await addBlockButtonsToNodes(
      Array.from(chatContainer.querySelectorAll("[data-index]")),
    );

    const observer = new MutationObserver(
      debounceRAF((mutationsList) => {
        const nodes = collectChatRows(mutationsList);
        if (nodes.size) addBlockButtonsToNodes(Array.from(nodes));
      }),
    );

    chatUsernameObserver = observer;
    chatUsernameContainer = chatContainer;
    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-index"],
    });

    chatButtonSweep = () => {
      const current = getActiveChatContainer();
      if (!current || current !== chatUsernameContainer) return;
      addBlockButtonsToNodes(current.querySelectorAll("[data-index]"));
    };

    ensureChatSweep();
  } finally {
    chatUsernameSetupRunning = false;
  }
}
