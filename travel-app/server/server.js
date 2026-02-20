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

      // 为缺少 ID 的标记点补充 ID 并保存回文件
      let needsSave = false;
      if (data.locations) {
        data.locations.forEach(loc => {
          if (!loc.id) {
            loc.id = 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            needsSave = true;
          }
        });
      }

      // 如果有 ID 生成，保存回文件
      if (needsSave) {
        fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8", (writeErr) => {
          if (writeErr) {
            console.error("保存 ID 失败:", writeErr);
          } else {
            console.log("[自动] 为标记点补充 ID 并保存");
          }
        });
      }

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

// ============ 行程编辑 API ============

// PUT /api/days/:dayId — 修改行程（除id和expenses外），可选更新地图标点
app.put("/api/days/:dayId", (req, res) => {
  const { dayId } = req.params;
  const { date, route, distance, elevation, stay, phase, spots, locations } = req.body;

  console.log(`[REQUEST] PUT /api/days/${dayId}, locations: ${locations ? locations.length : 0}`);

  updateTripData((data) => {
    const day = data.days.find((d) => d.id === dayId);
    if (!day) {
      throw new Error("未找到对应的天数");
    }

    // 更新允许的字段
    if (date !== undefined) day.date = date;
    if (route !== undefined) day.route = route;
    if (distance !== undefined) day.distance = distance;
    if (elevation !== undefined) day.elevation = elevation;
    if (stay !== undefined) day.stay = stay;
    if (phase !== undefined) day.phase = phase;
    if (spots !== undefined) day.spots = spots;

    // 处理地图标点更新（支持多个）- 基于 ID 的更新/新增/删除
    if (locations !== undefined && data.locations) {
      console.log(`[DEBUG] 处理 locations - dayId: ${dayId}, locations 数量: ${locations.length}`);

      // 1. 收集前端传来的 ID 列表
      const incomingIds = locations.map(loc => loc.id).filter(Boolean);
      console.log(`[DEBUG] incomingIds 数量: ${incomingIds.length}, IDs: ${incomingIds.join(', ')}`);

      // 2. 完全删除不在列表中的记录
      // 先收集要删除的索引（反向遍历避免索引问题）
      const indicesToDelete = [];
      data.locations.forEach((loc, idx) => {
        if (loc.day === dayId && !loc.deleted) {
          if (!incomingIds.includes(loc.id)) {
            indicesToDelete.push(idx);
            console.log(`[DEBUG] 删除: ${loc.id} - ${loc.name}`);
          }
        }
      });
      // 反向删除（从后往前删，避免索引偏移）
      for (let i = indicesToDelete.length - 1; i >= 0; i--) {
        data.locations.splice(indicesToDelete[i], 1);
      }
      console.log(`[DEBUG] 共删除 ${indicesToDelete.length} 个记录`);

      // 3. 处理每个位置：更新或新增
      if (Array.isArray(locations)) {
        locations.forEach((loc) => {
          if (loc && (loc.name || loc.lat || loc.lng) && loc.id) {
            // 查找是否已存在
            const existingIndex = data.locations.findIndex(
              l => l.id === loc.id && l.day === dayId
            );

            if (existingIndex >= 0) {
              // 更新现有记录
              console.log(`[DEBUG] 更新: ${loc.id} - ${loc.name}`);
              data.locations[existingIndex] = {
                ...data.locations[existingIndex],
                name: loc.name || "",
                lat: parseFloat(loc.lat) || 0,
                lng: parseFloat(loc.lng) || 0,
                alt: loc.alt || "",
                desc: loc.desc || "",
                major: loc.major || false,
                stay: loc.stay || "",
                order: loc.order !== undefined && loc.order !== null ? parseInt(loc.order, 10) : null,
              };
            } else {
              // 新增记录
              console.log(`[DEBUG] 新增: ${loc.id} - ${loc.name}`);
              data.locations.push({
                id: loc.id,
                name: loc.name || "",
                lat: parseFloat(loc.lat) || 0,
                lng: parseFloat(loc.lng) || 0,
                day: dayId,
                phase: day.phase,
                alt: loc.alt || "",
                desc: loc.desc || "",
                major: loc.major || false,
                stay: loc.stay || "",
                order: loc.order !== undefined && loc.order !== null ? parseInt(loc.order, 10) : null,
              });
            }
          }
        });
      }
    }

    return day;
  }, res, `修改行程: ${dayId}`);
});

