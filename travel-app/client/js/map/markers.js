/**
 * 标记点渲染模块
 * 负责：图标工厂、标记点创建、路线绑定
 */

const MarkersModule = (() => {
    // 存储图层组（用于图例切换）
    const phaseLayers = {};
    const routeLayers = {};

    // 获取阶段颜色
    function getPhaseColor(phaseId) {
        const phases = MapData.getPhases();
        const phase = phases.find(p => p.id === phaseId);
        return phase?.color || '#999';
    }

    // ============== 图标工厂 ==============

    /**
     * 创建普通地点图标
     */
    function createIcon(phase, major) {
        const color = getPhaseColor(phase);
        const size = major ? 12 : 8;
        const border = major ? 3 : 2;
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: ${border}px solid white;
                border-radius: 50%;
                box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [size + border * 2, size + border * 2],
            iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
            popupAnchor: [0, -(size / 2 + border)],
        });
    }

    /**
     * 创建起点/终点特殊图标
     */
    function createSpecialIcon(type) {
        const emoji = type === 'start' ? '🚗' : '🏁';
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size: 24px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${emoji}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16],
        });
    }

    /**
     * 创建高亮景点图标
     */
    function createHighlightIcon(phase) {
        const color = getPhaseColor(phase);
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 16px;
                height: 16px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 2px ${color}, 0 2px 6px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -13],
        });
    }

    /**
     * 判断一个地点是否需要高亮图标
     */
    function isHighlight(name) {
        const keywords = MapData.getHighlightKeywords();
        return keywords.some(keyword => name.includes(keyword));
    }

    /**
     * 根据地点信息选择合适的图标
     */
    function resolveIcon(loc) {
        if (loc.name === '酒泉(终点)') return createSpecialIcon('end');
        if (loc.name === '酒泉' && loc.phase === 1) return null; // 起点已单独添加
        if (isHighlight(loc.name)) return createHighlightIcon(loc.phase);
        return createIcon(loc.phase, loc.major);
    }

    // ============== Popup 内容生成 ==============

    function buildPopupHTML(loc) {
        const color = getPhaseColor(loc.phase);
        return `
            <div class="popup-day" style="background: ${color};">${loc.day}</div>
            <div class="popup-title">${loc.name}</div>
            <div class="popup-info">
                ${loc.desc}<br>
                海拔: ${loc.alt}
                ${loc.stay ? '<br><span style="color: #E67E22; font-weight: 600;">🏨 ' + loc.stay + '</span>' : ''}
            </div>
        `;
    }

    // ============== 辅助函数 ==============

    /**
     * 从 day 字符串提取天数编号
     * 处理 "D1", "D1-D2" 等格式
     */
    function extractDayNumber(dayStr) {
        if (!dayStr) return 999;
        const match = dayStr.match(/D(\d+)/);
        return match ? parseInt(match[1], 10) : 999;
    }

    /**
     * 获取按阶段和天数排序的路线点
     * 从 locations 动态生成，而非使用预定义的 routePoints
     */
    function getSortedLocationsByPhase(locations, phase) {
        return locations
            .filter(loc => loc.phase === phase && !loc.deleted && !loc.labelOnly)
            .sort((a, b) => {
                const dayA = extractDayNumber(a.day);
                const dayB = extractDayNumber(b.day);
                if (dayA !== dayB) return dayA - dayB;
                // 同天按数组顺序
                return 0;
            })
            .map(loc => [loc.lat, loc.lng]);
    }

    // ============== 渲染方法 ==============

    /**
     * 获取某阶段的所有地点（已排序）
     * 排序规则：按天数 -> 按 order 字段 -> 按数组顺序
     */
    function getLocationsByPhase(locations, phase) {
        return locations
            .filter(loc => loc.phase === phase && !loc.deleted && !loc.labelOnly)
            .sort((a, b) => {
                const dayA = extractDayNumber(a.day);
                const dayB = extractDayNumber(b.day);
                if (dayA !== dayB) return dayA - dayB;
                // 同天内按 order 排序（可选字段，数值越小越靠前）
                const orderA = a.order ?? Infinity;
                const orderB = b.order ?? Infinity;
                if (orderA !== orderB) return orderA - orderB;
                return 0;
            });
    }

    /**
     * 绘制所有路线
     * 从 locations 动态生成路线，包括阶段之间的连接线
     */
    function drawRoutes(map) {
        const locations = MapData.getLocations();
        const phases = MapData.getPhases();
        const maxPhase = phases.length;

        // 先绘制各阶段的路线
        for (let phase = 1; phase <= maxPhase; phase++) {
            const locs = getLocationsByPhase(locations, phase);
            const points = locs.map(loc => [loc.lat, loc.lng]);

            if (points.length < 2) continue;

            const color = getPhaseColor(phase);
            const isReturnPhase = phase === 7;

            const polyline = L.polyline(points, {
                color: color,
                weight: 4,
                opacity: 0.85,
                smoothFactor: 1.5,
                dashArray: isReturnPhase ? '8, 6' : null, // 返程用虚线
            }).addTo(map);

            routeLayers[phase] = polyline;
        }

        // 绘制阶段之间的连接线
        const connectorColor = '#888888'; // 灰色连接线
        for (let phase = 1; phase < maxPhase; phase++) {
            const currentPhaseLocs = getLocationsByPhase(locations, phase);
            const nextPhaseLocs = getLocationsByPhase(locations, phase + 1);

            if (currentPhaseLocs.length === 0 || nextPhaseLocs.length === 0) continue;

            // 获取当前阶段最后一个点和下一个阶段第一个点
            const lastPoint = currentPhaseLocs[currentPhaseLocs.length - 1];
            const firstPoint = nextPhaseLocs[0];

            const connectorPoints = [
                [lastPoint.lat, lastPoint.lng],
                [firstPoint.lat, firstPoint.lng]
            ];

            const connector = L.polyline(connectorPoints, {
                color: connectorColor,
                weight: 3,
                opacity: 0.7,
                smoothFactor: 1.5,
                dashArray: '5, 5', // 虚线表示连接
            }).addTo(map);

            routeLayers[`connector_${phase}`] = connector;
        }
    }

    /**
     * 绘制所有标记点
     */
    function drawMarkers(map) {
        const locations = MapData.getLocations();
        const phases = MapData.getPhases();
        const maxPhase = phases.length;

        // 初始化各阶段图层组
        for (let phase = 1; phase <= maxPhase; phase++) {
            phaseLayers[phase] = L.layerGroup().addTo(map);
        }

        // 起点特殊标记
        L.marker([39.7332, 98.4941], { icon: createSpecialIcon('start'), zIndexOffset: 1000 })
            .bindPopup(`
                <div class="popup-day" style="background: ${getPhaseColor(1)};">出发点</div>
                <div class="popup-title">酒泉</div>
                <div class="popup-info">30天青甘藏大环线起点<br>海拔: 1500m</div>
            `, { className: 'custom-popup' })
            .addTo(map);

        // 遍历所有地点（过滤已删除的）
        locations.filter(loc => !loc.deleted).forEach(loc => {
            if (loc.labelOnly) return;

            const icon = resolveIcon(loc);
            if (!icon) return; // 起点已单独处理

            const marker = L.marker([loc.lat, loc.lng], {
                icon: icon,
                zIndexOffset: loc.major ? 500 : 100,
            }).bindPopup(buildPopupHTML(loc), {
                className: 'custom-popup',
                maxWidth: 250,
            });

            // 主要地点显示永久标签
            if (loc.major) {
                marker.bindTooltip(loc.name, {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -10],
                    className: 'custom-tooltip',
                    opacity: 0.9,
                });
            }

            marker.addTo(phaseLayers[loc.phase]);
        });
    }

    /**
     * 适配地图视野到所有标记点
     */
    function fitMapBounds(map) {
        const locations = MapData.getLocations();
        const config = MapData.getMapConfig();
        const allPoints = locations.filter(l => !l.labelOnly).map(l => [l.lat, l.lng]);
        if (allPoints.length > 0) {
            map.fitBounds(allPoints, { padding: config.fitBoundsPadding || [50, 50] });
        }
    }

    /**
     * 清除所有标记和路线
     */
    function clearAll(map) {
        // 清除各阶段图层
        Object.values(phaseLayers).forEach(layer => {
            if (layer) map.removeLayer(layer);
        });
        // 清除路线图层
        Object.values(routeLayers).forEach(layer => {
            if (layer) map.removeLayer(layer);
        });
        // 重置图层对象
        Object.keys(phaseLayers).forEach(key => delete phaseLayers[key]);
        Object.keys(routeLayers).forEach(key => delete routeLayers[key]);
    }

    /**
     * 初始化所有标记和路线
     */
    function init(map) {
        drawRoutes(map);
        drawMarkers(map);
        fitMapBounds(map);
    }

    // 公开接口
    return {
        init,
        clearAll,
        getPhaseLayers: () => phaseLayers,
        getRouteLayers: () => routeLayers,
    };
})();
