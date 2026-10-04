// uKick — chatlayout

import { ICON_USER, isOverlayVisible, toggleOverlay } from "./activeusers.js";

let swapChatDirection = false;

const DANMAKU_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="7" y1="9" x2="13" y2="9"></line><line x1="7" y1="13" x2="17" y2="13"></line></svg>`;

function setToggleActive(btn, active) {
  btn?.classList.toggle("ukick-active", active);
}

export function processChatLayout() {
  addSwapButton();
  applyChatOrder(swapChatDirection);
  addChannelToggles();
}

function applyChatOrder(swapped) {
  const chatroom = document.getElementById("channel-chatroom");
  const main = document.querySelector("main");
  if (!chatroom || !main) return;

  const row = main.parentElement;
  if (!row || !row.contains(chatroom)) return;

  let chatSide = null;
  for (const child of row.children) {
    if (child !== main && child.contains(chatroom)) {
      chatSide = child;
      break;
    }
  }
  if (!chatSide) return;

  chatroom.style.removeProperty("order");
  chatroom.parentElement?.style.removeProperty("flex-direction");
  chatSide.style.removeProperty("flex-direction");
  chatSide.style.removeProperty("order");
  row.style.removeProperty("flex-direction");

  if (!swapped) return;

  const display = getComputedStyle(row).display;
  const direction = getComputedStyle(row).flexDirection;

  if (display === "flex" || display === "grid") {
    const orderValue = direction === "row-reverse" ? "1" : "-1";
    chatSide.style.setProperty("order", orderValue, "important");
  } else {
    row.style.setProperty("flex-direction", "row-reverse", "important");
  }
}

function findChatHeader(chatroom) {
  const peopleBtn = chatroom
    .querySelector('svg[data-ds-icon="PeopleGroup"]')
    ?.closest("button");
  if (peopleBtn?.parentElement) return peopleBtn.parentElement;

  const collapseBtn = chatroom
    .querySelector('svg[data-ds-icon="CollapseRight"]')
    ?.closest("button");
  if (collapseBtn?.parentElement?.parentElement)
    return collapseBtn.parentElement.parentElement;

  return chatroom.firstElementChild;
}

function addSwapButton() {
  const chatroom = document.getElementById("channel-chatroom");
  if (!chatroom) return;

  const staleSwap = document.getElementById("ukick-swap-btn");
  if (staleSwap && !chatroom.contains(staleSwap)) staleSwap.remove();

  const header = findChatHeader(chatroom);

  if (header && !document.getElementById("ukick-swap-btn")) {
    const btn = document.createElement("button");
    btn.id = "ukick-swap-btn";
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
      applyChatOrder(swapChatDirection);
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
}

function addChannelToggles() {
  const usernameEl = document.getElementById("channel-username");
  if (!usernameEl) return;
  const parent = usernameEl.parentElement;

  let wrapper = document.getElementById("ukick-channel-toggles");
  if (wrapper && wrapper.parentElement !== parent) {
    wrapper.remove();
    wrapper = null;
  }

  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "ukick-channel-toggles";
    wrapper.style.cssText =
      "display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;";

    const danmakuBtn = document.createElement("button");
    danmakuBtn.id = "danmaku-toggle-btn";
    danmakuBtn.className = "ukick-round-toggle";
    danmakuBtn.title = "Danmaku";
    danmakuBtn.innerHTML = DANMAKU_ICON;
    browser.storage.local.get("enableDanmaku", (r) =>
      setToggleActive(danmakuBtn, r.enableDanmaku === true),
    );
    danmakuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      browser.storage.local.get("enableDanmaku", (result) => {
        browser.storage.local.set({
          enableDanmaku: !(result.enableDanmaku ?? false),
        });
      });
    });
    wrapper.appendChild(danmakuBtn);

    const usersBtn = document.createElement("button");
    usersBtn.id = "active-users-toggle-btn";
    usersBtn.className = "ukick-round-toggle";
    usersBtn.title = "Active users";
    usersBtn.innerHTML = ICON_USER;
    usersBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleOverlay();
    });
    wrapper.appendChild(usersBtn);

    parent.appendChild(wrapper);
  }

  if (parent.lastElementChild !== wrapper) parent.appendChild(wrapper);

  setToggleActive(
    document.getElementById("active-users-toggle-btn"),
    isOverlayVisible,
  );
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("enableDanmaku" in changes)) return;
  setToggleActive(
    document.getElementById("danmaku-toggle-btn"),
    changes.enableDanmaku.newValue === true,
  );
});
