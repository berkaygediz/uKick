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

const SUGGESTIONS_DATA = {
  blockedCategories: [
    "slots & casino",
    "knight online",
    "celebrity slot machine",
    "the four kings casino and slots",
    "tasty slot machine",
  ],
  blockedTags: ["slot", "knight", "knightonline"],
};

async function addSuggestedItem(storageKey, item) {
  const data = await chrome.storage.local.get([storageKey]);
  const list = JSON.parse(data[storageKey] || "[]");

  if (list.some((i) => normalize(i) === normalize(item))) {
    return;
  }

  list.push(item);
  await chrome.storage.local.set({ [storageKey]: JSON.stringify(list) });

  if (storageKey === "blockedCategories") loadBlockedCategories();
  if (storageKey === "blockedTags") loadBlockedTags();
}

function renderSuggestions(containerId, storageKey, currentList) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const suggestedItems = SUGGESTIONS_DATA[storageKey] || [];

  const itemsToRender = suggestedItems.filter(
    (s) => !currentList.some((c) => normalize(c) === normalize(s)),
  );

  if (itemsToRender.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "block";

  const suggestionsText =
    chrome.i18n.getMessage("options_suggestions") || "SUGGESTIONS:";

  let html = `<div style="font-size: 13px; color: #b2ff59; margin-bottom: 5px; margin-top: 10px; font-weight: bold;">${suggestionsText}</div>`;
  html += `<div class="btn-group" style="flex-wrap: wrap;">`;

  itemsToRender.forEach((item) => {
    html += `<button class="suggestion-btn" data-key="${storageKey}" data-value="${item}">${item}</button>`;
  });

  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll(".suggestion-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addSuggestedItem(btn.dataset.key, btn.dataset.value);
    });
  });
}

async function loadBlockedChannels() {
  const data = await chrome.storage.local.get(["blockedChannels"]);
  const channels = JSON.parse(data.blockedChannels || "[]");

  const channelList = document.getElementById("channelList");
  const channelTitle = document.getElementById("channelTitle");

  const titleBase = chrome.i18n.getMessage("options_blocked_channels");
  channelTitle.textContent = `${titleBase} (${channels.length})`;
  channelList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  channels.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = channels.filter((c) => c !== toRemove);
      await chrome.storage.local.set({
        blockedChannels: JSON.stringify(filtered),
      });
      loadBlockedChannels();
    });
    fragment.appendChild(li);
  });
  channelList.appendChild(fragment);
}

async function loadBlockedCategories() {
  const data = await chrome.storage.local.get(["blockedCategories"]);
  const categories = JSON.parse(data.blockedCategories || "[]");

  const categoryList = document.getElementById("categoryList");
  const categoryTitle = document.getElementById("categoryTitle");

  const titleBase = chrome.i18n.getMessage("options_blocked_categories");
  categoryTitle.textContent = `${titleBase} (${categories.length})`;
  categoryList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  categories.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = categories.filter((c) => c !== toRemove);
      await chrome.storage.local.set({
        blockedCategories: JSON.stringify(filtered),
      });
      loadBlockedCategories();
    });
    fragment.appendChild(li);
  });
  categoryList.appendChild(fragment);
  renderSuggestions("categorySuggestions", "blockedCategories", categories);
}

async function loadBlockedTags() {
  const data = await chrome.storage.local.get(["blockedTags"]);
  const tags = JSON.parse(data.blockedTags || "[]");

  const tagList = document.getElementById("tagList");
  const tagTitle = document.getElementById("tagTitle");

  const titleBase =
    chrome.i18n.getMessage("options_blocked_tags") || "Blocked Tags";
  tagTitle.textContent = `${titleBase} (${tags.length})`;

  tagList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  tags.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = tags.filter((t) => t !== toRemove);
      await chrome.storage.local.set({
        blockedTags: JSON.stringify(filtered),
      });
      loadBlockedTags();
    });
    fragment.appendChild(li);
  });
  tagList.appendChild(fragment);
  renderSuggestions("tagSuggestions", "blockedTags", tags);
}

