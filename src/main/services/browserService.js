const { addExtra } = require("puppeteer-extra");
const puppeteerCore = require("puppeteer-core");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { app } = require("electron");
const { log, warn, err } = require("../utils/logger");
const { getSelectors, saveScrapConfig } = require("../utils/scrapConfig");
const {
  getLiveHost,
  getLiveStatus,
  setDataSource,
  getDataSource,
  setLiveStatus,
} = require("../managers/stateManager");
const { getModSession, getModCredentials } = require("./authService");
const { forwardToRenderer } = require("../managers/windowManager");
const { injectChatScraper } = require("../scraper");

const puppeteer = addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

let browserInstance = null;
let isBrowserInitializing = false;
let isBrowserVisible = false;

const messageQueue = [];
let isProcessingQueue = false;

const TYPING_DELAY_MIN = 80;
const TYPING_DELAY_MAX = 250;
const COOLDOWN_MIN = 6000;
const COOLDOWN_MAX = 12000;

const PROFILE_DIR_NAME = "puppeteer_profile";

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findExecutablePath() {
  const platform = os.platform();
  if (platform !== "win32") return null;

  const commonPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(
      os.homedir(),
      "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
    ),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function cleanupBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      warn("[Puppeteer] Lỗi khi đóng trình duyệt cũ:", e.message);
    }
    browserInstance = null;
  }
}

async function deleteProfile() {
  const profilePath = path.join(app.getPath("userData"), PROFILE_DIR_NAME);
  if (fs.existsSync(profilePath)) {
    try {
      fs.rmSync(profilePath, { recursive: true, force: true });
      log("[System] Đã xóa profile trình duyệt.");
    } catch (e) {
      err("[System] Lỗi xóa profile:", e.message);
    }
  }
}

async function initBrowser() {
  if (browserInstance) return { ok: true };
  if (isBrowserInitializing) throw new Error("Trình duyệt đang khởi tạo...");

  isBrowserInitializing = true;

  const currentLiveHost = getLiveHost();
  const modCreds = getModCredentials();

  if (!modCreds) {
    isBrowserInitializing = false;
    throw new Error("Chưa đăng nhập Mod (Vui lòng đăng nhập trước).");
  }
  if (!currentLiveHost) {
    isBrowserInitializing = false;
    throw new Error("Chưa kết nối kênh (Vui lòng nhập ID kênh).");
  }

  const executablePath = findExecutablePath();
  if (!executablePath) {
    isBrowserInitializing = false;
    forwardToRenderer("tiktok-error", "Không tìm thấy Chrome/Edge!", "SYSTEM");
    throw new Error("Browser not found");
  }

  try {
    const cookies = await getModSession().cookies.get({
      domain: ".tiktok.com",
    });
    const liveUrl = `https://www.tiktok.com/@${currentLiveHost}/live`;
    const profilePath = path.join(app.getPath("userData"), PROFILE_DIR_NAME);

    log(`[Puppeteer] Khởi chạy Chrome từ: ${executablePath}`);

    browserInstance = await puppeteer.launch({
      headless: false,
      executablePath: executablePath,
      userDataDir: profilePath,
      defaultViewport: null,
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--window-position=-3000,-3000",
        "--ignore-certificate-errors",
        "--disable-blink-features=AutomationControlled",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--mute-audio",
        "--exclude-switches=enable-automation",
        "--disable-extensions",
        "--use-mock-keychain",
      ],
    });

    const pages = await browserInstance.pages();
    const page = pages.length > 0 ? pages[0] : await browserInstance.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "media", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const puppeteerCookies = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || ".tiktok.com",
      path: c.path || "/",
      httpOnly: c.httpOnly,
      secure: c.secure,
    }));
    await page.setCookie(...puppeteerCookies);

    log("[Puppeteer] Chuyển hướng vào trang Live...");
    await page.goto(liveUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(3000);

    const title = await page.title();
    log(`[Page Title] ${title}`);

    await page.evaluate(() => {
      const style = document.createElement("style");
      style.innerHTML = `
        video { display: none !important; }
        .gift-container { display: none !important; }
        canvas { display: none !important; }
      `;
      document.head.appendChild(style);
    });

    const selectors = getSelectors();
    try {
      await page.waitForSelector(selectors.inputSelector, { timeout: 5000 });
      await page.click(selectors.inputSelector).catch(() => {});
    } catch (e) {
      warn(
        `[Puppeteer] Cảnh báo: Không tìm thấy ô chat (${selectors.inputSelector}). Có thể cần chạy 'New Scrap'.`
      );
    }

    isBrowserInitializing = false;
    log("[Puppeteer] Trình duyệt sẵn sàng.");
    return { ok: true };
  } catch (e) {
    isBrowserInitializing = false;
    err("[Puppeteer Init Error]", e.message);
    if (browserInstance) {
      try {
        await browserInstance.close();
      } catch (ex) {}
      browserInstance = null;
    }
    throw e;
  }
}

