// uKick - ambient

const CFG = {
  enabled: false,
  blur: 60,
  opacity: 0.6,
  fps: 12,
  spread: 2.2,
  scrim: 0.3,
  width: 384,
};

let started = false;
let video = null,
  usingVFC = false;
let canvas = null,
  ctx = null,
  scrim = null;
let tiny = null,
  tinyX = null,
  tinyW = 0;
let DW = CFG.width,
  DH = 144;
let anchor = null;
let hasFrame = false;
let cbPending = false,
  loopTimer = 0,
  loopGen = 0;
let lastDraw = 0,
  navT = 0,
  navT2 = 0,
  rsT = 0,
  lastUrl = location.href;
let healthTimer = 0,
  bootTimer = 0,
  bootTries = 0;
let mediaHandler = null,
  resizeHandler = null,
  visHandler = null,
  fsHandler = null;
let historyWrapped = false;

const MIN_INTERVAL = () => 1000 / Math.min(Math.max(CFG.fps, 1), 30);

const CSS =
  "html{background:#090b0f}" +
  "body{background-color:transparent!important}" +
  'html:not(.ukick-ambient-off) [class*="bg-surface-bg-lowest"]:not([role="dialog"]):not([role="dialog"] *){background-color:transparent!important}' +
  'html:not(.ukick-ambient-off) [class*="bg-kick-asphaltBlack-950"]:not([role="dialog"]):not([role="dialog"] *){background-color:transparent!important}' +
  "html:not(.ukick-ambient-off) nav.top-0{backdrop-filter:blur(80px)!important;-webkit-backdrop-filter:blur(80px)!important;background-color:rgba(9,11,15,.45)!important}" +
  "#ukick-ambient-canvas{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:-2!important;pointer-events:none!important}" +
  "#ukick-ambient-scrim{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:-1!important;pointer-events:none!important}";

const scEl = () => document.querySelector("main") || document.scrollingElement;

function getVideo() {
  let best = null,
    bw = 0;
  for (const v of document.querySelectorAll("video")) {
    const r = v.getBoundingClientRect();
    if (r.width < 380 || r.height < 180) continue;
    if (!v.closest("main")) continue;
    if (r.width > bw) {
      bw = r.width;
      best = v;
    }
  }
  return best;
}

function applyVisual() {
  const show = CFG.enabled && hasFrame && !document.fullscreenElement;
  if (canvas) {
    if (canvas.style.display !== (show ? "" : "none"))
      canvas.style.display = show ? "" : "none";
    canvas.style.opacity = String(CFG.opacity);
  }
  if (scrim) {
    scrim.style.backgroundColor = "rgba(9,11,15," + CFG.scrim + ")";
    if (scrim.style.display !== (show ? "block" : "none"))
      scrim.style.display = show ? "block" : "none";
  }
}

function sizeBacking() {
  if (!canvas) return;
  DW = Math.min(Math.max(CFG.width | 0, 96), 640);
  DH = Math.max(Math.round(DW * (innerHeight / Math.max(innerWidth, 1))), 32);
  if (canvas.width !== DW || canvas.height !== DH) {
    canvas.width = DW;
    canvas.height = DH;
  }
}

function ensureTiny(bandAspect) {
  const w =
    CFG.blur <= 4
      ? 0
      : Math.max(48, Math.min(288, Math.round(3840 / CFG.blur)));
  if (!w) {
    tiny = null;
    tinyX = null;
    tinyW = 0;
    return;
  }
  const h = Math.max(6, Math.round(w * bandAspect));
  if (
    !tiny ||
    tiny.width !== w ||
    Math.abs(tiny.height / tiny.width - bandAspect) > 0.12
  ) {
    tiny = document.createElement("canvas");
    tiny.width = w;
    tiny.height = h;
    tinyX = tiny.getContext("2d", { alpha: true });
    tinyX.imageSmoothingQuality = "high";
  }
  tinyW = w;
}

function isMini(r) {
  if (!anchor) return false;
  if (r.width >= anchor.w * 0.55 && r.height >= anchor.h * 0.55) return false;
  let el = video,
    i = 0;
  while (el && i++ < 6) {
    if (getComputedStyle(el).position === "fixed") return true;
    el = el.parentElement;
  }
  return r.top > innerHeight * 0.5;
}

function clearCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, DW, DH);
  if (hasFrame) {
    hasFrame = false;
    applyVisual();
  }
}