async function addItem(storageKey, inputId) {
  const input = document.getElementById(inputId);
  const newItem = input.value.trim();
  if (!newItem) return;

  const data = await chrome.storage.local.get([storageKey]);
  const list = JSON.parse(data[storageKey] || "[]");

  if (list.some((item) => normalize(item) === normalize(newItem))) {
    alert("Item already exists.");
    input.value = "";
    return;
  }

  list.push(newItem);
  await chrome.storage.local.set({ [storageKey]: JSON.stringify(list) });
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
  const data = await chrome.storage.local.get([storageKey]);
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

      const data = await chrome.storage.local.get([storageKey]);
      const currentList = JSON.parse(data[storageKey] || "[]");
      const merged = [...new Set([...currentList, ...importedList])];
      await chrome.storage.local.set({ [storageKey]: JSON.stringify(merged) });

      if (storageKey === "blockedChannels") {
        loadBlockedChannels();
      } else if (storageKey === "blockedCategories") {
        loadBlockedCategories();
      } else {
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
    await chrome.storage.local.set({ [storageKey]: "[]" });
    if (storageKey === "blockedChannels") {
      loadBlockedChannels();
    } else if (storageKey === "blockedCategories") {
      loadBlockedCategories();
    } else {
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
  document.getElementById("showChannelsBtn").style.display = show
    ? "none"
    : "inline-block";
  if (show) loadBlockedChannels();
}

function toggleCategoriesSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("categoriesControls").style.display = display;
  document.getElementById("categoryList").style.display = display;
  document.getElementById("categoryInput").style.display = display;
  document.getElementById("addCategoryBtn").style.display = display;
  document.getElementById("showCategoriesBtn").style.display = show
    ? "none"
    : "inline-block";

  const suggestionsDiv = document.getElementById("categorySuggestions");
  if (suggestionsDiv) suggestionsDiv.style.display = show ? "block" : "none";

  if (show) loadBlockedCategories();
}

function toggleTagsSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("tagsControls").style.display = display;
  document.getElementById("tagList").style.display = display;
  document.getElementById("tagInput").style.display = display;
  document.getElementById("addTagBtn").style.display = display;
  document.getElementById("showTagsBtn").style.display = show
    ? "none"
    : "inline-block";

  const suggestionsDiv = document.getElementById("tagSuggestions");
  if (suggestionsDiv) suggestionsDiv.style.display = show ? "block" : "none";

  if (show) loadBlockedTags();
}

function i18n(key, substitutions) {
  if (typeof chrome !== "undefined" && chrome.i18n)
    return chrome.i18n.getMessage(key, substitutions) || key;
  return key;
}

async function checkAndRequestPermission(permissionObj) {
  if (await chrome.permissions.contains(permissionObj)) {
    return true;
  }
  try {
    return await chrome.permissions.request(permissionObj);
  } catch (e) {
    console.error("Permission request failed", e);
    return false;
  }
}

async function setupFeatureToggle(toggleId, contentId, permissionObj) {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  if (!toggle) return;

  const hasPermission = await chrome.permissions.contains(permissionObj);
  const storedPref = (await chrome.storage.local.get(toggleId))[toggleId];

  if (hasPermission && storedPref === undefined) {
    await chrome.storage.local.set({ [toggleId]: true });
  }

  let isEnabled = storedPref && hasPermission;

  if (!hasPermission && storedPref) {
    isEnabled = false;
  }

  toggle.checked = isEnabled;

  if (content) {
    if (isEnabled) {
      content.classList.remove("section-content-disabled");
    } else {
      content.classList.add("section-content-disabled");
    }
  }

  toggle.addEventListener("change", async () => {
    if (toggle.checked) {
      const granted = await checkAndRequestPermission(permissionObj);
      if (granted) {
        await chrome.storage.local.set({ [toggleId]: true });
        if (content) content.classList.remove("section-content-disabled");
      } else {
        toggle.checked = false;
        if (content) content.classList.add("section-content-disabled");
        alert("Permission denied. Feature cannot be enabled.");
      }
    } else {
      await chrome.storage.local.set({ [toggleId]: false });
      if (content) content.classList.add("section-content-disabled");
    }
  });
}

