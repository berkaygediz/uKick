// uKick — styles

export function injectButtonStyles() {
  if (document.getElementById("ukick-btn-styles")) return;

  const style = document.createElement("style");
  style.id = "ukick-btn-styles";
  style.textContent = `
    .ukick-x-btn {
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(0, 0, 0, 0.6);
      color: rgba(255, 255, 255, 0.7);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .ukick-x-btn:hover {
      background: rgba(255, 80, 80, 0.4) !important;
      border-color: rgba(255, 80, 80, 0.6) !important;
      color: #ffffff !important;
    }
    .ukick-btn-thumb {
      position: absolute; top: 6px; right: 6px;
      width: 24px; height: 24px; font-size: 12px; border-radius: 9999px;
      z-index: 9999;
      background: rgba(25, 12, 12, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.9);
    }
    .ukick-btn-cat {
      position: absolute; top: 6px; right: 6px;
      width: 20px; height: 20px; font-size: 10px; border-radius: 9999px;
      z-index: 200;
    }
    .ukick-btn-tag {
      width: 16px; height: 16px; font-size: 9px; border-radius: 9999px;
      margin-left: 4px; vertical-align: middle; display: inline-flex;
    }
    .ukick-btn-follow {
      margin-left: 8px;
      width: 24px; height: 24px; font-size: 12px; border-radius: 9999px;
      vertical-align: middle;
    }
    .ukick-btn-chat {
      margin-left: 6px;
      width: 16px; height: 16px; font-size: 9px; border-radius: 9999px;
      vertical-align: middle;
    }
    .ukick-btn-channel {
      margin-left: 8px;
      width: 24px; height: 24px; font-size: 12px; border-radius: 9999px;
      vertical-align: middle;
    }
    .ukick-btn-sidebar {
      position: absolute; top: 10px; right: 4px;
      width: 25px; height: 25px; font-size: 14px; border-radius: 9999px;
      display: none; z-index: 99999;
      background: rgba(120, 20, 20, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .ukick-x-btn.ukick-unblock {
      color: #53fc18;
      border-color: rgba(83, 252, 24, 0.35);
    }
    .ukick-x-btn.ukick-unblock:hover {
      background: rgba(83, 252, 24, 0.2) !important;
      border-color: rgba(83, 252, 24, 0.6) !important;
      color: #53fc18 !important;
    }
    .ukick-round-toggle {
      width: 26px; height: 26px; border-radius: 9999px;
      display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(20, 22, 26, 0.95);
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .ukick-round-toggle:hover {
      background: rgba(255, 255, 255, 0.18) !important;
      border-color: rgba(255, 255, 255, 0.65) !important;
      color: #ffffff !important;
    }
    .ukick-round-toggle.ukick-active {
      color: #53fc18;
      border-color: rgba(83, 252, 24, 0.6);
      background: rgba(83, 252, 24, 0.15);
    }
    .ukick-round-toggle.ukick-active:hover {
      background: rgba(83, 252, 24, 0.3) !important;
      border-color: rgba(83, 252, 24, 0.85) !important;
      color: #53fc18 !important;
    }
    html.ukick-hide-block-buttons .ukick-x-btn {
      display: none !important;
    }
    html.ukick-buttons-hover .ukick-x-btn {
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, visibility 0.15s;
    }
    html.ukick-buttons-hover [class*="group/card"]:hover .ukick-x-btn,
    html.ukick-buttons-hover div[data-testid="channel-results-card"]:hover .ukick-x-btn,
    html.ukick-buttons-hover a.focusable-leaf:hover .ukick-x-btn,
    html.ukick-buttons-hover [class~="group/tag"]:hover .ukick-x-btn,
    html.ukick-buttons-hover [data-testid^="sidebar-recommended-channel-"]:hover .ukick-x-btn,
    html.ukick-buttons-hover [data-index]:hover .ukick-x-btn {
      opacity: 1;
      visibility: visible;
    }

    html.ukick-buttons-hover .ukick-btn-channel,
    html.ukick-buttons-hover .category-page-block-btn {
      opacity: 1;
      visibility: visible;
    }

    html.ukick-buttons-hover .ukick-btn-chat {
      width: 0;
      margin-left: 0;
      overflow: hidden;
    }
    html.ukick-buttons-hover [data-index]:hover .ukick-btn-chat {
      width: 16px;
      margin-left: 6px;
    }

    @media (hover: none) {
      html.ukick-buttons-hover .ukick-x-btn {
        opacity: 1;
        visibility: visible;
      }
      html.ukick-buttons-hover .ukick-btn-chat {
        width: 16px;
        margin-left: 6px;
      }
    }
    div[data-testid="channel-results-card"] > .ukick-x-btn {
      position: static;
      top: auto;
      right: auto;
    }
  `;
  document.head.appendChild(style);
}