function draw() {
  if (!ctx || !video) return;
  if (!video.videoWidth) {
    clearCanvas();
    return;
  }
  const r = video.getBoundingClientRect();
  if (r.width < 10) {
    clearCanvas();
    return;
  }
  if (!document.fullscreenElement && !isMini(r)) {
    const sc = scEl();
    if (sc) {
      const sr = sc.getBoundingClientRect();
      anchor = { top: r.top - sr.top + sc.scrollTop, h: r.height, w: r.width };
    } else {
      anchor = { top: r.top + scrollY, h: r.height, w: r.width };
    }
  }
  if (!anchor) return;
  const sc = scEl();
  let vy;
  if (sc) {
    const sr = sc.getBoundingClientRect();
    vy = anchor.top - sc.scrollTop + sr.top;
  } else {
    vy = anchor.top - scrollY;
  }
  const gh = anchor.h * CFG.spread;
  const gy = vy + anchor.h / 2 - gh / 2;
  if (gy > innerHeight || gy + gh < 0) {
    clearCanvas();
    return;
  }
  const s = DW / innerWidth;
  const by = gy * s,
    bh = Math.max(gh * s, 4);
  const vw = video.videoWidth,
    vh = video.videoHeight;
  const scale = Math.max(DW / vw, bh / vh);
  const cw = DW / scale,
    chh = bh / scale;
  const cx = (vw - cw) / 2,
    cy = (vh - chh) / 2;
  ctx.clearRect(0, 0, DW, DH);
  if (CFG.blur > 4) {
    ensureTiny(bh / DW);
    if (tinyX) {
      tinyX.filter = "saturate(1.4)";
      try {
        tinyX.drawImage(video, cx, cy, cw, chh, 0, 0, tiny.width, tiny.height);
      } catch {}
      tinyX.filter = "none";
      try {
        ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, 0, by, DW, bh);
      } catch {}
    }
  } else {
    try {
      ctx.drawImage(video, cx, cy, cw, chh, 0, by, DW, bh);
    } catch {}
  }
  ctx.globalCompositeOperation = "destination-out";
  const g = ctx.createLinearGradient(0, by, 0, by + bh);
  g.addColorStop(0, "rgba(0,0,0,.85)");
  g.addColorStop(0.18, "rgba(0,0,0,0)");
  g.addColorStop(0.82, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, by, DW, bh);
  ctx.globalCompositeOperation = "source-over";
  if (!hasFrame) {
    hasFrame = true;
    applyVisual();
  }
}

function shouldRun() {
  return (
    CFG.enabled &&
    video &&
    video.isConnected &&
    !document.hidden &&
    !document.fullscreenElement &&
    !video.paused &&
    !video.seeking &&
    video.readyState >= 2
  );
}

function stopLoop() {
  loopGen++;
  cbPending = false;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = 0;
  }
}

function kick() {
  if (!shouldRun()) return;
  const g = loopGen;
  if (usingVFC && video) {
    if (!cbPending) {
      cbPending = true;
      video.requestVideoFrameCallback(() => vfcTick(g));
    }
  } else if (!loopTimer) {
    loopTimer = setTimeout(() => timerTick(g), MIN_INTERVAL());
  }
}

function vfcTick(g) {
  if (g !== loopGen) return;
  cbPending = false;
  if (!shouldRun()) return;
  const n = performance.now();
  if (n - lastDraw >= MIN_INTERVAL()) {
    lastDraw = n;
    draw();
  }
  if (g === loopGen && usingVFC && video) {
    cbPending = true;
    video.requestVideoFrameCallback(() => vfcTick(g));
  }
}

function timerTick(g) {
  if (g !== loopGen) return;
  loopTimer = 0;
  if (!shouldRun()) return;
  const n = performance.now();
  if (n - lastDraw >= MIN_INTERVAL()) {
    lastDraw = n;
    draw();
  }
  if (g === loopGen) loopTimer = setTimeout(() => timerTick(g), MIN_INTERVAL());
}

function bindVideo(v) {
  video = v;
  anchor = null;
  usingVFC = typeof v.requestVideoFrameCallback === "function";
  stopLoop();
  clearCanvas();
  applyVisual();
  kick();
}

function unbindVideo() {
  if (!video) {
    applyVisual();
    return;
  }
  video = null;
  anchor = null;
  usingVFC = false;
  stopLoop();
  clearCanvas();
  applyVisual();
}

function rebindCheck() {
  const v = getVideo();
  if (v !== video) {
    v ? bindVideo(v) : unbindVideo();
  } else if (video) kick();
}

function onNavigate() {
  clearTimeout(navT);
  clearTimeout(navT2);
  navT = setTimeout(() => {
    sizeBacking();
    rebindCheck();
  }, 250);
  navT2 = setTimeout(() => {
    sizeBacking();
    rebindCheck();
  }, 900);
}

function onMediaEvent(e) {
  const t = e.target;
  if (!t || t.tagName !== "VIDEO") return;
  const type = e.type;
  if (type === "loadstart" || type === "emptied" || type === "ended") {
    if (t === video) {
      clearCanvas();
      anchor = null;
    }
  }
  if (type === "loadeddata") rebindCheck();
  if (t === video || type === "play" || type === "playing") kick();
}

