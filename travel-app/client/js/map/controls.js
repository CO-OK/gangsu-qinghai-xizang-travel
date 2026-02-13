/**
 * UI 控件模块
 * 负责：标题栏、图例面板、统计信息面板
 */

const ControlsModule = (() => {
    // 获取阶段颜色
    function getPhaseColor(phaseId) {
        const phases = MapData.getPhases();
        const phase = phases.find(p => p.id === phaseId);
        return phase?.color || '#999';
    }

    // 获取阶段名称
    function getPhaseName(phaseId) {
        const phases = MapData.getPhases();
        const phase = phases.find(p => p.id === phaseId);
        return phase?.name || `阶段${phaseId}`;
    }

    /**
     * 创建标题栏控件
     */
    function createTitleBanner(map) {
        const titleControl = L.control({ position: 'topleft' });
        titleControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'title-banner');
            div.innerHTML = `
                <h2>🗺️ ${MapData.getTitle()}</h2>
                <p>总里程 ${MapData.getTotalDistance()} ｜ 最高海拔 ${MapData.getMaxAltitude()} ｜ ${MapData.getDateRange()}</p>
            `;
            return div;
        };
        titleControl.addTo(map);
    }

    /**
     * 创建图例控件
     */
    function createLegend(map) {
        const phaseLayers = MarkersModule.getPhaseLayers();
        const routeLayers = MarkersModule.getRouteLayers();
        const phases = MapData.getPhases();

        const legend = L.control({ position: 'bottomleft' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>行程阶段（点击切换显示）</h4>';

            phases.forEach(phase => {
                const phaseNum = phase.id;
                const color = getPhaseColor(phaseNum);
                const name = getPhaseName(phaseNum);

                const item = L.DomUtil.create('div', 'legend-item', div);

                // 返程阶段使用虚线样式
                const lineStyle = phaseNum === 7
                    ? `background: repeating-linear-gradient(90deg, ${color} 0px, ${color} 6px, transparent 6px, transparent 10px);`
                    : `background: ${color};`;

                item.innerHTML = `
                    <div class="legend-line" style="${lineStyle}"></div>
                    <span>${name}</span>
                `;
                item.dataset.phase = phaseNum;
                item.dataset.visible = 'true';

                item.addEventListener('click', function () {
                    const p = parseInt(this.dataset.phase);
                    const visible = this.dataset.visible === 'true';

                    if (visible) {
                        if (phaseLayers[p]) map.removeLayer(phaseLayers[p]);
                        if (routeLayers[p]) map.removeLayer(routeLayers[p]);
                        this.style.opacity = '0.35';
                        this.dataset.visible = 'false';
                    } else {
                        if (phaseLayers[p]) map.addLayer(phaseLayers[p]);
                        if (routeLayers[p]) map.addLayer(routeLayers[p]);
                        this.style.opacity = '1';
                        this.dataset.visible = 'true';
                    }
                });
            });

            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        legend.addTo(map);
    }

    /**
     * 创建统计信息面板
     */
    function createInfoPanel(map) {
        const locations = MapData.getLocations();
        const markerCount = locations.filter(l => !l.labelOnly).length;

        const infoPanel = L.control({ position: 'topright' });
        infoPanel.onAdd = function () {
            const div = L.DomUtil.create('div', 'info-panel');
            div.style.marginTop = '50px';
            div.innerHTML = `
                <h4>📊 行程统计</h4>
                <div class="stat"><span>总天数</span><span class="stat-value">${MapData.getTotalDays()}天</span></div>
                <div class="stat"><span>总里程</span><span class="stat-value">${MapData.getTotalDistance()}</span></div>
                <div class="stat"><span>途经省份</span><span class="stat-value">甘肃·青海·西藏</span></div>
                <div class="stat"><span>最高海拔</span><span class="stat-value">${MapData.getMaxAltitude()}</span></div>
                <div class="stat"><span>标记地点</span><span class="stat-value">${markerCount} 个</span></div>
                <div class="stat"><span>5A景区</span><span class="stat-value">8 个</span></div>
                <div class="stat"><span>世界遗产</span><span class="stat-value">3 处</span></div>
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; font-size: 11px; color: #aaa;">
                    💡 点击地图标记查看详情<br>
                    💡 点击图例可切换阶段显示<br>
                    💡 右上角可切换底图样式
                </div>
            `;
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        infoPanel.addTo(map);
    }

    /**
     * 初始化所有 UI 控件
     */
    function init(map) {
        createTitleBanner(map);
        createLegend(map);
        createInfoPanel(map);
    }

    return { init };
})();
