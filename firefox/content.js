// ==UserScript==
// @name         uKick — Block Everything & Stream Tweaks
// @namespace    https://github.com/berkaygediz/uKick
// @version      1.1.2
// @description  All-in-one extension to block, boost, and tweak everything on Kick for a better streaming experience.
// @author       berkaygediz
// @match        https://kick.com/*
// @match        https://www.kick.com/*
// @grant        GM_getValue
// @grant        GM_setValue
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
        try {
            const result = await browser.storage.local.get("blockedChannels");
            const list = JSON.parse(result.blockedChannels || "[]");
            return list.map((x) => x.trim().toLowerCase());
        } catch {
            return [];
        }
    }

    async function saveBlockedChannels(list) {
        await browser.storage.local.set({
            blockedChannels: JSON.stringify(list),
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
        try {
            const result = await browser.storage.local.get("blockedCategories");
            const list = JSON.parse(result.blockedCategories || "[]");
            return list.map(normalizeData);
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async function saveBlockedCategories(list) {
        try {
            const data = JSON.stringify(list);
            await browser.storage.local.set({ blockedCategories: data });
        } catch (err) {
            console.error(err);
        }
    }


    // ==== Firefox Extension ====

    async function blockCategory(categoryName) {
        const blocked = await getBlockedCategories();
        const normalizedCategory = normalizeData(categoryName);
        if (!blocked.includes(normalizedCategory)) {
            blocked.push(normalizedCategory);
            await browser.storage.local.set({
                blockedCategories: JSON.stringify(blocked),
            });
        }
    }


    async function processCategoryCards() {
        const blockedCategories = await getBlockedCategories();

        const blockedNormalized = blockedCategories.map((cat) =>
            normalizeData(cat).toLowerCase().trim()
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

            if (card.querySelector(".category-block-btn")) return;

            const imageWrapper = card.querySelector(
                'a[href^="/category/"] > div.relative'
            );
            if (!imageWrapper) return;

            const btn = document.createElement("button");
            btn.textContent = "✖";
            btn.title = `Hide category: ${nameEl.textContent}`;
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
        const blockedCategories = (await getBlockedCategories()).map(normalizeData);

        document.querySelectorAll('.group\\/card').forEach((card) => {
            let hide = false;

            // === Channel ===
            const channelAnchor = card.querySelector('a[href^="/"]:not([href^="/category/"])');
            if (channelAnchor) {
                const username = normalizeData(channelAnchor.getAttribute("href").slice(1));
                if (blockedChannels.includes(username)) hide = true;
            }

            // === Category ===
            const categoryAnchor = card.querySelector('a[href^="/category/"]');
            if (categoryAnchor) {
                const rawCategoryText = categoryAnchor.querySelector("span")?.textContent || categoryAnchor.textContent;
                const categoryName = normalizeData(rawCategoryText);
                if (blockedCategories.includes(categoryName)) hide = true;
            }

            card.style.display = hide ? "none" : "";
        });

        // === Video player ===
        const usernameEl = document.getElementById("channel-username");
        if (usernameEl) {
            const currentUsername = normalizeData(usernameEl.textContent);
            const videoPlayer = document.getElementById("video-player");
            if (videoPlayer) {
                if (blockedChannels.includes(currentUsername)) {
                    videoPlayer.style.display = "none";
                    if (typeof videoPlayer.pause === "function") videoPlayer.pause();
                } else {
                    videoPlayer.style.display = "";
                }
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
        btn.title = "Block this channel";
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
            alert(`${username} blocked!`);
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
        document.querySelectorAll('[class*="group/card"]').forEach((card) => {
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
                if (card.querySelector(".block-btn")) return;

                const anchor = card.querySelector('a[href^="/"]');
                if (!anchor) return;

                const username = anchor.getAttribute("href").split("/")[1];
                const followBtn = card.querySelector('button[aria-label="Takip Et"]');

                if (!followBtn) {
                    return;
                }
                const btn = createBlockButton(username);
                btn.classList.add("block-btn");
                btn.style.marginLeft = "8px";
                followBtn.insertAdjacentElement("afterend", btn);
            });
    }

    async function processSidebarChannels() {
        const blocked = await getBlockedChannels();
        document
            .querySelectorAll('[data-testid^="sidebar-recommended-channel-"]')
            .forEach((anchor) => {
                const username = anchor.getAttribute("href")?.split("/")[1];
                if (!username) return;

                if (blocked.includes(normalizeData(username))) {
                    anchor.style.display = "none";
                    return;
                }

                if (anchor.querySelector(".sidebar-block-btn")) return;

                const btn = document.createElement("button");
                btn.textContent = "✕";
                btn.className = "sidebar-block-btn";
                btn.title = "Block this channel";
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

        // Helper function to escape HTML meta-characters to prevent XSS
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
            nodes.forEach((msg) => {
                if (msg.querySelector(".username-block-btn")) return;

                const userButton = msg.querySelector("button[title]");
                if (!userButton) return;

                const btn = document.createElement("button");
                btn.textContent = "X";
                btn.title = "Block this channel";
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
        btn.title = "Block this channel";
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
        btn.title = "Block this channel";
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
    // ==== Firefox Extension ====

    let lastKickUrl = location.href;

    initAutoQualityControl();

    async function initAutoQualityControl() {
        sessionStorage.removeItem("quality_reload_done");

        const { autoQuality, preferredQuality } = await getQualitySettings();

        if (autoQuality && isKickStreamUrl(location.href)) {
            setPreferredQuality(preferredQuality, false);
        }

        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastKickUrl) {
                lastKickUrl = currentUrl;

                if (autoQuality && isKickStreamUrl(currentUrl)) {
                    setTimeout(() => {
                        setPreferredQuality(preferredQuality, false);
                    }, 1000);
                }
            }
        }).observe(document, { subtree: true, childList: true });

        browser.runtime.onMessage.addListener((request) => {
            if (request.action === "setQuality") {
                setPreferredQuality(request.quality, true);
            } else if (request.action === "updateQualitySettings") {
                getQualitySettings().then(({ autoQuality, preferredQuality }) => {
                    if (autoQuality && isKickStreamUrl(location.href)) {
                        setPreferredQuality(preferredQuality, false);
                    }
                });
            }
        });
    }

    function isKickStreamUrl(url) {
        return /^https:\/\/(www\.)?kick\.com\/[^\/?#]+/.test(url);
    }

    function setPreferredQuality(preferredQuality, shouldReload) {
        const qualityButtons = document.querySelectorAll(
            '[data-testid="player-quality-option"]'
        );
        const availableQualities = Array.from(qualityButtons).map((btn) =>
            btn.textContent.trim()
        );

        if (availableQualities.length === 0) {
            sessionStorage.setItem("stream_quality", preferredQuality);
            if (shouldReload && !sessionStorage.getItem("quality_reload_done")) {
                sessionStorage.setItem("quality_reload_done", "true");
                location.reload();
            }
            return;
        }

        let selected = preferredQuality;
        if (!availableQualities.includes(preferredQuality)) {
            availableQualities.sort((a, b) => parseInt(b) - parseInt(a));
            selected =
                availableQualities.find(
                    (q) => parseInt(q) <= parseInt(preferredQuality)
                ) || availableQualities[0];
        }

        sessionStorage.setItem("stream_quality", selected);

        if (shouldReload && !sessionStorage.getItem("quality_reload_done")) {
            sessionStorage.setItem("quality_reload_done", "true");
            location.reload();
        }
    }

    // ==== Firefox Extension ====

    function getQualitySettings() {
        return new Promise((resolve) => {
            browser.storage.local.get(["autoQuality", "preferredQuality"]).then((data) => {
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
                    console.warn("Audio source disconnect hatası:", e);
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
            const result = await browser.storage.local.get("enabled");
            return result.enabled ?? true;
        }

        let enabled = await isEnabled();
        let observer = null;

        async function startProcessing() {
            setupAudioContext();
            await processCards();
            await processSidebarChannels();
            await processCategoryCards();
            await removeBlockedCards();
            await removeSidebarBlockedChannels();
            await removeBlockedCategoryCards();
            await addBlockButtonOnChannelPage();
            await observeBlockedChatMessages();
            await observeChatUsernames();
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
            }
        });
    })();

})();