function wrapHistory() {
  if (historyWrapped) return;
  historyWrapped = true;
  try {
    const wrap = (fn) =>
      function (...a) {
        const r = fn.apply(this, a);
        onNavigate();
        return r;
      };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
  } catch {}
}

function injectStyle() {
  if (document.getElementById("ukick-ambient-style")) return;
  const st = document.createElement("style");
  st.id = "ukick-ambient-style";
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
}

function createCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "ukick-ambient-canvas";
  canvas.setAttribute("aria-hidden", "true");
  (document.body || document.documentElement).appendChild(canvas);
  try {
    ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  } catch {
    ctx = canvas.getContext("2d");
  }
  if (ctx) ctx.imageSmoothingQuality = "high";
  scrim = document.createElement("div");
  scrim.id = "ukick-ambient-scrim";
  scrim.setAttribute("aria-hidden", "true");
  (document.body || document.documentElement).appendChild(scrim);
  sizeBacking();
  applyVisual();
}

function start() {
  if (started) return;
  started = true;
  injectStyle();
  document.documentElement.classList.remove("ukick-ambient-off");
  createCanvas();
  wrapHistory();

  mediaHandler = onMediaEvent;
  for (const ev of [
    "play",
    "playing",
    "loadeddata",
    "loadstart",
    "seeked",
    "canplay",
    "emptied",
    "ended",
  ]) {
    document.addEventListener(ev, mediaHandler, true);
  }
  window.addEventListener("popstate", onNavigate);
  resizeHandler = () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      sizeBacking();
      anchor = null;
      draw();
      kick();
    }, 200);
  };
  window.addEventListener("resize", resizeHandler, { passive: true });
  visHandler = () => {
    if (!document.hidden) kick();
  };
  document.addEventListener("visibilitychange", visHandler);
  fsHandler = () => {
    applyVisual();
    if (!document.fullscreenElement) kick();
  };
  document.addEventListener("fullscreenchange", fsHandler);

  healthTimer = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
    }
    if (video && (!video.isConnected || !video.closest("main"))) {
      unbindVideo();
      return;
    }
    if (!video) rebindCheck();
  }, 2000);

  bootTries = 0;
  bootTimer = setInterval(() => {
    if (getVideo()) {
      clearInterval(bootTimer);
      bootTimer = 0;
      rebindCheck();
    } else if (++bootTries > 40) {
      clearInterval(bootTimer);
      bootTimer = 0;
    }
  }, 500);

  rebindCheck();
}

function stop() {
  if (!started) return;
  started = false;
  stopLoop();
  if (mediaHandler) {
    for (const ev of [
      "play",
      "playing",
      "loadeddata",
      "loadstart",
      "seeked",
      "canplay",
      "emptied",
      "ended",
    ]) {
      document.removeEventListener(ev, mediaHandler, true);
    }
    mediaHandler = null;
  }
  window.removeEventListener("popstate", onNavigate);
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  if (visHandler) {
    document.removeEventListener("visibilitychange", visHandler);
    visHandler = null;
  }
  if (fsHandler) {
    document.removeEventListener("fullscreenchange", fsHandler);
    fsHandler = null;
  }
  clearInterval(healthTimer);
  healthTimer = 0;
  if (bootTimer) {
    clearInterval(bootTimer);
    bootTimer = 0;
  }
  unbindVideo();
  canvas?.remove();
  canvas = null;
  ctx = null;
  scrim?.remove();
  scrim = null;
  document.documentElement.classList.add("ukick-ambient-off");
}

export function initAmbient() {
  chrome.storage.local.get(
    [
      "ambientEnabled",
      "ambientBlur",
      "ambientOpacity",
      "ambientSpread",
      "ambientScrim",
    ],
    (r) => {
      if (typeof r.ambientBlur === "number") CFG.blur = r.ambientBlur;
      if (typeof r.ambientOpacity === "number") CFG.opacity = r.ambientOpacity;
      if (typeof r.ambientSpread === "number") CFG.spread = r.ambientSpread;
      if (typeof r.ambientScrim === "number") CFG.scrim = r.ambientScrim;
      CFG.enabled = r.ambientEnabled === true;
      if (CFG.enabled) start();
      else document.documentElement.classList.add("ukick-ambient-off");
    },
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("ambientEnabled" in changes) {
      CFG.enabled = changes.ambientEnabled.newValue === true;
      if (CFG.enabled) {
        start();
        draw();
        kick();
      } else stop();
    }
    if ("ambientBlur" in changes) {
      CFG.blur = changes.ambientBlur.newValue;
      tiny = null;
      draw();
    }
    if ("ambientOpacity" in changes) {
      CFG.opacity = changes.ambientOpacity.newValue;
      applyVisual();
    }
    if ("ambientSpread" in changes) {
      CFG.spread = changes.ambientSpread.newValue;
      draw();
    }
    if ("ambientScrim" in changes) {
      CFG.scrim = changes.ambientScrim.newValue;
      applyVisual();
    }
  });
}
