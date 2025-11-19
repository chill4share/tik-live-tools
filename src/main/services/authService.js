// src/main/services/authService.js
const { session, BrowserWindow } = require("electron");
const keytar = require("keytar");
const fetch = require("node-fetch");
const { log, warn, err } = require("../utils/logger");
const {
  getMainWindow,
  forwardToRenderer,
} = require("../managers/windowManager");

const KEYTAR_SERVICE = "com.chill4share.tiktoklivetool";
const KEYTAR_ACCOUNT = "tiktokModCredentials";
const LOGIN_SESSION_PARTITION = "persist:tiktok-mod-session";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

let modAuthCredentials = null;
let loginWindow = null;

// Hàm gọi API lấy thông tin mới nhất
async function fetchUserInfoViaAPI(cookies) {
  try {
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Thêm timestamp để tránh cache
    const response = await fetch(
      `https://www.tiktok.com/passport/web/account/info/?t=${Date.now()}`,
      {
        headers: {
          Cookie: cookieStr,
          "User-Agent": USER_AGENT,
          Referer: "https://www.tiktok.com/",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.data) {
        return {
          uniqueId: data.data.username,
          // Ưu tiên lấy screen_name (Tên hiển thị)
          nickname:
            data.data.screen_name || data.data.nickname || data.data.username,
        };
      }
    }
  } catch (e) {
    warn("Lỗi API Info:", e.message);
  }
  return null;
}

async function updateModProfile(username, realNickname) {
  if (!username || !realNickname) return;

  if (modAuthCredentials && modAuthCredentials.username === username) {
    modAuthCredentials.nickname = realNickname;
  } else {
    modAuthCredentials = { username, nickname: realNickname };
  }

  try {
    const credsToSave = { username, nickname: realNickname };
    await keytar.setPassword(
      KEYTAR_SERVICE,
      KEYTAR_ACCOUNT,
      JSON.stringify(credsToSave)
    );
    log(`[AUTH] Đã lưu tên hiển thị mới vào hệ thống: "${realNickname}"`);
    forwardToRenderer("mod-login-success", credsToSave);
  } catch (e) {
    err("Lỗi lưu profile:", e);
  }
}

async function getCredentialsFromSession(sessionToCheck) {
  try {
    const allCookies = await sessionToCheck.cookies.get({});
    if (!allCookies.find((c) => c.name === "sessionid")) return { ok: false };

    const apiInfo = await fetchUserInfoViaAPI(allCookies);

    if (apiInfo && apiInfo.uniqueId) {
      return { ok: true, ...apiInfo };
    }

    // Fallback: Nếu API lỗi thì mới lấy từ cookie (dữ liệu cũ)
    const usernameNames = ["user_unique_id", "uniqueId", "uid_tt"];
    let usernameCookie = allCookies.find((c) => usernameNames.includes(c.name));
    const username = decodeURIComponent(
      usernameCookie ? usernameCookie.value || usernameCookie.name : "unknown"
    );
    return { ok: true, uniqueId: username, nickname: username };
  } catch (e) {
    err("Check cookies:", e);
  }
  return { ok: false };
}

async function checkModLoginStatus() {
  let keytarCreds = null;
  try {
    const s = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    if (s) keytarCreds = JSON.parse(s);
  } catch (e) {}

  if (!keytarCreds || !keytarCreds.username) return { ok: false };

  const modSession = session.fromPartition(LOGIN_SESSION_PARTITION);
  const cookies = await modSession.cookies.get({ domain: ".tiktok.com" });

  if (cookies.find((c) => c.name === "sessionid")) {
    modAuthCredentials = keytarCreds;

    // [ĐÃ SỬA] LOẠI BỎ logic check API tại đây.
    // Chúng ta chỉ tin tưởng vào tên Mod được cập nhật trong initBrowser (đã fix)

    log(
      `[IDENTITY] Cache: @${keytarCreds.username} | Tên: ${keytarCreds.nickname}`
    );
    forwardToRenderer("mod-login-success", keytarCreds);
    return { ok: true, username: keytarCreds.username };
  }
  return { ok: false };
}

async function startModLogin() {
  modAuthCredentials = null;
  if (loginWindow) {
    loginWindow.focus();
    return { ok: true };
  }

  let isSavingCredentials = false;
  const loginSession = session.fromPartition(LOGIN_SESSION_PARTITION);

  loginWindow = new BrowserWindow({
    width: 450,
    height: 700,
    parent: getMainWindow(),
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: loginSession,
    },
  });
  loginWindow.webContents.setUserAgent(USER_AGENT);
  loginWindow.loadURL("https://www.tiktok.com/login/");

  const attemptToSaveCredentials = async () => {
    if (isSavingCredentials) return false;
    isSavingCredentials = true;
    try {
      const result = await getCredentialsFromSession(loginSession);
      if (!result.ok) {
        isSavingCredentials = false;
        return false;
      }

      const credsToSave = {
        username: result.uniqueId,
        nickname: result.nickname,
      };
      await keytar.setPassword(
        KEYTAR_SERVICE,
        KEYTAR_ACCOUNT,
        JSON.stringify(credsToSave)
      );
      modAuthCredentials = credsToSave;

      log(
        `[IDENTITY] Login Mới Thành Công: @${result.uniqueId} (${result.nickname})`
      );
      forwardToRenderer("mod-login-success", credsToSave);

      setTimeout(() => {
        if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
      }, 500);
      isSavingCredentials = false;
      return true;
    } catch (e) {
      isSavingCredentials = false;
      return false;
    }
  };

  loginSession.cookies.on("changed", async (ev, c) => {
    if (["sessionid", "uid_tt"].includes(c.name))
      setTimeout(() => attemptToSaveCredentials(), 1000);
  });
  loginWindow.on("closed", () => {
    loginWindow = null;
  });
  return { ok: true };
}

async function modLogout() {
  modAuthCredentials = null;
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  } catch (e) {}
  try {
    await session.fromPartition(LOGIN_SESSION_PARTITION).clearStorageData();
  } catch (e) {}
  log(`[IDENTITY] Đã đăng xuất.`);
  return { ok: true };
}

function getModSession() {
  return session.fromPartition(LOGIN_SESSION_PARTITION);
}
function getModCredentials() {
  return modAuthCredentials;
}

module.exports = {
  checkModLoginStatus,
  startModLogin,
  modLogout,
  getModSession,
  getModCredentials,
  updateModProfile,
  LOGIN_SESSION_PARTITION,
};
