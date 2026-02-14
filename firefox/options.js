function normalize(str) {
  return str.trim().toLowerCase();
}

function createListItem(name, onRemove) {
  const li = document.createElement("li");
  li.textContent = name;

  const btn = document.createElement("button");
  btn.textContent = "X";
  btn.className = "delete-btn";
  btn.onclick = () => onRemove(name);

  li.appendChild(btn);
  return li;
}

async function loadBlockedChannels() {
  const data = await browser.storage.local.get(["blockedChannels"]);
  const channels = JSON.parse(data.blockedChannels || "[]");

  const channelList = document.getElementById("channelList");
  const channelTitle = document.getElementById("channelTitle");

  const titleBase = browser.i18n.getMessage("options_blocked_channels");
  channelTitle.textContent = `${titleBase} (${channels.length})`;
  channelList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  channels.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = channels.filter((c) => c !== toRemove);
      await browser.storage.local.set({
        blockedChannels: JSON.stringify(filtered),
      });
      loadBlockedChannels();
    });
    fragment.appendChild(li);
  });
  channelList.appendChild(fragment);
}

async function loadBlockedCategories() {
  const data = await browser.storage.local.get(["blockedCategories"]);
  const categories = JSON.parse(data.blockedCategories || "[]");

  const categoryList = document.getElementById("categoryList");
  const categoryTitle = document.getElementById("categoryTitle");

  const titleBase = browser.i18n.getMessage("options_blocked_categories");
  categoryTitle.textContent = `${titleBase} (${categories.length})`;
  categoryList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  categories.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = categories.filter((c) => c !== toRemove);
      await browser.storage.local.set({
        blockedCategories: JSON.stringify(filtered),
      });
      loadBlockedCategories();
    });
    fragment.appendChild(li);
  });
  categoryList.appendChild(fragment);
}

async function loadBlockedTags() {
  const data = await browser.storage.local.get(["blockedTags"]);
  const tags = JSON.parse(data.blockedTags || "[]");

  const tagList = document.getElementById("tagList");
  const tagTitle = document.getElementById("tagTitle");

  const titleBase = browser.i18n.getMessage("options_blocked_tags") || "Blocked Tags";
  tagTitle.textContent = `${titleBase} (${tags.length})`;

  tagList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  tags.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = tags.filter((t) => t !== toRemove);
      await browser.storage.local.set({
        blockedTags: JSON.stringify(filtered),
      });
      loadBlockedTags();
    });
    fragment.appendChild(li);
  });
  tagList.appendChild(fragment);
}

async function addItem(storageKey, inputId) {
  const input = document.getElementById(inputId);
  const newItem = input.value.trim();
  if (!newItem) return;

  const data = await browser.storage.local.get([storageKey]);
  const list = JSON.parse(data[storageKey] || "[]");

  if (list.some((item) => normalize(item) === normalize(newItem))) {
    alert("Item already exists.");
    input.value = "";
    return;
  }

  list.push(newItem);
  await browser.storage.local.set({ [storageKey]: JSON.stringify(list) });
  input.value = "";

  switch (storageKey) {
    case "blockedChannels":
      loadBlockedChannels();
      break;
    case "blockedCategories":
      loadBlockedCategories();
      break;
    case "blockedTags":
      loadBlockedTags();
      break;
  }
}

