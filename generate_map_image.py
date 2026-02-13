#!/usr/bin/env python3
"""
生成青甘大环线 + 西藏大环线 29天自驾高清路线图
输出: route-map-hd.png
"""

import matplotlib
matplotlib.use('Agg')  # 无GUI后端

import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
import contextily as cx
import numpy as np
from matplotlib.lines import Line2D

# ============== 配色 ==============
PHASE_COLORS = {
    1: '#E74C3C',  # 红 - 青甘东半环
    2: '#E67E22',  # 橙 - 进藏
    3: '#9B59B6',  # 紫 - 拉萨
    4: '#F39C12',  # 金 - 林芝桃花
    5: '#2ECC71',  # 绿 - 阿里南线
    6: '#3498DB',  # 蓝 - 阿里北线
    7: '#1ABC9C',  # 青 - 返程西半环
}

PHASE_NAMES = {
    1: 'P1 青甘东半环 (D1-D7)',
    2: 'P2 青藏线进藏 (D8-D10)',
    3: 'P3 拉萨游览 (D11-D13)',
    4: 'P4 林芝桃花 (D14-D16)',
    5: 'P5 阿里南线 (D17-D22)',
    6: 'P6 阿里北线 (D23-D25)',
    7: 'P7 返程西半环 (D26-D29)',
}