async function scanAndUpdateSelectors() {
  if (!browserInstance) {
    return { ok: false, error: "Trình duyệt chưa mở. Hãy kết nối kênh trước." };
  }
  log("[Scrap] Bắt đầu quét cấu trúc HTML mới...");
  try {
    const pages = await browserInstance.pages();
    const page = pages[0];

    const detected = await page.evaluate(() => {
      const result = {};

      const inputCandidates = [
        '[data-e2e="comment-input"]',
        'div[contenteditable="plaintext-only"]',
        'textarea[placeholder*="comment"]',
        'div[class*="InputArea"]',
        'div[class*="chat_input"]',
      ];
      for (const sel of inputCandidates) {
        if (document.querySelector(sel)) {
          result.inputSelector = sel;
          break;
        }
      }

      const containerCandidates = [
        '[data-e2e="chat-room"]',
        ".webcast-chatroom-scroll-panel",
        'div[class*="ChatRoom"]',
        'div[class*="message_container"]',
      ];
      for (const sel of containerCandidates) {
        if (document.querySelector(sel)) {
          result.chatContainerSelector = sel;
          break;
        }
      }

      return result;
    });

    if (detected.inputSelector || detected.chatContainerSelector) {
      saveScrapConfig(detected);
      log(
        `[Scrap] Tìm thấy Selector mới: Input=${detected.inputSelector}, Container=${detected.chatContainerSelector}`
      );
      return { ok: true, data: detected };
    } else {
      warn("[Scrap] Không tìm thấy cấu trúc nào khớp.");
      return { ok: false, error: "Không tìm thấy cấu trúc nào khớp." };
    }
  } catch (e) {
    err("[Scrap Error]", e.message);
    return { ok: false, error: e.message };
  }
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const { content, resolve, reject } = messageQueue.shift();
    try {
      await doSendComment(content);
      resolve({ ok: true });
    } catch (e) {
      err("[Queue Error]", e.message);
      reject(e);
    }

    const cooldown = randomInt(COOLDOWN_MIN, COOLDOWN_MAX);
    await sleep(cooldown);
  }
  isProcessingQueue = false;
}

async function isSafeToReply(page) {
  try {
    let targetHost = getLiveHost();
    if (!targetHost) {
      warn("[Safety] Không xác định được chủ kênh ban đầu. Hủy trả lời.");
      return false;
    }

    targetHost = targetHost.toLowerCase().replace("@", "");
    const currentUrl = await page.url();

    if (!currentUrl.toLowerCase().includes(`@${targetHost}`)) {
      warn(
        `[SAFETY BLOCK] ⛔ Đang ở sai kênh! (Target: ${targetHost} | Current: ${currentUrl})`
      );
      return false;
    }

    const pageTitle = await page.title();
    if (!pageTitle.includes("LIVE")) {
      warn(`[SAFETY BLOCK] ⛔ Kênh này đang không Live! (Title: ${pageTitle})`);
      return false;
    }

    return true;
  } catch (e) {
    warn("[Safety Error]", e.message);
    return false;
  }
}

