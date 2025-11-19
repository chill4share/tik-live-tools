const { GoogleGenerativeAI } = require("@google/generative-ai");
const { log, warn, err } = require("../utils/logger");
const {
  getSalesContext,
  containsBannedWords,
} = require("../utils/salesContext");
const { getModCredentials } = require("./authService");
const { getLiveHost } = require("../managers/stateManager");
const fs = require("fs");
const path = require("path");

let currentApiKey = "";

const SUPPORTED_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];

const CONFIG = {
  USER_COOLDOWN_MS: 30000,
  AI_DELAY_MS: 2500,
  MAX_QUEUE_SIZE: 20,
  CLEANUP_INTERVAL: 300000,
};

const MEMORY_LIMIT = 4;
const MEMORY_TIMEOUT = 120000;

let genAI = null;
let currentModelIndex = 0;
let model = null;

const userTimestamps = new Map();
const conversationHistory = new Map();
const processingQueue = [];
let isProcessing = false;

// --- HÀM QUAN TRỌNG: CẬP NHẬT KEY ---
function updateApiKey(newKey) {
  if (!newKey || newKey.trim() === "") {
    currentApiKey = "";
    genAI = null;
    model = null;
    log("[AI] Đã xóa API Key.");
    return;
  }
  currentApiKey = newKey.trim();
  initAI();
}

function initAI() {
  if (!currentApiKey) {
    warn("[AI Warning] Chưa có API Key. Vui lòng nhập trong Menu Trợ giúp.");
    return;
  }
  try {
    genAI = new GoogleGenerativeAI(currentApiKey);
    const modelName = SUPPORTED_MODELS[currentModelIndex];
    model = genAI.getGenerativeModel({ model: modelName });
    log(`[AI Status] Đã khởi tạo lại với Key mới & Model: ${modelName}`);
  } catch (e) {
    err("[AI Init Error]", e.message);
  }
}

function switchModel() {
  currentModelIndex++;
  if (currentModelIndex >= SUPPORTED_MODELS.length) {
    currentModelIndex = 0;
    return false;
  }
  const newModelName = SUPPORTED_MODELS[currentModelIndex];
  warn(`[AI Switch] Đang chuyển sang model dự phòng: ${newModelName}`);
  try {
    model = genAI.getGenerativeModel({ model: newModelName });
    return true;
  } catch (e) {
    return switchModel();
  }
}

async function attemptGenerate(prompt, retryCount = 0) {
  if (retryCount > 2) return null;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (e) {
    const errorMsg = (e.message || "").toLowerCase();
    if (
      errorMsg.includes("429") ||
      errorMsg.includes("503") ||
      errorMsg.includes("overloaded")
    ) {
      warn(
        `[AI Error] Model ${SUPPORTED_MODELS[currentModelIndex]} quá tải. Thử lại...`
      );
      if (switchModel()) {
        return await attemptGenerate(prompt, retryCount + 1);
      }
    }
    throw e;
  }
}

function getFormattedHistory(username) {
  const userData = conversationHistory.get(username);
  if (!userData) return "";

  if (Date.now() - userData.lastUpdate > MEMORY_TIMEOUT) {
    conversationHistory.delete(username);
    return "";
  }

  return userData.history.join("\n");
}

function updateHistory(username, userText, aiReply) {
  let userData = conversationHistory.get(username);
  if (!userData) {
    userData = { history: [], lastUpdate: Date.now() };
  }

  userData.history.push(`Customer: "${userText}"`);
  userData.history.push(`You: "${aiReply}"`);

  if (userData.history.length > MEMORY_LIMIT * 2) {
    userData.history = userData.history.slice(-(MEMORY_LIMIT * 2));
  }

  userData.lastUpdate = Date.now();
  conversationHistory.set(username, userData);
}

function saveMissedQuestion(username, question) {
  try {
    const logPath = path.join(process.cwd(), "missed_questions.txt");
    const time = new Date().toLocaleString("vi-VN");
    const line = `[${time}] @${username}: ${question}\n`;
    fs.appendFileSync(logPath, line, { encoding: "utf8" });
  } catch (e) {
    warn("[Log Missed] Không ghi được file:", e.message);
  }
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (processingQueue.length > 0) {
    const currentReq = processingQueue.shift();
    const { username, text, resolve } = currentReq;

    try {
      const currentHost = getLiveHost() || "";
      const context = getSalesContext(currentHost);
      const historyStr = getFormattedHistory(username);

      const prompt = `
        ${context}
        LỊCH SỬ TRÒ CHUYỆN:
        ${historyStr ? historyStr : "(Khách mới)"}
        TIN NHẮN KHÁCH (@${username}): "${text}"
        OUTPUT (Trả lời hoặc SKIP):
      `;

      let reply = await attemptGenerate(prompt);

      if (reply) {
        reply = reply.replace(/\n/g, " ").replace(/['"]/g, "").trim();
        if (
          reply.toUpperCase().includes("SKIP") ||
          reply.length < 2 ||
          containsBannedWords(reply)
        ) {
          saveMissedQuestion(username, text);
          resolve(null);
        } else {
          log(`[AI Reply] ✅ @${username}: "${reply}"`);
          updateHistory(username, text, reply);
          userTimestamps.set(username, Date.now());
          resolve(reply);
        }
      } else {
        resolve(null);
      }
    } catch (e) {
      err(`[AI Process Error] ${username}:`, e.message);
      resolve(null);
    }

    await new Promise((r) => setTimeout(r, CONFIG.AI_DELAY_MS));
  }

  isProcessing = false;
}

function generateReply(username, commentText) {
  if (!currentApiKey) return Promise.resolve(null);
  if (!model) initAI();
  if (!model) return Promise.resolve(null);

  const incomingName = (username || "").toString().trim().toLowerCase();
  const modCreds = getModCredentials();

  if (modCreds) {
    const botNickname = (modCreds.nickname || "").toLowerCase();
    const botUsername = (modCreds.username || "").toLowerCase();
    if (incomingName === botNickname || incomingName === botUsername) {
      return Promise.resolve(null);
    }
  }

  const currentHost = getLiveHost();
  if (currentHost && incomingName === currentHost.toLowerCase()) {
    return Promise.resolve(null);
  }

  if (containsBannedWords(commentText)) return Promise.resolve(null);

  const lastReplyTime = userTimestamps.get(username) || 0;
  const now = Date.now();
  if (now - lastReplyTime < CONFIG.USER_COOLDOWN_MS) {
    return Promise.resolve(null);
  }

  if (processingQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    processingQueue.push({ username, text: commentText, resolve });
    processQueue();
  });
}

setInterval(() => {
  const now = Date.now();
  for (const [user, timestamp] of userTimestamps) {
    if (now - timestamp > 300000) {
      userTimestamps.delete(user);
    }
  }
}, CONFIG.CLEANUP_INTERVAL);

// --- SỬA LỖI QUAN TRỌNG: EXPORT CẢ 2 HÀM ---
module.exports = { generateReply, updateApiKey };
