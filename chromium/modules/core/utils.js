/*
 * uKick — utils: ortak yardımcılar.
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