# ============== 地点数据 ==============
LOCATIONS = [
    # Phase 1
    {'name': '酒泉', 'lat': 39.7332, 'lng': 98.4941, 'phase': 1, 'major': True, 'day': 'D1'},
    {'name': '张掖', 'lat': 38.9260, 'lng': 100.4500, 'phase': 1, 'major': True, 'day': 'D1-D2'},
    {'name': '扁都口', 'lat': 38.35, 'lng': 100.74, 'phase': 1, 'major': False, 'day': 'D2'},
    {'name': '祁连', 'lat': 38.1748, 'lng': 100.2467, 'phase': 1, 'major': True, 'day': 'D2-D3'},
    {'name': '门源', 'lat': 37.3744, 'lng': 101.6218, 'phase': 1, 'major': False, 'day': 'D3'},
    {'name': '西宁', 'lat': 36.6171, 'lng': 101.7782, 'phase': 1, 'major': True, 'day': 'D3-D5'},
    {'name': '青海湖', 'lat': 36.60, 'lng': 100.60, 'phase': 1, 'major': True, 'day': 'D4'},
    {'name': '日月山', 'lat': 36.50, 'lng': 100.98, 'phase': 1, 'major': False, 'day': 'D4'},
    {'name': '茶卡盐湖', 'lat': 36.71, 'lng': 99.08, 'phase': 1, 'major': True, 'day': 'D5'},
    {'name': '德令哈', 'lat': 37.3691, 'lng': 97.3608, 'phase': 1, 'major': False, 'day': 'D5'},
    {'name': '大柴旦', 'lat': 37.85, 'lng': 95.35, 'phase': 1, 'major': True, 'day': 'D6'},
    {'name': '格尔木', 'lat': 36.4017, 'lng': 94.9038, 'phase': 1, 'major': True, 'day': 'D6-D8'},
    # Phase 2
    {'name': '昆仑山口', 'lat': 35.63, 'lng': 94.07, 'phase': 2, 'major': False, 'day': 'D8'},
    {'name': '可可西里', 'lat': 35.30, 'lng': 93.50, 'phase': 2, 'major': True, 'day': 'D8'},
    {'name': '沱沱河', 'lat': 34.22, 'lng': 92.44, 'phase': 2, 'major': True, 'day': 'D8-D9'},
    {'name': '唐古拉山口', 'lat': 32.89, 'lng': 91.63, 'phase': 2, 'major': True, 'day': 'D9'},
    {'name': '安多', 'lat': 32.26, 'lng': 91.68, 'phase': 2, 'major': False, 'day': 'D9-D10'},
    {'name': '那曲', 'lat': 31.48, 'lng': 92.05, 'phase': 2, 'major': False, 'day': 'D10'},
    {'name': '念青唐古拉山', 'lat': 30.80, 'lng': 90.97, 'phase': 2, 'major': False, 'day': 'D10'},
    # Phase 3
    {'name': '拉萨', 'lat': 29.6500, 'lng': 91.1000, 'phase': 3, 'major': True, 'day': 'D10-D16', 'highlight': True},
    # Phase 4
    {'name': '巴松措', 'lat': 30.01, 'lng': 93.96, 'phase': 4, 'major': True, 'day': 'D14'},
    {'name': '林芝', 'lat': 29.65, 'lng': 94.36, 'phase': 4, 'major': True, 'day': 'D14-D16'},
    {'name': '色季拉山口', 'lat': 29.75, 'lng': 94.73, 'phase': 4, 'major': False, 'day': 'D15'},
    {'name': '鲁朗', 'lat': 29.77, 'lng': 94.75, 'phase': 4, 'major': True, 'day': 'D15'},
    # Phase 5
    {'name': '羊卓雍措', 'lat': 28.98, 'lng': 90.68, 'phase': 5, 'major': True, 'day': 'D17'},
    {'name': '卡若拉冰川', 'lat': 28.87, 'lng': 90.23, 'phase': 5, 'major': False, 'day': 'D17'},
    {'name': '江孜', 'lat': 28.91, 'lng': 89.61, 'phase': 5, 'major': False, 'day': 'D17'},
    {'name': '日喀则', 'lat': 29.27, 'lng': 88.89, 'phase': 5, 'major': True, 'day': 'D17-D18'},
    {'name': '嘉措拉山口', 'lat': 28.80, 'lng': 87.50, 'phase': 5, 'major': False, 'day': 'D18'},
    {'name': '珠峰', 'lat': 28.15, 'lng': 86.85, 'phase': 5, 'major': True, 'day': 'D18-D19', 'highlight': True},
    {'name': '佩枯措', 'lat': 28.58, 'lng': 85.61, 'phase': 5, 'major': False, 'day': 'D19'},
    {'name': '萨嘎', 'lat': 29.33, 'lng': 85.23, 'phase': 5, 'major': True, 'day': 'D19-D20'},
    {'name': '仲巴', 'lat': 29.77, 'lng': 84.03, 'phase': 5, 'major': False, 'day': 'D20'},
    {'name': '塔钦', 'lat': 31.07, 'lng': 81.31, 'phase': 5, 'major': True, 'day': 'D20-D21'},
    {'name': '冈仁波齐', 'lat': 31.07, 'lng': 81.31, 'phase': 5, 'major': True, 'day': 'D21', 'highlight': True},
    {'name': '玛旁雍措', 'lat': 30.67, 'lng': 81.46, 'phase': 5, 'major': True, 'day': 'D21'},
    {'name': '拉昂错', 'lat': 30.65, 'lng': 81.19, 'phase': 5, 'major': False, 'day': 'D21'},
    {'name': '札达', 'lat': 31.48, 'lng': 79.80, 'phase': 5, 'major': True, 'day': 'D21-D22'},
    {'name': '噶尔', 'lat': 32.50, 'lng': 80.10, 'phase': 5, 'major': False, 'day': 'D22'},
    {'name': '盐湖乡', 'lat': 32.20, 'lng': 81.50, 'phase': 5, 'major': False, 'day': 'D22-D23'},
    # Phase 6
    {'name': '措勤', 'lat': 31.02, 'lng': 85.16, 'phase': 6, 'major': True, 'day': 'D23'},
    {'name': '当穷错', 'lat': 31.60, 'lng': 86.30, 'phase': 6, 'major': False, 'day': 'D24'},
    {'name': '当惹雍措', 'lat': 31.01, 'lng': 86.67, 'phase': 6, 'major': True, 'day': 'D24', 'highlight': True},
    {'name': '尼玛', 'lat': 31.78, 'lng': 87.24, 'phase': 6, 'major': False, 'day': 'D24-D25'},
    {'name': '色林错', 'lat': 31.80, 'lng': 88.80, 'phase': 6, 'major': True, 'day': 'D25'},
    {'name': '纳木错', 'lat': 30.70, 'lng': 90.50, 'phase': 6, 'major': True, 'day': 'D25-D26', 'highlight': True},
    # Phase 7
    {'name': '安多(返程)', 'lat': 32.26, 'lng': 91.68, 'phase': 7, 'major': False, 'day': 'D26'},
    {'name': '格尔木(返程)', 'lat': 36.4017, 'lng': 94.9038, 'phase': 7, 'major': False, 'day': 'D27'},
    {'name': '敦煌', 'lat': 40.1421, 'lng': 94.6620, 'phase': 7, 'major': True, 'day': 'D28'},
    {'name': '莫高窟', 'lat': 40.04, 'lng': 94.80, 'phase': 7, 'major': True, 'day': 'D29'},
    {'name': '嘉峪关', 'lat': 39.7731, 'lng': 98.2894, 'phase': 7, 'major': True, 'day': 'D29'},
    {'name': '酒泉(终点)', 'lat': 39.7332, 'lng': 98.4941, 'phase': 7, 'major': True, 'day': 'D29'},
]

