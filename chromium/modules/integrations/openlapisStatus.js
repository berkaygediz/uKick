// uKick — OpenLapis Connect transport + status

const OPENLAPIS_HOST = "com.openlapis.connect";

function getRuntime() {
  return typeof browser !== "undefined" ? browser : chrome;
}

function rawSend(payload) {
  return new Promise((resolve) => {
    const runtime = getRuntime();
    runtime.runtime.sendNativeMessage(OPENLAPIS_HOST, payload, (response) => {
      const reached = !runtime.runtime.lastError;
      resolve({
        reached,
        response: reached ? response : null,
        error: reached ? null : runtime.runtime.lastError.message,
      });
    });
  });
}

export async function sendToOpenLapis(payload) {
  const res = await rawSend(payload);
  if (!res.reached) return { ok: false, error: res.error };
  return { ok: res.response?.status !== "error", data: res.response };
}

export async function getOpenLapisStatus() {
  const granted = await chrome.permissions.contains({
    permissions: ["nativeMessaging"],
  });
  if (!granted) return { connected: false, reason: "no-permission" };

  const res = await rawSend({ app: "openlapis", action: "ping" });
  return {
    connected: res.reached,
    reason: res.reached ? null : res.error,
    data: res.response,
  };
}
