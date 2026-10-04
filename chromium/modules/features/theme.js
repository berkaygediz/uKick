// uKick — theme

export const themepalettes = {
  original: { bg: "#53fc18", text: "#000000" },
  purple: { bg: "#9333ea", text: "#ffffff" },
  red: { bg: "#ef4444", text: "#ffffff" },
  blue: { bg: "#3b82f6", text: "#ffffff" },
  orange: { bg: "#f97316", text: "#000000" },
  cyan: { bg: "#06b6d4", text: "#ffffff" },
  pink: { bg: "#ec4899", text: "#ffffff" },
  yellow: { bg: "#eab308", text: "#000000" },
  white: { bg: "#f5f5f5", text: "#000000" },
  magenta: { bg: "#d946ef", text: "#ffffff" },
  teal: { bg: "#14b8a6", text: "#000000" },
  indigo: { bg: "#6366f1", text: "#ffffff" },
  lime: { bg: "#a3e635", text: "#000000" },
  sky: { bg: "#38bdf8", text: "#000000" },
  coral: { bg: "#fb7185", text: "#000000" },
};

let paletteStyleTag = null,
  paletteObserver = null,
  isPaletteRunning = false;

function hexToHsl(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255,
    g = parseInt(result[2], 16) / 255,
    b = parseInt(result[3], 16) / 255;
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function getLogoFilter(targetHex) {
  const target = hexToHsl(targetHex);
  if (target.s < 15) return `grayscale(1) brightness(${target.l / 50})`;
  return `hue-rotate(${target.h - 101}deg) saturate(${target.s / 98}) brightness(${target.l / 54})`;
}

export function applyPaletteTheme(bgColor, textColor) {
  removePaletteTheme();

  if (
    bgColor === themepalettes.original.bg &&
    textColor === themepalettes.original.text
  )
    return;

  if (!bgColor || !textColor) return;
  const filter = getLogoFilter(bgColor);
  paletteStyleTag = document.createElement("style");
  paletteStyleTag.id = "kick-palette-style";
  paletteStyleTag.textContent = `
    /* TV (webos/tizen) navbar */
    .data-\\[active\\=true\\]\\:text-surface-fg-brand[data-active="true"] { color: ${bgColor} !important; }
    .data-\\[focused\\=true\\]\\:bg-brand-bg-default[data-focused="true"] { background-color: ${bgColor} !important; }
    .data-\\[focused\\=true\\]\\:text-brand-fg-default[data-focused="true"] { color: ${textColor} !important; }
    .\\[\\&\\[data-active\\=true\\]\\_svg\\]\\:fill-surface-fg-brand[data-active="true"] svg { fill: ${bgColor} !important; }
    .\\[\\&\\[data-focused\\=true\\]\\_svg\\]\\:fill-brand-fg-default[data-focused="true"] svg { fill: ${textColor} !important; }

    :root, body {
      --color-brand-bg-default: ${bgColor} !important;
      --color-brand-fg-default: ${textColor} !important;
      --color-surface-fg-brand: ${bgColor} !important;
      --color-kick-voltGreen-150: ${bgColor} !important;
      --color-media-fg-brand: ${bgColor} !important;
    }

    .text-primary-base, .text-green-500 { color: ${bgColor} !important; }
    .bg-primary-base, .bg-green-500 { background-color: ${bgColor} !important; }
    .border-green-500 { border-color: ${bgColor} !important; }
    [fill="url(#paint0_linear_614_6275)"] { fill: ${bgColor} !important; }
    .text-primary-onPrimary { color: ${textColor} !important; }

    .bg-brand-bg-default { background-color: ${bgColor} !important; }
    .text-brand-fg-default { color: ${textColor} !important; }
    .focus-visible\\:bg-kick-voltGreen-150:focus-visible { background-color: ${bgColor} !important; }

    .text-surface-fg-brand { color: ${bgColor} !important; }
    .border-surface-fg-brand { border-color: ${bgColor} !important; }
    .bg-surface-fg-brand { background-color: ${bgColor} !important; }

    .bg-kick-voltGreen-150 { background-color: ${bgColor} !important; }
    .border-kick-voltGreen-150 { border-color: ${bgColor} !important; }
    .text-kick-voltGreen-150 { color: ${bgColor} !important; }

    .ring-kick-voltGreen-150 { --tw-ring-color: ${bgColor} !important; }
    .ring-1.ring-kick-voltGreen-150 { box-shadow: 0 0 0 1px ${bgColor} !important; }

    .bg-kick-voltGreen-150.text-kick-asphaltBlack-900 { color: ${textColor} !important; }

    .border-brand-bg-default { border-color: ${bgColor} !important; }
    .text-brand-bg-default { color: ${bgColor} !important; }
    svg.text-brand-bg-default path { fill: ${bgColor} !important; }

    /* TV */
    .text-media-fg-brand { color: ${bgColor} !important; }

    img[src*="kick-logo"] { filter: ${filter} !important; }
  `;
  document.head.appendChild(paletteStyleTag);

  paletteObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (
          node.nodeType === 1 &&
          node.tagName === "IMG" &&
          node.src.includes("kick-logo")
        )
          node.style.filter = filter;
      }
    }
  });
  paletteObserver.observe(document.body, { childList: true, subtree: true });
}

function removePaletteTheme() {
  if (paletteStyleTag) {
    paletteStyleTag.remove();
    paletteStyleTag = null;
  }
  if (paletteObserver) {
    paletteObserver.disconnect();
    paletteObserver = null;
  }
}

export async function startWebsitePalette() {
  if (isPaletteRunning) return;
  isPaletteRunning = true;
  const { themePalette = "original" } =
    await chrome.storage.local.get("themePalette");
  const colors = themepalettes[themePalette] || themepalettes.original;
  applyPaletteTheme(colors.bg, colors.text);
}

export function stopWebsitePalette() {
  if (!isPaletteRunning) return;
  isPaletteRunning = false;
  removePaletteTheme();
}

export function setPaletteRunning(value) {
  isPaletteRunning = value;
}
