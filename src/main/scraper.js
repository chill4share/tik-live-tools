// src/main/scraper.js

async function injectChatScraper(
  page,
  onCommentCallback,
  customSelectors = {}
) {
  // Sử dụng selector động (nếu có) hoặc mặc định
  const MESSAGE_SELECTOR =
    customSelectors.chatItemSelector || '[data-e2e="chat-message"]';
  const USER_SELECTOR =
    customSelectors.userSelector || '[data-e2e="message-owner-name"]';
  const TEXT_SELECTOR =
    customSelectors.textSelector || ".break-words.align-middle";

  console.log("[Scraper] Injecting with selectors:", {
    MESSAGE_SELECTOR,
    USER_SELECTOR,
    TEXT_SELECTOR,
  });

  try {
    await page.waitForSelector(MESSAGE_SELECTOR, { timeout: 15000 });
  } catch (e) {
    console.warn("Chưa thấy tin nhắn nào (hoặc Selector sai)...");
  }

  // --- FIX LỖI: Bọc exposeFunction trong try-catch ---
  try {
    await page.exposeFunction("onNewCommentScraped", (commentData) => {
      onCommentCallback(commentData);
    });
  } catch (e) {
    // Nếu lỗi là "already exists" thì bỏ qua (coi như đã thành công từ trước)
    if (e.message && e.message.includes("already exists")) {
      console.log(
        "[Scraper] Function 'onNewCommentScraped' đã tồn tại, tiếp tục sử dụng."
      );
    } else {
      console.error("[Scraper] Lỗi exposeFunction:", e);
    }
  }
  // --------------------------------------------------

  await page.evaluate(
    (msgSel, userSel, textSel) => {
      const processNode = (node, isHistory = false) => {
        try {
          if (node.dataset.scraped === "true") return;
          node.dataset.scraped = "true";

          const userEl = node.querySelector(userSel);
          const textEl = node.querySelector(textSel);

          if (userEl && textEl) {
            const user = userEl.innerText.trim();
            const text = textEl.innerText.trim();

            if (user && text && !text.includes("Welcome to TikTok")) {
              window.onNewCommentScraped({ user, text, isHistory });
            }
          }
        } catch (e) {}
      };

      // GIAI ĐOẠN 1: QUÉT TIN CŨ
      const existingMsgs = document.querySelectorAll(msgSel);
      existingMsgs.forEach((node) => processNode(node, true));

      // GIAI ĐOẠN 2: BẮT TIN MỚI
      let chatContainer = null;
      const sampleMsg = document.querySelector(msgSel);

      // Logic tìm container cha tự động
      if (sampleMsg) {
        chatContainer = sampleMsg.parentElement?.parentElement || null;
      } else {
        const scrollContainer = document.querySelector(
          '[class*="overflow-y-scroll"]'
        );
        if (scrollContainer)
          chatContainer = scrollContainer.querySelector("div.absolute");
      }

      if (!chatContainer)
        return console.error("SCRAPER: Không tìm thấy khung chat!");

      // Ngắt Observer cũ nếu có (để tránh chạy chồng chéo)
      if (window.chatObserver) {
        window.chatObserver.disconnect();
      }

      window.chatObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                const msgNode = node.querySelector(msgSel) || node;
                if (msgNode.matches && msgNode.matches(msgSel)) {
                  processNode(msgNode, false);
                } else {
                  const children = node.querySelectorAll
                    ? node.querySelectorAll(msgSel)
                    : [];
                  children.forEach((child) => processNode(child, false));
                }
              }
            }
          }
        }
      });

      window.chatObserver.observe(chatContainer, {
        childList: true,
        subtree: true,
      });
    },
    MESSAGE_SELECTOR,
    USER_SELECTOR,
    TEXT_SELECTOR
  );
}

module.exports = { injectChatScraper };
