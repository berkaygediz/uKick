// uKick — keyboardvolume

let activeVideo = null,
  volDisplay = null,
  fadeTimer = null,
  isRunning = false;

function ensureStyle() {
  if (document.getElementById("kv-style")) return;

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

function onKeyDown(e) {
  if (!activeVideo || !document.body.contains(activeVideo)) {
    activeVideo = document.querySelector("#video-player");
    if (!activeVideo) return;
  }

  const tag = document.activeElement.tagName.toLowerCase(),
    editable = document.activeElement.isContentEditable;
  const isRange = tag === "input" && document.activeElement.type === "range";
  if (!isRange && (tag === "input" || tag === "textarea" || editable)) return;

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

    showVolume();
  }
}

export function startKeyboardVolume() {
  if (isRunning) return;
  isRunning = true;
  ensureStyle();
  activeVideo = document.querySelector("#video-player");
  document.addEventListener("keydown", onKeyDown, true);
}

export function stopKeyboardVolume() {
  if (!isRunning) return;
  isRunning = false;
  document.removeEventListener("keydown", onKeyDown, true);
  activeVideo = null;
}
