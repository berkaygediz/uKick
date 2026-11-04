/*
 * uKick - utils
 */

export function normalizeData(str) {
  return str?.toLowerCase().trim() || "";
}

export function showToast(message) {
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

export function findUsernameEl() {
  const els = document.querySelectorAll(
    "#channel-username, [data-testid='channel-username']",
  );
  for (const el of els) {
    if (el.getClientRects().length > 0) return el;
  }
  return els[0] || null;
}

export function showCenterToast(message, options = {}) {
  const box = document.createElement("div");
  box.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    max-width: calc(100vw - 32px); width: 360px;
    background-color: #242424; color: #fff;
    border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
    box-shadow: 0 12px 44px rgba(0,0,0,.6);
    z-index: 2147483646; font-size: 14px; line-height: 1.5;
    opacity: 0; transition: opacity 0.2s ease; overflow: hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    padding: 10px 16px; font-size: 14px; font-weight: bold; color: #eaeaea;
    border-bottom: 1px solid rgba(255,255,255,.08);
  `;
  header.textContent = options.title || "uKick";
  box.appendChild(header);

  const body = document.createElement("div");
  body.style.cssText = "padding: 14px 16px;";
  const text = document.createElement("div");
  text.textContent = message;
  body.appendChild(text);
  box.appendChild(body);

  let removed = false;
  function remove() {
    if (removed) return;
    removed = true;
    box.style.opacity = "0";
    setTimeout(() => box.remove(), 200);
  }

  if (options.confirmText) {
    const actions = document.createElement("div");
    actions.style.cssText =
      "display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px;";

    const cancel = document.createElement("button");
    cancel.textContent = options.cancelText || "Cancel";
    cancel.style.cssText = `
      height: 34px; padding: 0 18px; border-radius: 4px; border: none;
      background: #333; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
    `;
    cancel.addEventListener("click", () => {
      remove();
      options.onCancel?.();
    });

    const confirm = document.createElement("button");
    confirm.textContent = options.confirmText;
    confirm.style.cssText = `
      height: 34px; padding: 0 18px; border-radius: 4px; border: none;
      background: #00b660; color: #000; font-size: 13px; font-weight: bold; cursor: pointer;
      transition: background 0.3s ease;
    `;
    confirm.addEventListener("click", () => {
      remove();
      options.onConfirm?.();
    });

    actions.appendChild(cancel);
    actions.appendChild(confirm);
    body.appendChild(actions);
  }

  document.body.appendChild(box);
  requestAnimationFrame(() => {
    box.style.opacity = "1";
  });
  if (!options.confirmText) setTimeout(remove, 3000);
  return remove;
}

export function extractTagText(tagEl) {
  let text = "";
  for (const node of tagEl.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !node.classList.contains("tag-block-btn")
    ) {
      text += node.textContent;
    }
  }
  return text.replace(/\s+/g, " ").trim();
}

export function debounceRAF(fn) {
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

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function clearSearchHistory() {
  try {
    const key = "search-history";
    const hostname = location.hostname;

    if (hostname !== "kick.com" && !hostname.endsWith(".kick.com")) return;

    const current = localStorage.getItem(key);
    if (current && current !== "[]") localStorage.setItem(key, "[]");
  } catch (e) {}
}

export function debounce(fn, delay = 10) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(), delay);
  };
}
