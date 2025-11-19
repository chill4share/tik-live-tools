const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { log, err } = require("./logger");

// --- CẬP NHẬT DỮ LIỆU TỪ FILE "DỮ LIỆU TRẢ LỜI" ---
const DEFAULT_PRODUCT_INFO = `
[DANH MỤC 1: KIẾN THỨC SẢN PHẨM CƠ BẢN]
1. GIÁ CẢ & ƯU ĐÃI:
   - Ghế đôi: 2.200.000đ (2tr2). 
   - Ghế đơn: 1.600.000đ (1tr6).
   - Kịch bản giá rẻ: "Dạ anh/chị thấy giá thấp hơn là do đang có voucher trợ giá của TikTok Shop đó ạ, chốt liền kẻo hết mã nhé!"

2. KÍCH THƯỚC & TẢI TRỌNG:
   - Ghế đôi: Đệm dài 1m5, Rộng 93cm - Chịu tải 300kg (2 người lớn + 1 trẻ em thoải mái).
   - Ghế đơn: Đệm dài 1m5, Rộng 66cm - Chịu tải 150kg.
   - Tổng thể: Dài ~1m8 (tính cả phần gác chân duỗi ra).

3. CHẤT LIỆU & MÀU SẮC:
   - Màu sắc: 4 màu hot (Nâu, Cam, Xám, Be). Nhà có trẻ nhỏ nên khuyên lấy màu Nâu/Xám cho sạch.
   - Khung sắt: Thép Hòa Phát dày 2 ly, khung OVAN 40x20mm, sơn tĩnh điện bóng mịn (chống gỉ sét, bền như mới).
   - Da ghế: Da PU cao cấp, mát lạnh, không bí nóng, không nổ, lau khăn ẩm là sạch.
   
   *Phân biệt các loại đệm (để tư vấn):*
   - Đệm Memory Foam: Dòng cao cấp, ôm sát cơ thể, êm sâu, giảm đau mỏi (độ bền chỉ sau cao su non).
   - Đệm Cotton/Eco Foam: Kết hợp bông tự nhiên dệt tấm & foam định hình -> Êm ái, thoáng khí, giữ form tốt không lún.

4. TÍNH NĂNG NỔI BẬT:
   - Điều chỉnh: 5 cấp độ (cả tựa lưng và gác chân) -> Ngồi đọc sách, xem TV hay ngủ trưa đều tiện.
   - Gác chân (CON LĂN MASSAGE): 
     + Là combo gác chân kèm con lăn massage đa năng.
     + Tác động huyệt đạo gan bàn chân (huyệt Dũng Tuyền), giúp lưu thông máu, giảm tê bì.
     + Cực tốt cho người già hoặc người đi lại nhiều.

[DANH MỤC 2: VẬN CHUYỂN & LẮP ĐẶT]
1. SHIP HÀNG & THỜI GIAN:
   - Thời gian: Shop có ĐA KHO nên ship rất nhanh, chỉ 1-2 ngày là nhận được (trừ khi bên vận chuyển delay).
   - Phí ship:
     + Miền Bắc/Nam: Hơn 100k.
     + Miền Trung: Hơn 400k (do gửi từ kho Hà Nội vào).
   - Xử lý ship cao: "Hàng nặng cồng kềnh nên ship hơi cao xíu, nhưng bác áp thử mã Freeship của TikTok xem được giảm 200k không ạ?"

2. BẢO HÀNH & LẮP ĐẶT:
   - Lắp đặt: "Dạ dễ lắm ạ, shop đã lắp sẵn 80% rồi, con gái cũng lắp được trong 5 phút theo tờ hướng dẫn đi kèm".
   - Bảo hành: Lỗi 1 đổi 1 trong 7 ngày. Bảo hành khung sắt 2 năm.
   - Kiểm hàng: "Nhận hàng bác cứ bảo shipper cho kiểm tra, ưng ý mới nhận nhé!"
`;

