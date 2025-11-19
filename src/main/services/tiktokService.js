const { WebcastPushConnection } = require("tiktok-live-connector");
const { log, warn, err } = require("../utils/logger");
const { forwardToRenderer } = require("../managers/windowManager");
const {
  setLiveHost,
  setLiveStatus,
  setDataSource,
} = require("../managers/stateManager");

let ttcClient = null;
let keepaliveInterval = null;

async function connect(usernameRaw, opts = {}) {
  try {
    if (ttcClient) {
      try {
        ttcClient.disconnect();
      } catch (e) {}
      ttcClient = null;
    }

    let username = (usernameRaw || "").toString().trim();
    if (!username) return { ok: false, error: "empty username" };
    username = username.replace(/^@/, "");

    setLiveHost(username);
    setDataSource("LIBRARY");
    setLiveStatus(true);

    log(`[IDENTITY] Đang kết nối tới HOST (Chủ kênh): @${username}`);

    const ttcOptions = opts.ttcOptions || {};
    if (process.env.TTC_SIGN_PROVIDER_URL) {
      ttcOptions.signProvider = { url: process.env.TT_SIGN_PROVIDER_URL };
    }

    ttcClient = new WebcastPushConnection(username, ttcOptions);

    (function attachRawLogger(client) {
      const origEmit = client.emit;
      client.emit = function (eventName, ...args) {
        return origEmit.apply(this, [eventName, ...args]);
      };
    })(ttcClient);

    ttcClient.on("streamEnd", () => {
      warn(`[TikTok Event] Phiên Live đã KẾT THÚC (Signal from Socket).`);
      setLiveStatus(false);

      // Gửi sự kiện tiktok-live-ended thay vì tiktok-error chung chung
      forwardToRenderer(
        "tiktok-live-ended",
        { reason: "Socket received streamEnd" },
        "LIBRARY"
      );

      // Ngắt kết nối ngay lập tức
      disconnect();
    });

    const commonEvents = [
      "connected",
      "disconnected",
      "chat",
      "comment",
      "gift",
      "like",
      "streamStart",
      "error",
    ];
    commonEvents.forEach((evName) => {
      try {
        ttcClient.on(evName, (payload) => {
          const ts = new Date().toISOString();
          if (evName === "chat" || evName === "gift") setLiveStatus(true);
          forwardToRenderer(
            "tiktok-raw",
            { event: evName, payload, ts },
            "LIBRARY"
          );
          if (evName === "chat" || evName === "comment") {
            try {
              forwardToRenderer("tiktok-comment", payload, "LIBRARY");
            } catch (e) {}
          }
          forwardToRenderer("tiktok-keepalive", { ts }, "LIBRARY");
        });
      } catch (e) {}
    });

    ttcClient.on("error", (e) => {});

    await ttcClient.connect();
    log("ttcClient.connect() resolved - KẾT NỐI LIBRARY THÀNH CÔNG");
    setLiveStatus(true);

    if (!keepaliveInterval) {
      keepaliveInterval = setInterval(() => {
        forwardToRenderer(
          "tiktok-keepalive",
          { ts: new Date().toISOString() },
          "LIBRARY"
        );
      }, 20000);
    }
    return { ok: true };
  } catch (e) {
    err("connect-tiktok failed", e);

    const errorMsg = String(e).toLowerCase();
    // Nếu lỗi Offline -> Dừng lại ngay
    if (errorMsg.includes("offline") || errorMsg.includes("not online")) {
      setLiveStatus(false);
      // Báo lỗi về UI để UI biết mà không gọi Scraper nữa
      forwardToRenderer(
        "tiktok-error",
        "Kênh đang OFFLINE (Tắt Live).",
        "LIBRARY"
      );
      return { ok: false, error: "Live Offline" };
    }

    warn(">>> LIBRARY thất bại. Đang chuyển sang chế độ SCRAPER...");
    const { startFallbackScraper } = require("./browserService");
    setDataSource("SCRAPER");

    startFallbackScraper().then((res) => {
      if (res.ok) log(">>> Đã chuyển sang SCRAPER thành công.");
      else err(">>> Chuyển Scraper thất bại:", res.error);
    });

    return { ok: false, error: "Switching to Scraper" };
  }
}

async function disconnect() {
  try {
    if (ttcClient) {
      ttcClient.disconnect();
      ttcClient = null;
    }
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }
    setLiveHost(null);
    setLiveStatus(false);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

module.exports = { connect, disconnect };
