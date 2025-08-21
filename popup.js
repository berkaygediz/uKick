document.getElementById("openOptionsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const { blockedChannels, blockedCategories } = await chrome.storage.local.get(
    ["blockedChannels", "blockedCategories"]
  );

  const channels = JSON.parse(blockedChannels || "[]");
  const categories = JSON.parse(blockedCategories || "[]");

  document.getElementById("channelCount").textContent = channels.length;
  document.getElementById("categoryCount").textContent = categories.length;

  const enabled = (await chrome.storage.local.get("enabled")).enabled ?? true;
  const switchInput = document.getElementById("enableSwitch");
  switchInput.checked = enabled;

  switchInput.addEventListener("change", async () => {
    await chrome.storage.local.set({ enabled: switchInput.checked });
  });
});
