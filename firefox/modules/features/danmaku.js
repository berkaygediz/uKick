// uKick - danmaku

import { debounceRAF } from "../core/utils.js";
import { collectChatRows, getActiveChatContainer } from "./chat.js";

const dmPerf = {
  observerMs: 0,
  observerCalls: 0,
  pollMs: 0,
  pollCalls: 0,
  processMs: 0,
  processCalls: 0,
  processSkipped: 0,
  showMs: 0,
  showCalls: 0,
  reconnects: 0,
  lastReport: 0,
};
window.dmPerf = dmPerf;
window.dmReport = function () {
  console.table([
    {
      fn: "observer",
      cagri: dmPerf.observerCalls,
      toplamMs: +dmPerf.observerMs.toFixed(1),
    },
    {
      fn: "poll",
      cagri: dmPerf.pollCalls,
      toplamMs: +dmPerf.pollMs.toFixed(1),
    },
    {
      fn: "processMessage",
      cagri: dmPerf.processCalls,
      toplamMs: +dmPerf.processMs.toFixed(1),
    },
    { fn: "  ↳ atlanan", cagri: dmPerf.processSkipped, toplamMs: "-" },
    {
      fn: "showMessage",
      cagri: dmPerf.showCalls,
      toplamMs: +dmPerf.showMs.toFixed(1),
    },
    { fn: "reconnect", cagri: dmPerf.reconnects, toplamMs: "-" },
  ]);
};

function isDanmakuEnabled() {
  return new Promise((resolve) => {
    browser.storage.local.get("enableDanmaku", (result) =>
      resolve(result.enableDanmaku ?? false),
    );
  });
}

const DANMAKU_CSS = `
    .ukick-danmaku-overlay {
      position: absolute !important; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none !important; overflow: hidden !important;
      z-index: 2147483647 !important; background: transparent !important; contain: strict;
    }
    .ukick-danmaku-item {
      position: absolute !important; white-space: nowrap !important;
      font-family: 'Inter', sans-serif !important; font-weight: 900 !important;
      text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000 !important;
      color: white !important; font-size: 28px !important; will-change: transform !important;
      opacity: 0.9 !important; line-height: 1.3 !important; display: flex; align-items: center;
    }
    .ukick-danmaku-item img { display: inline-block !important; vertical-align: middle !important; height: 1.4em !important; width: auto !important; margin: 0 2px !important; }
  `;

function createLaneManager() {
  const laneUntil = [];
  return {
    assign(overlayHeight, itemHeight, durationMs) {
      const lh = itemHeight + 10;
      const laneCount = Math.max(1, Math.floor((overlayHeight / lh) * 0.9));
      const now = performance.now();

      let best = -1;
      let bestUntil = Infinity;
      for (let i = 0; i < laneCount; i++) {
        const until = laneUntil[i] || 0;
        if (until <= now) {
          best = i;
          break;
        }
        if (until < bestUntil) {
          bestUntil = until;
          best = i;
        }
      }
      if (best === -1) best = 0;

      laneUntil[best] = now + durationMs + 200;
      return best * lh;
    },
    reset() {
      laneUntil.length = 0;
    },
  };
}