const DEFAULT_SOCIAL_SCRIPT = `
[DANH MỤC 3: GIAO TIẾP KHÉO LÉO]
1. Khách khen đẹp/chào hỏi:
   - "Dạ ghế đẹp chờ người xứng đáng rinh về thôi ạ 🥰"
   - "Chào bác ạ! Bác ưng màu nào để em lên đơn cho nóng?"

2. Khách hỏi đời tư/trêu đùa:
   - "Dạ em chưa có người yêu, chỉ có ghế êm như vòng tay người yêu thôi 🤣"
   - "Thính này em không dính, em chỉ dính đơn hàng thôi bác ơi!"
`;

const DEFAULT_FAQ_SCENARIOS = `
[DANH MỤC 4: XỬ LÝ CÂU HỎI KHÓ (FAQ)]
1. "Sao chỗ kia bán rẻ hơn?" / "Đắt thế?"
   -> "Dạ tiền nào của nấy bác ơi. Bên em là hàng khung Hòa Phát dày 2 ly, đệm đúc nguyên khối chứ không phải hàng xưởng gia công ọp ẹp. Mua 1 lần dùng 10 năm!"

2. "Nằm có nóng lưng không?"
   -> "Dạ không đâu ạ, da PU bên em mát lạnh, cộng thêm đệm thiết kế thoáng khí nằm điều hòa là bao phê!"

3. "Con lăn có tác dụng gì? Có đa năng không?"
   -> "Dạ con lăn massage bên em thiết kế 3D, vừa day vừa ấn huyệt đạo bàn chân giúp lưu thông máu cực tốt, không chỉ là rung hời hợt đâu ạ."

4. "Tôi ở miền Trung ship đắt quá?"
   -> "Dạ do kho em ở Hà Nội/Sài Gòn gửi về nên hơi cao xíu, nhưng bù lại bác nhận được hàng chuẩn, đóng gói kỹ càng 2 lớp xốp ạ."
`;

const DEFAULT_BANNED_KEYWORDS = [
  "shopee",
  "lazada",
  "tiki",
  "sendo",
  "facebook",
  "zalo",
  "instagram",
  "chuyển khoản",
  "ck",
  "bank",
  "stk",
  "số tài khoản",
  "gọi điện",
  "sđt",
  "số điện thoại",
  "liên hệ",
  "09",
  "08",
  "03",
  "07",
  "05",
  "giá rẻ nhất",
  "cam kết 100%",
  "trị dứt điểm",
  "chữa bệnh",
];

// --- GIỮ NGUYÊN CÁC HÀM LOGIC BÊN DƯỚI ---
const DEFAULT_BRAND_NAME = "Tổng Kho Ghế";

const DEFAULT_CONFIG = {
  brandName: DEFAULT_BRAND_NAME,
  productInfo: DEFAULT_PRODUCT_INFO,
  socialScript: DEFAULT_SOCIAL_SCRIPT,
  faqScenarios: DEFAULT_FAQ_SCENARIOS,
  bannedKeywords: DEFAULT_BANNED_KEYWORDS,
  customFields: [],
};

const CONFIG_FILENAME = "sales_config.json";
let dynamicConfig = { ...DEFAULT_CONFIG };
let isConfigLoaded = false;

function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_FILENAME);
}

function loadSalesConfig(forceReload = false) {
  if (isConfigLoaded && !forceReload) return;

  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, "utf-8");
      const savedConfig = JSON.parse(rawData);
      // Merge config cũ với config mới để giữ lại các trường custom nếu có
      dynamicConfig = {
        ...DEFAULT_CONFIG,
        ...savedConfig,
        // Ưu tiên dùng data mới cập nhật trong code nếu user chưa sửa file json
        productInfo: savedConfig.productInfo || DEFAULT_PRODUCT_INFO,
        faqScenarios: savedConfig.faqScenarios || DEFAULT_FAQ_SCENARIOS,
      };
      log("[Config] Đã tải cấu hình cá nhân.");
    } else {
      saveConfigToDisk(DEFAULT_CONFIG);
      log("[Config] Đã tạo cấu hình mặc định mới nhất.");
    }
    isConfigLoaded = true;
  } catch (e) {
    err("[Config] Lỗi tải file:", e);
    dynamicConfig = { ...DEFAULT_CONFIG };
  }
}

