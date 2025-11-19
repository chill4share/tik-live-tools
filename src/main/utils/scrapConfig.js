// src/main/utils/scrapConfig.js
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { log, err } = require("./logger");

const CONFIG_FILENAME = "scrap_config.json";

// CẬP NHẬT: Selector chuẩn dựa trên file HTML bạn gửi
const DEFAULT_SELECTORS = {
  inputSelector: 'div[contenteditable="plaintext-only"]',
  sendBtnSelector: '[data-e2e="comment-icon"]',
  chatContainerSelector: ".webcast-chatroom-scroll-panel", // Fallback, scraper.js có logic tự tìm container

  // --- QUAN TRỌNG: Sửa dòng này ---
  chatItemSelector: '[data-e2e="chat-message"]',
  // --------------------------------

  userSelector: '[data-e2e="message-owner-name"]',
  textSelector: ".break-words.align-middle",
};

let currentSelectors = { ...DEFAULT_SELECTORS };

function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_FILENAME);
}

function loadScrapConfig() {
  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const saved = JSON.parse(raw);
      // Ưu tiên dùng config đã lưu, nhưng nếu thiếu key nào thì dùng default bù vào
      currentSelectors = { ...DEFAULT_SELECTORS, ...saved };

      // FIX NHANH: Nếu file lưu cũ vẫn đang dùng selector sai (.webcast...),
      // ta ép cập nhật lại selector đúng từ code mới.
      if (currentSelectors.chatItemSelector === ".webcast-chatroom-message") {
        currentSelectors.chatItemSelector = DEFAULT_SELECTORS.chatItemSelector;
      }

      log("[ScrapConfig] Đã tải cấu hình.");
    } else {
      saveScrapConfig(DEFAULT_SELECTORS);
    }
  } catch (e) {
    err("[ScrapConfig] Lỗi đọc config, dùng mặc định.", e);
    currentSelectors = { ...DEFAULT_SELECTORS };
  }
  return currentSelectors;
}

function saveScrapConfig(newSelectors) {
  try {
    const filePath = getConfigPath();
    const merged = { ...currentSelectors, ...newSelectors };
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf-8");
    currentSelectors = merged;
    log("[ScrapConfig] Đã lưu cấu hình selector mới.");
  } catch (e) {
    err("[ScrapConfig] Lỗi lưu file:", e);
  }
}

function getSelectors() {
  return currentSelectors;
}

loadScrapConfig();

module.exports = {
  getSelectors,
  saveScrapConfig,
  loadScrapConfig,
};
