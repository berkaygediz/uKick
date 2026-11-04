// uKick - screenshot

import { showToast } from "../core/utils.js";

const CAM_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';

let enabled = false;
let btn = null;
let timer = 0;

function pageSlug() {
  try {
    const p = (location.pathname || "").split("/").filter(Boolean);
    if (!p.length) return "";
    if (p[0] === "popout" && p[1]) return p[1].toLowerCase();
    return p[0].toLowerCase();
  } catch {
    return "";
  }
}

function findVideo() {
  try {
    let best = null,
      bestArea = 0;
    for (const v of document.querySelectorAll("video")) {
      if (!v.videoWidth) continue;
      const r = v.getBoundingClientRect();
      if (r.width < 200 || r.height < 100) continue;
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  } catch {
    return null;
  }
}

function fileName() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" : "") + n;
  return (
    "kick-" +
    (pageSlug() || "video") +
    "-" +
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    "-" +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds()) +
    ".png"
  );
}

function captureFrame(cb) {
  const v = findVideo();
  if (!v || !v.videoWidth) {
    cb(null, "shot_notready");
    return;
  }
  try {
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) {
        cb(null, "shot_failed");
        return;
      }
      cb(blob, null);
    }, "image/png");
  } catch {
    cb(null, "shot_unavailable");
  }
}

function download(blob) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(chrome.i18n.getMessage("shot_saved") || "Screenshot saved.");
  } catch {
    showToast(chrome.i18n.getMessage("shot_failed") || "Screenshot failed.");
  }
}

function copy(blob) {
  try {
    if (
      !window.ClipboardItem ||
      !navigator.clipboard ||
      !navigator.clipboard.write
    ) {
      download(blob);
      return;
    }
    const item = {};
    item[blob.type] = blob;
    navigator.clipboard.write([new ClipboardItem(item)]).then(
      () =>
        showToast(
          chrome.i18n.getMessage("shot_copied") || "Screenshot copied.",
        ),
      () => download(blob),
    );
  } catch {
    download(blob);
  }
}

function onButtonClick(e) {
  e.stopPropagation();
  captureFrame((blob, errKey) => {
    if (!blob) {
      showToast(chrome.i18n.getMessage(errKey) || "Screenshot failed.");
      return;
    }
    if (e.ctrlKey || e.metaKey) copy(blob);
    else download(blob);
  });
}

function applyInlinePlacement(wrapper) {
  wrapper.appendChild(btn);
  btn.className = "ukick-round-toggle";
  btn.innerHTML = CAM_ICON;
}

function applyFloatingPlacement() {
  document.documentElement.appendChild(btn);
  btn.className = "floating";
  btn.innerHTML = CAM_ICON.replace(
    /width="14" height="14"/,
    'width="20" height="20"',
  );
}

function ensureButton() {
  if (btn) return;
  const style = document.createElement("style");
  style.id = "ukick-shot-styles";
  style.textContent =
    "#ukick-shot-btn{display:none;align-items:center;justify-content:center;z-index:2147483000;cursor:pointer}" +
    "#ukick-shot-btn.floating{position:fixed;right:14px;bottom:114px;width:42px;height:42px;" +
    "border-radius:10px;background:#171a1c;color:#53fc18;border:1px solid rgba(83,252,24,.45);" +
    "font-weight:900;box-shadow:0 4px 18px rgba(0,0,0,.5)}" +
    "#ukick-shot-btn.floating.show{display:flex}" +
    "#ukick-shot-btn.ukick-round-toggle{display:inline-flex}";
  (document.head || document.documentElement).appendChild(style);

  btn = document.createElement("button");
  btn.id = "ukick-shot-btn";
  btn.title =
    chrome.i18n.getMessage("btn_screenshot") ||
    "Screenshot (click: save, Ctrl+click: copy)";
  btn.addEventListener("click", onButtonClick);
  applyFloatingPlacement();

  timer = setInterval(() => {
    const wrapper = document.getElementById("ukick-channel-toggles");
    if (wrapper && btn.parentElement !== wrapper) applyInlinePlacement(wrapper);
    else if (!wrapper && btn.parentElement !== document.documentElement)
      applyFloatingPlacement();
    if (btn.classList.contains("floating"))
      btn.classList.toggle("show", !!findVideo());
    refreshTitle();
  }, 2000);
}

function refreshTitle() {
  const t =
    chrome.i18n.getMessage("btn_screenshot") ||
    "Screenshot (click: save, Ctrl+click: copy)";
  if (btn && btn.title !== t) btn.title = t;
}

function removeButton() {
  clearInterval(timer);
  timer = 0;
  btn?.remove();
  btn = null;
  document.getElementById("ukick-shot-styles")?.remove();
}

export function initScreenshot() {
  chrome.storage.local.get("enableScreenshot", (r) => {
    enabled = r.enableScreenshot === true;
    if (enabled) ensureButton();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !("enableScreenshot" in changes)) return;
    enabled = changes.enableScreenshot.newValue === true;
    if (enabled) ensureButton();
    else removeButton();
  });
}