const openSvg = `<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
const syncSvg = `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`;
const removeSvg = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

function timeAgo(timestamp) {
  if (!timestamp) return i18n("time_never");
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n("time_just_now");
  if (mins < 60) return i18n("time_minutes_ago", [mins]);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return i18n("time_hours_ago", [hours]);
  const days = Math.floor(hours / 24);
  return i18n("time_days_ago", [days]);
}

function renderSubscriptions() {
  chrome.storage.local.get(
    ["remoteSubscriptions", "syncIntervalMinutes"],
    (result) => {
      const subs = result.remoteSubscriptions || [];
      const syncIntervalSelect = document.getElementById("syncIntervalSelect");
      if (
        result.syncIntervalMinutes !== undefined &&
        result.syncIntervalMinutes !== null
      )
        syncIntervalSelect.value = result.syncIntervalMinutes;

      const subListEl = document.getElementById("subList");
      if (!subListEl) return;

      subListEl.innerHTML = "";
      const fragment = document.createDocumentFragment();

      subs.forEach((sub) => {
        const li = document.createElement("li");
        const info = document.createElement("div");
        info.className = "sub-info";
        const urlSpan = document.createElement("span");
        urlSpan.className = "sub-url";
        urlSpan.textContent = sub.url;
        urlSpan.title = sub.url;
        const metaRow = document.createElement("div");
        metaRow.className = "sub-meta";
        metaRow.innerHTML = `<span>${i18n("meta_updated")} ${timeAgo(sub.lastSync)}</span><span>${i18n("meta_items")} ${sub.count || 0}</span>`;
        info.appendChild(urlSpan);
        info.appendChild(metaRow);

        const badge = document.createElement("span");
        badge.className = "sub-badge";
        badge.textContent = sub.type; // channels, categories, tags

        const actions = document.createElement("div");
        actions.className = "sub-actions";

        const openBtn = document.createElement("button");
        openBtn.innerHTML = openSvg;
        openBtn.title = i18n("btn_open_url");
        openBtn.onclick = () => window.open(sub.url, "_blank");

        const syncBtn = document.createElement("button");
        syncBtn.innerHTML = syncSvg;
        syncBtn.title = i18n("btn_update_now");
        syncBtn.onclick = async () => {
          syncBtn.style.color = "#00b660";
          chrome.runtime.sendMessage(
            { action: "syncUrl", url: sub.url },
            (res) => {
              syncBtn.style.color = res?.success ? "#8bc34a" : "#d9534f";
              renderSubscriptions();
            },
          );
        };

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = removeSvg;
        removeBtn.title = i18n("btn_remove");
        removeBtn.onclick = async () => {
          const updatedSubs = subs.filter((s) => s.url !== sub.url);
          await chrome.storage.local.set({ remoteSubscriptions: updatedSubs });
          renderSubscriptions();
        };

        actions.appendChild(openBtn);
        actions.appendChild(syncBtn);
        actions.appendChild(removeBtn);

        li.appendChild(info);
        li.appendChild(badge);
        li.appendChild(actions);
        fragment.appendChild(li);
      });
      subListEl.appendChild(fragment);
    },
  );
}

function setupSubscriptionEvents() {
  const subUrlInput = document.getElementById("subUrlInput");
  const subTypeSelect = document.getElementById("subTypeSelect");
  const syncIntervalSelect = document.getElementById("syncIntervalSelect");
  const addSubBtn = document.getElementById("addSubBtn");
  const updateAllBtn = document.getElementById("updateAllBtn");

  if (!addSubBtn) return;

  addSubBtn.addEventListener("click", async () => {
    const url = subUrlInput.value.trim();
    const type = subTypeSelect.value;
    if (!url) return;

    try {
      const urlObj = new URL(url);
      const hasPermission = await chrome.permissions.contains({
        origins: [`${urlObj.origin}/*`],
      });
      if (!hasPermission) {
        const granted = await chrome.permissions.request({
          origins: [`${urlObj.origin}/*`],
        });
        if (!granted) {
          alert(i18n("alert_permission_denied"));
          return;
        }
      }
    } catch (err) {
      alert(i18n("alert_invalid_url"));
      return;
    }

    const { remoteSubscriptions } = await chrome.storage.local.get(
      "remoteSubscriptions",
    );
    const subs = remoteSubscriptions || [];
    if (subs.some((s) => s.url === url)) {
      alert(i18n("alert_duplicate_url"));
      return;
    }

    subs.push({ url, type, lastSync: 0, count: 0, data: [] });
    await chrome.storage.local.set({ remoteSubscriptions: subs });
    subUrlInput.value = "";
    renderSubscriptions();
    chrome.runtime.sendMessage({ action: "syncUrl", url }, () =>
      renderSubscriptions(),
    );
  });

  syncIntervalSelect.addEventListener("change", async () => {
    const interval = parseFloat(syncIntervalSelect.value);
    await chrome.storage.local.set({ syncIntervalMinutes: interval });
    chrome.runtime.sendMessage({
      action: "setSyncInterval",
      intervalMinutes: interval,
    });
  });

  updateAllBtn.addEventListener("click", async () => {
    updateAllBtn.disabled = true;
    updateAllBtn.innerHTML = `<b>${i18n("options_sub_updating")}</b>`;
    chrome.runtime.sendMessage({ action: "syncAll" }, (res) => {
      updateAllBtn.disabled = false;
      updateAllBtn.innerHTML = `<b style="color: #000000">${i18n("options_sub_update_all")}</b>`;
      renderSubscriptions();
    });
  });
}

function setupIntegrations() {
  const headers = document.querySelectorAll(".int-group-header");
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      const isActive = header.classList.contains("active");
      header.classList.toggle("active", !isActive);
      content.style.display = isActive ? "none" : "block";
    });
  });

  function buildPayload(appName, action) {
    let source = {},
      options = {};
    if (appName === "SolidWriting") {
      if (action === "documentize") source = { type: "text", content: "test" };
      else source = { type: "details", content: { id: "1", title: "test" } };
    } else if (appName === "SolidSheets") {
      if (action === "import_table") source = { type: "csv", content: "a,b,c" };
      else source = { type: "list", content: ["u1", "u2"] };
    }
    return { app: appName, action, source, options };
  }

  document.querySelectorAll(".int-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = btn.closest(".int-item");
      const appName = btn.getAttribute("data-app");
      const action = item.querySelector(".int-action-select")?.value || "test";
      const payload = buildPayload(appName, action);

      const runtime = typeof browser !== "undefined" ? browser : chrome;
      btn.style.background = "#555";

      runtime.runtime.sendNativeMessage(
        "com.openlapis.connect",
        payload,
        (response) => {
          const hasError =
            runtime.runtime.lastError || response?.status === "error";

          if (runtime.runtime.lastError) {
            console.error("OpenLapis Error:", runtime.runtime.lastError);
          } else {
            console.log("OpenLapis:", response);
          }

          btn.style.background = hasError ? "#d9534f" : "#00b660";
          setTimeout(() => {
            btn.style.background = "";
          }, 1500);
        },
      );
    });
  });
}

function setupEventListeners() {
  const translations = {
    channelTitle: chrome.i18n.getMessage("options_blocked_channels"),
    categoryTitle: chrome.i18n.getMessage("options_blocked_categories"),
    tagTitle: chrome.i18n.getMessage("options_blocked_tags"),

    showChannelsBtn: chrome.i18n.getMessage("options_show"),
    showCategoriesBtn: chrome.i18n.getMessage("options_show"),
    showTagsBtn: chrome.i18n.getMessage("options_show"),

    exportChannelsBtn: chrome.i18n.getMessage("options_export"),
    importChannelsBtn: chrome.i18n.getMessage("options_import"),
    clearChannelsBtn: chrome.i18n.getMessage("options_clear_all"),
    refreshChannelsBtn: chrome.i18n.getMessage("options_refresh"),
    addChannelBtn: chrome.i18n.getMessage("options_add_channel"),

    exportCategoriesBtn: chrome.i18n.getMessage("options_export"),
    importCategoriesBtn: chrome.i18n.getMessage("options_import"),
    clearCategoriesBtn: chrome.i18n.getMessage("options_clear_all"),
    refreshCategoriesBtn: chrome.i18n.getMessage("options_refresh"),
    addCategoryBtn: chrome.i18n.getMessage("options_add_category"),

    exportTagsBtn: chrome.i18n.getMessage("options_export"),
    importTagsBtn: chrome.i18n.getMessage("options_import"),
    clearTagsBtn: chrome.i18n.getMessage("options_clear_all"),
    refreshTagsBtn: chrome.i18n.getMessage("options_refresh"),
    addTagBtn: chrome.i18n.getMessage("options_add_tags"),

    customizationTitle: chrome.i18n.getMessage("options_customization"),
    disableSearchHistoryLabel: chrome.i18n.getMessage(
      "options_disable_search_history",
    ),
    enableChatBlockingLabel: chrome.i18n.getMessage(
      "options_enable_chat_blocking",
    ),
    disableBlockButtonsLabel: chrome.i18n.getMessage(
      "options_hide_block_buttons",
    ),
    enableDanmakuLabel: chrome.i18n.getMessage("options_enable_danmaku_chat"),
    disableActiveUsersLabel: chrome.i18n.getMessage(
      "options_disable_active_users",
    ),
    enableKeyboardVolumeLabel: chrome.i18n.getMessage(
      "options_enable_keyboard_volume",
    ),

    themesTitle: chrome.i18n.getMessage("options_themes"),
    subTitle: chrome.i18n.getMessage("options_subscriptions"),
    subUrlInput: chrome.i18n.getMessage("placeholder_remote_url"),
    addSubBtn: chrome.i18n.getMessage("options_sub_add"),
    updateAllBtn: chrome.i18n.getMessage("options_sub_update_all"),
    subIntervalLabel: chrome.i18n.getMessage("options_sub_interval"),

    options_integrations: chrome.i18n.getMessage("options_integrations"),
    int_openlapis_exp: chrome.i18n.getMessage("int_openlapis_exp"),
    int_config_title: chrome.i18n.getMessage("int_config_title"),
    int_config_desktop: chrome.i18n.getMessage("int_config_desktop"),
    int_config_desktop_li1: chrome.i18n.getMessage("int_config_desktop_li1"),
    int_config_desktop_li2: chrome.i18n.getMessage("int_config_desktop_li2"),
    int_config_mobile: chrome.i18n.getMessage("int_config_mobile"),
    int_config_mobile_p: chrome.i18n.getMessage("int_config_mobile_p"),
  };

  for (const [id, text] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el && text) {
      if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        if (el.tagName === "SELECT") {
          Array.from(el.options).forEach((opt) => {
            const optId = opt.id || opt.getAttribute("data-i18n-key");
            if (optId && translations[optId])
              opt.textContent = translations[optId];
          });
        } else {
          el.placeholder = text;
        }
      } else {
        const bold = el.querySelector("b");
        if (bold) bold.textContent = text;
        else el.textContent = text;
      }
    }
  }

  const subTypeSelect = document.getElementById("subTypeSelect");
  if (subTypeSelect) {
    subTypeSelect.options[0].textContent = i18n("options_sub_type_channels");
    subTypeSelect.options[1].textContent = i18n("options_sub_type_categories");
    subTypeSelect.options[2].textContent = i18n("options_sub_type_tags");
  }

  const syncIntervalSelect = document.getElementById("syncIntervalSelect");
  if (syncIntervalSelect) {
    const opts = syncIntervalSelect.options;
    opts[0].textContent = i18n("options_sub_6h");
    opts[1].textContent = i18n("options_sub_12h");
    opts[2].textContent = i18n("options_sub_1d");
    opts[3].textContent = i18n("options_sub_2d");
    opts[4].textContent = i18n("options_sub_1w");
    opts[5].textContent = i18n("options_sub_1m");
  }

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = i18n(key);
    if (text !== key) {
      if (el.tagName === "OPTION") el.textContent = text;
      else if (el.tagName === "BUTTON") {
        const bold = el.querySelector("b");
        if (bold) bold.textContent = text;
        else el.textContent = text;
      } else el.textContent = text;
    }
  });

  document
    .getElementById("showChannelsBtn")
    .addEventListener("click", () => toggleChannelsSection(true));
  document
    .getElementById("showCategoriesBtn")
    .addEventListener("click", () => toggleCategoriesSection(true));
  document
    .getElementById("addChannelBtn")
    .addEventListener("click", () =>
      addItem("blockedChannels", "channelInput"),
    );
  document
    .getElementById("addCategoryBtn")
    .addEventListener("click", () =>
      addItem("blockedCategories", "categoryInput"),
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
  document
    .getElementById("showTagsBtn")
    .addEventListener("click", () => toggleTagsSection(true));
  document
    .getElementById("addTagBtn")
    .addEventListener("click", () => addItem("blockedTags", "tagInput"));
  document
    .getElementById("exportTagsBtn")
    .addEventListener("click", () => exportList("blockedTags"));
  document
    .getElementById("importTagsBtn")
    .addEventListener("click", () => importList("blockedTags"));
  document
    .getElementById("clearTagsBtn")
    .addEventListener("click", () => clearList("blockedTags"));
  document
    .getElementById("refreshTagsBtn")
    .addEventListener("click", () => loadBlockedTags());
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();

  const themeOptions = document.querySelectorAll(".theme-option");
  const paletteToggle = document.getElementById("disableWebsitePaletteToggle");

  function updateThemeGridState(isEnabled) {
    themeOptions.forEach((opt) => {
      if (isEnabled) {
        opt.classList.remove("disabled");
      } else {
        opt.classList.add("disabled");
      }
    });
  }

  function setActiveTheme(themeId) {
    themeOptions.forEach((opt) => {
      if (opt.getAttribute("data-theme") === themeId) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
  }

  if (paletteToggle) {
    chrome.storage.local.get(
      ["disableWebsitePalette"],
      ({ disableWebsitePalette = true }) => {
        const isEnabled = !disableWebsitePalette;
        paletteToggle.checked = isEnabled;
        updateThemeGridState(isEnabled);
      },
    );

    paletteToggle.addEventListener("change", () => {
      const isEnabled = paletteToggle.checked;
      chrome.storage.local.set({ disableWebsitePalette: !isEnabled });
      updateThemeGridState(isEnabled);
    });
  }

  chrome.storage.local.get(
    ["themePalette"],
    ({ themePalette = "original" }) => {
      setActiveTheme(themePalette);
    },
  );

  themeOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      if (opt.classList.contains("disabled")) return;
      const selectedTheme = opt.getAttribute("data-theme");
      chrome.storage.local.set({ themePalette: selectedTheme });
      setActiveTheme(selectedTheme);
    });
  });

  const disableSearchHistoryToggle = document.getElementById(
    "disableSearchHistoryToggle",
  );

  if (disableSearchHistoryToggle) {
    chrome.storage.local.get(
      ["disableSearchHistory"],
      ({ disableSearchHistory = false }) => {
        disableSearchHistoryToggle.checked = disableSearchHistory;
      },
    );

    disableSearchHistoryToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({
        disableSearchHistory: disableSearchHistoryToggle.checked,
      });
    });
  }

  const enableChatBlockingToggle = document.getElementById(
    "enableChatBlockingToggle",
  );

  if (enableChatBlockingToggle) {
    chrome.storage.local.get(
      ["enableChatBlocking"],
      ({ enableChatBlocking = false }) => {
        enableChatBlockingToggle.checked = enableChatBlocking;
      },
    );

    enableChatBlockingToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({
        enableChatBlocking: enableChatBlockingToggle.checked,
      });
    });
  }

  const disableBlockButtonsToggle = document.getElementById(
    "disableBlockButtonsToggle",
  );

  if (disableBlockButtonsToggle) {
    chrome.storage.local.get(
      ["disableBlockButtons"],
      ({ disableBlockButtons = false }) => {
        disableBlockButtonsToggle.checked = disableBlockButtons;
      },
    );

    disableBlockButtonsToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({
        disableBlockButtons: disableBlockButtonsToggle.checked,
      });
    });
  }

  const enableDanmakuToggle = document.getElementById("enableDanmakuToggle");

  if (enableDanmakuToggle) {
    chrome.storage.local.get(["enableDanmaku"], ({ enableDanmaku = false }) => {
      enableDanmakuToggle.checked = enableDanmaku;
    });

    enableDanmakuToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({
        enableDanmaku: enableDanmakuToggle.checked,
      });
    });
  }

  const disableActiveUsersToggle = document.getElementById(
    "disableActiveUsersToggle",
  );

  if (disableActiveUsersToggle) {
    chrome.storage.local.get(
      ["disableActiveUsers"],
      ({ disableActiveUsers = false }) => {
        disableActiveUsersToggle.checked = disableActiveUsers;
      },
    );
    disableActiveUsersToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({
        disableActiveUsers: disableActiveUsersToggle.checked,
      });
    });
  }

  const enableKeyboardVolumeToggle = document.getElementById(
    "enableKeyboardVolumeToggle",
  );

  if (enableKeyboardVolumeToggle) {
    chrome.storage.local.get(
      ["enableKeyboardVolume"],
      ({ enableKeyboardVolume = false }) => {
        enableKeyboardVolumeToggle.checked = enableKeyboardVolume;
      },
    );
    enableKeyboardVolumeToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({
        enableKeyboardVolume: enableKeyboardVolumeToggle.checked,
      });
    });
  }

  setupFeatureToggle("enableSubscriptionsToggle", "subscriptionsContent", {
    permissions: ["alarms"],
  });

  setupFeatureToggle("enableIntegrationsToggle", "integrationsContent", {
    permissions: ["nativeMessaging"],
  });

  setupSubscriptionEvents();
  renderSubscriptions();

  setupIntegrations();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.remoteSubscriptions) {
      renderSubscriptions();
    }
  });
});
