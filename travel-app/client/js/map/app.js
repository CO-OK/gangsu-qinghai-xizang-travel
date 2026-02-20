/**
 * 地图应用入口
 * 协调各模块初始化
 */

(function () {
    'use strict';

    let mapInstance = null;

    async function init() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        try {
            // 1. 加载地图数据
            await MapData.load();

            // 隐藏 loading
            if (loadingEl) loadingEl.style.display = 'none';

            // 2. 初始化地图
            mapInstance = MapModule.init();

            // 3. 绘制路线和标记点
            MarkersModule.init(mapInstance);

            // 4. 添加 UI 控件
            ControlsModule.init(mapInstance);

            console.log('🗺️ 青甘大环线 + 西藏大环线 路线图加载完成');

        } catch (e) {
            console.error('地图加载失败:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) {
                errorEl.style.display = '';
                if (errorText) errorText.textContent = e.message || '未知错误';
            }
        }
    }

    /**
     * 刷新地图数据
     * 清除现有标记，重新加载数据并绘制
     */
    async function refreshMap() {
        if (!mapInstance) {
            console.warn('地图未初始化');
            return;
        }

        try {
            // 1. 重新加载数据
            await MapData.load();

            // 2. 清除现有标记和路线
            MarkersModule.clearAll(mapInstance);

            // 3. 重新绘制
            MarkersModule.init(mapInstance);

            console.log('🗺️ 地图已刷新');
        } catch (e) {
            console.error('地图刷新失败:', e);
        }
    }

    // 暴露刷新函数到全局
    window.refreshMap = refreshMap;

    // 监听 localStorage 变化，跨标签页自动刷新
    window.addEventListener('storage', function(e) {
        if (e.key === 'trip_data_updated') {
            console.log('检测到数据更新，自动刷新地图');
            refreshMap();
        }
    });

    // DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
