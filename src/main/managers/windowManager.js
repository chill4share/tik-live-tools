const { BrowserWindow, app, dialog } = require("electron");
const path = require("path");
const { log, warn, err } = require("../utils/logger");
// Import để lấy nguồn hiện tại
const { getDataSource } = require("./stateManager");

let mainWindow = null;

function isDevMode() {
  return process.argv.includes("--dev") || !app.isPackaged;
}

function createMainWindow() {
  const isDev = isDevMode();
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: true,

    // [SỬA] Ẩn thanh menu mặc định của Windows để dùng menu custom của React
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // [SỬA] Đảm bảo tắt hẳn menu (ngăn phím Alt kích hoạt menu cũ)
  mainWindow.setMenu(null);

  if (isDev) {
    const url = "http://localhost:5173";
    mainWindow.loadURL(url).catch((e) => warn("loadURL error", e));
    try {
      mainWindow.webContents.openDevTools({ mode: "undocked" });
    } catch (e) {}
  } else {
    try {
      const indexPath = path.join(
        process.resourcesPath,
        "app",
        "dist",
        "index.html"
      );
      log("Loading packaged index at", indexPath);
      mainWindow.loadFile(indexPath).catch((e) => {
        warn("Primary loadFile failed, trying fallback", e);
        try {
          const alt = path.join(app.getAppPath(), "dist", "index.html");
          log("Trying fallback path:", alt);
          mainWindow.loadFile(alt).catch((e2) => {
            err("Failed to load packaged index.html (both paths):", alt, e2);
          });
        } catch (ex) {
          err("Fallback loadFile thrown", ex);
        }
      });
    } catch (e) {
      err("Exception when loading packaged UI", e);
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

// --- HÀM GỬI DỮ LIỆU CÓ KIỂM SOÁT ---
function forwardToRenderer(channel, data, sourceOrigin = null) {
  if (!mainWindow || !mainWindow.webContents) return;

  // Nếu là dữ liệu chat/comment, bắt buộc kiểm tra nguồn
  if (channel === "tiktok-raw" || channel === "tiktok-comment") {
    const currentSource = getDataSource();

    // Nếu dữ liệu có khai báo nguồn và nguồn đó KHÁC nguồn hiện tại -> CHẶN
    if (sourceOrigin && sourceOrigin !== currentSource) {
      // Ví dụ: Dữ liệu từ LIBRARY đến, nhưng hệ thống đang chạy SCRAPER -> Bỏ qua
      return;
    }
  }

  try {
    mainWindow.webContents.send(channel, data);
  } catch (e) {
    warn("forwardToRenderer failed", channel, e);
  }
}

function showMessageBox(type, title, message, detail) {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type,
      title,
      message,
      detail,
    });
  }
}

module.exports = {
  createMainWindow,
  getMainWindow,
  forwardToRenderer,
  showMessageBox,
};
