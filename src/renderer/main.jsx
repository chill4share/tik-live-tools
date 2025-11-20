import { h, render } from "preact";
import { useState, useEffect, useRef, useLayoutEffect } from "preact/hooks";
import ControlPanel from "./ControlPanel";
import Settings from "./Settings";
import "./style.css";

const MenuBar = ({ activeTab, setActiveTab, isConnected }) => {
  const menuStyle = {
    display: "flex",
    background: "#1e293b",
    color: "white",
    padding: "0 16px",
    height: "40px",
    alignItems: "center",
    gap: "20px",
    fontSize: "13px",
    userSelect: "none",
    position: "relative",
    zIndex: 1000,
  };

  const itemStyle = (isActive) => ({
    cursor: "pointer",
    padding: "10px 0",
    borderBottom: isActive ? "2px solid #38bdf8" : "2px solid transparent",
    color: isActive ? "#38bdf8" : "#94a3b8",
    fontWeight: isActive ? "600" : "400",
  });

  const [showHelp, setShowHelp] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowHelp(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNewScrap = async () => {
    if (!isConnected) return;

    setShowHelp(false);
    try {
      let currentConfig = {
        inputSelector: "N/A",
        chatContainerSelector: "N/A",
        chatItemSelector: "N/A",
        userSelector: "N/A",
        textSelector: "N/A",
      };

      if (window.electronAPI.getScrapConfig) {
        const saved = await window.electronAPI.getScrapConfig();
        currentConfig = { ...currentConfig, ...saved };
      }

      const msgStep1 = `🔍 CẤU HÌNH SELECTOR HIỆN TẠI:

1️⃣ Input: ${currentConfig.inputSelector}
2️⃣ Container: ${currentConfig.chatContainerSelector}
3️⃣ Item: ${currentConfig.chatItemSelector}
4️⃣ User: ${currentConfig.userSelector}
5️⃣ Text: ${currentConfig.textSelector}

Bạn có muốn quét lại trang Live để tìm Selector mới (Input & Container) không?`;

      if (!window.confirm(msgStep1)) return;

      alert("⏳ Đang quét... Vui lòng đợi 5-10 giây và KHÔNG thao tác chuột.");
      const res = await window.electronAPI.scanNewSelectors();

      if (!res.ok) {
        alert(`❌ Quét thất bại: ${res.error}`);
        return;
      }

      const newConfig = res.data;
      const finalConfig = {
        ...currentConfig,
        ...newConfig,
      };

      const msgStep2 = `✅ QUÉT THÀNH CÔNG! SO SÁNH KẾT QUẢ:

[INPUT]
🔴 Cũ: ${currentConfig.inputSelector}
🟢 Mới: ${finalConfig.inputSelector}

[CONTAINER]
🔴 Cũ: ${currentConfig.chatContainerSelector}
🟢 Mới: ${finalConfig.chatContainerSelector}

(Các selector cấu trúc tin nhắn 3,4,5 được giữ nguyên)

Bạn có muốn LƯU và ÁP DỤNG cấu hình mới này?`;

      if (window.confirm(msgStep2)) {
        if (window.electronAPI.saveScrapConfig) {
          await window.electronAPI.saveScrapConfig(finalConfig);
          alert("✅ Đã lưu thành công! Tool sẽ dùng cấu hình mới từ bây giờ.");
        } else {
          alert("❌ Lỗi: Hàm saveScrapConfig chưa được khai báo trong API.");
        }
      } else {
        alert("🚫 Đã hủy bỏ thay đổi. Vẫn dùng cấu hình cũ.");
      }
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleCheckUpdate = () => {
    setShowHelp(false);
    window.electronAPI.checkForUpdate();
  };

  const handleInputApiKey = async () => {
    setShowHelp(false);
    const currentKey = await window.electronAPI.getAiApiKey();
    setHasSavedKey(!!currentKey && currentKey.length > 0);
    setKeyInput("");
    setShowKeyModal(true);
  };

  const saveApiKey = async () => {
    const newKey = keyInput.trim();

    if (!newKey) {
      if (hasSavedKey) {
        alert("Bạn không nhập gì cả. Hệ thống sẽ giữ nguyên Key cũ.");
        setShowKeyModal(false);
      } else {
        alert("Vui lòng nhập API Key để sử dụng tính năng này.");
      }
      return;
    }

    const res = await window.electronAPI.saveAiApiKey(newKey);
    if (res.ok) {
      alert("Đã lưu API Key mới thành công!");
      setHasSavedKey(true);
      setShowKeyModal(false);
      setKeyInput("");
    } else {
      alert("Lỗi khi lưu Key: " + res.error);
    }
  };

  return (
    <div style={menuStyle}>
      <div style={{ fontWeight: "bold", marginRight: "10px" }}>
        🔥 TikTok Tool
      </div>
      <div
        style={itemStyle(activeTab === "home")}
        onClick={() => setActiveTab("home")}
      >
        🏠 Trang chủ
      </div>
      <div
        style={itemStyle(activeTab === "settings")}
        onClick={() => setActiveTab("settings")}
      >
        ⚙️ Cài đặt AI
      </div>
      <div
        ref={menuRef}
        style={{ position: "relative", marginLeft: "auto", cursor: "pointer" }}
        onClick={() => setShowHelp(!showHelp)}
      >
        <span style={{ color: "#cbd5e1" }}>❓ Trợ giúp ▾</span>
        {showHelp && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "30px",
              background: "white",
              color: "#333",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              borderRadius: "4px",
              width: "200px",
              zIndex: 1001,
            }}
          >
            <div
              className="menu-item"
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
                fontWeight: "bold",
                color: isConnected ? "#d97706" : "#9ca3af",
                cursor: isConnected ? "pointer" : "not-allowed",
                opacity: isConnected ? 1 : 0.5,
                background: isConnected ? "transparent" : "#f3f4f6",
              }}
              title={
                isConnected
                  ? "Quét lại cấu trúc trang web"
                  : "Hãy kết nối Livestream trước để sử dụng"
              }
              onClick={handleNewScrap}
            >
              🔍 New Scrap (Fix Lỗi)
            </div>
            <div
              className="menu-item"
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
                color: "#2563eb",
                fontWeight: "bold",
              }}
              onClick={handleInputApiKey}
            >
              🔑 Cài đặt API Key
            </div>
            <div
              className="menu-item"
              style={{ padding: "10px", borderBottom: "1px solid #eee" }}
              onClick={() => window.electronAPI.openLogFolder()}
            >
              📂 Mở thư mục Log
            </div>

            <div
              className="menu-item"
              style={{ padding: "10px", borderBottom: "1px solid #eee" }}
              onClick={handleCheckUpdate}
            >
              🔄 Check Update
            </div>

            <div
              className="menu-item"
              style={{ padding: "10px" }}
              onClick={() =>
                alert("TikTok Live Tool v1.0.1\nBuild by Gemini AI")
              }
            >
              ℹ️ About Tool
            </div>
          </div>
        )}
      </div>

      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "400px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: 0, color: "#333" }}>Cài đặt Gemini API Key</h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              Nhập Key của bạn để kích hoạt AI trả lời tự động. Key sẽ được lưu
              mã hóa an toàn trên máy tính.
            </p>
            <input
              value={keyInput}
              onInput={(e) => setKeyInput(e.target.value)}
              placeholder={
                hasSavedKey
                  ? "✅ Đã có Key (Nhập mới để ghi đè...)"
                  : "Nhập API Key (bắt đầu bằng AIza...)"
              }
              style={{
                padding: "10px",
                borderRadius: "6px",
                border: hasSavedKey ? "2px solid #22c55e" : "1px solid #ccc",
                width: "100%",
                boxSizing: "border-box",
              }}
              type="password"
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowKeyModal(false)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  background: "#f3f4f6",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                }}
              >
                Hủy
              </button>
              <button
                onClick={saveApiKey}
                style={{
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Lưu Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [username, setUsername] = useState(
    localStorage.getItem("tiktokUsername") || ""
  );
  const [status, setStatus] = useState("idle");
  const [comments, setComments] = useState([]);
  const [isModLoggedIn, setIsModLoggedIn] = useState(false);
  const [modUsername, setModUsername] = useState("mod_user");
  const [modDisplayName, setModDisplayName] = useState("");
  const [hostDisplayName, setHostDisplayName] = useState("");

  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [isBrowserVisible, setIsBrowserVisible] = useState(false);
  const [isLiveEnded, setIsLiveEnded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const autoReplyRef = useRef(autoReplyEnabled);
  const filterEnabledRef = useRef(filterEnabled);
  const modLoggedInRef = useRef(isModLoggedIn);
  const modUsernameRef = useRef(modUsername);
  const autoReplyStartTimeRef = useRef(0);

  const modIdRef = useRef("");
  const modNameRef = useRef("");
  const hostIdRef = useRef("");
  const hostNameRef = useRef("");

  const recentKeysRef = useRef(new Map());
  const connectionTimeRef = useRef(0);
  const botSentHistoryRef = useRef(new Set());
  const chatListRef = useRef(null);

  const cleanText = (str) =>
    (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const normalizeId = (str) =>
    (str || "").toString().replace(/^@/, "").trim().toLowerCase();

  useLayoutEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [comments, activeTab]);

  useEffect(() => {
    autoReplyRef.current = autoReplyEnabled;
    filterEnabledRef.current = filterEnabled;
    modLoggedInRef.current = isModLoggedIn;
    modUsernameRef.current = modUsername;

    if (autoReplyEnabled) {
      autoReplyStartTimeRef.current = Date.now();
    } else {
      autoReplyStartTimeRef.current = 0;
    }

    modIdRef.current = normalizeId(modUsername);
    modNameRef.current = cleanText(modDisplayName);
    hostIdRef.current = normalizeId(username);
    hostNameRef.current = cleanText(hostDisplayName);
  }, [
    autoReplyEnabled,
    filterEnabled,
    isModLoggedIn,
    modUsername,
    modDisplayName,
    username,
    hostDisplayName,
  ]);

  useEffect(() => {
    async function checkLoginOnStartup() {
      if (window.electronAPI?.checkModLoginStatus) {
        const res = await window.electronAPI.checkModLoginStatus();
        if (res.ok) {
          setIsModLoggedIn(true);
          setModUsername(res.username);
          if (res.nickname) setModDisplayName(res.nickname);
        }
      }
    }
    checkLoginOnStartup();

    const savedConfig = localStorage.getItem("userSalesConfig");
    if (savedConfig && window.electronAPI) {
      window.electronAPI.updateSalesSettings(JSON.parse(savedConfig));
    }

    function handleIncomingComment(payload) {
      if (!payload) return;

      const rawText = payload.comment || payload.message || payload.body || "";
      const text = rawText.toString().trim();

      if (!text) return;
      if (text.length <= 2 && !payload.isManual) return;

      if (botSentHistoryRef.current.has(text)) return;

      const rawUniqueId =
        payload.uniqueId || payload.user?.uniqueId || "unknown";
      const nickname =
        payload.nickname || payload.user?.nickname || rawUniqueId;

      if (normalizeId(rawUniqueId) === modIdRef.current && !payload.isManual) {
        return;
      }

      const isHistoryData = payload.isHistory === true;
      const now = Date.now();

      if (
        now - connectionTimeRef.current < 2000 &&
        !payload.isManual &&
        !isHistoryData
      ) {
        return;
      }

      const dedupeKey = `${cleanText(rawUniqueId)}:::${text}`;
      const history = recentKeysRef.current;
      const existingEntry = history.get(dedupeKey);

      if (existingEntry && now - existingEntry.ts < 30000) {
        return;
      }

      history.set(dedupeKey, { ts: now });

      const isImportant =
        /(giá|nhiêu|ship|size|còn|tư vấn|mã|đặt|shop|bnh|bn|bao tiền|mua|chốt|lấy|cọc|địa chỉ|sđt|số đt|inbox|ib|check|đệm|ghế|màu|bảo hành|bh|kích thước|dài|rộng|nặng|kg|tải|massage|lăn|khung|da|nỉ|vải|gỗ|sắt|nhựa|lắp|ráp|hỏng|lỗi|đổi|trả|tỉnh|hà nội|hcm|sài gòn|miễn phí|free|voucher|sale|giảm|foam|bông|nhung|thép|hòa phát|ovan|sơn|tĩnh điện|cao cấp|xuất khẩu|êm|nóng|bí|ngả|nằm|ngồi|ngủ|đọc sách|bầu|bỉm|già|cụ|đau lưng|bình dương|hải phòng|đà nẵng|cần thơ|bắc ninh|nghệ an|thanh hóa|bền|chắc|xịn|thật|giả|chính hãng|mới|cũ|thanh lý|bom|xả|kho|sỉ|lẻ|buôn|ctv|cộng tác|zalo|fb|face|gửi|ảnh|video|clip|hướng dẫn|hd|sử dụng|vệ sinh|giặt|lau|tháo|bánh xe|xoay|tựa|gối|tay|chân|nâng|hạ|piston|hơi|thủy lực|trợ lực|trả góp|quẹt thẻ|visa|ck|chuyển khoản|cod|nhận hàng|kiểm tra|xem|thử|vừa|chật|to|nhỏ|cao|thấp|mét|cm|mm|mẫu|ảnh thật|feedback|review|đánh giá|uy tín|lừa|phốt|đắt|rẻ|bớt|tặng|quà|combo|bộ|cặp|đôi|lẻ|sẵn|hết|về|bao lâu|ngày|giờ|sáng|chiều|tối|gấp|nhanh|hỏa tốc|grab|ahamove|viettel|ghtk|ghn|bưu điện|xe khách|gửi xe|bảo trì|linh kiện|thay thế)/i.test(
          text
        );

      const newCommentObj = {
        id: `msg-${now}-${Math.random().toString(36).substr(2, 9)}`,
        user: nickname,
        username: rawUniqueId,
        text: text,
        avatar: payload.profilePictureUrl || payload.user?.avatar || "",
        ts: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isMod: payload.isManual || false,
        receivedAt: now,
        isHistory: isHistoryData,
        isImportant: isImportant,
      };

      setComments((prev) => [...prev.slice(-199), newCommentObj]);

      if (!payload.isManual) {
        triggerAutoReply(newCommentObj, isHistoryData);
      }
    }

    async function triggerAutoReply(commentItem, isHistoryData) {
      if (!autoReplyRef.current || !modLoggedInRef.current) return;
      if (isHistoryData) return;
      if (commentItem.receivedAt < autoReplyStartTimeRef.current) return;

      const commenterNameClean = cleanText(commentItem.user);
      const myName = modNameRef.current;
      const ownerName = hostNameRef.current;

      if (myName && commenterNameClean === myName) return;
      if (ownerName && commenterNameClean === ownerName) return;

      const commenterIdClean = normalizeId(commentItem.username);
      const myId = modIdRef.current;
      const ownerId = hostIdRef.current;
      if (myId && commenterIdClean === myId) return;
      if (ownerId && commenterIdClean === ownerId) return;

      if (filterEnabledRef.current) {
        const txt = commentItem.text;
        if (txt.length < 2) return;
        if (/^(.)\1+$/.test(txt) && txt.length > 4) return;
        if (!/[a-zA-Z0-9]/.test(cleanText(txt)) && txt.length > 5) return;
      }

      try {
        const aiText = await window.electronAPI.generateAiReply(
          commentItem.user,
          commentItem.text
        );
        if (!aiText) return;

        const replyContent = `@${commentItem.user} ${aiText}`;

        botSentHistoryRef.current.add(replyContent.trim());
        botSentHistoryRef.current.add(aiText.trim());

        setTimeout(() => {
          botSentHistoryRef.current.delete(replyContent.trim());
          botSentHistoryRef.current.delete(aiText.trim());
        }, 60000);

        const res = await window.electronAPI.sendTikTokComment(replyContent);

        if (res.ok) {
          handleIncomingComment({
            uniqueId: modUsernameRef.current,
            nickname: modDisplayName || "Bot",
            comment: replyContent,
            isManual: true,
          });
        }
      } catch (e) {}
    }

    if (window.electronAPI) {
      window.electronAPI.onRaw((data) => {
        if (data.event === "chat" || data.event === "comment")
          handleIncomingComment(data.payload);
      });
      window.electronAPI.onModLoginSuccess((data) => {
        const info = typeof data === "object" ? data : { username: data };
        setIsModLoggedIn(true);
        setModUsername(info.username);
        if (info.nickname) setModDisplayName(info.nickname);
      });
      window.electronAPI.onHostInfoFound(setHostDisplayName);
      window.electronAPI.onModInfoFound((data) =>
        setModDisplayName(data.nickname)
      );
      window.electronAPI.onError((err) => {
        if (err && (err.includes("Offline") || err.includes("kết thúc")))
          setStatus("OFFLINE");
      });
      window.electronAPI.onLiveEnded((data) => {
        setStatus("LIVE ENDED");
        setIsLiveEnded(true);
        setAutoReplyEnabled(false);
        setFilterEnabled(false);
        alert("⚠️ Phiên Live đã kết thúc! Vui lòng chọn kênh khác.");
      });
    }

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [k, meta] of recentKeysRef.current) {
        if (now - meta.ts > 60000) recentKeysRef.current.delete(k);
      }
    }, 30000);
    return () => clearInterval(cleanupInterval);
  }, []);

  const handleConnect = async () => {
    if (!username) return alert("Nhập Username!");
    setStatus("connecting");
    setIsLiveEnded(false);
    localStorage.setItem("tiktokUsername", username);

    connectionTimeRef.current = Date.now();
    setHostDisplayName("");
    setComments([]);

    const res = await window.electronAPI.connectTikTok(
      username.replace(/^@/, ""),
      { ttcOptions: { processMessageData: true } }
    );
    if (!res.ok) {
      const err = (res.error || "").toLowerCase();
      if (err.includes("offline") || err.includes("not online")) {
        setStatus("OFFLINE");
        alert("Kênh OFFLINE.");
      } else {
        handleCheckCaptcha();
      }
    } else {
      setStatus("connected");
    }
  };

  const handleCheckCaptcha = async () => {
    if (!isModLoggedIn) return alert("Đăng nhập Mod trước!");
    connectionTimeRef.current = Date.now();
    const res = await window.electronAPI.openManualBrowser();
    if (res.ok) {
      setStatus("connected (scrape)");
      window.electronAPI.startFallbackScraper();
    }
  };

  const handleManualSend = async (txt) => {
    const cleanTxt = txt.trim();
    if (!cleanTxt) return;
    botSentHistoryRef.current.add(cleanTxt);
    setTimeout(() => botSentHistoryRef.current.delete(cleanTxt), 60000);

    const res = await window.electronAPI.sendTikTokComment(cleanTxt);
    if (res.ok) {
      setComments((prev) => [
        ...prev.slice(-150),
        {
          id: `manual-${Date.now()}`,
          user: modDisplayName || modUsername,
          username: modUsername,
          text: cleanTxt,
          avatar: "",
          ts: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isMod: true,
        },
      ]);
    } else {
      alert("Lỗi: " + res.error);
    }
  };

  const handleToggleView = async () => {
    const res = await window.electronAPI.toggleBrowserView();
    if (res.ok) setIsBrowserVisible(res.isVisible);
  };

  const clearChat = () => {
    setComments([]);
  };

  return (
    <div className="app-container">
      <MenuBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={status.includes("connected")}
      />

      {activeTab === "settings" ? (
        <div className="main-content" style={{ background: "#f1f5f9" }}>
          <Settings onSave={() => {}} />
        </div>
      ) : (
        <>
          <div className="top-bar">
            <input
              className="input-box"
              value={username}
              onInput={(e) => setUsername(e.target.value)}
              placeholder="ID kênh (vd: funa.furniture)..."
            />
            {status !== "connected" && !status.includes("scrape") ? (
              <button className="btn" onClick={handleConnect}>
                Kết nối
              </button>
            ) : (
              <button
                className="btn btn-danger"
                onClick={() =>
                  window.electronAPI
                    .disconnectTikTok()
                    .then(() => setStatus("idle"))
                }
              >
                Ngắt kết nối
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleCheckCaptcha}>
              Capcha
            </button>
            <button
              className="btn"
              style={{
                marginLeft: 8,
                backgroundColor: isBrowserVisible ? "#f59e0b" : "#8b5cf6",
              }}
              onClick={handleToggleView}
            >
              {isBrowserVisible ? "🙈 Ẩn" : "👁️ Xem"}
            </button>
            <div
              className="status-label"
              style={{
                color: status.includes("connected")
                  ? "#16a34a"
                  : status === "OFFLINE" || status === "LIVE ENDED"
                  ? "#ef4444"
                  : "#6b7280",
              }}
            >
              {status.toUpperCase()}
            </div>
          </div>

          <div className="main-content">
            <div className="chat-col">
              <div
                className="chat-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Bình luận trực tiếp</span>
                <button
                  onClick={clearChat}
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    borderRadius: "4px",
                    color: "#b91c1c",
                    cursor: "pointer",
                  }}
                  title="Xóa sạch màn hình chat"
                >
                  🗑️ Dọn dẹp
                </button>
              </div>
              <div className="chat-list" ref={chatListRef}>
                {comments.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#999",
                      marginTop: 20,
                    }}
                  >
                    Đang chờ tin nhắn...
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`comment-item ${c.isMod ? "is-mod" : ""}`}
                    >
                      {!c.isMod && (
                        <div className="avatar-wrap">
                          {c.avatar && <img src={c.avatar} />}
                        </div>
                      )}
                      <div className="msg-content">
                        <div className="msg-info">
                          <span className="user-name">{c.user}</span>
                          <span className="msg-time">{c.ts}</span>
                        </div>
                        <div
                          className={`msg-bubble ${
                            c.isImportant ? "highlight-question" : ""
                          }`}
                        >
                          {c.text}
                        </div>
                      </div>
                      {c.isMod && (
                        <div
                          className="avatar-wrap"
                          style={{
                            background: "#fe2c55",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 10,
                          }}
                        >
                          ME
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <ControlPanel
              isModLoggedIn={isModLoggedIn}
              modUsername={modDisplayName || modUsername}
              autoReplyEnabled={autoReplyEnabled}
              setAutoReplyEnabled={setAutoReplyEnabled}
              filterEnabled={filterEnabled}
              setFilterEnabled={setFilterEnabled}
              onLogin={() => window.electronAPI.startModLogin()}
              onLogout={() =>
                window.electronAPI
                  .modLogout()
                  .then(() => setIsModLoggedIn(false))
              }
              onManualCommentSent={handleManualSend}
              isLiveEnded={isLiveEnded}
              isConnected={status.includes("connected")}
            />
          </div>
        </>
      )}
    </div>
  );
}

render(<App />, document.getElementById("root"));