// POST /api/days — 新增行程
app.post("/api/days", (req, res) => {
  const { insertAfter, day: newDay } = req.body;

  if (!insertAfter || !newDay) {
    return res.status(400).json({ error: "缺少必要参数" });
  }

  updateTripData((data) => {
    // 解析插入位置的 day 编号
    const insertNum = parseInt(insertAfter.replace("D", ""));
    if (isNaN(insertNum)) {
      throw new Error("无效的插入位置");
    }

    // 1. 找到插入位置索引
    const insertIndex = data.days.findIndex((d) => {
      const num = parseInt(d.id.replace("D", ""));
      return num === insertNum;
    });

    if (insertIndex === -1) {
      throw new Error("未找到插入位置: " + insertAfter);
    }

    // 2. 创建新 day 对象
    const dayId = "D" + (insertNum + 1);
    const day = {
      id: dayId,
      date: newDay.date || "",
      route: newDay.route || "",
      distance: newDay.distance || "200km",
      elevation: newDay.elevation || "3000m",
      stay: newDay.stay || "",
      phase: newDay.phase || 1,
      spots: newDay.spots || [],
      expenses: [],
    };

    // 3. 在插入位置后添加新 day
    data.days.splice(insertIndex + 1, 0, day);

    // 4. 重新索引后续所有 days（id +1）
    for (let i = insertIndex + 1; i < data.days.length; i++) {
      const num = parseInt(data.days[i].id.replace("D", ""));
      data.days[i].id = "D" + (num + 1);
    }

    // 5. 同步更新 locations 的 day 字段
    if (data.locations) {
      data.locations.forEach((loc) => {
        if (!loc.day) return;

        // 使用正则替换所有匹配的 day 编号
        loc.day = loc.day.replace(/D(\d+)/g, (match, num) => {
          const n = parseInt(num);
          if (n >= insertNum + 1) {
            return "D" + (n + 1);
          }
          return match;
        });
      });
    }

    // 6. 更新 totalDays
    data.totalDays = data.days.length;

    return day;
  }, res, `新增行程: 在 ${insertAfter} 后添加 ${newDay.date || ""}`);
});

// DELETE /api/days/:dayId — 删除行程
app.delete("/api/days/:dayId", (req, res) => {
  const { dayId } = req.params;

  updateTripData((data) => {
    // 解析要删除的 day 编号
    const deleteNum = parseInt(dayId.replace("D", ""));
    if (isNaN(deleteNum)) {
      throw new Error("无效的天数ID");
    }

    // 1. 找到要删除的 day 索引
    const deleteIndex = data.days.findIndex((d) => d.id === dayId);

    if (deleteIndex === -1) {
      throw new Error("未找到要删除的天数: " + dayId);
    }

    // 2. 删除该 day
    const removed = data.days.splice(deleteIndex, 1);

    // 3. 重新索引后续所有 days（id -1）
    for (let i = deleteIndex; i < data.days.length; i++) {
      const num = parseInt(data.days[i].id.replace("D", ""));
      data.days[i].id = "D" + (num - 1);
    }

    // 4. 同步更新 locations 的 day 字段
    if (data.locations) {
      data.locations.forEach((loc) => {
        if (!loc.day) return;

        const dayStr = "D" + deleteNum;

        // 处理单天格式: "D28" -> 删除该 location
        if (loc.day === dayStr) {
          loc.deleted = true;
        }
        // 处理范围格式: "D27-D29" -> "D27-D28"
        else if (loc.day.includes(dayStr)) {
          // 移除对应的 day（如 "D27-D29" 变成 "D27-D28"）
          loc.day = loc.day
            .split(/[,-]/)
            .map((d) => d.trim())
            .filter((d) => d !== dayStr)
            .join("-");
        }
        // 处理 >= 删除编号的需要 -1
        else {
          loc.day = loc.day.replace(/D(\d+)/g, (match, num) => {
            const n = parseInt(num);
            if (n > deleteNum) {
              return "D" + (n - 1);
            }
            return match;
          });
        }
      });
    }

    // 5. 更新 totalDays
    data.totalDays = data.days.length;

    return removed[0];
  }, res, `删除行程: ${dayId}`);
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

// 未匹配的 API 路由返回 404
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API 端点不存在" });
});

// SPA 路由：所有非 API 请求返回 index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
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
║    GET  /api/trip-data       - 获取行程数据           ║
║    POST /api/expenses/:dayId - 添加开销               ║
║    PUT  /api/expenses/:dayId/:idx - 修改开销          ║
║    DELETE /api/expenses/:dayId/:idx - 删除开销        ║
║    PUT  /api/days/:dayId     - 修改行程               ║
║    POST /api/days            - 新增行程               ║
║    DELETE /api/days/:dayId   - 删除行程               ║
╚═══════════════════════════════════════════════════════╝
  `);
});