# ============== 路线数据 ==============
ROUTE_POINTS = {
    1: [(39.7332, 98.4941), (38.9260, 100.4500), (38.35, 100.74), (38.1748, 100.2467),
        (37.3744, 101.6218), (36.6171, 101.7782), (36.50, 100.98), (36.60, 100.60),
        (36.6171, 101.7782), (36.71, 99.08), (37.3691, 97.3608), (37.85, 95.35), (36.4017, 94.9038)],
    2: [(36.4017, 94.9038), (35.63, 94.07), (35.30, 93.50), (34.22, 92.44),
        (32.89, 91.63), (32.26, 91.68), (31.48, 92.05), (30.80, 90.97), (29.6500, 91.1000)],
    3: [],
    4: [(29.6500, 91.1000), (30.01, 93.96), (29.65, 94.36), (29.75, 94.73),
        (29.77, 94.75), (29.75, 94.73), (29.65, 94.36), (29.6500, 91.1000)],
    5: [(29.6500, 91.1000), (28.98, 90.68), (28.87, 90.23), (28.91, 89.61),
        (29.27, 88.89), (28.80, 87.50), (28.15, 86.85), (28.58, 85.61),
        (29.33, 85.23), (29.77, 84.03), (30.45, 82.10), (31.07, 81.31),
        (30.67, 81.46), (30.65, 81.19), (31.48, 79.80), (32.50, 80.10), (32.20, 81.50)],
    6: [(32.20, 81.50), (31.02, 85.16), (31.60, 86.30), (31.01, 86.67),
        (31.78, 87.24), (31.80, 88.80), (30.70, 90.50)],
    7: [(30.70, 90.50), (31.48, 92.05), (32.26, 91.68), (32.89, 91.63),
        (34.22, 92.44), (35.30, 93.50), (35.63, 94.07), (36.4017, 94.9038),
        (37.85, 95.35), (40.1421, 94.6620), (40.04, 94.80), (39.7731, 98.2894), (39.7332, 98.4941)],
}


