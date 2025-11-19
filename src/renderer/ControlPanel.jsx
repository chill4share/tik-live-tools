// src/renderer/ControlPanel.jsx
import { h } from "preact";
import { useState } from "preact/hooks";

const panelStyle = {
  flex: 1,
  minWidth: "300px",
  maxWidth: "350px",
  background: "#fff",
  borderRadius: "8px",
  border: "1px solid #ddd",
  display: "flex",
  flexDirection: "column",
  padding: "16px",
  gap: "12px",
  overflowY: "auto",
};

const sectionStyle = {
  padding: "12px",
  background: "#f9fafb",
  borderRadius: "8px",
  border: "1px solid #eee",
};

const btnFull = {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: "8px",
};

const ControlPanel = (props) => {
  const [manualTxt, setManualTxt] = useState("");

  const handleSend = () => {
    if (manualTxt.trim()) {
      props.onManualCommentSent(manualTxt);
      setManualTxt("");
    }
  };

  // Logic khóa: Khóa các chức năng Gửi/Auto khi chưa sẵn sàng
  const isLocked =
    !props.isModLoggedIn || props.isLiveEnded || !props.isConnected;

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Cấu hình Mod</h3>

      {/* Cảnh báo đỏ nếu Live Ended */}
      {props.isLiveEnded && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fca5a5",
            padding: "10px",
            borderRadius: "6px",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "13px",
          }}
        >
          ⛔ PHIÊN LIVE ĐÃ KẾT THÚC
        </div>
      )}

      {/* Login Status */}
      <div style={sectionStyle}>
        {props.isModLoggedIn ? (
          <>
            <div style={{ color: "green", fontWeight: 700, marginBottom: 5 }}>
              ✅ Đã đăng nhập
            </div>
            <div style={{ fontSize: 13 }}>ID: @{props.modUsername}</div>
            <button
              style={{ ...btnFull, background: "#dc2626" }}
              onClick={props.onLogout}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <div style={{ color: "red", fontWeight: 700, marginBottom: 5 }}>
              ⚠️ Chưa đăng nhập
            </div>
            {/* [ĐÃ SỬA] Xóa bỏ disabled để luôn cho phép đăng nhập */}
            <button style={btnFull} onClick={props.onLogin}>
              Đăng nhập Mod
            </button>
          </>
        )}
      </div>

      {/* Auto Options */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Tự động trả lời (AI)
        </div>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            cursor: isLocked ? "not-allowed" : "pointer",
            marginBottom: 6,
            opacity: isLocked ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={props.autoReplyEnabled}
            onChange={(e) => props.setAutoReplyEnabled(e.target.checked)}
            disabled={isLocked}
          />
          <span>Bật Auto Reply</span>
        </label>

        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            cursor: isLocked ? "not-allowed" : "pointer",
            opacity: isLocked ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={props.filterEnabled}
            onChange={(e) => props.setFilterEnabled(e.target.checked)}
            disabled={isLocked}
          />
          <span>Lọc Spam/Rác</span>
        </label>
      </div>

      {/* Manual Send */}
      <div
        style={{
          ...sectionStyle,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Gửi thủ công</div>
        <textarea
          style={{
            flex: 1,
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            resize: "none",
            outline: "none",
            background: isLocked ? "#e5e7eb" : "#fff",
          }}
          placeholder={
            props.isLiveEnded ? "Live đã kết thúc." : "Nhập tin nhắn..."
          }
          value={manualTxt}
          onInput={(e) => setManualTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLocked) handleSend();
            }
          }}
          disabled={isLocked}
        />
        <button
          style={{
            ...btnFull,
            background: isLocked ? "#9ca3af" : "#2563eb",
            cursor: isLocked ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={isLocked}
        >
          Gửi (Enter)
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
