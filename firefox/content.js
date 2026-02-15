// ==UserScript==
// @name         uKick — Block & Stream Tweaks for Kick
// @namespace    https://github.com/berkaygediz/uKick
// @version      2.5.0.2
// @description  All-in-one extension to block, boost, and tweak everything on Kick for a better streaming experience.
// @author       berkaygediz
// @match        https://kick.com/*
// @match        https://www.kick.com/*
// @license      Apache-2.0
// @homepageURL  https://github.com/berkaygediz/uKick
// @supportURL   https://github.com/berkaygediz/uKick/issues
// ==/UserScript==

(function () {
  "use strict";

  function normalizeData(str) {
    return str?.toLowerCase().trim() || "";
  }

  // ===== Firefox Extension (Promise) =====

  async function getBlockedChannels() {
    return new Promise((resolve) => {
      browser.storage.local.get("blockedChannels", (result) => {
        try {
          const list = JSON.parse(result.blockedChannels || "[]");
          resolve(list.map((x) => x.trim().toLowerCase()));
        } catch {
          resolve([]);
        }
      });
    });
  }

  async function saveBlockedChannels(list) {
    return new Promise((resolve) => {
      browser.storage.local.set(
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

  // ==== Firefox Extension ==== getBlockedCategories & saveBlockedCategories

  async function getBlockedCategories() {
    return new Promise((resolve) => {
      try {
        browser.storage.local.get("blockedCategories", (result) => {
          if (browser.runtime.lastError) {
            console.error(browser.runtime.lastError);
            resolve([]);
            return;
          }
          try {
            const list = JSON.parse(result.blockedCategories || "[]");
            resolve(list.map(normalizeData));
          } catch {
            resolve([]);
          }
        });
      } catch (err) {
        console.error(err);
        resolve([]);
      }
    });
  }

  async function saveBlockedCategories(list) {
    return new Promise((resolve) => {
      try {
        const data = JSON.stringify(list);
        browser.storage.local.set({ blockedCategories: data }, () => {
          if (browser.runtime.lastError) {
            console.error(browser.runtime.lastError);
          }
          resolve();
        });
      } catch (err) {
        console.error(err);
        resolve();
      }
    });
  }

  // ==== Firefox Extension ==== getBlockedTags & saveBlockedTags

  async function getBlockedTags() {
    return new Promise((resolve) => {
      try {
        browser.storage.local.get("blockedTags", (result) => {
          if (browser.runtime.lastError) {
            console.error(browser.runtime.lastError);
            resolve([]);
            return;
          }
          try {
            const list = JSON.parse(result.blockedTags || "[]");
            resolve(list.map(normalizeData));
          } catch {
            resolve([]);
          }
        });
      } catch (err) {
        console.error(err);
        resolve([]);
      }
    });
  }

  async function saveBlockedTags(list) {
    return new Promise((resolve) => {
      try {
        const data = JSON.stringify(list);
        browser.storage.local.set({ blockedTags: data }, () => {
          if (browser.runtime.lastError) {
            console.error(browser.runtime.lastError);
          }
          resolve();
        });
      } catch (err) {
        console.error(err);
        resolve();
      }
    });
  }

  async function blockTag(tagName) {
    const blocked = await getBlockedTags();
    const normalizedTag = normalizeData(tagName);
    if (!blocked.includes(normalizedTag)) {
      blocked.push(normalizedTag);
      await new Promise((resolve) => {
        browser.storage.local.set(
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
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #333;
        color: #fff;
        padding: 12px 24px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
        `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }

  async function processTagButtons() {
    const blockedTags = await getBlockedTags();
    const blockedNormalized = blockedTags.map((tag) =>
      normalizeData(tag).toLowerCase().trim(),
    );

    const { disableBlockButtons = false } = await browser.storage.local.get(
      "disableBlockButtons",
    );
    if (disableBlockButtons) return;

    const containers = document.querySelectorAll("div.mt-2.flex");

    containers.forEach((container) => {
      const tagElements = container.querySelectorAll("button, a");

      tagElements.forEach((tagEl) => {
        if (tagEl.classList.contains("tag-block-btn")) return;
        if (tagEl.dataset.xAdded === "true") return;

        if (tagEl.querySelector(".tag-block-btn")) {
          tagEl.dataset.xAdded = "true";
          return;
        }

        let rawText =
          tagEl.childNodes[0]?.textContent || tagEl.textContent || "";
        rawText = rawText.replace(/\s+/g, " ").trim();
        if (!rawText) return;

        const normalized = normalizeData(rawText).toLowerCase().trim();

        if (blockedNormalized.includes(normalized)) return;

        const xBtn = document.createElement("span");
        xBtn.textContent = "✖";
        xBtn.title = "Block tag: " + rawText;
        xBtn.className = "tag-block-btn";
        xBtn.style.cssText = `
                margin-left: 4px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border: none;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 12px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                flex-shrink: 0;
                line-height: 1;
                `;

        xBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();

          await blockTag(rawText);

          showToast(`${rawText}`);
        });

        tagEl.style.display = "inline-flex";
        tagEl.style.alignItems = "center";
        tagEl.style.gap = "2px";

        tagEl.appendChild(xBtn);
        tagEl.dataset.xAdded = "true";
      });
    });
  }

  // ==== Firefox Extension ====

  async function blockCategory(categoryName) {
    const blocked = await getBlockedCategories();
    const normalizedCategory = normalizeData(categoryName);
    if (!blocked.includes(normalizedCategory)) {
      blocked.push(normalizedCategory);
      await new Promise((resolve) => {
        browser.storage.local.set(
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

    const { disableBlockButtons = false } = await browser.storage.local.get(
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

      if (disableBlockButtons) return;

      if (card.querySelector(".category-block-btn")) return;

      const imageWrapper = card.querySelector(
        'a[href^="/category/"] > div.relative',
      );
      if (!imageWrapper) return;

      const btn = document.createElement("button");
      btn.textContent = "✖";
      btn.title =
        browser.i18n.getMessage("btn_block_category") +
        ": " +
        nameEl.textContent;
      btn.className = "category-block-btn";
      btn.style.cssText = `
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 14px;
          cursor: pointer;
          z-index: 200;
        `;

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
      (await getBlockedCategories?.()).map(normalizeData) || [];
    const blockedTags = (await getBlockedTags?.()).map(normalizeData) || [];

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
        if (blockedChannels.includes(username)) {
          shouldHide = true;
        }
      }

      if (!shouldHide) {
        const categoryLink = card.querySelector('a[href^="/category/"]');
        if (categoryLink) {
          const categoryText =
            categoryLink.querySelector("span")?.textContent ||
            categoryLink.textContent;
          const categoryName = normalizeData(categoryText);
          if (blockedCategories.includes(categoryName)) {
            shouldHide = true;
          }
        }
      }

      if (!shouldHide && blockedTags.length > 0) {
        const tagsContainer = card.querySelector("div.mt-2.flex");
        if (tagsContainer) {
          const tagElements = tagsContainer.querySelectorAll("button, a");
          for (const tag of tagElements) {
            let tagName = "";

            tagName =
              tag.getAttribute("aria-label") ||
              tag.getAttribute("title") ||
              tag.textContent ||
              "";

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

  // Sidebar, recommended channels
  async function removeSidebarBlockedChannels() {
    const blockedChannels = (await getBlockedChannels()).map(normalizeData);
    const blockedCategories = (await getBlockedCategories()).map(normalizeData);

    document
      .querySelectorAll('[data-testid^="sidebar-recommended-channel-"]')
      .forEach((item) => {
        let hide = false;

        // === Channel  ===
        const anchor =
          item.querySelector('a[href^="/"]') || item.closest('a[href^="/"]');
        if (anchor) {
          const username = normalizeData(
            anchor.getAttribute("href").split("/")[1],
          );
          if (blockedChannels.includes(username)) hide = true;
        }

        // === Category ===
        const categoryEl = item.querySelector("span.text-xs.font-bold");
        if (categoryEl) {
          const categoryName = normalizeData(categoryEl.textContent);
          if (blockedCategories.includes(categoryName)) hide = true;
        }

        item.style.display = hide ? "none" : "";
      });
  }

  async function addBlockButtonOnChannelPage() {
    const usernameEl = document.getElementById("channel-username");
    if (!usernameEl) return;
    if (document.getElementById("channelPageBlockBtn")) return;

    const username = usernameEl.textContent.trim();
    const btn = document.createElement("button");
    btn.id = "channelPageBlockBtn";
    btn.textContent = "✕";
    btn.title = browser.i18n.getMessage("btn_block_channel");
    Object.assign(btn.style, {
      marginLeft: "8px",
      color: "white",
      backgroundColor: "#962424",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "16px",
      padding: "3px 5px",
      userSelect: "none",
      verticalAlign: "middle",
      lineHeight: "1",
    });

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await blockChannel(username);
      alert(browser.i18n.getMessage("alert_channel_blocked", username));
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
      "seuraa", // Finnish
      "obserwuj", // Polish
      "подписаться", // Russian
      "theo dõi", // Vietnamese
      "sledovat", // Czech
    ];

    const { disableBlockButtons = false } = await browser.storage.local.get(
      "disableBlockButtons",
    );

    document.querySelectorAll('[class*="group/card"]').forEach((card) => {
      if (disableBlockButtons) return;
      if (card.querySelector(".block-btn")) return;

      const anchor = card.querySelector('a[href^="/"]');
      if (!anchor) return;

      const username = anchor.getAttribute("href").split("/")[1];

      const titleEl = card.querySelector("a[title]");
      if (!titleEl) return;

      const btn = createBlockButtonAbsolute(username);
      btn.classList.add("block-btn");
      titleEl.parentElement.appendChild(btn);
    });

    document
      .querySelectorAll("div.flex.w-full.shrink-0.grow-0.flex-col")
      .forEach((card) => {
        if (disableBlockButtons) return;
        if (card.querySelector(".block-btn")) return;

        const anchor = card.querySelector('a[href^="/"]');
        if (!anchor) return;

        const username = anchor.getAttribute("href").split("/")[1];

        const followBtn = Array.from(card.querySelectorAll("button")).find(
          (btn) => {
            const text = btn.textContent.trim().toLowerCase();
            return followTexts.some((kw) => text.includes(kw));
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

        if (disableBlockButtons) return;

        if (anchor.querySelector(".sidebar-block-btn")) return;

        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "sidebar-block-btn";
        btn.title = browser.i18n.getMessage("btn_block_channel");
        btn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 4px;
            background: #ac2c2cc2;
            color: white;
            border: none;
            border-radius: 25%;
            width: 25px;
            height: 25px;
            font-size: 14px;
            display: none;
            cursor: pointer;
            z-index: 9999;
          `;

        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await blockChannel(username);
          await removeSidebarBlockedChannels();
          await processSidebarChannels();
        });

        anchor.style.position = "relative";
        anchor.addEventListener("mouseenter", () => {
          btn.style.display = "block";
        });
        anchor.addEventListener("mouseleave", () => {
          btn.style.display = "none";
        });

        anchor.appendChild(btn);
      });
  }

  async function observeBlockedChatMessages() {
    const { disableChatBlocking = false } = await browser.storage.local.get(
      "disableChatBlocking",
    );
    if (disableChatBlocking) return;
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
      if (content) {
        content.innerHTML = `<span style="color: gray; font-style: italic;">[${username}]</span>`;
        content.style.opacity = "0.3";
      }
    }

    function processChatNode(node) {
      const userButton = node.querySelector("button[title]");
      if (!userButton) return;

      const usernameChatter = userButton.getAttribute("title");
      const normalizedChatter = normalize(usernameChatter);

      if (blockedSet.has(normalizedChatter)) {
        hideChatMessage(node, usernameChatter);
      }
    }

    const chatContainer = await waitForChatContainer();

    function debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    }

    const processAddedNodes = debounce((mutationsList) => {
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
    }, 100);

    const chatObserver = new MutationObserver(processAddedNodes);

    chatObserver.observe(chatContainer, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      chatContainer.querySelectorAll("[data-index]").forEach(processChatNode);
    }, 1000);

    async function refreshBlockedUsers() {
      const freshList = await getBlockedChannels();
      blockedSet.clear();
      freshList.forEach((u) => blockedSet.add(u.trim().toLowerCase()));

      chatContainer.querySelectorAll("[data-index]").forEach(processChatNode);
    }
    window.refreshBlockedUsers = refreshBlockedUsers;
  }

  async function observeChatUsernames() {
    const chatContainer = document.getElementById("chatroom-messages");
    if (!chatContainer) return;

    function debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    }

    async function addBlockButtonsToNodes(nodes) {
      try {
        let disableBlockButtons = false;
        let disableChatBlocking = false;

        if (browser && browser.storage && browser.storage.local) {
          try {
            const res1 = await browser.storage.local.get("disableBlockButtons");
            disableBlockButtons = res1.disableBlockButtons ?? false;

            const res2 = await browser.storage.local.get("disableChatBlocking");
            disableChatBlocking = res2.disableChatBlocking ?? false;
          } catch (e) {}
        }

        if (disableChatBlocking) return;

        for (const msg of nodes) {
          if (disableBlockButtons) return;

          if (msg.querySelector(".username-block-btn")) continue;

          const userButton = msg.querySelector("button[title]");
          if (!userButton) continue;

          const btn = document.createElement("button");
          btn.textContent = "✕";
          btn.title = browser.i18n
            ? browser.i18n.getMessage("btn_block_channel")
            : "Block";
          btn.className = "username-block-btn";

          Object.assign(btn.style, {
            marginLeft: "6px",
            backgroundColor: "#6b1919",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "10px",
            padding: "0 4px",
            userSelect: "none",
            verticalAlign: "middle",
          });

          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const username = userButton.getAttribute("title").trim();
            try {
              await blockChannel(username);
              await removeBlockedCards();
              if (window.refreshBlockedUsers) {
                await window.refreshBlockedUsers();
              }
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
      debounce((mutationsList) => {
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
      }, 100),
    );

    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  // search page
  function createBlockButton(username) {
    const btn = document.createElement("button");
    btn.textContent = "X";
    btn.title = browser.i18n.getMessage("btn_block_channel");
    Object.assign(btn.style, {
      marginLeft: "8px",
      color: "white",
      backgroundColor: "#bd2c2c",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      padding: "2px 6px",
      userSelect: "none",
    });

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
    btn.title = browser.i18n.getMessage("btn_block_channel");
    btn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(255, 0, 0, 0.4);
      color: white;
      border: none;
      border-radius: 25%;
      width: 24px;
      height: 24px;
      font-size: 14px;
      cursor: pointer;
      z-index: 9999;
    `;
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

  // === Quality Control ===
  // ==== Firefox Extension ===

  // languages (EN, ES, PT, FR, DE, IT, TR, ID, ZH, JA, KO, AR, FI, PL, RU, VI, CS)
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

    browser.runtime.onMessage.addListener((request) => {
      if (request.action === "setQuality") {
        location.reload();
      }
      if (request.action === "updateQualitySettings") {
        getQualitySettings().then((s) => {
          if (s.autoQuality && isKickStreamUrl(location.href)) {
            waitForPlayerAndApply(s.preferredQuality, false);
          }
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
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    ["mouseenter", "mouseover", "mousemove"].forEach((t) => {
      video.dispatchEvent(
        new MouseEvent(t, { bubbles: true, clientX: cx, clientY: cy }),
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
      ).filter((el) => {
        const text = (el.textContent || "").trim();
        return /^\d+/.test(text);
      });

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

      const targetEl = qualityEls.find((el) => {
        const txt = (el.textContent || "").toLowerCase();
        return txt.includes(String(target));
      });

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
    const buttons = document.querySelectorAll("button[aria-label]");
    for (const btn of buttons) {
      const label = (btn.getAttribute("aria-label") || "").toLowerCase();
      if (
        SETTINGS_LABELS.some((langLabel) =>
          label.includes(langLabel.toLowerCase()),
        )
      ) {
        return btn;
      }
    }

    const settingsByClass = document.querySelector(
      'button[class*="settings"], button[class*="cog"], .vjs-icon-cog',
    );
    if (settingsByClass) return settingsByClass;

    const controlBar = document.querySelector(
      '[class*="control-bar"], [class*="controls"], [class*="bottom-bar"]',
    );
    if (controlBar) {
      const btns = controlBar.querySelectorAll("button");
      if (btns.length > 0) {
        for (let i = btns.length - 2; i >= 0; i--) {
          const btn = btns[i];
          const label = btn.getAttribute("aria-label") || "";
          return btn;
        }
      }
    }

    return document.querySelector('button[class*="settings"]');
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
      browser.storage.local.get(["autoQuality", "preferredQuality"], (data) => {
        resolve({
          autoQuality: data.autoQuality ?? false,
          preferredQuality: data.preferredQuality ?? "1080",
        });
      });
    });
  }

  // Volume Boost
  let audioContext;
  let gainNode;
  let source;
  let currentBoost = 1;
  let currentVideo = null;
  let isAudioContextInitialized = false;

  function setupAudioContext() {
    const video = document.getElementById("video-player");
    if (!video || !audioContext) return;

    if (video !== currentVideo || !source) {
      currentVideo = video;

      if (source) {
        try {
          source.disconnect();
        } catch (e) {
          console.warn("Audio source disconnect error:", e);
        }
      }

      source = audioContext.createMediaElementSource(video);

      if (!gainNode) {
        gainNode = audioContext.createGain();
      }

      gainNode.gain.value = currentBoost;
      source.connect(gainNode).connect(audioContext.destination);
    }
  }

  function setVolumeBoost(boostAmount) {
    if (!audioContext) return;

    currentBoost = boostAmount;

    if (gainNode) {
      gainNode.gain.value = boostAmount;
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  // ==== Firefox Extension ====
  async function applyStoredVolumeBoost() {
    const { volumeBoost = 1 } = await browser.storage.local.get("volumeBoost");
    const parsed = isNaN(Number(volumeBoost)) ? 1 : Number(volumeBoost);
    setVolumeBoost(parsed);
  }

  function enableAudioContextOnUserGesture() {
    function initialize() {
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      isAudioContextInitialized = true;
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

      if (!location.hostname.includes("kick.com")) return;

      const current = localStorage.getItem(key);

      if (current && current !== "[]") {
        localStorage.setItem(key, "[]");
      }
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

    if (isSwapChatDirection) {
      main.before(chatroom);
    } else {
      main.after(chatroom);
    }
  }

  function addChatToggleButton() {
    if (document.getElementById("mtc-controls-wrapper")) return;

    const chatroom = document.getElementById("channel-chatroom");
    if (!chatroom) return;
    const header = chatroom.firstElementChild;
    if (!header) return;

    const wrapper = document.createElement("div");
    wrapper.id = "mtc-controls-wrapper";
    wrapper.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin-right: 8px;
    `;

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

    // Swap
    wrapper.appendChild(btn);

    // Danmaku
    const danmakuBtn = document.createElement("button");
    danmakuBtn.id = "danmaku-toggle-btn";
    danmakuBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

    danmakuBtn.style.cssText = `background:transparent;border:none;color:inherit;cursor:pointer;padding:8px;opacity:0.7;transition:opacity 0.2s,transform 0.2s,color 0.2s;display:flex;align-items:center;justify-content:center;`;

    browser.storage.local.get("enableDanmaku", (result) => {
      const isEnabled = result.enableDanmaku ?? true;
      updateDanmakuBtnStyle(danmakuBtn, isEnabled);
    });

    danmakuBtn.onmouseenter = function () {
      this.style.opacity = "1";
      this.style.transform = "scale(1.1)";
    };
    danmakuBtn.onmouseleave = function () {
      browser.storage.local.get("enableDanmaku", (res) => {
        const isEnabled = res.enableDanmaku ?? true;
        updateDanmakuBtnStyle(danmakuBtn, isEnabled);
      });
      this.style.transform = "scale(1)";
    };

    danmakuBtn.onclick = (e) => {
      e.stopPropagation();
      browser.storage.local.get("enableDanmaku", (result) => {
        const currentStatus = result.enableDanmaku ?? true;
        const newStatus = !currentStatus;
        browser.storage.local.set({ enableDanmaku: newStatus }, () => {
          updateDanmakuBtnStyle(danmakuBtn, newStatus);
        });
      });
    };

    wrapper.appendChild(danmakuBtn);
    header.appendChild(wrapper);
  }

  function updateDanmakuBtnStyle(btn, isEnabled) {
    if (isEnabled) {
      btn.style.color = "#53fc18";
      btn.style.opacity = "1";
    } else {
      btn.style.color = "inherit";
      btn.style.opacity = "0.5";
    }
  }

  // DANMAKU
  function isDanmakuEnabled() {
    return new Promise((resolve) => {
      browser.storage.local.get("enableDanmaku", (result) => {
        const isEnabled = result.enableDanmaku ?? true;
        resolve(isEnabled);
      });
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
      if (this.state.chatContainer) {
        this.state.chatContainer.removeEventListener(
          "scroll",
          this.handleScroll,
        );
      }
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
      const scrollableArea = container.querySelector(".no-scrollbar");
      if (!scrollableArea) return -1;
      const messages = scrollableArea.querySelectorAll("div[data-index]");
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
        if (
          this.state.chatContainer &&
          this.state.chatContainer !== target.el
        ) {
          this.state.chatContainer.removeEventListener(
            "scroll",
            this.handleScroll,
          );
        }

        this.state.chatContainer = target.el;
        if (this.state.observer) this.state.observer.disconnect();

        this.state.chatContainer.addEventListener(
          "scroll",
          this.handleScroll.bind(this),
        );

        this.state.observer = new MutationObserver((mutations) => {
          if (!this.state.isActive) return;
          mutations.forEach((m) => {
            m.addedNodes.forEach((n) => {
              if (n.nodeType === 1) this.processMessage(n);
            });
          });
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
        const styles = window.getComputedStyle(videoContainer);
        if (styles.position === "static")
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
      const currentIndexStr = node.getAttribute("data-index");
      const currentIndex = parseInt(currentIndexStr);
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
      if (this.state.messageQueue.length >= this.config.maxQueueSize) {
        this.state.messageQueue.shift();
      }
      this.state.messageQueue.push(msgObj);
    },

    startQueueProcessor: function () {
      const loop = () => {
        if (!this.state.isActive) return;
        if (this.state.isPaused) {
          this.state.displayTimer = setTimeout(loop, this.config.baseInterval);
          return;
        }
        if (this.state.messageQueue.length === 0) {
          this.state.displayTimer = setTimeout(loop, this.config.baseInterval);
          return;
        }

        const msg = this.state.messageQueue.shift();
        this.showMessage(msg.html, false);

        let nextDelay = this.config.baseInterval;
        const queueSize = this.state.messageQueue.length;

        if (queueSize > 15) {
          nextDelay = this.config.fastInterval;
        } else if (queueSize > 5) {
          nextDelay = this.config.normalInterval;
        } else {
          nextDelay = this.config.baseInterval;
        }

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
      const maxLanes = Math.floor((rect.height / lh) * 0.85);
      const lane = Math.floor(Math.random() * Math.max(1, maxLanes));

      item.style.top = lane * lh + "px";

      const anim = item.animate(
        [
          { transform: `translateX(${rect.width}px)` },
          { transform: `translateX(-100%) translateX(-${item.offsetWidth}px)` },
        ],
        { duration: this.config.speed * 1000, easing: "linear" },
      );

      anim.onfinish = () => item.remove();
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
    if (await isDanmakuEnabled()) {
      DanmakuEngine.start();
    } else {
      DanmakuEngine.stop();
    }
  }

  // Active Users

  let activeUsers = new Map();
  let messageCount = 0;
  let activeObserver = null;
  let activeUIElement = null;
  let isActiveEnabled = false;
  let statsInterval = null;
  let lastUrlPath = location.pathname;

  const ICON_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  const ICON_CHAT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;

  function updateStatsUI() {
    if (!isActiveEnabled) return;
    const target = document.querySelector('[data-testid="viewer-count"]');
    const parent = target?.parentElement;
    if (!parent) return;

    if (!activeUIElement || !document.body.contains(activeUIElement)) {
      activeUIElement = document.createElement("div");
      activeUIElement.className = "flex items-center gap-2 text-sm font-bold";
      activeUIElement.style.marginLeft = "4px";
      activeUIElement.innerHTML = `<div class="flex items-center gap-1 text-primary-base">${ICON_USER}<span class="uk-u">0</span></div><div class="flex items-center gap-1 text-white">${ICON_CHAT}<span class="uk-m">0</span></div>`;
      parent.appendChild(activeUIElement);
    }

    activeUIElement.querySelector(".uk-u").textContent = activeUsers.size;
    activeUIElement.querySelector(".uk-m").textContent = messageCount;
  }

  function resetActiveStats() {
    if (activeObserver) activeObserver.disconnect();
    activeObserver = null;
    activeUsers.clear();
    messageCount = 0;
    if (activeUIElement) activeUIElement.remove();
    activeUIElement = null;
  }

  function startActiveObserver() {
    if (!isActiveEnabled) return;
    resetActiveStats();
    const container = document.querySelector("#chatroom-messages");
    if (!container) return;

    activeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;

          const btn = node.matches('button[title][data-prevent-expand="true"]')
            ? node
            : node.querySelector('button[title][data-prevent-expand="true"]');

          if (btn) {
            activeUsers.set(btn.title, Date.now());
            messageCount++;
          }
        }
      }
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

          const now = Date.now();
          activeUsers.forEach((time, user) => {
            if (now - time > 1800000) activeUsers.delete(user);
          });

          const currentPath = location.pathname;
          const isChannelPage = /^\/\w+$/.test(currentPath);

          if (currentPath !== lastUrlPath) {
            lastUrlPath = currentPath;
            isChannelPage ? startActiveObserver() : resetActiveStats();
          } else if (isChannelPage) {
            const container = document.querySelector("#chatroom-messages");
            if (
              container &&
              (!activeObserver || !document.contains(container))
            ) {
              startActiveObserver();
            }
          }

          updateStatsUI();
        }, 1000);
      }
    } else {
      if (statsInterval) clearInterval(statsInterval);
      statsInterval = null;
      resetActiveStats();
    }
  }

  function debounce(fn, delay = 10) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(), delay);
    };
  }

  // ==== Firefox Extension ====

  (async () => {
    if (typeof browser === "undefined" || !browser.storage) return;

    async function isEnabled() {
      return new Promise((resolve) => {
        browser.storage.local.get("enabled", (result) => {
          resolve(result.enabled ?? true);
        });
      });
    }

    function isSearchHistoryDisabled() {
      return new Promise((resolve) => {
        browser.storage.local.get("disableSearchHistory", (res) => {
          resolve(res.disableSearchHistory === true);
        });
      });
    }

    function isActiveUsersDisabled() {
      return new Promise((resolve) => {
        browser.storage.local.get("disableActiveUsers", (res) => {
          resolve(res.disableActiveUsers === true);
        });
      });
    }

    let enabled = await isEnabled();

    const disableSearchHistory = await isSearchHistoryDisabled();
    if (disableSearchHistory) {
      clearSearchHistory();
    }

    const disableActiveUsers = await isActiveUsersDisabled();
    toggleActiveStats(!disableActiveUsers);

    let observer = null;

    async function startProcessing() {
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

      processChatLayout();

      try {
        await processDanmaku();
      } catch {}

      if (await isSearchHistoryDisabled()) {
        clearSearchHistory();
      }
    }

    function startObserver() {
      if (observer) return;
      observer = new MutationObserver(
        debounce(async () => {
          if (!(await isEnabled())) return;

          await startProcessing();
        }, 50),
      );
      observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

    if (enabled) {
      startObserver();
      await startProcessing();
    }

    enableAudioContextOnUserGesture();

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        if ("enabled" in changes) {
          const newValue = changes.enabled.newValue;
          if (newValue) {
            initAutoQualityControl();
            startObserver();
            startProcessing();
          } else {
            stopObserver();
          }
        }
        if ("volumeBoost" in changes) {
          let rawValue = changes.volumeBoost.newValue;
          let parsed =
            typeof rawValue === "string"
              ? parseFloat(rawValue)
              : Number(rawValue);
          const newBoost = isNaN(parsed) ? 1 : parsed;
          setVolumeBoost(newBoost);
        }
        if ("disableSearchHistory" in changes) {
          if (changes.disableSearchHistory.newValue === true) {
            clearSearchHistory();
          }
        }
        if ("enableDanmaku" in changes) {
          const newValue = changes.enableDanmaku.newValue;
          if (newValue === true) {
            processDanmaku();
          } else {
            DanmakuEngine.stop();
          }
        }
        if ("disableActiveUsers" in changes) {
          const isDisabled = changes.disableActiveUsers.newValue;
          toggleActiveStats(!isDisabled);
        }
      }
    });
  })();
})();
