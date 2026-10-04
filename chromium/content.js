// ==UserScript==
// @name         uKick - Everything for Kick
// @namespace    https://github.com/berkaygediz/uKick
// @version      3.0.0.0
// @description  All-in-one Kick tool to block channels, categories, tags & chat. Sync remote lists. Boost volume, set quality, danmaku & themes.
// @author       berkaygediz
// @match        https://kick.com/*
// @match        https://www.kick.com/*
// @license      Apache-2.0
// @homepageURL  https://github.com/berkaygediz/uKick
// @supportURL   https://github.com/berkaygediz/uKick/issues
// ==/UserScript==

(async () => {
  try {
    await import(chrome.runtime.getURL("modules/main.js"));
  } catch (e) {
    console.error("uKick: module load failed:", e);
  }
})();
