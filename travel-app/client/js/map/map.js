/**
 * 地图初始化模块
 * 负责：创建地图实例、瓦片图层管理、图层切换、加载失败自动降级
 */

const MapModule = (() => {
    let map = null;

    /**
     * 创建所有瓦片图层
     */
    function createTileLayers() {
        // 1. 高德地图 - 标准（国内最稳定）
        const gaodeNormal = L.tileLayer(
            'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            { subdomains: '1234', maxZoom: 18, attribution: '&copy; 高德地图' }
        );

        // 2. 高德地图 - 卫星
        const gaodeSatellite = L.tileLayer(
            'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
            { subdomains: '1234', maxZoom: 18, attribution: '&copy; 高德地图' }
        );
        const gaodeSatLabel = L.tileLayer(
            'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
            { subdomains: '1234', maxZoom: 18, opacity: 0.9 }
        );
        const gaodeSatGroup = L.layerGroup([gaodeSatellite, gaodeSatLabel]);

        // 3. CartoDB（国际备用，CDN 一般可达）
        const cartoLight = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; CartoDB &copy; OSM' }
        );

        // 4. OpenStreetMap（备用）
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap'
        });

        return { gaodeNormal, gaodeSatGroup, cartoLight, osmLayer };
    }

    /**
     * 设置加载失败自动降级机制
     */
    function setupFallback(layers) {
        const { gaodeNormal, cartoLight, osmLayer } = layers;

        let tileLoaded = false;
        gaodeNormal.on('tileload', () => { tileLoaded = true; });

        setTimeout(() => {
            if (!tileLoaded) {
                map.removeLayer(gaodeNormal);
                cartoLight.addTo(map);
                console.log('高德地图加载超时，已切换到 CartoDB');

                let cartoLoaded = false;
                cartoLight.on('tileload', () => { cartoLoaded = true; });
                setTimeout(() => {
                    if (!cartoLoaded) {
                        map.removeLayer(cartoLight);
                        osmLayer.addTo(map);
                        console.log('CartoDB 加载超时，已切换到 OSM');
                    }
                }, 5000);
            }
        }, 5000);
    }

    /**
     * 初始化地图
     * @returns {{ map: L.Map }} 返回地图实例
     */
    function init() {
        const config = MapData.getMapConfig();

        // 创建地图
        map = L.map('map', {
            center: config.center,
            zoom: config.zoom,
            zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 创建图层
        const layers = createTileLayers();

        // 默认使用高德标准地图
        layers.gaodeNormal.addTo(map);

        // 图层切换控件
        const baseLayers = {
            '高德地图': layers.gaodeNormal,
            '高德卫星': layers.gaodeSatGroup,
            'CartoDB': layers.cartoLight,
            'OpenStreetMap': layers.osmLayer,
        };
        L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

        // 加载失败降级
        setupFallback(layers);

        return map;
    }

    return { init };
})();
