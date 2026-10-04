/*
 * uKick — danmaku: sohbet mesajlarını video üzerinde kaydırır.
 */

function isDanmakuEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get("enableDanmaku", (result) =>
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
    highestProcessedIndex: -1,
    isPaused: false,
    displayTimer: null,
    scrollTimer: null,
    intervalId: null,
    isActive: false,
    currentUrl: window.location.href,
  },

  start: function () {
    if (this.state.isActive) return;

    this.state.isActive = true;
    this.state.currentUrl = window.location.href;
    this.state.messageQueue = [];
    this.state.highestProcessedIndex = this.scanLatestIndex();

    this.setupOverlay();
    this.setupObserver();
    this.startQueueProcessor();

    this.state.intervalId = setInterval(() => {
      if (!this.state.isActive) return;

      if (window.location.href !== this.state.currentUrl) {
        this.state.currentUrl = window.location.href;
        this.state.messageQueue = [];
        this.state.highestProcessedIndex = -1;
        if (this.state.observer) {
          this.state.observer.disconnect();
          this.state.observer = null;
        }
        if (this.state.chatContainer) {
          this.state.chatContainer.removeEventListener(
            "scroll",
            this.handleScroll,
          );
          this.state.chatContainer = null;
        }
        this.setupOverlay();
      }

      this.setupOverlay();
      this.setupObserver();
    }, 1000);
  },

  stop: function () {
    this.state.isActive = false;
    if (this.state.intervalId) clearInterval(this.state.intervalId);
    if (this.state.observer) this.state.observer.disconnect();
    if (this.state.overlay) this.state.overlay.remove();
    if (this.state.displayTimer) clearTimeout(this.state.displayTimer);
    if (this.state.chatContainer)
      this.state.chatContainer.removeEventListener("scroll", this.handleScroll);
    this.state.intervalId = null;
    this.state.observer = null;
    this.state.overlay = null;
    this.state.chatContainer = null;
    this.state.messageQueue = [];
  },

  findChatContainer: function () {
    const id =
      document.getElementById("chatroom-messages") ||
      document.getElementById("chatroom");
    if (id) return { el: id };
    const scroll =
      document.querySelector('[class*="chat-scrollable-area"]') ||
      document.querySelector(".no-scrollbar.relative");
    return scroll ? { el: scroll } : null;
  },

  findVideoContainer: function () {
    const video = document.querySelector("video");
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

  scanLatestIndex: function () {
    const container = this.state.chatContainer;
    if (!container) return -1;
    const messages = container.querySelectorAll("div[data-index]");
    let maxIndex = -1;
    messages.forEach((node) => {
      const idx = parseInt(node.getAttribute("data-index"));
      if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
    });
    return maxIndex;
  },

  setupObserver: function () {
    if (
      this.state.observer &&
      this.state.chatContainer &&
      document.body.contains(this.state.chatContainer)
    )
      return;
    const target = this.findChatContainer();
    if (target) {
      if (this.state.chatContainer && this.state.chatContainer !== target.el)
        this.state.chatContainer.removeEventListener(
          "scroll",
          this.handleScroll,
        );
      this.state.chatContainer = target.el;
      if (this.state.observer) this.state.observer.disconnect();
      this.state.chatContainer.addEventListener(
        "scroll",
        this.handleScroll.bind(this),
      );
      this.state.observer = new MutationObserver((mutations) => {
        if (!this.state.isActive) return;
        mutations.forEach((m) =>
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) this.processMessage(n);
          }),
        );
      });
      this.state.observer.observe(this.state.chatContainer, {
        childList: true,
        subtree: true,
      });
    }
  },

  setupOverlay: function () {
    if (this.state.overlay && document.body.contains(this.state.overlay))
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

  handleScroll: function () {
    this.state.isPaused = true;
    if (this.state.scrollTimer) clearTimeout(this.state.scrollTimer);
    this.state.scrollTimer = setTimeout(() => {
      this.state.isPaused = false;
    }, this.config.scrollPauseDuration);
  },

  processMessage: function (node) {
    const currentIndex = parseInt(node.getAttribute("data-index"));
    if (!isNaN(currentIndex)) {
      if (currentIndex <= this.state.highestProcessedIndex) return;
      this.state.highestProcessedIndex = currentIndex;
    }
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
    if (!this.state.overlay) {
      this.setupOverlay();
      if (!this.state.overlay) return;
    }
    const rect = this.state.overlay.getBoundingClientRect();
    if (rect.width === 0) return;

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
    this.state.overlay.appendChild(item);

    const lh = this.config.fontSize + 10;
    const lane = Math.floor(
      Math.random() * Math.max(1, Math.floor((rect.height / lh) * 0.85)),
    );
    item.style.top = lane * lh + "px";

    item.animate(
      [
        { transform: `translateX(${rect.width}px)` },
        { transform: `translateX(-100%) translateX(-${item.offsetWidth}px)` },
      ],
      { duration: this.config.speed * 1000, easing: "linear" },
    ).onfinish = () => item.remove();
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