async function doSendComment(content) {
  if (getLiveStatus() === false) throw new Error("Live Ended");
  if (!browserInstance) await initBrowser();

  const pages = await browserInstance.pages();
  const page = pages[0];

  const isSafe = await isSafeToReply(page);
  if (!isSafe) {
    throw new Error(
      "Hủy gửi tin nhắn do trình duyệt đang ở sai kênh hoặc đã tắt Live."
    );
  }

  const selectors = getSelectors();

  try {
    const inputEl = await page.$(selectors.inputSelector);
    if (!inputEl) {
      throw new Error(`Không tìm thấy ô chat: ${selectors.inputSelector}`);
    }

    await inputEl.click();

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.innerText = "";
    }, selectors.inputSelector);

    for (const char of content) {
      await page.keyboard.type(char);
      await sleep(randomInt(50, 150));
    }

    await sleep(100);
    await page.keyboard.press("Space");
    await sleep(50);
    await page.keyboard.press("Backspace");

    await sleep(randomInt(300, 600));

    await page.keyboard.press("Enter");

    log(`[Puppeteer] Sent (Human Speed): "${content}"`);
  } catch (e) {
    err("[Send Error]", e.message);
    throw new Error(`Gửi thất bại: ${e.message}`);
  }
}

function sendComment(content) {
  return new Promise((resolve, reject) => {
    if (messageQueue.length > 10) {
      resolve({ ok: false, error: "Queue full" });
      return;
    }
    messageQueue.push({ content, resolve, reject });
    processQueue();
  });
}

async function openManualBrowser() {
  if (!browserInstance) {
    try {
      await initBrowser();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  const pages = await browserInstance.pages();
  const page = pages[0];

  try {
    const session = await page.target().createCDPSession();
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        windowState: "normal",
        left: 100,
        top: 100,
        width: 1200,
        height: 800,
      },
    });
    await page.bringToFront();
    isBrowserVisible = true;
    log("[View] Đã HIỆN trình duyệt thủ công.");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function toggleBrowserVisibility() {
  if (!browserInstance) return { ok: false, error: "Browser not active" };
  const pages = await browserInstance.pages();
  const page = pages[0];
  const session = await page.target().createCDPSession();
  const { windowId } = await session.send("Browser.getWindowForTarget");

  if (isBrowserVisible) {
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        windowState: "normal",
        left: -3000,
        top: -3000,
        width: 1200,
        height: 800,
      },
    });
    isBrowserVisible = false;
    log("[View] Đã ẨN.");
  } else {
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        windowState: "normal",
        left: 100,
        top: 100,
        width: 1200,
        height: 800,
      },
    });
    await page.bringToFront();
    isBrowserVisible = true;
    log("[View] Đã HIỆN.");
  }
  return { ok: true, isVisible: isBrowserVisible };
}

async function startFallbackScraper() {
  if (getLiveStatus() === false) return { ok: false, error: "Live is Offline" };
  setDataSource("SCRAPER");

  if (!browserInstance) {
    try {
      await initBrowser();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  try {
    const pages = await browserInstance.pages();
    const page = pages[0];
    const selectors = getSelectors(); // Lấy config mới nhất

    log("[Scraper] Đang inject script Scraper với Config động...");

    await injectChatScraper(
      page,
      (commentData) => {
        if (getDataSource() !== "SCRAPER") return;

        const payload = {
          uniqueId: commentData.user,
          nickname: commentData.user,
          comment: commentData.text,
          commentId: `scrape-${Date.now()}`,
          profilePictureUrl: "",
          isScraper: true,
        };

        forwardToRenderer(
          "tiktok-raw",
          {
            event: "chat",
            payload,
            ts: new Date().toISOString(),
          },
          "SCRAPER"
        );
      },
      selectors // TRUYỀN SELECTORS VÀO ĐÂY
    );

    return { ok: true };
  } catch (e) {
    err("Scraper Start Error:", e);
    return { ok: false, error: e.message };
  }
}

module.exports = {
  cleanupBrowser,
  deleteProfile,
  openManualBrowser,
  sendComment,
  startFallbackScraper,
  toggleBrowserVisibility,
  scanAndUpdateSelectors,
  initBrowser,
};
