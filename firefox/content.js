// ==UserScript==
// @name         uKick — Block & Stream Tweaks for Kick
// @namespace    https://github.com/berkaygediz/uKick
// @version      2.0.0.0
// @description  All-in-one extension to block, boost, and tweak everything on Kick for a better streaming experience.
// @author       berkaygediz
// @match        https://kick.com/*
// @match        https://www.kick.com/*
// @license      GPL-3.0
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
                resolve
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
                    resolve
                );
            });
        }
    }

    async function processTagButtons() {
        const blockedTags = await getBlockedTags();
        const blockedNormalized = blockedTags.map(tag =>
            normalizeData(tag).toLowerCase().trim()
        );

        const { disableBlockButtons = false } = await browser.storage.local.get("disableBlockButtons");
        if (disableBlockButtons) return;

        const containers = document.querySelectorAll('div.mt-1.flex');

        containers.forEach(container => {
            const tagElements = container.querySelectorAll('button, a');

            tagElements.forEach(tagEl => {
                if (tagEl.classList.contains("tag-block-btn")) return;

                if (tagEl.dataset.xAdded === "true") return;

                if (tagEl.querySelector(".tag-block-btn")) {
                    tagEl.dataset.xAdded = "true";
                    return;
                }

                let rawText = tagEl.childNodes[0]?.textContent || tagEl.textContent || "";
                rawText = rawText.replace(/\s+/g, ' ').trim();
                if (!rawText) return;

                const normalized = normalizeData(rawText).toLowerCase().trim();

                if (blockedNormalized.includes(normalized)) return;

                const xBtn = document.createElement("button");
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
                `;

                xBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    await blockTag(rawText);
                });

                tagEl.style.display = 'inline-flex';
                tagEl.style.alignItems = 'center';
                tagEl.style.gap = '2px';

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
                    resolve
                );
            });
        }
    }

    async function processCategoryCards() {
        const blockedCategories = await getBlockedCategories();

        const blockedNormalized = blockedCategories.map((cat) =>
            normalizeData(cat).toLowerCase().trim()
        );

        const { disableBlockButtons = false } = await browser.storage.local.get("disableBlockButtons");

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
                'a[href^="/category/"] > div.relative'
            );
            if (!imageWrapper) return;

            const btn = document.createElement("button");
            btn.textContent = "✖";
            btn.title = browser.i18n.getMessage("btn_block_category") + ": " + nameEl.textContent;
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
                z-index: 9999;
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
                normalizeData(cat).toLowerCase().trim()
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
        const blockedCategories = (await getBlockedCategories?.()).map(normalizeData) || [];
        const blockedTags = (await getBlockedTags?.()).map(normalizeData) || [];

        document.querySelectorAll('.group\\/card').forEach((card) => {
            let shouldHide = false;

            const channelLink = card.querySelector('a[href^="/"]:not([href^="/category/"]) img.rounded-full')?.closest('a');
            if (channelLink) {
                const username = normalizeData(channelLink.getAttribute("href").slice(1));
                if (blockedChannels.includes(username)) {
                    shouldHide = true;
                }
            }

            if (!shouldHide) {
                const categoryLink = card.querySelector('a[href^="/category/"]');
                if (categoryLink) {
                    const categoryText = categoryLink.querySelector("span")?.textContent || categoryLink.textContent;
                    const categoryName = normalizeData(categoryText);
                    if (blockedCategories.includes(categoryName)) {
                        shouldHide = true;
                    }
                }
            }

            if (!shouldHide && blockedTags.length > 0) {
                const tagsContainer = card.querySelector('div.flex.mt-1');
                if (tagsContainer) {
                    const tagElements = tagsContainer.querySelectorAll('button, a');
                    for (const tag of tagElements) {
                        let tagName = "";

                        tagName =
                            tag.getAttribute('aria-label') ||
                            tag.getAttribute('title') ||
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

        document.querySelectorAll('div.flex.flex-row.items-center').forEach((item) => {
            const anchor = item.querySelector('a[href^="/"]:not([href^="/category/"])');
            if (!anchor) return;

            const username = normalizeData(anchor.getAttribute("href").slice(1));
            if (blockedChannels.includes(username)) {
                const outer = item.closest('div.flex.w-full.shrink-0.grow-0.flex-col');
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
                    const username = normalizeData(anchor.getAttribute("href").split("/")[1]);
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
        btn.textContent = "X";
        btn.title = browser.i18n.getMessage("btn_block_channel");
        Object.assign(btn.style, {
            marginLeft: "8px",
            color: "white",
            backgroundColor: "red",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
            padding: "2px 8px",
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
        // Multilingual "Follow" buttons
        const followTexts = [
            "takip et",   // Turkish
            "follow",     // English
            "folgen",     // German
            "suivre",     // French
            "seguir",     // Spanish / Portuguese
            "segui",      // Italian
            "obserwuj",   // Polish
            "关注",        // Chinese (Simplified)
            "フォロー",     // Japanese
            "팔로우"       // Korean
        ];

        const { disableBlockButtons = false } = await browser.storage.local.get("disableBlockButtons");

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

        document.querySelectorAll("div.flex.w-full.shrink-0.grow-0.flex-col").forEach((card) => {
            if (disableBlockButtons) return;
            if (card.querySelector(".block-btn")) return;

            const anchor = card.querySelector('a[href^="/"]');
            if (!anchor) return;

            const username = anchor.getAttribute("href").split("/")[1];

            const followBtn = Array.from(card.querySelectorAll("button")).find((btn) => {
                const text = btn.textContent.trim().toLowerCase();
                return followTexts.some((kw) => text.includes(kw));
            });

            if (!followBtn) return;

            const btn = createBlockButton(username);
            btn.classList.add("block-btn");
            btn.style.marginLeft = "8px";
            followBtn.insertAdjacentElement("afterend", btn);
        });
    }

    async function processSidebarChannels() {
        const blocked = await getBlockedChannels();
        const { disableBlockButtons = false } = await browser.storage.local.get("disableBlockButtons");

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
                    top: 6px;
                    right: 6px;
                    background: rgba(255, 0, 0, 0.7);
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
        const { disableChatBlocking = false } = await browser.storage.local.get("disableChatBlocking");
        if (disableChatBlocking) return;
        let blockedUsers = await getBlockedChannels();

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

        function escapeHTML(str) {
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

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

            const isBlocked = blockedUsers.some(
                (blockedName) => normalize(blockedName) === normalizedChatter
            );

            if (isBlocked) {
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
        }, 0);

        const chatObserver = new MutationObserver(processAddedNodes);

        chatObserver.observe(chatContainer, {
            childList: true,
            subtree: true,
        });

        setTimeout(() => {
            chatContainer.querySelectorAll("[data-index]").forEach(processChatNode);
        }, 1000);

        async function refreshBlockedUsers() {
            blockedUsers = await getBlockedChannels();
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
            const { disableBlockButtons = false } = await browser.storage.local.get("disableBlockButtons");
            const { disableChatBlocking = false } = await browser.storage.local.get("disableChatBlocking");

            if (disableChatBlocking) return;
            nodes.forEach((msg) => {
                if (disableBlockButtons) return;

                if (msg.querySelector(".username-block-btn")) return;

                const userButton = msg.querySelector("button[title]");

                if (!userButton) return;

                const btn = document.createElement("button");
                btn.textContent = "X";
                btn.title = browser.i18n.getMessage("btn_block_channel");
                btn.className = "username-block-btn";
                Object.assign(btn.style, {
                    marginLeft: "6px",
                    backgroundColor: "red",
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
                    await blockChannel(username);
                    await removeBlockedCards();
                    if (window.refreshBlockedUsers) {
                        await window.refreshBlockedUsers();
                    }
                });

                userButton.parentElement.appendChild(btn);
            });
        }

        await addBlockButtonsToNodes(
            Array.from(chatContainer.querySelectorAll("[data-index]"))
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
            }, 100)
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
            backgroundColor: "red",
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
        btn.textContent = "X";
        btn.title = browser.i18n.getMessage("btn_block_channel");
        btn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(255, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 25%;
      width: 25px;
      height: 25px;
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

    let lastKickUrl = location.href;
    let lastAppliedQuality = null;
    let _persistTimer = null;

    initAutoQualityControl();

    async function initAutoQualityControl() {
        sessionStorage.removeItem("quality_reload_done");

        browser.storage.local.get(["preferredQuality"], (data) => {
            if (data.preferredQuality) {
                persistSessionQuality(String(data.preferredQuality));
                lastAppliedQuality = String(data.preferredQuality);
            }
        });

        const settings = await getQualitySettings();

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
                waitForPlayerAndApply(request.quality, true);
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

        sessionStorage.setItem("stream_quality", String(pref));

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
                '[data-testid="player-quality-option"], [role="menuitemradio"], [role="menuitem"]'
            );
            if (cur === String(pref) && (video || qualityEls.length > 0)) {
                clearInterval(_persistTimer);
                _persistTimer = null;
                return;
            }

            try {
                sessionStorage.setItem("stream_quality", String(pref));
            } catch (e) {
            }
        }, 400);
    }

    async function waitForPlayerAndApply(preferredQuality, shouldReload) {
        const maxWait = 15000;
        const start = Date.now();

        persistSessionQuality(preferredQuality);

        while (Date.now() - start < maxWait) {
            const video = document.querySelector("video");
            if (video) break;
            await sleep(300);
        }
        applyKickQuality(preferredQuality, shouldReload);
    }

    async function applyKickQuality(preferredQuality, shouldReload) {
        if (!preferredQuality) return;

        const pref = parseInt(String(preferredQuality).replace(/\D/g, ""), 10);

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

        const r = video.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;

        ["mouseenter", "mouseover", "mousemove"].forEach((t) => {
            video.dispatchEvent(
                new MouseEvent(t, { bubbles: true, clientX: cx, clientY: cy })
            );
        });

        await sleep(700);

        let settingsBtn =
            document.querySelector('button[aria-label*="Settings"]') ||
            document.querySelector('button[aria-label*="Ayarlar"]') ||
            document.querySelector('button[title*="Settings"]') ||
            document.querySelector('button[class*="settings"]');

        if (!settingsBtn) {
            triggerReloadIfNeeded(shouldReload);
            return;
        }

        try {
            settingsBtn.click();
        } catch (e) {
            try { settingsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (e) { }
        }

        await sleep(700);

        const qualityEls = Array.from(
            document.querySelectorAll(
                '[data-testid="player-quality-option"], [role="menuitemradio"], [role="menuitem"]'
            )
        );

        let available = qualityEls
            .map((el) => (el.textContent || "").toLowerCase().trim())
            .map((t) => t.replace(/auto|fps|p60|p/g, "").trim())
            .filter((t) => /^\d+$/.test(t))
            .map((t) => parseInt(t));

        if (!available.length) {
            triggerReloadIfNeeded(shouldReload);
            return;
        }

        available.sort((a, b) => b - a);
        let target =
            available.find((q) => q <= pref) || available[available.length - 1];

        if (lastAppliedQuality === String(target)) {
            sessionStorage.setItem("stream_quality", String(target));
            return;
        }

        const targetEl = qualityEls.find((el) => {
            const txt = (el.textContent || "").toLowerCase();
            return txt.includes(String(target));
        });

        if (targetEl) {
            try {
                targetEl.click();
            } catch (e) {
                try { targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (e) { }
            }
        }

        sessionStorage.setItem("stream_quality", String(target));
        lastAppliedQuality = String(target);

        triggerReloadIfNeeded(shouldReload);
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
        } catch (e) { }
    }

    function debounce(fn, delay = 25) {
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


        let enabled = await isEnabled();

        const disableSearchHistory = await isSearchHistoryDisabled();
        if (disableSearchHistory) {
            clearSearchHistory();
        }

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
                }, 50)
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
            }
        });
    })();
})();