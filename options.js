function normalize(str) {
  return str.trim().toLowerCase();
}

function createListItem(name, onRemove) {
  const li = document.createElement("li");
  li.textContent = name;

  const btn = document.createElement("button");
  btn.textContent = "❌";
  btn.className = "delete-btn";
  btn.onclick = () => onRemove(name);

  li.appendChild(btn);
  return li;
}

async function loadBlockedChannels() {
  const data = await chrome.storage.local.get(["blockedChannels"]);
  const channels = JSON.parse(data.blockedChannels || "[]");

  const channelList = document.getElementById("channelList");
  const channelTitle = document.getElementById("channelTitle");

  channelTitle.textContent = `Blocked Channels (${channels.length})`;
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

  categoryTitle.textContent = `Blocked Categories (${categories.length})`;
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

  if (storageKey === "blockedChannels") {
    loadBlockedChannels();
  } else {
    loadBlockedCategories();
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
      } else {
        loadBlockedCategories();
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
    } else {
      loadBlockedCategories();
    }
  }
}

function toggleChannelsSection(show) {
  document.getElementById("channelsControls").style.display = show
    ? "block"
    : "none";
  document.getElementById("channelList").style.display = show
    ? "block"
    : "none";
  document.getElementById("showChannelsBtn").style.display = show
    ? "none"
    : "inline-block";
  if (show) loadBlockedChannels();
}

function toggleCategoriesSection(show) {
  document.getElementById("categoriesControls").style.display = show
    ? "block"
    : "none";
  document.getElementById("categoryList").style.display = show
    ? "block"
    : "none";
  document.getElementById("showCategoriesBtn").style.display = show
    ? "none"
    : "inline-block";
  if (show) loadBlockedCategories();
}

function setupEventListeners() {
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
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});
