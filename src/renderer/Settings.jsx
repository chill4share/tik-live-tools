import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

const Settings = ({ onSave }) => {
  const [brandName, setBrandName] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [socialScript, setSocialScript] = useState("");
  const [bannedKeywords, setBannedKeywords] = useState("");

  // --- MỚI: State cho FAQ ---
  const [faqScenarios, setFaqScenarios] = useState("");

  // State cho các trường tùy chỉnh
  const [customFields, setCustomFields] = useState([]);

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      if (window.electronAPI) {
        try {
          const config = await window.electronAPI.getSalesSettings();
          setBrandName(config.brandName || "");
          setProductInfo(config.productInfo || "");
          setSocialScript(config.socialScript || "");
          setBannedKeywords(config.bannedKeywords || "");
          setFaqScenarios(config.faqScenarios || ""); // Load FAQ
          setCustomFields(config.customFields || []);
        } catch (e) {
          console.error("Load setting error:", e);
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async () => {
    const config = {
      brandName,
      productInfo,
      socialScript,
      bannedKeywords,
      faqScenarios, // Lưu FAQ
      customFields,
    };
    if (window.electronAPI) {
      await window.electronAPI.updateSalesSettings(config);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    if (onSave) onSave();
  };

  // Logic thêm/xóa trường tùy chỉnh
  const addCustomField = () => {
    setCustomFields([...customFields, { title: "", content: "" }]);
  };

  const removeCustomField = (index) => {
    const newFields = [...customFields];
    newFields.splice(index, 1);
    setCustomFields(newFields);
  };

  const updateCustomField = (index, key, value) => {
    const newFields = [...customFields];
    newFields[index][key] = value;
    setCustomFields(newFields);
  };

  // Style mở rộng (Giữ nguyên gốc)
  const containerStyle = {
    padding: "20px",
    maxWidth: "95%", // Mở rộng ra 95% màn hình
    margin: "0 auto",
    background: "white",
    borderRadius: "8px",
    height: "100%",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginTop: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    background: "#fff",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontWeight: "bold",
    color: "#1f2937",
    fontSize: "15px",
    display: "block",
  };
  const descStyle = {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "4px",
    fontStyle: "italic",
  };

  const sectionStyle = {
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  };

  if (isLoading)
    return <div style={{ padding: 20 }}>⏳ Đang tải cấu hình...</div>;

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          paddingBottom: "15px",
        }}
      >
        <h2 style={{ margin: 0, color: "#111827" }}>
          ⚙️ Cài đặt bán hàng (AI Learning)
        </h2>
        <button
          onClick={handleSave}
          className="btn"
          style={{
            padding: "10px 30px",
            background: isSaved ? "#059669" : "#2563eb",
            color: "white",
            fontWeight: "bold",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {isSaved ? "✅ ĐÃ LƯU" : "💾 LƯU CÀI ĐẶT"}
        </button>
      </div>
      {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div style={sectionStyle}>
          <label style={labelStyle}>Tên Shop / Thương hiệu:</label>
          <input
            style={inputStyle}
            value={brandName}
            onInput={(e) => setBrandName(e.target.value)}
            placeholder="Ví dụ: Tổng Kho Ghế..."
          />
        </div>
        <div style={sectionStyle}>
          <label style={labelStyle}>Từ khóa cấm (ngăn cách dấu phẩy):</label>
          <input
            style={inputStyle}
            value={bannedKeywords}
            onInput={(e) => setBannedKeywords(e.target.value)}
            placeholder="sđt, bank, ck..."
          />
        </div>
      </div>
      {/* KHỐI 2: SẢN PHẨM (QUAN TRỌNG NHẤT) */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Thông tin sản phẩm & Chính sách:</label>
        <div style={descStyle}>
          * AI sẽ dựa vào đây để trả lời. Hãy ghi rõ giá, size, màu sắc, bảo
          hành.
        </div>
        <textarea
          style={{
            ...inputStyle,
            height: "250px",
            resize: "vertical",
            fontFamily: "monospace",
          }}
          value={productInfo}
          onInput={(e) => setProductInfo(e.target.value)}
        />
      </div>
      {/* --- KHỐI MỚI: XỬ LÝ TỪ CHỐI (FAQ) --- */}
      <div style={sectionStyle}>
        <label style={labelStyle}>🛡️ Kịch bản Xử lý Từ chối / FAQ:</label>
        <div style={descStyle}>
          * Dạy AI cách "cãi lý" khi khách chê đắt, chê ship cao, hoặc hỏi khó.
        </div>
        <textarea
          style={{ ...inputStyle, height: "150px", resize: "vertical" }}
          value={faqScenarios}
          onInput={(e) => setFaqScenarios(e.target.value)}
          placeholder="Ví dụ: Khách chê đắt -> Trả lời: Tiền nào của nấy bác ơi..."
        />
      </div>
      {/* --------------------------------------- */}
      {/* KHỐI 3: KỊCH BẢN CHÀO HỎI */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Kịch bản chào hỏi / Xã giao:</label>
        <textarea
          style={{ ...inputStyle, height: "120px", resize: "vertical" }}
          value={socialScript}
          onInput={(e) => setSocialScript(e.target.value)}
        />
      </div>
      {/* KHỐI 4: MỞ RỘNG (CUSTOM FIELDS) */}
      <div
        style={{
          ...sectionStyle,
          border: "1px dashed #2563eb",
          background: "#eff6ff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <div>
            <label style={{ ...labelStyle, color: "#1e40af" }}>
              Thông tin mở rộng (Tùy chỉnh):
            </label>
            <div style={descStyle}>
              Thêm các mục mới mà AI chưa biết (VD: "Chương trình KM", "Lưu ý
              Ship").
            </div>
          </div>
          <button
            onClick={addCustomField}
            style={{
              background: "#fff",
              border: "1px solid #2563eb",
              color: "#2563eb",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            + Thêm mục mới
          </button>
        </div>

        {customFields.length === 0 && (
          <div
            style={{ textAlign: "center", color: "#93c5fd", padding: "20px" }}
          >
            Chưa có thông tin mở rộng nào.
          </div>
        )}

        {customFields.map((field, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
              alignItems: "start",
            }}
          >
            <div style={{ flex: 1 }}>
              <input
                style={{ ...inputStyle, marginTop: 0, fontWeight: "bold" }}
                placeholder="Tiêu đề (VD: Khuyến Mãi)"
                value={field.title}
                onInput={(e) =>
                  updateCustomField(index, "title", e.target.value)
                }
              />
            </div>
            <div style={{ flex: 3 }}>
              <textarea
                style={{
                  ...inputStyle,
                  marginTop: 0,
                  height: "38px",
                  minHeight: "38px",
                  resize: "vertical",
                }}
                placeholder="Nội dung chi tiết..."
                value={field.content}
                onInput={(e) =>
                  updateCustomField(index, "content", e.target.value)
                }
              />
            </div>
            <button
              onClick={() => removeCustomField(index)}
              style={{
                background: "#fee2e2",
                color: "#ef4444",
                border: "1px solid #fca5a5",
                borderRadius: "4px",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                marginTop: "0",
              }}
              title="Xóa dòng này"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      <div style={{ height: "50px" }}></div> {/* Spacer dưới cùng */}
    </div>
  );
};

export default Settings;
