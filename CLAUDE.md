# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

青甘西藏 29 天自驾规划静态网页应用，包含两个独立视图：

- **route-map/** - 交互式 Leaflet.js 地图，显示 GPS 航点和路线折线
- **travel-app/** - 时间轴 UI，包含每日行程、景点和费用追踪

## 开发方式

### 静态文件方式（无服务器）
直接在浏览器中打开 HTML 文件：
- `route-map/index.html` - 地图视图
- `travel-app/index.html` - 时间轴/费用视图

### 本地服务器方式（推荐，可编辑开销）
使用 Node.js 服务器，支持在网页上直接编辑开销数据：

```bash
cd travel-app
node server.js
# 浏览器打开 http://localhost:3000
```

修改开销后会自动保存到 `data.js` 文件，刷新页面即可看到更新。

## 代码架构

### route-map (交互式地图)

使用 IIFE 模块模式，加载顺序严格依赖：

1. `js/data.js` - **数据层**（GPS 坐标、路线折线、阶段颜色）
2. `js/map.js` - Leaflet 初始化，图层配置
3. `js/markers.js` - 标记点/圆圈渲染，弹出框内容
4. `js/controls.js` - UI 叠加层（图例、信息面板）
5. `js/app.js` - 入口，协调各模块初始化

**`data.js` 关键数据结构：**
- `LOCATIONS[]` - 地点对象数组 `{name, lat, lng, day, phase, alt, desc, major}`
- `ROUTE_POINTS{}` - 按阶段索引的折线坐标
- `PHASE_COLORS{}` - 阶段颜色映射（1-7）
- `PHASE_NAMES{}` - 阶段显示名称

### travel-app (时间轴视图)

单页 DOM 渲染模式，使用工厂函数辅助：

- `data.js` - **主要编辑文件**（`TRIP_DATA.days[]` 包含 29 天数据）
- `app.js` - 渲染逻辑，使用 `el()` DOM 工厂函数
- `server.js` - **本地服务器**（Express + API），支持网页编辑开销

**模式**：`el(tag, attrs, children)` 创建元素，支持样式、事件和嵌套内容。

## 数据修改

**route-map 地点数据：** 编辑 `route-map/js/data.js` - 向 `LOCATIONS[]` 添加对象，向 `ROUTE_POINTS[phase]` 添加坐标。

**travel-app 费用数据：** 有两种方式：

1. **网页编辑（推荐）**：启动服务器后，点击每行开销的"编辑"按钮即可修改
2. **手动编辑**：编辑 `travel-app/data.js` - 向每天的 `expenses` 数组添加 `{item: "...", amount: N}`。金额为纯数字。

## Git 使用

这是个人项目，有意义变更时提交即可。
