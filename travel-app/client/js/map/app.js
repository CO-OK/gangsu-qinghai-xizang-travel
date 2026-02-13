/**
 * 地图应用入口
 * 协调各模块初始化
 */

(function () {
    'use strict';

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
            const map = MapModule.init();

            // 3. 绘制路线和标记点
            MarkersModule.init(map);

            // 4. 添加 UI 控件
            ControlsModule.init(map);

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

    // DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
