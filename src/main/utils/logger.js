const log = require("electron-log");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

log.transports.file.fileName = "app.log";

try {
  const logPath = log.transports.file.getFile().path;

  fs.writeFileSync(logPath, "");
} catch (e) {
  // Bỏ qua lỗi nếu file chưa tồn tại (lần chạy đầu tiên)
  // console.error("Không thể làm sạch log cũ:", e);
}

if (app.isPackaged) {
  log.transports.console.level = false;
}

const IGNORED_KEYWORDS = [
  "[IDENTITY] Cache:",
  "Request Autofill.enable failed",
  "Request Autofill.setAddresses failed",
  "connect-tiktok failed",
  "ERROR:CONSOLE",
  "Switching to Scraper",
];

log.hooks.push((message, transport) => {
  if (transport !== log.transports.file) return message;

  const logContent = (message.data || []).map(String).join(" ");

  if (IGNORED_KEYWORDS.some((key) => logContent.includes(key))) {
    return false;
  }

  return message;
});

function info(...args) {
  log.info(...args);
}
function warn(...args) {
  log.warn(...args);
}
function err(...args) {
  log.error(...args);
}

function openLogFile() {
  const logPath = log.transports.file.getFile().path;
  const { shell } = require("electron");
  shell.showItemInFolder(logPath);
}

module.exports = { log: info, warn, err, openLogFile };
