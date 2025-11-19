// src/main/ipcHandlers.js
const { ipcMain } = require("electron");
const keytar = require("keytar");
const tiktokService = require("./services/tiktokService");
const authService = require("./services/authService");
const browserService = require("./services/browserService");
const aiService = require("./services/aiService");
const { updateSalesConfig, getSalesConfig } = require("./utils/salesContext");
const { openLogFile } = require("./utils/logger");
const { getSelectors, saveScrapConfig } = require("./utils/scrapConfig");
const { initUpdater, checkForUpdates } = require("./services/updaterService");

const KEYTAR_SERVICE = "com.chill4share.tiktoklivetool";
const KEYTAR_AI_ACCOUNT = "gemini_api_key";

async function loadApiKeyOnStartup() {
  try {
    const storedKey = await keytar.getPassword(
      KEYTAR_SERVICE,
      KEYTAR_AI_ACCOUNT
    );
    if (storedKey) {
      // Cập nhật key vào AI Service ngay khi app khởi động
      aiService.updateApiKey(storedKey);
      console.log("[System] Đã tải API Key từ Keytar thành công.");
    } else {
      console.log("[System] Chưa có API Key nào được lưu.");
    }
  } catch (e) {
    console.error("Không thể tải API Key:", e);
  }
}

function registerHandlers() {
  // --- [FIX] GỌI 2 HÀM NÀY ĐỂ KÍCH HOẠT TÍNH NĂNG ---
  initUpdater(); // Kích hoạt lắng nghe sự kiện update
  loadApiKeyOnStartup(); // Tải API Key cũ lên
  // --------------------------------------------------

  ipcMain.handle("connect-tiktok", (ev, username, opts) =>
    tiktokService.connect(username, opts)
  );
  ipcMain.handle("disconnect-tiktok", () => tiktokService.disconnect());

  ipcMain.handle("check-mod-login-status", () =>
    authService.checkModLoginStatus()
  );
  ipcMain.handle("start-mod-login", () => authService.startModLogin());
  ipcMain.handle("mod-logout", async () => {
    await authService.modLogout();
    await browserService.cleanupBrowser();
    await browserService.deleteProfile();
    return { ok: true };
  });

  ipcMain.handle("open-manual-browser", () =>
    browserService.openManualBrowser()
  );
  ipcMain.handle("start-fallback-scraper", () =>
    browserService.startFallbackScraper()
  );
  ipcMain.handle("send-tiktok-comment", (ev, content) =>
    browserService.sendComment(content)
  );

  ipcMain.handle("generate-ai-reply", (ev, { user, text }) =>
    aiService.generateReply(user, text)
  );
  ipcMain.handle("update-sales-settings", (ev, config) => {
    updateSalesConfig(config);
    return { ok: true };
  });
  ipcMain.handle("get-sales-settings", (ev) => {
    return getSalesConfig();
  });
  ipcMain.handle("scan-new-selectors", async () => {
    return await browserService.scanAndUpdateSelectors();
  });

  ipcMain.handle("toggle-browser-view", () =>
    browserService.toggleBrowserVisibility()
  );
  ipcMain.handle("open-log-folder", () => {
    openLogFile();
    return { ok: true };
  });

  // HANDLERS MỚI CHO SCRAP CONFIG
  ipcMain.handle("get-scrap-config", () => {
    return getSelectors();
  });

  ipcMain.handle("save-scrap-config", async (event, newSelectors) => {
    saveScrapConfig(newSelectors);
    return { ok: true };
  });
  ipcMain.handle("check-for-update", () => {
    checkForUpdates();
    return { ok: true };
  });
  ipcMain.handle("get-ai-api-key", async () => {
    try {
      const key = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_AI_ACCOUNT);
      return key || "";
    } catch (e) {
      return "";
    }
  });

  ipcMain.handle("save-ai-api-key", async (ev, newKey) => {
    try {
      if (!newKey) {
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_AI_ACCOUNT);
      } else {
        await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_AI_ACCOUNT, newKey);
      }
      // Cập nhật ngay lập tức cho service đang chạy
      aiService.updateApiKey(newKey);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

module.exports = { registerHandlers };
