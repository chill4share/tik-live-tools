const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");
const { log, warn } = require("../utils/logger");
const {
  getMainWindow,
  forwardToRenderer,
} = require("../managers/windowManager");

autoUpdater.autoDownload = false;
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

function initUpdater() {
  autoUpdater.on("checking-for-update", () => {
    log("[Updater] Checking for update...");
    forwardToRenderer("update-status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    log(`[Updater] Update available: ${info.version}`);
    forwardToRenderer("update-status", {
      status: "available",
      version: info.version,
    });

    dialog
      .showMessageBox(getMainWindow(), {
        type: "info",
        title: "Cập nhật mới",
        message: `Tìm thấy phiên bản mới v${info.version}. Bạn có muốn tải về không?`,
        buttons: ["Tải ngay", "Để sau"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on("update-not-available", () => {
    log("[Updater] No update available.");
    forwardToRenderer("update-status", { status: "not-available" });
    dialog.showMessageBox(getMainWindow(), {
      type: "info",
      title: "Không có cập nhật",
      message: "Bạn đang dùng phiên bản mới nhất.",
    });
  });

  autoUpdater.on("error", (err) => {
    warn("[Updater] Error: " + err);
    forwardToRenderer("update-status", { status: "error", error: err.message });
    dialog.showErrorBox(
      "Lỗi cập nhật",
      err.message || "Không thể kiểm tra cập nhật"
    );
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent);
    log(`[Updater] Downloaded ${percent}%`);
    forwardToRenderer("update-status", {
      status: "downloading",
      percent: percent,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    log("[Updater] Update downloaded");
    forwardToRenderer("update-status", { status: "downloaded" });

    dialog
      .showMessageBox(getMainWindow(), {
        type: "question",
        title: "Cài đặt cập nhật",
        message: "Tải xong rồi! Khởi động lại để cài đặt ngay?",
        buttons: ["Khởi động lại", "Lát nữa"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });
}

function checkForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    warn("[Updater] Check failed: " + e.message);
  }
}

module.exports = { initUpdater, checkForUpdates };
