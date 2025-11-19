const { app } = require("electron");
const { createMainWindow } = require("./managers/windowManager");
const { registerHandlers } = require("./ipcHandlers");
const { disconnect } = require("./services/tiktokService");
const { cleanupBrowser } = require("./services/browserService");
const { loadSalesConfig } = require("./utils/salesContext");

app.on("ready", () => {
  loadSalesConfig(); // Đọc file config từ ổ cứng (hoặc tạo mới)

  createMainWindow();
  registerHandlers();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (require("./managers/windowManager").getMainWindow() === null) {
    createMainWindow();
  }
});

process.on("exit", () => {
  disconnect();
  cleanupBrowser();
});

process.on("SIGINT", () => {
  process.exit();
});