def generate_map():
    # 设置中文字体
    plt.rcParams['font.sans-serif'] = ['PingFang SC', 'Heiti SC', 'STHeiti', 'SimHei', 'Arial Unicode MS']
    plt.rcParams['axes.unicode_minus'] = False

    # 创建高清画布
    fig, ax = plt.subplots(1, 1, figsize=(24, 18), dpi=200)

    # ===== 绘制路线 =====
    for phase in range(1, 8):
        points = ROUTE_POINTS[phase]
        if len(points) < 2:
            continue
        lats = [p[0] for p in points]
        lngs = [p[1] for p in points]

        linestyle = '--' if phase == 7 else '-'
        linewidth = 3.0 if phase != 7 else 2.5
        alpha = 0.9

        ax.plot(lngs, lats,
                color=PHASE_COLORS[phase],
                linewidth=linewidth,
                linestyle=linestyle,
                alpha=alpha,
                zorder=2,
                path_effects=[pe.Stroke(linewidth=linewidth + 2, foreground='white', alpha=0.5), pe.Normal()])

    # ===== 绘制标记点 =====
    text_effects = [
        pe.Stroke(linewidth=3, foreground='white'),
        pe.Normal()
    ]

    # 标签偏移策略（避免重叠）
    label_offsets = {
        '酒泉': (0.3, 0.4),
        '张掖': (0.3, 0.4),
        '祁连': (-0.3, 0.5),
        '西宁': (0.5, 0.3),
        '青海湖': (-0.8, -0.5),
        '茶卡盐湖': (0.3, 0.4),
        '大柴旦': (0.3, 0.4),
        '格尔木': (-1.2, -0.5),
        '可可西里': (0.3, 0.4),
        '沱沱河': (0.3, 0.3),
        '唐古拉山口': (0.4, 0.3),
        '拉萨': (0.4, 0.4),
        '巴松措': (0.3, 0.3),
        '林芝': (0.4, 0.3),
        '鲁朗': (0.3, -0.5),
        '羊卓雍措': (-0.3, -0.5),
        '日喀则': (0.4, 0.3),
        '珠峰': (0.3, -0.5),
        '萨嘎': (0.3, 0.3),
        '塔钦': (0.3, 0.3),
        '冈仁波齐': (-1.5, 0.5),
        '玛旁雍措': (0.4, -0.4),
        '札达': (-0.5, 0.4),
        '措勤': (0.3, 0.3),
        '当惹雍措': (0.4, -0.5),
        '色林错': (0.3, 0.3),
        '纳木错': (-0.3, 0.5),
        '敦煌': (0.3, 0.3),
        '莫高窟': (0.3, -0.5),
        '嘉峪关': (0.4, 0.3),
        '酒泉(终点)': (0.3, -0.5),
    }

    for loc in LOCATIONS:
        color = PHASE_COLORS[loc['phase']]
        is_highlight = loc.get('highlight', False)
        is_major = loc['major']

        # 标记大小和样式
        if is_highlight:
            marker_size = 120
            edge_width = 2.5
            marker_shape = '*'
            zorder = 10
        elif is_major:
            marker_size = 50
            edge_width = 1.5
            marker_shape = 'o'
            zorder = 8
        else:
            marker_size = 20
            edge_width = 1
            marker_shape = 'o'
            zorder = 6

        # 绘制标记
        ax.scatter(loc['lng'], loc['lat'],
                   s=marker_size,
                   c=color,
                   edgecolors='white',
                   linewidths=edge_width,
                   marker=marker_shape,
                   zorder=zorder)

        # 主要地点添加文字标签
        if is_major:
            fontsize = 9 if is_highlight else 7.5
            fontweight = 'bold' if is_highlight else 'medium'
            offset = label_offsets.get(loc['name'], (0.3, 0.3))

            label_text = loc['name']
            # 起点终点加特殊标记
            if loc['name'] == '酒泉' and loc['phase'] == 1:
                label_text = '▶ 酒泉(起点)'
            elif loc['name'] == '酒泉(终点)':
                label_text = '■ 酒泉(终点)'

            ax.annotate(label_text,
                        xy=(loc['lng'], loc['lat']),
                        xytext=(loc['lng'] + offset[0], loc['lat'] + offset[1]),
                        fontsize=fontsize,
                        fontweight=fontweight,
                        color='#1a1a1a',
                        ha='left',
                        va='center',
                        zorder=15,
                        path_effects=text_effects,
                        arrowprops=dict(arrowstyle='-', color='#999', lw=0.5, shrinkA=0, shrinkB=3)
                        if abs(offset[0]) > 0.5 or abs(offset[1]) > 0.5
                        else None)

    # ===== 添加底图 =====
    # 瓦片源列表（按优先级：高德 > CartoDB > 纯色）
    tile_sources = [
        ('高德地图', 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'),
        ('CartoDB Voyager', cx.providers.CartoDB.Voyager),
    ]
    basemap_loaded = False
    for name, source in tile_sources:
        try:
            cx.add_basemap(ax, crs='EPSG:4326', source=source, zoom=7, alpha=0.7)
            print(f"✅ 底图加载成功 ({name})")
            basemap_loaded = True
            break
        except Exception as e:
            print(f"⚠️  {name} 加载失败: {e}")
    if not basemap_loaded:
        print("⚠️  所有底图均加载失败，使用纯色背景")
        ax.set_facecolor('#f5f5f0')
        ax.grid(True, alpha=0.3, linestyle='--', color='#ccc')

    # ===== 设置地图范围（留边距） =====
    all_lats = [loc['lat'] for loc in LOCATIONS]
    all_lngs = [loc['lng'] for loc in LOCATIONS]
    lat_margin = (max(all_lats) - min(all_lats)) * 0.08
    lng_margin = (max(all_lngs) - min(all_lngs)) * 0.06
    ax.set_xlim(min(all_lngs) - lng_margin, max(all_lngs) + lng_margin)
    ax.set_ylim(min(all_lats) - lat_margin, max(all_lats) + lat_margin)

    # ===== 标题 =====
    ax.set_title('青甘大环线 + 西藏大环线  29天自驾路线图',
                 fontsize=22, fontweight='bold', color='#1a1a1a', pad=20)

    # ===== 副标题 =====
    ax.text(0.5, 1.01,
            '总里程 ~13,000km  ｜  最高海拔 5,248m  ｜  3月1日 - 3月29日  ｜  甘肃 · 青海 · 西藏',
            transform=ax.transAxes, fontsize=11, color='#888',
            ha='center', va='bottom')

    # ===== 图例 =====
    legend_elements = []
    for phase in range(1, 8):
        ls = '--' if phase == 7 else '-'
        legend_elements.append(
            Line2D([0], [0], color=PHASE_COLORS[phase], linewidth=3,
                   linestyle=ls, label=PHASE_NAMES[phase])
        )
    legend_elements.append(Line2D([0], [0], marker='*', color='w', markerfacecolor='#E74C3C',
                                  markersize=12, label='核心景点', linewidth=0))

    legend = ax.legend(handles=legend_elements, loc='lower left',
                       fontsize=10, frameon=True, fancybox=True,
                       shadow=True, borderpad=1, labelspacing=0.8,
                       framealpha=0.95, edgecolor='#ddd')
    legend.get_frame().set_facecolor('white')

    # ===== 隐藏坐标轴标签 =====
    ax.set_xlabel('')
    ax.set_ylabel('')
    ax.tick_params(axis='both', which='both', length=0, labelsize=0)

    # ===== 版权水印 =====
    ax.text(0.99, 0.01, '© 青甘藏自驾路线图 | 数据仅供参考',
            transform=ax.transAxes, fontsize=8, color='#bbb',
            ha='right', va='bottom')

    # ===== 保存 =====
    plt.tight_layout()
    output_path = '/Users/quanwei/tour/route-map-hd.png'
    fig.savefig(output_path, dpi=200, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f"✅ 高清路线图已保存: {output_path}")
    print(f"   分辨率: {24*200} x {18*200} = 4800 x 3600 像素")


if __name__ == '__main__':
    generate_map()
