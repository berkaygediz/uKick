// uKick — platform

const PLATFORM_HOSTS = {
  web: "kick.com",
  webos: "webos.kick.com",
  tizen: "tizen.kick.com",
};

const KNOWN_HOSTS = new Set([
  "kick.com",
  "www.kick.com",
  "webos.kick.com",
  "tizen.kick.com",
]);

export async function initPlatformRedirect() {
  const { enablePlatformRedirect = false, platformPreference = "web" } =
    await browser.storage.local.get([
      "enablePlatformRedirect",
      "platformPreference",
    ]);

  if (!enablePlatformRedirect) return false;

  const targetHost = PLATFORM_HOSTS[platformPreference];
  if (!targetHost) return false;

  const currentHost = location.hostname;
  if (!KNOWN_HOSTS.has(currentHost)) return false;

  const currentPlatform =
    currentHost === "webos.kick.com"
      ? "webos"
      : currentHost === "tizen.kick.com"
        ? "tizen"
        : "web"; // kick.com + www.kick.com
  if (currentPlatform === platformPreference) return false;

  location.replace(
    `https://${targetHost}${location.pathname}${location.search}${location.hash}`,
  );
  return true;
}
