const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  connectTikTok: (username, opts) =>
    ipcRenderer.invoke("connect-tiktok", username, opts),
  disconnectTikTok: () => ipcRenderer.invoke("disconnect-tiktok"),

  onRaw: (cb) => {
    ipcRenderer.on("tiktok-raw", (evt, data) => cb(data));
  },
  onError: (cb) => {
    ipcRenderer.on("tiktok-error", (evt, data) => cb(data));
  },
  onKeepalive: (cb) => {
    ipcRenderer.on("tiktok-keepalive", (evt, data) => cb(data));
  },
  onLiveEnded: (cb) => {
    ipcRenderer.on("tiktok-live-ended", (evt, data) => cb(data));
  },

  checkModLoginStatus: () => ipcRenderer.invoke("check-mod-login-status"),
  startModLogin: () => ipcRenderer.invoke("start-mod-login"),
  modLogout: () => ipcRenderer.invoke("mod-logout"),

  onModLoginSuccess: (cb) => {
    ipcRenderer.on("mod-login-success", (evt, data) => cb(data));
  },
  onModInfoFound: (cb) => {
    ipcRenderer.on("mod-info-found", (evt, data) => cb(data));
  },
  onHostInfoFound: (cb) => {
    ipcRenderer.on("host-info-found", (evt, nickname) => cb(nickname));
  },
  onCaptchaDetected: (cb) => {
    ipcRenderer.on("tiktok-captcha-detected", (evt, data) => cb(data));
  },

  sendTikTokComment: (content) =>
    ipcRenderer.invoke("send-tiktok-comment", content),
  openManualBrowser: () => ipcRenderer.invoke("open-manual-browser"),
  startFallbackScraper: () => ipcRenderer.invoke("start-fallback-scraper"),
  generateAiReply: (user, text) =>
    ipcRenderer.invoke("generate-ai-reply", { user, text }),
  toggleBrowserView: () => ipcRenderer.invoke("toggle-browser-view"),

  getSalesSettings: () => ipcRenderer.invoke("get-sales-settings"),
  updateSalesSettings: (config) =>
    ipcRenderer.invoke("update-sales-settings", config),
  openLogFolder: () => ipcRenderer.invoke("open-log-folder"),

  scanNewSelectors: () => ipcRenderer.invoke("scan-new-selectors"),
  getScrapConfig: () => ipcRenderer.invoke("get-scrap-config"),
  saveScrapConfig: (config) => ipcRenderer.invoke("save-scrap-config", config),

  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  onUpdateStatus: (cb) => {
    ipcRenderer.on("update-status", (evt, data) => cb(data));
  },
  getAiApiKey: () => ipcRenderer.invoke("get-ai-api-key"),
  saveAiApiKey: (key) => ipcRenderer.invoke("save-ai-api-key", key),
});