function saveConfigToDisk(config) {
  try {
    const filePath = getConfigPath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    err("[Config] Lỗi lưu file:", e);
  }
}

function getSalesConfig() {
  if (!isConfigLoaded) loadSalesConfig();
  return {
    ...dynamicConfig,
    bannedKeywords: dynamicConfig.bannedKeywords.join(", "),
  };
}

function updateSalesConfig(newConfig) {
  if (!newConfig) return;
  dynamicConfig = { ...dynamicConfig, ...newConfig };

  if (typeof newConfig.bannedKeywords === "string") {
    dynamicConfig.bannedKeywords = newConfig.bannedKeywords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
  }
  saveConfigToDisk(dynamicConfig);
  isConfigLoaded = true;
  log("[Config] Đã cập nhật settings mới.");
}

function getSalesContext(hostname) {
  const {
    brandName,
    productInfo,
    socialScript,
    faqScenarios,
    bannedKeywords,
    customFields,
  } = dynamicConfig;
  const bannedList = bannedKeywords.slice(0, 5).join(", ");

  let customContext = "";
  if (customFields && customFields.length > 0) {
    customContext = customFields
      .map((f) => `[${f.title.toUpperCase()}]:\n${f.content}`)
      .join("\n");
  }

  return `
    VAI TRÒ: Bạn là chủ shop "${brandName}" đang livestream bán ghế thư giãn.
    MỤC TIÊU: Trả lời tự nhiên, ngắn gọn (dưới 30 từ), khéo léo chốt đơn.

    --- QUY TẮC XỬ LÝ THÔNG MINH ---
    1. VỚI CÂU HỎI CÓ SẴN TRONG DỮ LIỆU:
       -> Trả lời chính xác theo thông tin đã học (Giá, Kích thước, Bảo hành...).
    
    2. VỚI CÂU HỎI MỚI/LẠ (CHƯA CÓ KỊCH BẢN):
       -> ĐƯỢC PHÉP SUY LUẬN LINH HOẠT từ tính năng sản phẩm để trả lời.
       -> Ví dụ: Khách hỏi "Ghế này nằm xem phim lâu có mỏi không?", dù không có câu mẫu, hãy tự suy luận từ "Đệm êm + Ngả lưng" để trả lời: "Dạ không lo mỏi đâu ạ, ghế có đệm êm lại ngả lưng được, nằm cày phim cả ngày bao phê ạ!".
       -> NGUYÊN TẮC CỐT LÕI: Chỉ suy luận từ dữ liệu thật (Khung thép, Đệm, Sơn tĩnh điện...), TUYỆT ĐỐI KHÔNG BỊA tính năng không có (như loa bluetooth, sạc điện thoại...).

    3. KHI GẶP CÂU HỎI QUÁ KHÓ / KHÔNG LIÊN QUAN / TỪ CẤM:
       -> Trả về đúng 1 chữ: "SKIP".
       (Hệ thống sẽ tự động lưu lại câu hỏi này để chủ shop trả lời sau).

    --- DỮ LIỆU KIẾN THỨC (DÙNG ĐỂ SUY LUẬN) ---
    ${productInfo}
    
    ${socialScript}
    ${faqScenarios}
    ${customContext}
    
    --- DANH SÁCH CẤM ---
    - Không nhắc đến: ${bannedList}...
    - Không xin số điện thoại trên live.
  `;
}

function containsBannedWords(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return dynamicConfig.bannedKeywords.some((word) => lower.includes(word));
}

loadSalesConfig();

module.exports = {
  getSalesContext,
  containsBannedWords,
  updateSalesConfig,
  getSalesConfig,
  loadSalesConfig,
};
