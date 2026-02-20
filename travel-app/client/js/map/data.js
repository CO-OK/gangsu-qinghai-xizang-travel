/**
 * 地图数据模块
 * 从 API 获取地图相关数据
 */

const MapData = (() => {
    let data = null;

    /**
     * 从 API 加载地图数据
     */
    async function load() {
        const response = await fetch('/api/trip-data');
        if (!response.ok) {
            throw new Error('无法加载地图数据');
        }
        data = await response.json();
        return data;
    }

    /**
     * 获取地点列表
     */
    function getLocations() {
        return data?.locations || [];
    }

    /**
     * 获取阶段列表
     */
    function getPhases() {
        return data?.phases || [];
    }

    /**
     * 获取地图配置
     */
    function getMapConfig() {
        return data?.mapConfig || { center: [32.5, 90], zoom: 6 };
    }

    /**
     * 获取高亮关键词
     */
    function getHighlightKeywords() {
        return data?.highlightKeywords || [];
    }

    /**
     * 获取行程标题
     */
    function getTitle() {
        return data?.title || '青甘西藏自驾行程';
    }

    /**
     * 获取总天数
     */
    function getTotalDays() {
        return data?.totalDays || 30;
    }

    /**
     * 获取总里程
     */
    function getTotalDistance() {
        return data?.totalDistance || '~13,500 km';
    }

    /**
     * 获取最高海拔
     */
    function getMaxAltitude() {
        return '5,248m (嘉措拉)';
    }

    /**
     * 获取日期范围
     */
    function getDateRange() {
        if (!data?.startDate) return '3月1日-3月30日';
        const parts = data.startDate.split('-');
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const endDay = day + data.totalDays - 1;
        return `${month}月${day}日-${month}月${endDay}日`;
    }

    return {
        load,
        getLocations,
        getRoutePoints,
        getPhases,
        getMapConfig,
        getHighlightKeywords,
        getTitle,
        getTotalDays,
        getTotalDistance,
        getMaxAltitude,
        getDateRange,
    };
})();