export const DanmakuEngine = {
  config: {
    speed: 6,
    fontSize: 28,

    baseInterval: 120,
    normalInterval: 50,
    fastInterval: 25,

    maxQueueSize: 60,
    scrollPauseDuration: 500,
    maxTextLength: 100,
    recentMemorySize: 300,

    replyPatterns: [
      /^الرد على @[\w-]+ /i, // ar
      /^Odpovídá @[\w-]+ /i, // cs
      /^Antworten an @[\w-]+ /i, // de
      /^Replying to @[\w-]+ /i, // en
      /^Respondiendo a @[\w-]+ /i, // es
      /^Vastaa @[\w-]+ /i, // fi
      /^Répondre à @[\w-]+ /i, // fr
      /^בתשובה ל@[\w-]+ /i, // he
      /^Membalas @[\w-]+ /i, // id
      /^Rispondi a @[\w-]+ /i, // it
      /^返信中 @[\w-]+ /i, // ja
      /^@[\w-]+에게 답장 /i, // ko
      /^Odpowiada @[\w-]+ /i, // pl
      /^Respondendo a @[\w-]+ /i, // pt
      /^Ответ @[\w-]+ /i, // ru
      /^Yanıtla @[\w-]+ /i, // tr
      /^Trả lời @[\w-]+ /i, // vi
      /^回复 @[\w-]+ /i, // zh_CN
    ],

    systemKeywords: [
      "رسائل جديدة", // ar
      "Nové zprávy", // cs
      "Neue Nachrichten", // de
      "New messages", // en
      "Nuevos mensajes", // es
      "Uudet viestit", // fi
      "Nouveaux messages", // fr
      "הודעות חדשות", // he
      "Pesan baru", // id
      "Nuovi messaggi", // it
      "新しいメッセージ", // ja
      "새 메시지", // ko
      "Nowe wiadomości", // pl
      "Novas mensagens", // pt
      "Новые сообщения", // ru
      "Yeni mesajlar", // tr
      "Tin nhắn mới", // vi
      "新消息", // zh_CN
    ],
  },

  state: {
    overlay: null,
    observer: null,
    chatContainer: null,
    messageQueue: [],
    isPaused: false,
    displayTimer: null,
    scrollTimer: null,
    intervalId: null,
    pollId: null,
    isActive: false,
    currentUrl: window.location.href,
    lastScrollTop: 0,
  },

  lanes: createLaneManager(),
  recentKeys: new Set(),

  start: function () {
    if (this.state.isActive) return;

    this.state.isActive = true;
    this.state.currentUrl = window.location.href;
    this.state.messageQueue = [];
    this.state.lastScrollTop = 0;
    this.lanes.reset();
    this.recentKeys.clear();

    this.setupOverlay();
    this.setupObserver();
    this.startQueueProcessor();

    this.state.intervalId = setInterval(() => {
      if (!this.state.isActive) return;

      if (window.location.href !== this.state.currentUrl) {
        this.state.currentUrl = window.location.href;
        this.state.messageQueue = [];
        this.lanes.reset();
        this.recentKeys.clear();
      }

      this.setupOverlay();
      this.setupObserver();
    }, 2000);

    this.state.pollId = setInterval(() => {
      if (!this.state.isActive || !this.state.chatContainer) return;
      const t0 = performance.now();
      const rows = this.state.chatContainer.querySelectorAll("[data-index]");
      if (rows.length === 0) return;
      this.processMessage(rows[rows.length - 1]);
      dmPerf.pollMs += performance.now() - t0;
      dmPerf.pollCalls++;
      if (performance.now() - dmPerf.lastReport > 5000) {
        dmPerf.lastReport = performance.now();
        window.dmReport();
      }
    }, 2000);
  },

  stop: function () {
    this.state.isActive = false;
    if (this.state.intervalId) clearInterval(this.state.intervalId);
    if (this.state.pollId) clearInterval(this.state.pollId);
    if (this.state.observer) this.state.observer.disconnect();
    if (this.state.overlay) this.state.overlay.remove();
    if (this.state.displayTimer) clearTimeout(this.state.displayTimer);
    this.state.intervalId = null;
    this.state.pollId = null;
    this.state.observer = null;
    this.state.overlay = null;
    this.state.chatContainer = null;
    this.state.messageQueue = [];
  },

  setupObserver: function () {
    const active = getActiveChatContainer();
    if (!active) return;
    if (this.state.observer && this.state.chatContainer === active) return;

    if (this.state.chatContainer !== active) {
      dmPerf.reconnects++;
    }

    if (this.state.observer) this.state.observer.disconnect();
    if (this.state.chatContainer) {
      this.state.chatContainer.removeEventListener("scroll", this.handleScroll);
    }

    this.state.chatContainer = active;
    this.state.lastScrollTop = active.scrollTop || 0;
    this.state.chatContainer.addEventListener("scroll", this.handleScroll);

    this.state.observer = new MutationObserver(
      debounceRAF((mutationsList) => {
        if (!this.state.isActive) return;
        const t0 = performance.now();
        const rows = collectChatRows(mutationsList);
        for (const row of rows) this.processMessage(row);
        dmPerf.observerMs += performance.now() - t0;
        dmPerf.observerCalls++;
      }),
    );

    this.state.observer.observe(this.state.chatContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-index"],
    });
  },

  findVideoContainer: function () {
    const videos = Array.from(document.querySelectorAll("video")).filter(
      (v) => v.getClientRects().length > 0,
    );
    const video = videos[0] || document.querySelector("video");
    if (!video) return null;
    let parent = video.parentElement;
    while (parent && parent.parentElement) {
      const styles = window.getComputedStyle(parent);
      const isPositioned =
        styles.position === "relative" ||
        styles.position === "absolute" ||
        styles.position === "fixed";
      const isLargeEnough =
        parent.clientHeight >= video.clientHeight &&
        parent.clientWidth >= video.clientWidth;
      if (isPositioned && isLargeEnough) return parent;
      parent = parent.parentElement;
    }
    return video.parentElement;
  },

  setupOverlay: function () {
    if (
      this.state.overlay &&
      document.body.contains(this.state.overlay) &&
      this.state.overlay.getClientRects().length > 0
    )
      return;
    const videoContainer = this.findVideoContainer();
    if (videoContainer) {
      document
        .querySelectorAll(".ukick-danmaku-overlay")
        .forEach((e) => e.remove());
      this.state.overlay = document.createElement("div");
      this.state.overlay.className = "ukick-danmaku-overlay";
      if (window.getComputedStyle(videoContainer).position === "static")
        videoContainer.style.position = "relative";
      videoContainer.appendChild(this.state.overlay);
    }
  },

  handleScroll: () => {
    const st = DanmakuEngine.state.chatContainer?.scrollTop || 0;
    const prev = DanmakuEngine.state.lastScrollTop;
    DanmakuEngine.state.lastScrollTop = st;

    if (st < prev - 2) {
      DanmakuEngine.state.isPaused = true;
      if (DanmakuEngine.state.scrollTimer)
        clearTimeout(DanmakuEngine.state.scrollTimer);
      DanmakuEngine.state.scrollTimer = setTimeout(() => {
        DanmakuEngine.state.isPaused = false;
      }, DanmakuEngine.config.scrollPauseDuration);
    }
  },

  processMessage: function (node) {
    const t0 = performance.now();
    if (node.nodeType !== 1) return;

    const span = node.querySelector("span.font-normal");
    if (!span) return;

    const html = span.innerHTML,
      txt = span.innerText || "";
    if (!html) return;

    if (this.config.systemKeywords.some((k) => txt.includes(k))) return;

    let cleanTxt = txt;
    this.config.replyPatterns.forEach((regex) => {
      cleanTxt = cleanTxt.replace(regex, "");
    });
    cleanTxt = cleanTxt.replace(/https?:\/\/[^\s]+/gi, "").trim();

    if (cleanTxt.length > this.config.maxTextLength) return;
    if (!cleanTxt && !html.includes("<img")) return;

    const key = txt.substring(0, 100);
    if (this.recentKeys.has(key)) {
      dmPerf.processSkipped++;
      return;
    }
    this.recentKeys.add(key);
    if (this.recentKeys.size > this.config.recentMemorySize) {
      const arr = Array.from(this.recentKeys);
      this.recentKeys = new Set(arr.slice(50));
    }

    dmPerf.processMs += performance.now() - t0;
    dmPerf.processCalls++;
    this.addToQueue({ html: html, text: cleanTxt });
  },

  addToQueue: function (msgObj) {
    if (this.state.messageQueue.length >= this.config.maxQueueSize)
      this.state.messageQueue.shift();
    this.state.messageQueue.push(msgObj);
  },

  startQueueProcessor: function () {
    const loop = () => {
      if (!this.state.isActive) return;
      if (this.state.isPaused || this.state.messageQueue.length === 0) {
        this.state.displayTimer = setTimeout(loop, this.config.baseInterval);
        return;
      }

      const msg = this.state.messageQueue.shift();
      this.showMessage(msg.html, false);

      let nextDelay = this.config.baseInterval;
      const queueSize = this.state.messageQueue.length;
      if (queueSize > 15) nextDelay = this.config.fastInterval;
      else if (queueSize > 5) nextDelay = this.config.normalInterval;

      this.state.displayTimer = setTimeout(loop, nextDelay);
    };
    loop();
  },

  showMessage: function (html) {
    const t0 = performance.now();
    if (!this.state.overlay) {
      this.setupOverlay();
      if (!this.state.overlay) return;
    }
    const rect = this.state.overlay.getBoundingClientRect();
    if (rect.width === 0) {
      this.setupOverlay();
      return;
    }

    const item = document.createElement("div");
    item.className = "ukick-danmaku-item";
    item.innerHTML = html;

    if (!html.includes("<img")) {
      const colors = [
        "#ffffff",
        "#ffebee",
        "#e3f2fd",
        "#e8f5e9",
        "#fff3e0",
        "#f3e5f5",
      ];
      item.style.color = colors[Math.floor(Math.random() * colors.length)];
    }

    const durationMs = this.config.speed * 1000;
    const top = this.lanes.assign(
      rect.height,
      this.config.fontSize,
      durationMs,
    );
    item.style.top = top + "px";

    this.state.overlay.appendChild(item);

    item.animate(
      [
        { transform: `translateX(${rect.width}px)` },
        { transform: `translateX(-100%) translateX(-${item.offsetWidth}px)` },
      ],
      { duration: durationMs, easing: "linear" },
    ).onfinish = () => item.remove();
    dmPerf.showMs += performance.now() - t0;
    dmPerf.showCalls++;
  },
};

function injectDanmakuStyles() {
  if (document.getElementById("ukick-danmaku-styles")) return;

  const s = document.createElement("style");
  s.id = "ukick-danmaku-styles";
  s.textContent = DANMAKU_CSS;
  document.head.appendChild(s);
}

export async function processDanmaku() {
  injectDanmakuStyles();
  if (await isDanmakuEnabled()) DanmakuEngine.start();
  else DanmakuEngine.stop();
}
