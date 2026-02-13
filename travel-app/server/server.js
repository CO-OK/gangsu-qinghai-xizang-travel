/**
 * 青甘西藏自驾行程 — Express 服务器
 *
 * RESTful API + 静态文件服务
 *
 * 启动方式：
 *   cd server && node server.js
 *
 * 访问：
 *   http://localhost:3000
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "../data/trip.json");

// 中间件
app.use(express.json());

// 静态文件服务（client 目录）
app.use(express.static(path.join(__dirname, "../client")));

// ============ API 端点 ============

// GET /api/trip-data — 获取完整数据
app.get("/api/trip-data", (req, res) => {
  fs.readFile(DATA_FILE, "utf8", (err, content) => {
    if (err) {
      console.error("读取数据文件失败:", err);
      return res.status(500).json({ error: "无法读取数据文件" });
    }
    try {
      const data = JSON.parse(content);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "数据格式错误" });
    }
  });
});

// POST /api/expenses/:dayId — 添加开销
app.post("/api/expenses/:dayId", (req, res) => {
  const { dayId } = req.params;
  const { item, amount } = req.body;

  if (!item || amount === undefined) {
    return res.status(400).json({ error: "缺少必要参数" });
  }

  updateTripData((data) => {
    const day = data.days.find((d) => d.id === dayId);
    if (!day) {
      throw new Error("未找到对应的天数");
    }
    if (!day.expenses) day.expenses = [];
    day.expenses.push({ item, amount: Number(amount) });
    return day;
  }, res, `添加开销: ${dayId} - ${item}: ¥${amount}`);
});

// PUT /api/expenses/:dayId/:index — 修改开销
app.put("/api/expenses/:dayId/:index", (req, res) => {
  const { dayId, index } = req.params;
  const { item, amount } = req.body;

  const idx = parseInt(index);
  if (isNaN(idx) || item === undefined || amount === undefined) {
    return res.status(400).json({ error: "参数错误" });
  }

  updateTripData((data) => {
    const day = data.days.find((d) => d.id === dayId);
    if (!day) {
      throw new Error("未找到对应的天数");
    }
    if (!day.expenses || idx >= day.expenses.length) {
      throw new Error("开销索引超出范围");
    }
    day.expenses[idx].item = item;
    day.expenses[idx].amount = Number(amount);
    return day;
  }, res, `修改开销: ${dayId}[${idx}] - ${item}: ¥${amount}`);
});

// DELETE /api/expenses/:dayId/:index — 删除开销
app.delete("/api/expenses/:dayId/:index", (req, res) => {
  const { dayId, index } = req.params;

  const idx = parseInt(index);
  if (isNaN(idx)) {
    return res.status(400).json({ error: "参数错误" });
  }

  updateTripData((data) => {
    const day = data.days.find((d) => d.id === dayId);
    if (!day) {
      throw new Error("未找到对应的天数");
    }
    if (!day.expenses || idx >= day.expenses.length) {
      throw new Error("开销索引超出范围");
    }
    const removed = day.expenses.splice(idx, 1);
    return removed[0];
  }, res, `删除开销: ${dayId}[${idx}]`);
});

// ============ 辅助函数 ============

function updateTripData(transform, res, logMessage) {
  fs.readFile(DATA_FILE, "utf8", (err, content) => {
    if (err) {
      return res.status(500).json({ error: "无法读取数据文件" });
    }

    try {
      const data = JSON.parse(content);
      const result = transform(data);

      // 写回文件
      fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8", (writeErr) => {
        if (writeErr) {
          console.error("写入文件失败:", writeErr);
          return res.status(500).json({ error: "保存失败" });
        }
        console.log(`[${new Date().toISOString()}] ${logMessage}`);
        res.json({ success: true, data: result });
      });
    } catch (e) {
      console.error("处理数据时出错:", e);
      res.status(500).json({ error: e.message || "处理数据时出错" });
    }
  });
}

// SPA 路由：所有非 API 请求返回 index.html
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "../client/index.html"));
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     青甘西藏自驾行程 — 本地服务器                      ║
╠═══════════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                         ║
║                                                       ║
║  API 端点:                                            ║
║    GET  /api/trip-data     - 获取行程数据             ║
║    POST /api/expenses/:dayId   - 添加开销            ║
║    PUT  /api/expenses/:dayId/:idx - 修改开销         ║
║    DELETE /api/expenses/:dayId/:idx - 删除开销        ║
╚═══════════════════════════════════════════════════════╝
  `);
});