async function exportList(storageKey) {
  const data = await browser.storage.local.get([storageKey]);
  const list = JSON.parse(data[storageKey] || "[]");

  const blob = new Blob([JSON.stringify(list, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${storageKey}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importList(storageKey) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importedList = JSON.parse(text);
      if (!Array.isArray(importedList)) throw new Error("Invalid format");

      const data = await browser.storage.local.get([storageKey]);
      const currentList = JSON.parse(data[storageKey] || "[]");
      const merged = [...new Set([...currentList, ...importedList])];
      await browser.storage.local.set({ [storageKey]: JSON.stringify(merged) });

      if (storageKey === "blockedChannels") {
        loadBlockedChannels();
      }
      else if (storageKey === "blockedCategories") {
        loadBlockedCategories();
      }
      else {
        loadBlockedTags();
      }

      alert("Import successful!");
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  input.click();
}

async function clearList(storageKey) {
  if (confirm(`Are you sure you want to clear all items in ${storageKey}?`)) {
    await browser.storage.local.set({ [storageKey]: "[]" });
    if (storageKey === "blockedChannels") {
      loadBlockedChannels();
    }
    else if (storageKey === "blockedCategories") {
      loadBlockedCategories();
    }
    else {
      loadBlockedTags();
    }
  }
}

function toggleChannelsSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("channelsControls").style.display = display;
  document.getElementById("channelList").style.display = display;
  document.getElementById("channelInput").style.display = display;
  document.getElementById("addChannelBtn").style.display = display;
  document.getElementById("showChannelsBtn").style.display = show ? "none" : "inline-block";
  if (show) loadBlockedChannels();
}

function toggleCategoriesSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("categoriesControls").style.display = display;
  document.getElementById("categoryList").style.display = display;
  document.getElementById("categoryInput").style.display = display;
  document.getElementById("addCategoryBtn").style.display = display;
  document.getElementById("showCategoriesBtn").style.display = show ? "none" : "inline-block";
  if (show) loadBlockedCategories();
}

function toggleTagsSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("tagsControls").style.display = display;
  document.getElementById("tagList").style.display = display;
  document.getElementById("tagInput").style.display = display;
  document.getElementById("addTagBtn").style.display = display;
  document.getElementById("showTagsBtn").style.display = show ? "none" : "inline-block";
  if (show) loadBlockedTags();
}

