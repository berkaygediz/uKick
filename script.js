// ==UserScript==
// @name         uKickBlock
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Lightning-fast content filtering for Kick.
// @author       berkaygediz
// @match        https://kick.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "blockedChannels";

  function normalizeUsername(name) {
    return name.trim().toLowerCase();
  }

  async function getBlockedChannels() {
    const data = await GM_getValue(STORAGE_KEY, "[]");
    try {
      const list = JSON.parse(data);
      return list.map(normalizeUsername);
    } catch {
      return [];
    }
  }

  async function saveBlockedChannels(list) {
    await GM_setValue(STORAGE_KEY, JSON.stringify(list));
  }

  async function blockChannel(username) {
    username = normalizeUsername(username);
    const blocked = await getBlockedChannels();
    if (!blocked.includes(username)) {
      blocked.push(username);
      await saveBlockedChannels(blocked);
    }
  }

  async function unblockChannel(username) {
    username = normalizeUsername(username);
    let blocked = await getBlockedChannels();
    blocked = blocked.filter((u) => u !== username);
    await saveBlockedChannels(blocked);
  }

  async function removeBlockedCards() {
    const blocked = await getBlockedChannels();

    document.querySelectorAll('[class*="group/card"]').forEach((card) => {
      const anchor = card.querySelector('a[href^="/"]');
      if (!anchor) return;
      const username = normalizeUsername(
        anchor.getAttribute("href").split("/")[1]
      );
      card.style.display = blocked.includes(username) ? "none" : "";
    });

    document
      .querySelectorAll("div.flex.w-full.shrink-0.grow-0.flex-col")
      .forEach((card) => {
        const anchor = card.querySelector('a[href^="/"]');
        if (!anchor) return;
        const username = normalizeUsername(
          anchor.getAttribute("href").split("/")[1]
        );
        card.style.display = blocked.includes(username) ? "none" : "";
      });

    // Block channel stream
    const usernameEl = document.getElementById("channel-username");
    if (usernameEl) {
      const currentUsername = normalizeUsername(usernameEl.textContent);
      const videoPlayer = document.getElementById("video-player");
      if (videoPlayer) {
        if (blocked.includes(currentUsername)) {
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
    const blocked = await getBlockedChannels();
    document
      .querySelectorAll('[data-testid^="sidebar-recommended-channel-"]')
      .forEach((item) => {
        const anchor =
          item.querySelector('a[href^="/"]') || item.closest('a[href^="/"]');
        if (!anchor) return;
        const username = normalizeUsername(
          anchor.getAttribute("href").split("/")[1]
        );
        anchor.style.display = blocked.includes(username) ? "none" : "";
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
    btn.title = "Bu kanalı engelle";
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
      if (blocked.includes(normalizeUsername(username))) {
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

      const btn = createBlockButton(username);
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

        if (followBtn) {
          const btn = createBlockButton(username);
          btn.classList.add("block-btn");
          btn.style.marginLeft = "8px";
          followBtn.insertAdjacentElement("afterend", btn);
        }
      });
  }

  async function processSidebarChannels() {
    const blocked = await getBlockedChannels();
    document
      .querySelectorAll('[data-testid^="sidebar-recommended-channel-"]')
      .forEach((anchor) => {
        const username = anchor.getAttribute("href")?.split("/")[1];
        if (!username) return;

        if (blocked.includes(normalizeUsername(username))) {
          anchor.style.display = "none";
          return;
        }

        if (anchor.querySelector(".sidebar-block-btn")) return;

        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.className = "sidebar-block-btn";
        btn.title = "Bu kanalı engelle";
        Object.assign(btn.style, {
          position: "absolute",
          top: "4px",
          right: "4px",
          backgroundColor: "rgba(255, 0, 0, 0.8)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "18px",
          height: "18px",
          fontSize: "12px",
          display: "none",
          cursor: "pointer",
          zIndex: "9999",
        });

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

  // Menu
  function createToggleButtonAndPanel() {
    const toggleBtn = document.createElement("div");
    toggleBtn.id = "kickToggleBtn";
    toggleBtn.textContent = "K";
    Object.assign(toggleBtn.style, {
      position: "fixed",
      top: "15px",
      right: "5px",
      width: "26px",
      height: "26px",
      lineHeight: "26px",
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "bold",
      backgroundColor: "#00B660",
      color: "white",
      borderRadius: "50%",
      cursor: "pointer",
      zIndex: "10000",
      boxShadow: "0 0 5px rgba(0,0,0,0.3)",
      userSelect: "none",
    });
    document.body.appendChild(toggleBtn);

    const panel = document.createElement("div");
    panel.id = "kickControlPanel";
    Object.assign(panel.style, {
      position: "fixed",
      top: "50px",
      right: "15px",
      backgroundColor: "#1f1f1f",
      color: "white",
      padding: "10px",
      borderRadius: "8px",
      zIndex: "9999",
      fontSize: "13px",
      fontFamily: "sans-serif",
      boxShadow: "0 0 10px rgba(0,0,0,0.5)",
      display: "none",
      minWidth: "180px",
    });

    panel.innerHTML = `
      <div style="margin-bottom: 8px; font-weight:bold;">🛡️ Blocked Channels</div>
      <button id="exportBtn" style="width:100%; margin-bottom:6px;">📤 Export</button>
      <button id="importBtn" style="width:100%; margin-bottom:6px;">📥 Import</button>
      <button id="showBtn" style="width:100%; margin-bottom:6px;">📃 List</button>
      <button id="clearBtn" style="width:100%; margin-bottom:6px;">🧹 Clear</button>
      <button id="reloadBtn" style="width:100%;">🔄 Reload</button>
    `;

    document.body.appendChild(panel);

    toggleBtn.addEventListener("click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    // Export
    document.getElementById("exportBtn").addEventListener("click", async () => {
      const data = await getBlockedChannels();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "blocked_channels.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import
    document.getElementById("importBtn").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            await saveBlockedChannels(parsed.map(normalizeUsername));
            await removeBlockedCards();
            await processCards();
            await processSidebarChannels();
            alert("Blocked list imported successfully.");
          } else {
            alert("Invalid format! Expected a list.");
          }
        } catch {
          alert("Invalid JSON file.");
        }
      };
      input.click();
    });

    // List
    document.getElementById("showBtn").addEventListener("click", async () => {
      const blocked = await getBlockedChannels();
      const win = window.open("", "_blank");
      if (!win) {
        alert(
          "The new window could not be opened. Please check your pop-up blocker."
        );
        return;
      }

      win.document.write(`
        <html>
        <head>
          <title>Blocked Channels</title>
          <style>
            body {
              font-family: sans-serif;
              background: #1e1e1e;
              color: white;
              padding: 20px;
            }
            h2 {
              margin-top: 0;
              color: #00B660;
            }
            ul {
              list-style: none;
              padding: 0;
              max-height: 70vh;
              overflow-y: auto;
            }
            li {
              margin: 6px 0;
              padding: 6px 10px;
              background: #2a2a2a;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-radius: 4px;
              font-size: 14px;
            }
            button {
              background: #d9534f;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              padding: 3px 8px;
              font-size: 13px;
            }
            button:hover {
              background: #c9302c;
            }
            #clearAllBtn {
              margin-top: 15px;
              padding: 6px 12px;
              font-size: 14px;
              background: #5bc0de;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              color: black;
            }
            #clearAllBtn:hover {
              background: #31b0d5;
              color: white;
            }
          </style>
        </head>
        <body>
          <h2>🛡️ Blocked Channels (${blocked.length})</h2>
          <ul id="channelList">
            ${blocked
              .map(
                (name) => `
                <li>
                  <span>${name}</span>
                  <button data-name="${name}">X</button>
                </li>
              `
              )
              .join("")}
          </ul>
          <button id="clearAllBtn">Clear All</button>

          <script>
            document.getElementById('channelList').addEventListener('click', e => {
              if (e.target.tagName === 'BUTTON') {
                const name = e.target.getAttribute('data-name');
                if (!name) return;
                window.opener.postMessage({ type: 'removeChannel', name }, '*');
                e.target.parentElement.remove();
              }
            });

            document.getElementById('clearAllBtn').addEventListener('click', () => {
            if (confirm('Do you want to remove all blocked channels?')) {
                window.opener.postMessage({ type: 'clearAll' }, '*');
                document.getElementById('channelList').innerHTML = '';
              }
            });
          <\/script>
        </body>
        </html>
      `);
      win.document.close();
    });

    // Clear All
    document.getElementById("clearBtn").addEventListener("click", async () => {
      if (confirm("Do you want to remove all blocks?")) {
        await saveBlockedChannels([]);
        await removeBlockedCards();
        await processCards();
        await processSidebarChannels();
        alert("All blocks have been cleared.");
      }
    });

    // Reload
    document.getElementById("reloadBtn").addEventListener("click", async () => {
      await removeBlockedCards();
      await processCards();
      await processSidebarChannels();
    });

    window.addEventListener("message", async (event) => {
      if (!event.data) return;

      if (event.data.type === "removeChannel") {
        await unblockChannel(event.data.name);
        await removeBlockedCards();
        await processCards();
        await processSidebarChannels();
      }

      if (event.data.type === "clearAll") {
        await saveBlockedChannels([]);
        await removeBlockedCards();
        await processCards();
        await processSidebarChannels();
      }
    });
  }

  function debounce(fn, delay = 25) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(), delay);
    };
  }

  const observer = new MutationObserver(
    debounce(async () => {
      await processCards();
      await processSidebarChannels();
      await removeBlockedCards();
      await removeSidebarBlockedChannels();
      await addBlockButtonOnChannelPage();
    }, 0)
  );

  observer.observe(document.body, { childList: true, subtree: true });

  (async () => {
    await processCards();
    await processSidebarChannels();
    await removeBlockedCards();
    await removeSidebarBlockedChannels();
    await addBlockButtonOnChannelPage();
    createToggleButtonAndPanel();
  })();
})();
