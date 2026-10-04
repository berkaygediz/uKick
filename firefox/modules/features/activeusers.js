// uKick — activeusers

let activeUsers = new Map();
let messageCount = 0;
let activeObserver = null;
let activeUIElement = null;
let isActiveEnabled = false;
export let isOverlayVisible = false;
let statsInterval = null;
let lastUrlPath = location.pathname;
let lastUIUserCount = -1;
let lastUIMsgCount = -1;

export const ICON_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
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
    activeUIElement.innerHTML = `<div class="flex items-center gap-1 text-primary-base" style="color:#53fc18">${ICON_USER}<span class="uk-u">0</span></div><div class="flex items-center gap-1 text-white" style="color:#ffffff">${ICON_CHAT}<span class="uk-m">0</span></div>`;
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

    if (node.querySelector('[data-testid="identity-badge-broadcaster"]'))
      role = "broadcaster";
    else if (node.querySelector('[data-testid="identity-badge-moderator"]'))
      role = "mod";
    else if (node.querySelector('[data-testid="identity-badge-verified"]'))
      role = "verified";

    const existingData = activeUsers.get(username);
    if (existingData) {
      const priority = { broadcaster: 4, verified: 3, mod: 2, viewer: 1 };
      const newRole =
        priority[role] > priority[existingData.role] ? role : existingData.role;
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

export function toggleActiveStats(status) {
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
  document.getElementById("ukick-active-users-overlay")?.remove();
  isOverlayVisible = false;
  document
    .getElementById("active-users-toggle-btn")
    ?.classList.remove("ukick-active");
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
      .au-pager { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 0 12px; border-top: 1px solid #24272c; position: sticky; bottom: 0; background: rgba(25,27,31,.98); z-index: 10; }
      .au-page-btn { background: none; border: 1px solid #3f4349; color: #F4F5F6; cursor: pointer; font-size: 16px; border-radius: 4px; width: 34px; height: 26px; }
      .au-page-btn:hover:not(:disabled) { background: #24272c; }
      .au-page-btn:disabled { opacity: 0.3; cursor: default; }
      .au-page-info { color: #A8ADB3; font-size: 12px; }
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

  const PAGE_SIZE = 500;

  const catOf = (role) =>
    role === "broadcaster"
      ? "BROADCASTER"
      : role === "verified"
        ? "VERIFIED"
        : role === "mod"
          ? "MODERATORS"
          : "VIEWERS";
  const catOrder = { BROADCASTER: 0, VERIFIED: 1, MODERATORS: 2, VIEWERS: 3 };

  const merged = [...activeUsers.entries()]
    .map(([user, data]) => ({
      user,
      color: data.color,
      cat: catOf(data.role),
    }))
    .sort(
      (a, b) =>
        catOrder[a.cat] - catOrder[b.cat] ||
        a.user.toLowerCase().localeCompare(b.user.toLowerCase()),
    );

  let page = 1;
  let query = "";

  const overlay = document.createElement("div");
  overlay.id = "ukick-active-users-overlay";

  const usersLabel = browser.i18n.getMessage("overlay_users") || "Users";

  overlay.innerHTML = `
    <div class="au-header">
      <b>${usersLabel} (${activeUsers.size})</b>
      <button class="au-close-btn" id="close-users-overlay">✕</button>
    </div>
    <div class="au-search-wrap"><input type="text" id="active-users-search" class="au-search-input" placeholder="..."></div>
    <div class="au-list" id="au-list"></div>
    <div class="au-pager" id="au-pager"></div>
  `;

  chatArea.appendChild(overlay);

  const listEl = overlay.querySelector("#au-list");
  const pagerEl = overlay.querySelector("#au-pager");

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const filtered = () =>
    query ? merged.filter((u) => u.user.toLowerCase().includes(query)) : merged;

  function renderList() {
    const data = filtered();
    const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * PAGE_SIZE;
    const slice = data.slice(start, start + PAGE_SIZE);

    let html = "";
    let lastCat = null;
    for (const item of slice) {
      if (item.cat !== lastCat) {
        lastCat = item.cat;
        html += `<div class="au-category-title">${item.cat}</div>`;
      }
      html += `<div class="au-user" data-username="${escapeHtml(item.user)}" style="color:${item.color}">${escapeHtml(item.user)}</div>`;
    }
    listEl.innerHTML = html;

    if (totalPages > 1) {
      pagerEl.innerHTML = `
        <button class="au-page-btn" id="au-prev" ${page === 1 ? "disabled" : ""}>‹</button>
        <span class="au-page-info">${page} / ${totalPages}</span>
        <button class="au-page-btn" id="au-next" ${page === totalPages ? "disabled" : ""}>›</button>
      `;
      pagerEl.querySelector("#au-prev")?.addEventListener("click", () => {
        if (page > 1) {
          page--;
          renderList();
          overlay.scrollTop = 0;
        }
      });
      pagerEl.querySelector("#au-next")?.addEventListener("click", () => {
        if (page < totalPages) {
          page++;
          renderList();
          overlay.scrollTop = 0;
        }
      });
    } else {
      pagerEl.innerHTML = "";
    }
  }

  overlay
    .querySelector("#active-users-search")
    .addEventListener("input", function () {
      query = this.value.toLowerCase().trim();
      page = 1;
      renderList();
    });

  listEl.addEventListener("click", (e) => {
    const el = e.target.closest(".au-user");
    if (el) window.open("https://kick.com/" + el.dataset.username, "_blank");
  });

  overlay.querySelector("#close-users-overlay").onclick = closeOverlay;

  renderList();
}

function updateOverlayUI() {
  if (isOverlayVisible) buildOverlay();
  else closeOverlay();
}

export function toggleOverlay() {
  isOverlayVisible = !isOverlayVisible;
  updateOverlayUI();
}