function setupEventListeners() {
  const translations = {
    channelTitle: browser.i18n.getMessage("options_blocked_channels"),
    categoryTitle: browser.i18n.getMessage("options_blocked_categories"),
    tagTitle: browser.i18n.getMessage("options_blocked_tags"),

    showChannelsBtn: browser.i18n.getMessage("options_show"),
    showCategoriesBtn: browser.i18n.getMessage("options_show"),
    showTagsBtn: browser.i18n.getMessage("options_show"),

    exportChannelsBtn: browser.i18n.getMessage("options_export"),
    importChannelsBtn: browser.i18n.getMessage("options_import"),
    clearChannelsBtn: browser.i18n.getMessage("options_clear_all"),
    refreshChannelsBtn: browser.i18n.getMessage("options_refresh"),
    addChannelBtn: browser.i18n.getMessage("options_add_channel"),

    exportCategoriesBtn: browser.i18n.getMessage("options_export"),
    importCategoriesBtn: browser.i18n.getMessage("options_import"),
    clearCategoriesBtn: browser.i18n.getMessage("options_clear_all"),
    refreshCategoriesBtn: browser.i18n.getMessage("options_refresh"),
    addCategoryBtn: browser.i18n.getMessage("options_add_category"),

    exportTagsBtn: browser.i18n.getMessage("options_export"),
    importTagsBtn: browser.i18n.getMessage("options_import"),
    clearTagsBtn: browser.i18n.getMessage("options_clear_all"),
    refreshTagsBtn: browser.i18n.getMessage("options_refresh"),
    addTagBtn: browser.i18n.getMessage("options_add_tags"),

    customizationTitle: browser.i18n.getMessage("options_customization"),
    disableSearchHistoryLabel: browser.i18n.getMessage("options_disable_search_history"),
    disableChatBlockingLabel: browser.i18n.getMessage("options_disable_chat_blocking"),
    disableBlockButtonsLabel: browser.i18n.getMessage("options_hide_block_buttons"),
    enableDanmakuLabel: browser.i18n.getMessage("options_enable_danmaku_chat"),
    disableActiveUsersLabel: browser.i18n.getMessage("options_disable_active_users")
  };

  for (const [id, text] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el && text) {
      const bold = el.querySelector("b");
      if (bold) bold.textContent = text;
      else el.textContent = text;
    }
  }

  document
    .getElementById("showChannelsBtn")
    .addEventListener("click", () => toggleChannelsSection(true));
  document
    .getElementById("showCategoriesBtn")
    .addEventListener("click", () => toggleCategoriesSection(true));

  document
    .getElementById("addChannelBtn")
    .addEventListener("click", () =>
      addItem("blockedChannels", "channelInput")
    );
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", () =>
      addItem("blockedCategories", "categoryInput")
    );

  document
    .getElementById("exportChannelsBtn")
    .addEventListener("click", () => exportList("blockedChannels"));
  document
    .getElementById("exportCategoriesBtn")
    .addEventListener("click", () => exportList("blockedCategories"));

  document
    .getElementById("importChannelsBtn")
    .addEventListener("click", () => importList("blockedChannels"));
  document
    .getElementById("importCategoriesBtn")
    .addEventListener("click", () => importList("blockedCategories"));

  document
    .getElementById("clearChannelsBtn")
    .addEventListener("click", () => clearList("blockedChannels"));
  document
    .getElementById("clearCategoriesBtn")
    .addEventListener("click", () => clearList("blockedCategories"));

  document
    .getElementById("refreshChannelsBtn")
    .addEventListener("click", () => loadBlockedChannels());
  document
    .getElementById("refreshCategoriesBtn")
    .addEventListener("click", () => loadBlockedCategories());

  document.getElementById("showTagsBtn").addEventListener("click", () => toggleTagsSection(true));

  document.getElementById("addTagBtn").addEventListener("click", () =>
    addItem("blockedTags", "tagInput")
  );

  document.getElementById("exportTagsBtn").addEventListener("click", () =>
    exportList("blockedTags")
  );

  document.getElementById("importTagsBtn").addEventListener("click", () =>
    importList("blockedTags")
  );

  document.getElementById("clearTagsBtn").addEventListener("click", () =>
    clearList("blockedTags")
  );

  document.getElementById("refreshTagsBtn").addEventListener("click", () =>
    loadBlockedTags()
  );
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();

  const disableSearchHistoryToggle = document.getElementById(
    "disableSearchHistoryToggle"
  );

  if (disableSearchHistoryToggle) {
    browser.storage.local.get(
      ["disableSearchHistory"],
      ({ disableSearchHistory = false }) => {
        disableSearchHistoryToggle.checked = disableSearchHistory;
      }
    );

    disableSearchHistoryToggle.addEventListener("change", async () => {
      await browser.storage.local.set({
        disableSearchHistory: disableSearchHistoryToggle.checked,
      });
    });
  }

  const disableChatBlockingToggle = document.getElementById(
    "disableChatBlockingToggle"
  );

  if (disableChatBlockingToggle) {
    browser.storage.local.get(
      ["disableChatBlocking"],
      ({ disableChatBlocking = false }) => {
        disableChatBlockingToggle.checked = disableChatBlocking;
      }
    );

    disableChatBlockingToggle.addEventListener("change", async () => {
      await browser.storage.local.set({
        disableChatBlocking: disableChatBlockingToggle.checked,
      });
    });
  }

  const disableBlockButtonsToggle = document.getElementById(
    "disableBlockButtonsToggle"
  );

  if (disableBlockButtonsToggle) {
    browser.storage.local.get(
      ["disableBlockButtons"],
      ({ disableBlockButtons = false }) => {
        disableBlockButtonsToggle.checked = disableBlockButtons;
      }
    );

    disableBlockButtonsToggle.addEventListener("change", async () => {
      await browser.storage.local.set({
        disableBlockButtons: disableBlockButtonsToggle.checked,
      });
    });
  }

  const enableDanmakuToggle = document.getElementById(
    "enableDanmakuToggle"
  );

  if (enableDanmakuToggle) {
    browser.storage.local.get(
      ["enableDanmaku"],
      ({ enableDanmaku = false }) => {
        enableDanmakuToggle.checked = enableDanmaku;
      }
    );

    enableDanmakuToggle.addEventListener("change", async () => {
      await browser.storage.local.set({
        enableDanmaku: enableDanmakuToggle.checked,
      });
    });
  }

  const disableActiveUsersToggle = document.getElementById("disableActiveUsersToggle");

  if (disableActiveUsersToggle) {
    browser.storage.local.get(["disableActiveUsers"], ({ disableActiveUsers = false }) => {
      disableActiveUsersToggle.checked = disableActiveUsers;
    });
    disableActiveUsersToggle.addEventListener("change", async () => {
      await browser.storage.local.set({ disableActiveUsers: disableActiveUsersToggle.checked });
    });
  }
});
