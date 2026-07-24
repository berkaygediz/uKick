// ==UserScript==
// @name         uKick - Everything for Kick
// @namespace    https://github.com/berkaygediz/uKick
// @version      2.7.0.6
// @description  All-in-one Kick tool to block channels, categories, tags & chat. Sync remote lists. Boost volume, set quality, danmaku & themes.
// @author       berkaygediz
// @match        https://kick.com/*
// @match        https://www.kick.com/*
// @license      Apache-2.0
// @homepageURL  https://github.com/berkaygediz/uKick
// @supportURL   https://github.com/berkaygediz/uKick/issues
// ==/UserScript==

(function () {
  "use strict";

  function injectButtonStyles() {
    if (!document.getElementById("ukick-btn-styles")) {
      const style = document.createElement("style");
      style.id = "ukick-btn-styles";
      style.textContent = `
        .ukick-x-btn {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.6);
          color: rgba(255, 255, 255, 0.7);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .ukick-x-btn:hover {
          background: rgba(255, 80, 80, 0.4) !important;
          border-color: rgba(255, 80, 80, 0.6) !important;
          color: #ffffff !important;
        }
        .ukick-btn-thumb {
          position: absolute; top: 6px; right: 6px;
          width: 24px; height: 24px; font-size: 12px; border-radius: 9999px;
          z-index: 9999;
          background: rgba(25, 12, 12, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.9);
        }
        .ukick-btn-cat {
          position: absolute; top: 6px; right: 6px;
          width: 20px; height: 20px; font-size: 10px; border-radius: 9999px;
          z-index: 200;
        }
        .ukick-btn-tag {
          width: 16px; height: 16px; font-size: 9px; border-radius: 9999px;
          margin-left: 4px; vertical-align: middle; display: inline-flex;
        }
        .ukick-btn-follow {
          margin-left: 8px;
          width: 24px; height: 24px; font-size: 12px; border-radius: 9999px;
          vertical-align: middle;
        }
        .ukick-btn-chat {
          margin-left: 6px;
          width: 16px; height: 16px; font-size: 9px; border-radius: 9999px;
          vertical-align: middle;
        }
        .ukick-btn-channel {
          margin-left: 8px;
          width: 24px; height: 24px; font-size: 12px; border-radius: 9999px;
          vertical-align: middle;
        }
        .ukick-btn-sidebar {
          position: absolute; top: 10px; right: 4px;
          width: 25px; height: 25px; font-size: 14px; border-radius: 9999px;
          display: none; z-index: 99999; 
          background: rgba(120, 20, 20, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }
      `;
      document.head.appendChild(style);
    }
  }
  injectButtonStyles();

  function normalizeData(str) {
    return str?.toLowerCase().trim() || "";
  }

  // ===== Chrome Extension (callback) =====

  async function getBlockedChannels() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["blockedChannels", "remoteSubscriptions"],
        (result) => {
          try {
            const local = JSON.parse(result.blockedChannels || "[]");

            const subs = result.remoteSubscriptions || [];
            const remote = subs
              .filter((s) => s.type === "channels" && Array.isArray(s.data))
              .flatMap((s) => s.data);

            const combined = new Set([...local, ...remote]);
            resolve([...combined].map(normalizeData));
          } catch (e) {
            console.error("uKick Get Channels Error:", e);
            resolve([]);
          }
        },
      );
    });
  }

  async function saveBlockedChannels(list) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        { blockedChannels: JSON.stringify(list) },
        resolve,
      );
    });
  }

  async function blockChannel(username) {
    username = normalizeData(username);
    const blocked = await getBlockedChannels();
    if (!blocked.includes(username)) {
      blocked.push(username);
      await saveBlockedChannels(blocked);
    }
  }

  async function unblockChannel(username) {
    username = normalizeData(username);
    let blocked = await getBlockedChannels();
    blocked = blocked.filter((u) => u !== username);
    await saveBlockedChannels(blocked);
  }

  async function getBlockedCategories() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["blockedCategories", "remoteSubscriptions"],
        (result) => {
          try {
            const local = JSON.parse(result.blockedCategories || "[]");
            const subs = result.remoteSubscriptions || [];
            const remote = subs
              .filter((s) => s.type === "categories" && Array.isArray(s.data))
              .flatMap((s) => s.data);

            const combined = new Set([...local, ...remote]);
            resolve([...combined].map(normalizeData));
          } catch (e) {
            resolve([]);
          }
        },
      );
    });
  }

  async function saveBlockedCategories(list) {
    return new Promise((resolve) => {
      try {
        const data = JSON.stringify(list);
        chrome.storage.local.set({ blockedCategories: data }, () => {
          if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
          resolve();
        });
      } catch (err) {
        resolve();
      }
    });
  }

  async function getBlockedTags() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["blockedTags", "remoteSubscriptions"],
        (result) => {
          try {
            const local = JSON.parse(result.blockedTags || "[]");
            const subs = result.remoteSubscriptions || [];
            const remote = subs
              .filter((s) => s.type === "tags" && Array.isArray(s.data))
              .flatMap((s) => s.data);

            const combined = new Set([...local, ...remote]);
            resolve([...combined].map(normalizeData));
          } catch (e) {
            resolve([]);
          }
        },
      );
    });
  }

  async function blockTag(tagName) {
    const blocked = await getBlockedTags();
    const normalizedTag = normalizeData(tagName);
    if (!blocked.includes(normalizedTag)) {
      blocked.push(normalizedTag);
      await new Promise((resolve) => {
        chrome.storage.local.set(
          { blockedTags: JSON.stringify(blocked) },
          resolve,
        );
      });
    }
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background-color: #333;
      color: #fff; padding: 12px 24px; border-radius: 4px; z-index: 10000;
      font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2000);
  }

  async function processTagButtons() {
    const blockedTags = await getBlockedTags();
    const blockedNormalized = blockedTags.map((tag) =>
      normalizeData(tag).toLowerCase().trim(),
    );
    const { disableBlockButtons = false } = await chrome.storage.local.get(
      "disableBlockButtons",
    );
    if (disableBlockButtons) return;

    document.querySelectorAll("div.mt-2.flex").forEach((container) => {
      container.style.maxHeight = "none";
      container.style.overflow = "visible";
      container.style.rowGap = "4px";

      container.querySelectorAll("button, a").forEach((tagEl) => {
        if (
          tagEl.classList.contains("tag-block-btn") ||
          tagEl.dataset.xAdded === "true" ||
          tagEl.querySelector(".tag-block-btn")
        ) {
          tagEl.dataset.xAdded = "true";
          return;
        }

        let rawText =
          tagEl.childNodes[0]?.textContent || tagEl.textContent || "";
        rawText = rawText.replace(/\s+/g, " ").trim();
        if (!rawText) return;

        if (
          blockedNormalized.includes(
            normalizeData(rawText).toLowerCase().trim(),
          )
        )
          return;

        const xBtn = document.createElement("span");
        xBtn.textContent = "✖";
        xBtn.title = "Block tag: " + rawText;
        xBtn.className = "ukick-x-btn ukick-btn-tag tag-block-btn";

        xBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          await blockTag(rawText);
          showToast(`${rawText}`);
          await removeBlockedCards();
        });

        tagEl.style.display = "inline-flex";
        tagEl.style.alignItems = "center";
        tagEl.style.gap = "2px";
        tagEl.appendChild(xBtn);
        tagEl.dataset.xAdded = "true";
      });
    });
  }

  async function blockCategory(categoryName) {
    const blocked = await getBlockedCategories();
    const normalizedCategory = normalizeData(categoryName);
    if (!blocked.includes(normalizedCategory)) {
      blocked.push(normalizedCategory);
      await new Promise((resolve) => {
        chrome.storage.local.set(
          { blockedCategories: JSON.stringify(blocked) },
          resolve,
        );
      });
    }
  }

  async function processCategoryCards() {
    const blockedCategories = await getBlockedCategories();
    const blockedNormalized = blockedCategories.map((cat) =>
      normalizeData(cat).toLowerCase().trim(),
    );
    const { disableBlockButtons = false } = await chrome.storage.local.get(
      "disableBlockButtons",
    );

    document.querySelectorAll('[class*="group/card"]').forEach((card) => {
      const nameEl = card.querySelector('[data-testid^="category-"]');
      if (!nameEl) return;

      const categoryName = normalizeData(nameEl.textContent)
        .toLowerCase()
        .trim();
      if (blockedNormalized.includes(categoryName)) {
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
        chrome.i18n.getMessage("btn_block_category") +
        ": " +
        nameEl.textContent;
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

  async function removeBlockedCategoryCards() {
    const blockedCategories = await getBlockedCategories();
    document.querySelectorAll('[class*="group/card"]').forEach((card) => {
      const nameEl = card.querySelector('[data-testid^="category-"]');
      if (!nameEl) return;

      const categoryName = normalizeData(nameEl.textContent)
        .toLowerCase()
        .trim();
      const blockedNormalized = blockedCategories.map((cat) =>
        normalizeData(cat).toLowerCase().trim(),
      );

      if (blockedNormalized.includes(categoryName)) {
        card.style.display = "none";
      } else {
        card.style.display = "";
      }
    });
  }

  async function removeBlockedCards() {
    const blockedChannels = (await getBlockedChannels()).map(normalizeData);
    const blockedCategories =
      (await getBlockedCategories?.().catch(() => [])) || [];
    const blockedTags = (await getBlockedTags?.().catch(() => [])) || [];

    document.querySelectorAll(".group\\/card").forEach((card) => {
      let shouldHide = false;

      const channelLink = card
        .querySelector(
          'a[href^="/"]:not([href^="/category/"]) img.rounded-full',
        )
        ?.closest("a");
      if (channelLink) {
        const username = normalizeData(
          channelLink.getAttribute("href").slice(1),
        );
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
        const tagsContainer = card.querySelector("div.mt-2.flex");
        if (tagsContainer) {
          const tagElements = tagsContainer.querySelectorAll("button, a");
          for (const tag of tagElements) {
            let tagName =
              tag.getAttribute("aria-label") || tag.getAttribute("title") || "";
            if (!tagName) {
              tagName = tag.childNodes[0]?.textContent || tag.textContent || "";
            }

            tagName = tagName.trim();
            if (!tagName) continue;

            const normalizedTag = normalizeData(tagName);

            if (blockedTags.includes(normalizedTag)) {
              shouldHide = true;
              break;
            }
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
          const outer = item.closest(
            "div.flex.w-full.shrink-0.grow-0.flex-col",
          );
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
  }

  async function removeSidebarBlockedChannels() {
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

  async function addBlockButtonOnChannelPage() {
    const usernameEl = document.getElementById("channel-username");
    if (!usernameEl || document.getElementById("channelPageBlockBtn")) return;

    const username = usernameEl.textContent.trim();
    const btn = document.createElement("button");
    btn.id = "channelPageBlockBtn";
    btn.textContent = "✕";
    btn.title = chrome.i18n.getMessage("btn_block_channel");
    btn.className = "ukick-x-btn ukick-btn-channel";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await blockChannel(username);
      alert(chrome.i18n.getMessage("alert_channel_blocked", username));
      location.reload();
    });

    const parent = usernameEl.parentElement;
    parent.style.display = "inline-flex";
    parent.style.alignItems = "center";
    parent.appendChild(btn);

    const blocked = await getBlockedChannels();
    const videoPlayer = document.getElementById("video-player");
    if (videoPlayer) {
      if (blocked.includes(normalizeData(username))) {
        videoPlayer.style.display = "none";
        if (typeof videoPlayer.pause === "function") videoPlayer.pause();
      } else {
        videoPlayer.style.display = "";
      }
    }
  }

  async function processCards() {
    const followTexts = [
      "follow", // English
      "seguir", // Spanish
      "seguir", // Portuguese
      "suivre", // French
      "folgen", // German
      "segui", // Italian
      "takip et", // Turkish
      "ikuti", // Indonesian
      "关注", // Chinese
      "フォロー", // Japanese
      "팔로우", // Korean
      "متابعة", // Arabic
      "עקוב", // Hebrew
      "seuraa", // Finnish
      "obserwuj", // Polish
      "подписаться", // Russian
      "theo dõi", // Vietnamese
      "sledovat", // Czech
    ];

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
      const followBtn = Array.from(card.querySelectorAll("button")).find(
        (btn) => {
          const ariaLabel = (btn.getAttribute("aria-label") || "")
            .toLowerCase()
            .trim();
          const text = btn.textContent.trim().toLowerCase();
          return followTexts.some(
            (kw) => ariaLabel.includes(kw) || text.includes(kw),
          );
        },
      );

      if (followBtn) {
        const btn = createBlockButton(username);
        btn.classList.add("block-btn");
        btn.style.marginLeft = "8px";
        followBtn.insertAdjacentElement("afterend", btn);
      } else {
        const titleEl = card.querySelector("a[title]");
        const btn = createBlockButtonAbsolute(username);
        btn.classList.add("block-btn");
        if (titleEl) {
          titleEl.parentElement.appendChild(btn);
        } else {
          if (getComputedStyle(card).position === "static")
            card.style.position = "relative";
          card.appendChild(btn);
        }
      }
    });

    document
      .querySelectorAll("div.flex.w-full.shrink-0.grow-0.flex-col")
      .forEach((card) => {
        if (disableBlockButtons || card.querySelector(".block-btn")) return;

        const anchor = card.querySelector('a[href^="/"]');
        if (!anchor) return;

        const username = anchor.getAttribute("href").split("/")[1];
        const followBtn = Array.from(card.querySelectorAll("button")).find(
          (btn) => {
            const ariaLabel = (btn.getAttribute("aria-label") || "")
              .toLowerCase()
              .trim();
            const text = btn.textContent.trim().toLowerCase();
            return followTexts.some(
              (kw) => ariaLabel.includes(kw) || text.includes(kw),
            );
          },
        );

        if (!followBtn) return;

        const btn = createBlockButton(username);
        btn.classList.add("block-btn");
        btn.style.marginLeft = "8px";
        followBtn.insertAdjacentElement("afterend", btn);
      });
  }

  async function processSidebarChannels() {
    const blocked = await getBlockedChannels();
    const { disableBlockButtons = false } = await chrome.storage.local.get(
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
        btn.title = chrome.i18n.getMessage("btn_block_channel");

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

  function debounceRAF(fn) {
    let ticking = false;
    let args = [];
    return (...newArgs) => {
      args = newArgs;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          fn(...args);
        });
      }
    };
  }

  async function observeBlockedChatMessages() {
    if (window.chatBlockObserver) window.chatBlockObserver.disconnect();

    const { enableChatBlocking = false } =
      await chrome.storage.local.get("enableChatBlocking");
    if (!enableChatBlocking) return;

    let blockedUsers = await getBlockedChannels();

    const blockedSet = new Set(blockedUsers.map((u) => u.trim().toLowerCase()));

    function normalize(name) {
      return name.trim().toLowerCase();
    }

    const waitForChatContainer = () =>
      new Promise((resolve) => {
        const check = () => {
          const container = document.querySelector("#chatroom-messages");
          if (container) return resolve(container);
          requestAnimationFrame(check);
        };
        check();
      });

    function hideChatMessage(node, username) {
      const content = node.querySelector('div[class*="betterhover"]');
      if (!content || content.dataset.hiddenUser === username) return;

      if (content.dataset.hiddenUser) {
        content.querySelector(".blocked-overlay")?.remove();
        Array.from(content.children).forEach((child) => {
          if (!child.classList.contains("blocked-overlay"))
            child.style.display = "";
        });
      }

      content.dataset.hiddenUser = username;
      content.style.opacity = "0.3";
      Array.from(content.children).forEach(
        (child) => (child.style.display = "none"),
      );

      const overlay = document.createElement("span");
      overlay.className = "blocked-overlay";
      overlay.style.cssText = "color: gray; font-style: italic;";
      overlay.textContent = `[${username}]`;
      content.appendChild(overlay);
    }

    function unhideChatMessage(node) {
      const content = node.querySelector('div[class*="betterhover"]');
      if (!content || !content.dataset.hiddenUser) return;

      content.querySelector(".blocked-overlay")?.remove();
      Array.from(content.children).forEach(
        (child) => (child.style.display = ""),
      );

      delete content.dataset.hiddenUser;
      content.style.opacity = "";
    }

    function processChatNode(node) {
      const userButton = node.querySelector("button[data-prevent-expand]");
      if (!userButton) return;

      const usernameChatter = userButton.textContent.trim();
      const normalizedChatter = normalize(usernameChatter);

      if (blockedSet.has(normalizedChatter)) {
        hideChatMessage(node, usernameChatter);
      } else {
        unhideChatMessage(node);
      }
    }

    const chatContainer = await waitForChatContainer();

    const processAddedNodes = debounceRAF((mutationsList) => {
      for (const mutation of mutationsList) {
        for (const addedNode of mutation.addedNodes) {
          if (!(addedNode instanceof HTMLElement)) continue;
          if (addedNode.hasAttribute("data-index")) {
            processChatNode(addedNode);
          } else {
            addedNode.querySelectorAll("[data-index]").forEach(processChatNode);
          }
        }
      }
    });

    const chatObserver = new MutationObserver(processAddedNodes);
    window.chatBlockObserver = chatObserver;
    chatObserver.observe(chatContainer, { childList: true, subtree: true });

    setTimeout(() => {
      chatContainer.querySelectorAll("[data-index]").forEach(processChatNode);
    }, 1000);

    window.refreshBlockedUsers = async () => {
      const freshList = await getBlockedChannels();
      blockedSet.clear();
      freshList.forEach((u) => blockedSet.add(u.trim().toLowerCase()));

      chatContainer.querySelectorAll("[data-index]").forEach(processChatNode);
    };
  }

  async function observeChatUsernames() {
    if (window.chatUsernameObserver) window.chatUsernameObserver.disconnect();

    const waitForChatContainer = () =>
      new Promise((resolve) => {
        const check = () => {
          const container = document.querySelector("#chatroom-messages");
          if (container) return resolve(container);
          requestAnimationFrame(check);
        };
        check();
      });

    const chatContainer = await waitForChatContainer();

    let disableBlockButtons = false;
    let enableChatBlocking = false;

    try {
      const res = await chrome.storage.local.get([
        "disableBlockButtons",
        "enableChatBlocking",
      ]);
      disableBlockButtons = res.disableBlockButtons ?? false;
      enableChatBlocking = res.enableChatBlocking ?? false;
    } catch (e) {}

    if (!enableChatBlocking) return;

    async function addBlockButtonsToNodes(nodes) {
      try {
        for (const msg of nodes) {
          if (disableBlockButtons) return;

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
              await removeBlockedCards();
              if (window.refreshBlockedUsers)
                await window.refreshBlockedUsers();
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
        let addedNodes = [];
        for (const mutation of mutationsList) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.hasAttribute("data-index")) {
                addedNodes.push(node);
              } else {
                addedNodes.push(...node.querySelectorAll("[data-index]"));
              }
            }
          });
        }
        if (addedNodes.length) addBlockButtonsToNodes(addedNodes);
      }),
    );

    window.chatUsernameObserver = observer;
    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  function createBlockButton(username) {
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

  function createBlockButtonAbsolute(username) {
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

  // Quality Control
  // languages (EN, ES, PT, FR, DE, IT, TR, ID, ZH, JA, KO, AR, FI, PL, RU, VI, CS, HE)
  const SETTINGS_LABELS = [
    "Settings", // English (en)
    "Ajustes", // Spanish (es)
    "Configurações", // Portuguese (pt)
    "Paramètres", // French (fr)
    "Einstellungen", // German (de)
    "Impostazioni", // Italian (it)
    "Ayarlar", // Turkish (tr)
    "Pengaturan", // Indonesian (id)
    "设置", // Chinese (zh_CN)
    "設定", // Japanese (ja)
    "설정", // Korean (ko)
    "إعدادات", // Arabic (ar)
    "Asetukset", // Finnish (fi)
    "Ustawienia", // Polish (pl)
    "Настройки", // Russian (ru)
    "Cài đặt", // Vietnamese (vi)
    "Nastavení", // Czech (cs)
    "הגדרות", // Hebrew (he)
  ];

  let lastKickUrl = location.href;
  let lastAppliedQuality = null;
  let _persistTimer = null;

  initAutoQualityControl();

  async function initAutoQualityControl() {
    sessionStorage.removeItem("quality_reload_done");

    const settings = await getQualitySettings();

    if (settings.preferredQuality) {
      persistSessionQuality(String(settings.preferredQuality));
      lastAppliedQuality = String(settings.preferredQuality);
    }

    if (settings.autoQuality && isKickStreamUrl(location.href)) {
      waitForPlayerAndApply(settings.preferredQuality, false);
    }

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
    if (_persistTimer) {
      clearInterval(_persistTimer);
      _persistTimer = null;
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
    _persistTimer = setInterval(() => {
      if (Date.now() - start > maxMs) {
        clearInterval(_persistTimer);
        _persistTimer = null;
        return;
      }
      const cur = sessionStorage.getItem("stream_quality");
      const video = document.querySelector("video");
      const qualityEls = document.querySelectorAll(
        '[data-testid="player-quality-option"], [role="menuitemradio"], [role="menuitem"]',
      );
      if (cur === String(pref) && (video || qualityEls.length > 0)) {
        clearInterval(_persistTimer);
        _persistTimer = null;
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
    if (!preferredQuality) return;

    const pref = parseInt(String(preferredQuality).replace(/\D/g, ""), 10);
    if (isNaN(pref)) return;

    sessionStorage.setItem("stream_quality", String(pref));
    persistSessionQuality(pref);
    lastAppliedQuality = String(pref);

    const video =
      document.querySelector("video") ||
      document.getElementById("video-player");

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
      let settingsBtn = findSettingsButton();

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

      let available = qualityEls
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

      let target =
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

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
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

  // ==== Volume Boost ====
  let audioContext,
    gainNode,
    source,
    currentBoost = 1,
    currentVideo = null;

  function setupAudioContext() {
    const video = document.getElementById("video-player");
    if (!video || !audioContext) return;

    if (video !== currentVideo || !source) {
      currentVideo = video;
      if (source)
        try {
          source.disconnect();
        } catch (e) {}
      source = audioContext.createMediaElementSource(video);
      if (!gainNode) gainNode = audioContext.createGain();
      gainNode.gain.value = currentBoost;
      source.connect(gainNode).connect(audioContext.destination);
    }
  }

  function setVolumeBoost(boostAmount) {
    if (!audioContext) return;
    currentBoost = boostAmount;
    if (gainNode) gainNode.gain.value = boostAmount;
    if (audioContext.state === "suspended") audioContext.resume();
  }

  async function applyStoredVolumeBoost() {
    const { volumeBoost = 1 } = await chrome.storage.local.get("volumeBoost");
    setVolumeBoost(isNaN(Number(volumeBoost)) ? 1 : Number(volumeBoost));
  }

  function enableAudioContextOnUserGesture() {
    function initialize() {
      if (!audioContext) audioContext = new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();
      setupAudioContext();
      applyStoredVolumeBoost();
      window.removeEventListener("click", initialize);
      window.removeEventListener("keydown", initialize);
    }
    window.addEventListener("click", initialize);
    window.addEventListener("keydown", initialize);
  }

  function clearSearchHistory() {
    try {
      const key = "search-history";
      const hostname = location.hostname;

      if (hostname !== "kick.com" && !hostname.endsWith(".kick.com")) return;

      const current = localStorage.getItem(key);
      if (current && current !== "[]") localStorage.setItem(key, "[]");
    } catch (e) {}
  }

  let swapChatDirection = false;

  function processChatLayout() {
    addChatToggleButton();
    moveChatLogic(swapChatDirection);
  }

  function moveChatLogic(isSwapChatDirection) {
    const chatroom = document.getElementById("channel-chatroom");
    const main = document.querySelector("main");

    if (!chatroom || !main || !main.parentElement || main.contains(chatroom))
      return;

    const parent = main.parentElement;
    const mainIndex = Array.prototype.indexOf.call(parent.children, main);
    const chatIndex = Array.prototype.indexOf.call(parent.children, chatroom);
    const isCurrentlySwaped = chatIndex < mainIndex;

    if (isSwapChatDirection === isCurrentlySwaped) return;

    if (isSwapChatDirection) main.before(chatroom);
    else main.after(chatroom);
  }

  function updateDanmakuBtnStyle(btn, isEnabled) {
    btn.style.color = isEnabled ? "#53fc18" : "inherit";
    btn.style.opacity = isEnabled ? "1" : "0.5";
  }

  function addChatToggleButton() {
    const chatroom = document.getElementById("channel-chatroom");
    if (!chatroom) return;

    let header = chatroom.querySelector(
      'button[aria-label="Show active chatters"]',
    )?.parentElement;
    if (!header) header = chatroom.firstElementChild;

    if (header && !document.getElementById("mtc-toggle-btn")) {
      const btn = document.createElement("button");
      btn.id = "mtc-toggle-btn";
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>`;
      btn.style.cssText = `background:transparent;border:none;color:inherit;cursor:pointer;padding:8px;opacity:0.7;transition:opacity 0.2s,transform 0.2s,color 0.2s;display:flex;align-items:center;justify-content:center;`;

      btn.onmouseenter = function () {
        this.style.opacity = "1";
        this.style.transform = "scale(1.1)";
      };
      btn.onmouseleave = function () {
        this.style.opacity = "0.7";
        this.style.transform = "scale(1)";
      };
      btn.onclick = (e) => {
        e.stopPropagation();
        swapChatDirection = !swapChatDirection;
        moveChatLogic(swapChatDirection);
      };

      const menuBtnContainer = header.querySelector(
        "div.h-fit.w-fit.cursor-pointer",
      );
      if (menuBtnContainer) {
        menuBtnContainer.insertAdjacentElement("afterend", btn);
      } else {
        header.insertBefore(btn, header.firstChild);
      }
    }

    if (!document.getElementById("mtc-controls-wrapper")) {
      const wrapper = document.createElement("div");
      wrapper.id = "mtc-controls-wrapper";
      wrapper.style.cssText = `
        display: flex; align-items: center; gap: 4px; margin-right: 4px; z-index: 9999;
      `;

      const danmakuBtn = document.createElement("button");
      danmakuBtn.id = "danmaku-toggle-btn";
      danmakuBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
      danmakuBtn.style.cssText = `background:transparent;border:none;color:inherit;cursor:pointer;padding:8px;opacity:0.7;transition:opacity 0.2s,transform 0.2s,color 0.2s;display:flex;align-items:center;justify-content:center;`;

      chrome.storage.local.get("enableDanmaku", (result) =>
        updateDanmakuBtnStyle(danmakuBtn, result.enableDanmaku ?? false),
      );
      danmakuBtn.onmouseenter = function () {
        this.style.opacity = "1";
        this.style.transform = "scale(1.1)";
      };
      danmakuBtn.onmouseleave = function () {
        chrome.storage.local.get("enableDanmaku", (res) =>
          updateDanmakuBtnStyle(this, res.enableDanmaku ?? false),
        );
        this.style.transform = "scale(1)";
      };
      danmakuBtn.onclick = (e) => {
        e.stopPropagation();
        chrome.storage.local.get("enableDanmaku", (result) => {
          const newStatus = !(result.enableDanmaku ?? false);
          chrome.storage.local.set({ enableDanmaku: newStatus }, () =>
            updateDanmakuBtnStyle(danmakuBtn, newStatus),
          );
        });
      };
      wrapper.appendChild(danmakuBtn);

      const activeUsersBtn = document.createElement("button");
      activeUsersBtn.id = "active-users-toggle-btn";
      activeUsersBtn.innerHTML = ICON_USER;
      activeUsersBtn.style.cssText = `background:transparent;border:none;color:inherit;cursor:pointer;padding:8px;opacity:0.7;transition:opacity 0.2s,transform 0.2s,color 0.2s;display:flex;align-items:center;justify-content:center;`;

      activeUsersBtn.onmouseenter = function () {
        this.style.opacity = "1";
        this.style.transform = "scale(1.1)";
      };
      activeUsersBtn.onmouseleave = function () {
        this.style.opacity = isOverlayVisible ? "1" : "0.7";
        this.style.transform = "scale(1)";
      };
      activeUsersBtn.onclick = (e) => {
        e.stopPropagation();
        isOverlayVisible = !isOverlayVisible;
        activeUsersBtn.style.opacity = isOverlayVisible ? "1" : "0.7";
        activeUsersBtn.style.color = isOverlayVisible ? "#53fc18" : "inherit";
        updateOverlayUI();
      };
      wrapper.appendChild(activeUsersBtn);

      const settingsBtnContainer = document.querySelector(
        "#chatroom-footer div.ml-auto",
      );
      if (settingsBtnContainer) {
        settingsBtnContainer.insertBefore(
          wrapper,
          settingsBtnContainer.firstChild,
        );
      } else {
        let fallbackHeader =
          chatroom.querySelector('button[aria-label="Show active chatters"]')
            ?.parentElement || chatroom.firstElementChild;
        if (fallbackHeader) {
          const kickActiveBtn = fallbackHeader.querySelector(
            'button[aria-label="Show active chatters"]',
          );
          if (kickActiveBtn)
            kickActiveBtn.parentNode.insertBefore(wrapper, kickActiveBtn);
          else fallbackHeader.appendChild(wrapper);
        }
      }
    }
  }

  // DANMAKU
  function isDanmakuEnabled() {
    return new Promise((resolve) => {
      chrome.storage.local.get("enableDanmaku", (result) =>
        resolve(result.enableDanmaku ?? false),
      );
    });
  }

  const DANMAKU_CSS = `
    .ukick-danmaku-overlay {
      position: absolute !important; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none !important; overflow: hidden !important;
      z-index: 2147483647 !important; background: transparent !important; contain: strict;
    }
    .ukick-danmaku-item {
      position: absolute !important; white-space: nowrap !important;
      font-family: 'Inter', sans-serif !important; font-weight: 900 !important;
      text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000 !important;
      color: white !important; font-size: 28px !important; will-change: transform !important;
      opacity: 0.9 !important; line-height: 1.3 !important; display: flex; align-items: center;
    }
    .ukick-danmaku-item img { display: inline-block !important; vertical-align: middle !important; height: 1.4em !important; width: auto !important; margin: 0 2px !important; }
  `;

  const DanmakuEngine = {
    config: {
      speed: 6,
      fontSize: 28,

      baseInterval: 120,
      normalInterval: 50,
      fastInterval: 25,

      maxQueueSize: 60,
      scrollPauseDuration: 500,
      maxTextLength: 100,

      replyPatterns: [
        /^الرد على @[\w-]+ /i, // Arabic (ar)
        /^Odpovídá @[\w-]+ /i, // Czech (cs)
        /^Antworten an @[\w-]+ /i, // German (de)
        /^Replying to @[\w-]+ /i, // English (en)
        /^Respondiendo a @[\w-]+ /i, // Spanish (es)
        /^Vastaa @[\w-]+ /i, // Finnish (fi)
        /^Répondre à @[\w-]+ /i, // French (fr)
        /^בתשובה ל@[\w-]+ /i, // Hebrew (he)
        /^Membalas @[\w-]+ /i, // Indonesian (id)
        /^Rispondi a @[\w-]+ /i, // Italian (it)
        /^返信中 @[\w-]+ /i, // Japanese (ja)
        /^@[\w-]+에게 답장 /i, // Korean (ko)
        /^Odpowiada @[\w-]+ /i, // Polish (pl)
        /^Respondendo a @[\w-]+ /i, // Portuguese (pt_BR, pt_PT)
        /^Ответ @[\w-]+ /i, // Russian (ru)
        /^Yanıtla @[\w-]+ /i, // Turkish (tr)
        /^Trả lời @[\w-]+ /i, // Vietnamese (vi)
        /^回复 @[\w-]+ /i, // Chinese Simplified (zh_CN)
      ],

      systemKeywords: [
        "رسائل جديدة", // Arabic (ar)
        "Nové zprávy", // Czech (cs)
        "Neue Nachrichten", // German (de)
        "New messages", // English (en)
        "Nuevos mensajes", // Spanish (es)
        "Uudet viestit", // Finnish (fi)
        "Nouveaux messages", // French (fr)
        "הודעות חדשות", // Hebrew (he)
        "Pesan baru", // Indonesian (id)
        "Nuovi messaggi", // Italian (it)
        "新しいメッセージ", // Japanese (ja)
        "새 메시지", // Korean (ko)
        "Nowe wiadomości", // Polish (pl)
        "Novas mensagens", // Portuguese (pt_BR, pt_PT)
        "Новые сообщения", // Russian (ru)
        "Yeni mesajlar", // Turkish (tr)
        "Tin nhắn mới", // Vietnamese (vi)
        "新消息", // Chinese Simplified (zh_CN)
      ],
    },

    state: {
      overlay: null,
      observer: null,
      chatContainer: null,
      messageQueue: [],
      highestProcessedIndex: -1,
      isPaused: false,
      displayTimer: null,
      scrollTimer: null,
      intervalId: null,
      isActive: false,
      currentUrl: window.location.href,
    },

    start: function () {
      if (this.state.isActive) return;

      this.state.isActive = true;
      this.state.currentUrl = window.location.href;
      this.state.messageQueue = [];
      this.state.highestProcessedIndex = this.scanLatestIndex();

      this.setupOverlay();
      this.setupObserver();
      this.startQueueProcessor();

      this.state.intervalId = setInterval(() => {
        if (!this.state.isActive) return;

        if (window.location.href !== this.state.currentUrl) {
          this.state.currentUrl = window.location.href;
          this.state.messageQueue = [];
          this.state.highestProcessedIndex = -1;
          if (this.state.observer) {
            this.state.observer.disconnect();
            this.state.observer = null;
          }
          if (this.state.chatContainer) {
            this.state.chatContainer.removeEventListener(
              "scroll",
              this.handleScroll,
            );
            this.state.chatContainer = null;
          }
          this.setupOverlay();
        }

        this.setupOverlay();
        this.setupObserver();
      }, 1000);
    },

    stop: function () {
      this.state.isActive = false;
      if (this.state.intervalId) clearInterval(this.state.intervalId);
      if (this.state.observer) this.state.observer.disconnect();
      if (this.state.overlay) this.state.overlay.remove();
      if (this.state.displayTimer) clearTimeout(this.state.displayTimer);
      if (this.state.chatContainer)
        this.state.chatContainer.removeEventListener(
          "scroll",
          this.handleScroll,
        );
      this.state.intervalId = null;
      this.state.observer = null;
      this.state.overlay = null;
      this.state.chatContainer = null;
      this.state.messageQueue = [];
    },

    findChatContainer: function () {
      const id =
        document.getElementById("chatroom-messages") ||
        document.getElementById("chatroom");
      if (id) return { el: id };
      const scroll =
        document.querySelector('[class*="chat-scrollable-area"]') ||
        document.querySelector(".no-scrollbar.relative");
      return scroll ? { el: scroll } : null;
    },

    findVideoContainer: function () {
      const video = document.querySelector("video");
      if (!video) return null;
      let parent = video.parentElement;
      while (parent && parent.parentElement) {
        const styles = window.getComputedStyle(parent);
        const isPositioned =
          styles.position === "relative" ||
          styles.position === "absolute" ||
          styles.position === "fixed";
        const isLargeEnough =
          parent.clientHeight >= video.clientHeight &&
          parent.clientWidth >= video.clientWidth;
        if (isPositioned && isLargeEnough) return parent;
        parent = parent.parentElement;
      }
      return video.parentElement;
    },

    scanLatestIndex: function () {
      const container = this.state.chatContainer;
      if (!container) return -1;
      const messages = container.querySelectorAll("div[data-index]");
      let maxIndex = -1;
      messages.forEach((node) => {
        const idx = parseInt(node.getAttribute("data-index"));
        if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
      });
      return maxIndex;
    },

    setupObserver: function () {
      if (
        this.state.observer &&
        this.state.chatContainer &&
        document.body.contains(this.state.chatContainer)
      )
        return;
      const target = this.findChatContainer();
      if (target) {
        if (this.state.chatContainer && this.state.chatContainer !== target.el)
          this.state.chatContainer.removeEventListener(
            "scroll",
            this.handleScroll,
          );
        this.state.chatContainer = target.el;
        if (this.state.observer) this.state.observer.disconnect();
        this.state.chatContainer.addEventListener(
          "scroll",
          this.handleScroll.bind(this),
        );
        this.state.observer = new MutationObserver((mutations) => {
          if (!this.state.isActive) return;
          mutations.forEach((m) =>
            m.addedNodes.forEach((n) => {
              if (n.nodeType === 1) this.processMessage(n);
            }),
          );
        });
        this.state.observer.observe(this.state.chatContainer, {
          childList: true,
          subtree: true,
        });
      }
    },

    setupOverlay: function () {
      if (this.state.overlay && document.body.contains(this.state.overlay))
        return;
      const videoContainer = this.findVideoContainer();
      if (videoContainer) {
        document
          .querySelectorAll(".ukick-danmaku-overlay")
          .forEach((e) => e.remove());
        this.state.overlay = document.createElement("div");
        this.state.overlay.className = "ukick-danmaku-overlay";
        if (window.getComputedStyle(videoContainer).position === "static")
          videoContainer.style.position = "relative";
        videoContainer.appendChild(this.state.overlay);
      }
    },

    handleScroll: function () {
      this.state.isPaused = true;
      if (this.state.scrollTimer) clearTimeout(this.state.scrollTimer);
      this.state.scrollTimer = setTimeout(() => {
        this.state.isPaused = false;
      }, this.config.scrollPauseDuration);
    },

    processMessage: function (node) {
      const currentIndex = parseInt(node.getAttribute("data-index"));
      if (!isNaN(currentIndex)) {
        if (currentIndex <= this.state.highestProcessedIndex) return;
        this.state.highestProcessedIndex = currentIndex;
      }
      if (node.nodeType !== 1) return;

      const span = node.querySelector("span.font-normal");
      if (!span) return;

      const html = span.innerHTML,
        txt = span.innerText || "";
      if (!html) return;
      if (this.config.systemKeywords.some((k) => txt.includes(k))) return;

      let cleanTxt = txt;
      this.config.replyPatterns.forEach((regex) => {
        cleanTxt = cleanTxt.replace(regex, "");
      });
      cleanTxt = cleanTxt.replace(/https?:\/\/[^\s]+/gi, "").trim();

      if (cleanTxt.length > this.config.maxTextLength) return;
      if (!cleanTxt && !html.includes("<img")) return;

      this.addToQueue({ html: html, text: cleanTxt });
    },

    addToQueue: function (msgObj) {
      if (this.state.messageQueue.length >= this.config.maxQueueSize)
        this.state.messageQueue.shift();
      this.state.messageQueue.push(msgObj);
    },

    startQueueProcessor: function () {
      const loop = () => {
        if (!this.state.isActive) return;
        if (this.state.isPaused || this.state.messageQueue.length === 0) {
          this.state.displayTimer = setTimeout(loop, this.config.baseInterval);
          return;
        }

        const msg = this.state.messageQueue.shift();
        this.showMessage(msg.html, false);

        let nextDelay = this.config.baseInterval;
        const queueSize = this.state.messageQueue.length;
        if (queueSize > 15) nextDelay = this.config.fastInterval;
        else if (queueSize > 5) nextDelay = this.config.normalInterval;

        this.state.displayTimer = setTimeout(loop, nextDelay);
      };
      loop();
    },

    showMessage: function (html) {
      if (!this.state.overlay) {
        this.setupOverlay();
        if (!this.state.overlay) return;
      }
      const rect = this.state.overlay.getBoundingClientRect();
      if (rect.width === 0) return;

      const item = document.createElement("div");
      item.className = "ukick-danmaku-item";
      item.innerHTML = html;

      if (!html.includes("<img")) {
        const colors = [
          "#ffffff",
          "#ffebee",
          "#e3f2fd",
          "#e8f5e9",
          "#fff3e0",
          "#f3e5f5",
        ];
        item.style.color = colors[Math.floor(Math.random() * colors.length)];
      }
      this.state.overlay.appendChild(item);

      const lh = this.config.fontSize + 10;
      const lane = Math.floor(
        Math.random() * Math.max(1, Math.floor((rect.height / lh) * 0.85)),
      );
      item.style.top = lane * lh + "px";

      item.animate(
        [
          { transform: `translateX(${rect.width}px)` },
          { transform: `translateX(-100%) translateX(-${item.offsetWidth}px)` },
        ],
        { duration: this.config.speed * 1000, easing: "linear" },
      ).onfinish = () => item.remove();
    },
  };

  function injectDanmakuStyles() {
    if (!document.getElementById("ukick-danmaku-styles")) {
      const s = document.createElement("style");
      s.id = "ukick-danmaku-styles";
      s.textContent = DANMAKU_CSS;
      document.head.appendChild(s);
    }
  }

  async function processDanmaku() {
    injectDanmakuStyles();
    if (await isDanmakuEnabled()) DanmakuEngine.start();
    else DanmakuEngine.stop();
  }

  // Active Users
  let activeUsers = new Map();
  let messageCount = 0;
  let activeObserver = null;
  let activeUIElement = null;
  let isActiveEnabled = false;
  let isOverlayVisible = false;
  let statsInterval = null;
  let lastUrlPath = location.pathname;
  let lastUIUserCount = -1;
  let lastUIMsgCount = -1;

  const ICON_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  const ICON_CHAT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;

  function updateStatsUI() {
    if (!isActiveEnabled) return;
    const target = document.querySelector('[data-testid="viewer-count"]');
    const parent = target?.parentElement;
    if (!parent) return;

    if (activeUsers.size === lastUIUserCount && messageCount === lastUIMsgCount)
      return;

    if (!activeUIElement || !document.body.contains(activeUIElement)) {
      activeUIElement = document.createElement("div");
      activeUIElement.className = "flex items-center gap-2 text-sm font-bold";
      activeUIElement.style.marginLeft = "4px";
      activeUIElement.innerHTML = `<div class="flex items-center gap-1 text-primary-base">${ICON_USER}<span class="uk-u">0</span></div><div class="flex items-center gap-1 text-white">${ICON_CHAT}<span class="uk-m">0</span></div>`;
      parent.appendChild(activeUIElement);
    }

    lastUIUserCount = activeUsers.size;
    lastUIMsgCount = messageCount;

    activeUIElement.querySelector(".uk-u").textContent = lastUIUserCount;
    activeUIElement.querySelector(".uk-m").textContent = lastUIMsgCount;
  }

  function resetActiveStats() {
    if (activeObserver) activeObserver.disconnect();
    activeObserver = null;
    activeUsers.clear();
    messageCount = 0;
    lastUIUserCount = -1;
    lastUIMsgCount = -1;
    closeOverlay();
    if (activeUIElement) activeUIElement.remove();
    activeUIElement = null;
  }

  function processActiveChatNodes(nodes) {
    for (const node of nodes) {
      if (
        node.nodeType !== 1 ||
        !node.hasAttribute ||
        !node.hasAttribute("data-index")
      )
        continue;
      const btn = node.querySelector("button[data-prevent-expand]");
      if (!btn) continue;

      const username = btn.textContent.trim();
      if (!username) continue;

      const color = btn.style.color || "rgb(255, 255, 255)";
      let role = "viewer";

      if (node.querySelector('g[clip-path="url(#clip0_614_6275)"]'))
        role = "verified";
      else if (node.querySelector('g[clip-path="url(#clip0_817_50667)"]'))
        role = "mod";

      const existingData = activeUsers.get(username);
      if (existingData) {
        const p = { verified: 3, mod: 2, viewer: 1 };
        const newRole =
          p[role] > p[existingData.role] ? role : existingData.role;
        activeUsers.set(username, {
          time: Date.now(),
          role: newRole,
          color: existingData.color || color,
        });
      } else {
        activeUsers.set(username, { time: Date.now(), role, color });
      }
      messageCount++;
    }
  }

  function startActiveObserver() {
    if (!isActiveEnabled) return;
    resetActiveStats();
    const container = document.querySelector("#chatroom-messages");
    if (!container) return;

    let pendingNodes = [];
    let rafId = null;
    const flushNodes = () => {
      rafId = null;
      if (pendingNodes.length === 0) return;
      processActiveChatNodes(pendingNodes);
      pendingNodes = [];
    };

    activeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList") continue;
        for (const node of m.addedNodes) pendingNodes.push(node);
      }
      if (pendingNodes.length > 0 && rafId === null)
        rafId = requestAnimationFrame(flushNodes);
    });

    activeObserver.observe(container, { childList: true, subtree: true });
  }

  function toggleActiveStats(status) {
    isActiveEnabled = status;
    if (status) {
      if (/^\/\w+$/.test(location.pathname)) startActiveObserver();
      if (!statsInterval) {
        statsInterval = setInterval(() => {
          if (!isActiveEnabled) return;
          const currentPath = location.pathname;
          const isChannelPage = /^\/\w+$/.test(currentPath);
          if (currentPath !== lastUrlPath) {
            lastUrlPath = currentPath;
            isChannelPage ? startActiveObserver() : resetActiveStats();
          } else if (isChannelPage) {
            const container = document.querySelector("#chatroom-messages");
            if (container && (!activeObserver || !document.contains(container)))
              startActiveObserver();
          }

          const now = Date.now();
          activeUsers.forEach((data, user) => {
            if (now - data.time > 1800000) activeUsers.delete(user);
          });

          updateStatsUI();
        }, 1000);
      }
    } else {
      if (statsInterval) clearInterval(statsInterval);
      statsInterval = null;
      resetActiveStats();
    }
  }

  function closeOverlay() {
    const existing = document.getElementById("ukick-active-users-overlay");
    if (existing) existing.remove();
    isOverlayVisible = false;
    const btn = document.getElementById("active-users-toggle-btn");
    if (btn) {
      btn.style.color = "inherit";
      btn.style.opacity = "0.7";
    }
  }

  function buildOverlay() {
    if (!document.getElementById("ukick-au-styles")) {
      const style = document.createElement("style");
      style.id = "ukick-au-styles";
      style.textContent = `
        #ukick-active-users-overlay { position: absolute; inset: 0; background: rgba(25,27,31,.98); z-index: 2147483647 !important; overflow-y: auto; font-size: 13px; color: #F4F5F6; display: flex; flex-direction: column; pointer-events: auto !important; }
        .au-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #24272c; position: sticky; top: 0; background: rgba(25,27,31,.98); z-index: 10; }
        .au-header b { font-size: 15px; }
        .au-close-btn { background: none; border: none; color: #A8ADB3; cursor: pointer; font-size: 18px; }
        .au-search-wrap { padding: 8px 16px 4px; position: sticky; top: 46px; background: rgba(25,27,31,.98); z-index: 10; border-bottom: 1px solid #24272c; margin-bottom: 4px; }
        .au-search-input { width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 6px; border: 1px solid #3f4349; background: #18191c; color: #F4F5F6; outline: none; font-size: 13px; }
        .au-search-input:focus { border-color: #53fc18; }
        .au-list { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 6px; }
        .au-category-title { color: #A8ADB3; font-size: 11px; letter-spacing: 0.5px; margin-top: 8px; margin-bottom: 4px; font-weight: 600; }
        .au-user { padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 500; }
        .au-user:hover { background: #24272c; }
      `;
      document.head.appendChild(style);
    }

    let chatArea = document.querySelector(
      "#channel-chatroom > .relative.flex.flex-1.flex-col",
    );

    if (!chatArea) {
      chatArea =
        document.querySelector("#chatroom-messages")?.parentElement
          ?.parentElement;
    }
    if (!chatArea) {
      chatArea = document.getElementById("channel-chatroom");
    }

    if (!chatArea) return;

    if (getComputedStyle(chatArea).position === "static") {
      chatArea.style.position = "relative";
    }

    const overlay = document.createElement("div");
    overlay.id = "ukick-active-users-overlay";

    const sorted = [...activeUsers.entries()].sort((a, b) =>
      a[0].toLowerCase().localeCompare(b[0].toLowerCase()),
    );
    const verified = [],
      mods = [],
      viewers = [];

    sorted.forEach(([user, data]) => {
      if (data.role === "verified") verified.push({ user, ...data });
      else if (data.role === "mod") mods.push({ user, ...data });
      else viewers.push({ user, ...data });
    });

    const renderCategory = (title, list) => {
      if (list.length === 0) return "";
      const usersHtml = list
        .map(
          (item) =>
            `<div class="au-user" data-username="${item.user}" style="color:${item.color}">${item.user}</div>`,
        )
        .join("");
      return `<div class="au-category" data-category="${title.toLowerCase()}"><div class="au-category-title">${title}</div>${usersHtml}</div>`;
    };

    const usersLabel = chrome.i18n.getMessage("overlay_users") || "Users";

    overlay.innerHTML = `
      <div class="au-header">
        <b>${usersLabel} (${activeUsers.size})</b>
        <button class="au-close-btn" id="close-users-overlay">✕</button>
      </div>
      <div class="au-search-wrap"><input type="text" id="active-users-search" class="au-search-input" placeholder="..."></div>
      <div class="au-list">
        ${renderCategory("VERIFIED", verified)}
        ${renderCategory("MODERATORS", mods)}
        ${renderCategory("VIEWERS", viewers)}
      </div>
    `;

    chatArea.appendChild(overlay);

    document
      .getElementById("active-users-search")
      .addEventListener("input", function () {
        const query = this.value.toLowerCase().trim();
        overlay.querySelectorAll(".au-category").forEach((category) => {
          let visibleCount = 0;
          category.querySelectorAll(".au-user").forEach((userEl) => {
            const isMatch = userEl.dataset.username
              .toLowerCase()
              .includes(query);
            userEl.style.display = isMatch ? "" : "none";
            if (isMatch) visibleCount++;
          });
          category.style.display = visibleCount === 0 ? "none" : "";
        });
      });

    document.getElementById("close-users-overlay").onclick = closeOverlay;
    overlay.querySelectorAll(".au-user").forEach((el) => {
      el.onclick = () =>
        window.open("https://kick.com/" + el.dataset.username, "_blank");
    });
  }

  function updateOverlayUI() {
    if (isOverlayVisible) buildOverlay();
    else closeOverlay();
  }

  function initDynamicChatWidth() {
    const STORAGE_KEY = "kcw_custom_width";
    if (!document.getElementById("kcw-style")) {
      const style = document.createElement("style");
      style.id = "kcw-style";
      style.textContent = `
        #kcw-line { position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: transparent; cursor: ew-resize; z-index: 99999; border-left: 2px solid #24272c; transition: border-color 0.2s; }
        #kcw-line:hover, #kcw-line.active { border-left-color: #3f4349; }
        #kcw-panel { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); background: rgba(10, 10, 10, 0.95); border: 1px solid rgba(60, 63, 68, 0.8); border-radius: 8px; padding: 6px; display: none; flex-direction: column; align-items: center; gap: 6px; z-index: 99999; }
        #kcw-panel.active { display: flex; }
        #kcw-val { color: rgba(255, 255, 255, 0.9); text-align: center; font-size: 11px; font-family: system-ui, sans-serif; user-select: none; background: rgba(255, 255, 255, 0.15); padding: 3px 8px; border-radius: 4px; }
        #kcw-panel button { border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s, transform 0.1s; }
        #kcw-panel button:active { transform: scale(0.9); }
        #kcw-ok { background: rgba(74, 222, 128, 0.15); } #kcw-ok:hover { background: rgba(74, 222, 128, 0.35); } #kcw-ok svg { color: #4ade80; }
        #kcw-cancel { background: rgba(248, 113, 113, 0.15); } #kcw-cancel:hover { background: rgba(248, 113, 113, 0.35); } #kcw-cancel svg { color: #f87171; }
        #kcw-reset { background: rgba(161, 161, 170, 0.15); } #kcw-reset:hover { background: rgba(161, 161, 170, 0.35); } #kcw-reset svg { color: #a1a1aa; }
      `;
      document.head.appendChild(style);
    }

    const observer = new MutationObserver(() => {
      const chatEl = document.getElementById("channel-chatroom");
      if (chatEl && !chatEl.dataset.kcw) {
        observer.disconnect();
        setupChat(chatEl);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function setupChat(chat) {
      chat.dataset.kcw = "1";
      chat.style.position = "relative";
      const savedWidth = localStorage.getItem(STORAGE_KEY);
      if (savedWidth) chat.style.setProperty("--chat-width", savedWidth);
      createDragUI(chat);
    }

    function createDragUI(chat) {
      let isDragging = false,
        startX = 0,
        startW = 0,
        prevW = 0;
      chat.insertAdjacentHTML(
        "beforeend",
        `
        <div id="kcw-line"></div>
        <div id="kcw-panel">
          <div id="kcw-val"></div>
          <button id="kcw-ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
          <button id="kcw-cancel"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          <button id="kcw-reset"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>
        </div>
      `,
      );

      const line = document.getElementById("kcw-line"),
        panel = document.getElementById("kcw-panel"),
        valDisplay = document.getElementById("kcw-val");

      const updateDisplay = (w) => (valDisplay.textContent = `${w}px`);

      const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        line.classList.remove("active");
        chat.style.removeProperty("transition");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", stopDrag);
      };

      const onMouseMove = (e) => {
        let newWidth = Math.max(
          250,
          Math.min(startW + (startX - e.clientX), window.innerWidth - 100),
        );
        chat.style.setProperty("--chat-width", `${newWidth}px`);
        updateDisplay(newWidth);
      };

      line.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        line.classList.add("active");
        panel.classList.add("active");
        startW =
          parseInt(getComputedStyle(chat).getPropertyValue("--chat-width")) ||
          chat.offsetWidth;
        prevW = startW;
        startX = e.clientX;
        chat.style.setProperty("transition", "none");
        updateDisplay(startW);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", stopDrag);
      });

      panel.addEventListener("mouseenter", () => panel.classList.add("active"));

      document.getElementById("kcw-ok").addEventListener("click", () => {
        localStorage.setItem(
          STORAGE_KEY,
          getComputedStyle(chat).getPropertyValue("--chat-width"),
        );
        panel.classList.remove("active");
      });
      document.getElementById("kcw-cancel").addEventListener("click", () => {
        chat.style.setProperty("--chat-width", `${prevW}px`);
        updateDisplay(prevW);
        panel.classList.remove("active");
      });
      document.getElementById("kcw-reset").addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        chat.style.removeProperty("--chat-width");
        panel.classList.remove("active");
      });
    }
  }

  function initKeyboardVolumeControl() {
    let activeVideo = null,
      volDisplay = null,
      fadeTimer = null,
      isRunning = false;

    if (!document.getElementById("kv-style")) {
      const style = document.createElement("style");
      style.id = "kv-style";
      style.textContent = `
        .kv-vol-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.7); color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 24px; font-weight: bold; font-family: sans-serif; pointer-events: none; z-index: 9999; opacity: 0; transition: opacity 0.2s ease-in-out; }
      `;
      document.head.appendChild(style);
    }

    function showVolume() {
      if (!activeVideo) return;

      if (!volDisplay || !volDisplay.parentNode) {
        volDisplay = document.createElement("div");
        volDisplay.className = "kv-vol-overlay";
        const holder =
          document.getElementById("injected-channel-player") ||
          activeVideo.parentElement;
        if (holder) holder.appendChild(volDisplay);
      }

      volDisplay.textContent = Math.round(activeVideo.volume * 100) + "%";
      volDisplay.style.opacity = "1";

      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => (volDisplay.style.opacity = "0"), 1000);
    }

    function updateSlider() {
      if (!activeVideo) return;
      const slider = document.querySelector('[aria-label="Volume"]'),
        track = document.querySelector(
          '[data-orientation="horizontal"].bg-white',
        );
      if (slider && track) {
        const pct = activeVideo.volume * 100;
        slider.parentNode.style.left = pct + "%";
        slider.setAttribute("aria-valuenow", pct);
        track.style.right = 100 - pct + "%";
      }
    }

    function onKeyDown(e) {
      if (!activeVideo || !document.body.contains(activeVideo)) {
        activeVideo = document.querySelector("#video-player");
        if (!activeVideo) return;
      }

      const tag = document.activeElement.tagName.toLowerCase(),
        editable = document.activeElement.isContentEditable;
      const isRange =
        tag === "input" && document.activeElement.type === "range";

      if (!isRange && (tag === "input" || tag === "textarea" || editable))
        return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();

        const step = 0.05;
        if (e.key === "ArrowUp") {
          if (activeVideo.muted) {
            activeVideo.muted = false;
            activeVideo.volume = 0;
          }
          activeVideo.volume = Math.min(1, activeVideo.volume + step);
        } else {
          activeVideo.volume = Math.max(0, activeVideo.volume - step);
        }

        updateSlider();
        showVolume();
      }
    }

    window.startKeyboardVolume = function () {
      if (isRunning) return;
      isRunning = true;
      activeVideo = document.querySelector("#video-player");
      document.addEventListener("keydown", onKeyDown, true);
    };

    window.stopKeyboardVolume = function () {
      if (!isRunning) return;
      isRunning = false;
      document.removeEventListener("keydown", onKeyDown, true);
      activeVideo = null;
    };
  }

  initKeyboardVolumeControl();

  const themepalettes = {
    original: { bg: "#53fc18", text: "#000000" },
    purple: { bg: "#9333ea", text: "#ffffff" },
    red: { bg: "#ef4444", text: "#ffffff" },
    blue: { bg: "#3b82f6", text: "#ffffff" },
    orange: { bg: "#f97316", text: "#ffffff" },
    cyan: { bg: "#06b6d4", text: "#ffffff" },
  };

  let paletteStyleTag = null,
    paletteObserver = null,
    isPaletteRunning = false;

  function hexToHsl(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 0 };
    let r = parseInt(result[1], 16) / 255,
      g = parseInt(result[2], 16) / 255,
      b = parseInt(result[3], 16) / 255;
    let max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      h,
      s,
      l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function getLogoFilter(targetHex) {
    const target = hexToHsl(targetHex);
    if (target.s < 15) return `grayscale(1) brightness(${target.l / 50})`;
    return `hue-rotate(${target.h - 101}deg) saturate(${target.s / 98}) brightness(${target.l / 54})`;
  }

  function applyPaletteTheme(bgColor, textColor) {
    removePaletteTheme();
    if (!bgColor || !textColor) return;
    const filter = getLogoFilter(bgColor);
    paletteStyleTag = document.createElement("style");
    paletteStyleTag.id = "kick-palette-style";
    paletteStyleTag.textContent = `
      .text-primary-base, .text-green-500 { color: ${bgColor} !important; }
      .bg-primary-base, .bg-green-500 { background-color: ${bgColor} !important; }
      .border-green-500 { border-color: ${bgColor} !important; }
      [fill="url(#paint0_linear_614_6275)"] { fill: ${bgColor} !important; }
      .text-primary-onPrimary { color: ${textColor} !important; }
      img[src*="kick-logo.svg"] { filter: ${filter} !important; }
    `;
    document.head.appendChild(paletteStyleTag);

    paletteObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (
            node.nodeType === 1 &&
            node.tagName === "IMG" &&
            node.src.includes("kick-logo.svg")
          )
            node.style.filter = filter;
        }
      }
    });
    paletteObserver.observe(document.body, { childList: true, subtree: true });
  }

  function removePaletteTheme() {
    if (paletteStyleTag) {
      paletteStyleTag.remove();
      paletteStyleTag = null;
    }
    if (paletteObserver) {
      paletteObserver.disconnect();
      paletteObserver = null;
    }
  }

  window.startWebsitePalette = async function () {
    if (isPaletteRunning) return;
    isPaletteRunning = true;
    const { themePalette = "original" } =
      await chrome.storage.local.get("themePalette");
    const colors = themepalettes[themePalette] || themepalettes.original;
    applyPaletteTheme(colors.bg, colors.text);
  };

  window.stopWebsitePalette = function () {
    if (!isPaletteRunning) return;
    isPaletteRunning = false;
    removePaletteTheme();
  };

  function debounce(fn, delay = 10) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(), delay);
    };
  }

  (async () => {
    if (typeof chrome === "undefined" || !chrome.storage) return;

    async function isEnabled() {
      return new Promise((resolve) =>
        chrome.storage.local.get("enabled", (result) =>
          resolve(result.enabled ?? true),
        ),
      );
    }
    function isSearchHistoryDisabled() {
      return new Promise((resolve) =>
        chrome.storage.local.get("disableSearchHistory", (res) =>
          resolve(res.disableSearchHistory === true),
        ),
      );
    }
    function isActiveUsersDisabled() {
      return new Promise((resolve) =>
        chrome.storage.local.get("disableActiveUsers", (res) =>
          resolve(res.disableActiveUsers === true),
        ),
      );
    }
    function isKeyboardVolumeEnabled() {
      return new Promise((resolve) =>
        chrome.storage.local.get("enableKeyboardVolume", (res) =>
          resolve(res.enableKeyboardVolume === true),
        ),
      );
    }
    function isWebsitePaletteDisabled() {
      return new Promise((resolve) =>
        chrome.storage.local.get("disableWebsitePalette", (res) =>
          resolve(res.disableWebsitePalette === true),
        ),
      );
    }

    let enabled = await isEnabled();

    if (await isSearchHistoryDisabled()) clearSearchHistory();
    toggleActiveStats(!(await isActiveUsersDisabled()));
    if (await isKeyboardVolumeEnabled()) startKeyboardVolume();
    if (!(await isWebsitePaletteDisabled())) startWebsitePalette();

    let observer = null;

    async function startUIFeatures() {
      processChatLayout();
      initDynamicChatWidth();
      try {
        await processDanmaku();
      } catch {}
    }

    async function startFilteringFeatures() {
      if (!(await isEnabled())) return;
      setupAudioContext();
      await processCards();
      await processSidebarChannels();
      await processCategoryCards();
      await processTagButtons();
      await removeBlockedCards();
      await removeSidebarBlockedChannels();
      await removeBlockedCategoryCards();
      await addBlockButtonOnChannelPage();
      await observeBlockedChatMessages();
      await observeChatUsernames();
      if (await isSearchHistoryDisabled()) clearSearchHistory();
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

    function startObserver() {
      if (observer) return;
      observer = new MutationObserver(
        debounce(async () => {
          await startUIFeatures();
          await startFilteringFeatures();
        }, 50),
      );
      observer.observe(document.body, { childList: true, subtree: true });
    }

    startObserver();
    await startUIFeatures();
    if (enabled) await startFilteringFeatures();
    enableAudioContextOnUserGesture();

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if ("enabled" in changes) {
        if (changes.enabled.newValue) startFilteringFeatures();
        else restoreHiddenElements();
      }
      if ("volumeBoost" in changes)
        setVolumeBoost(
          isNaN(Number(changes.volumeBoost.newValue))
            ? 1
            : Number(changes.volumeBoost.newValue),
        );
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
          window.chatBlockObserver?.disconnect();
          window.chatUsernameObserver?.disconnect();
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
            isPaletteRunning = true;
          }
        });
      }
    });
  })();
})();
