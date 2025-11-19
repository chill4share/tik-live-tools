const { log } = require("../utils/logger");

let currentLiveHost = null;
let isLiveOnline = false;
let dataSource = "LIBRARY"; // Giá trị mặc định: 'LIBRARY' hoặc 'SCRAPER'

module.exports = {
  getLiveHost: () => currentLiveHost,
  setLiveHost: (host) => {
    currentLiveHost = host;
  },

  getLiveStatus: () => isLiveOnline,
  setLiveStatus: (status) => {
    isLiveOnline = status;
    // console.log(`[STATE] Live Status: ${status ? "ON" : "OFF"}`);
  },

  // --- QUẢN LÝ NGUỒN DỮ LIỆU ---
  getDataSource: () => dataSource,
  setDataSource: (source) => {
    dataSource = source;
    console.log(`[SYSTEM] Nguồn dữ liệu chính thức: ${source}`);
  },
};
