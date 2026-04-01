#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吃豆人插件图标生成器
使用PIL绘制经典吃豆人风格的图标
"""

from PIL import Image, ImageDraw
import math

def draw_pacman(draw, center_x, center_y, radius, mouth_angle=60, direction='right', color='#FFD700'):
    """
    绘制吃豆人
    :param draw: ImageDraw对象
    :param center_x: 中心X坐标
    :param center_y: 中心Y坐标
    :param radius: 半径
    :param mouth_angle: 嘴巴张开角度
    :param direction: 朝向 ('right', 'left', 'up', 'down')
    :param color: 颜色
    """
    bbox = [
        center_x - radius,
        center_y - radius,
        center_x + radius,
        center_y + radius
    ]

    # 根据方向调整起始角度
    direction_angles = {
        'right': 0,
        'up': 90,
        'left': 180,
        'down': 270
    }
    base_angle = direction_angles.get(direction, 0)

    # 绘制吃豆人（扇形缺口）
    start_angle = base_angle + mouth_angle / 2
    end_angle = base_angle + 360 - mouth_angle / 2

    draw.pieslice(bbox, start_angle, end_angle, fill=color, outline=color)

def draw_dot(draw, x, y, radius, color='white'):
    """绘制豆子"""
    bbox = [x - radius, y - radius, x + radius, y + radius]
    draw.ellipse(bbox, fill=color, outline=color)

def draw_power_pellet(draw, x, y, radius, color='white'):
    """绘制能量豆（带发光效果）"""
    # 外层光晕
    for i in range(3, 0, -1):
        opacity = int(80 / i)
        glow_color = f'#{opacity:02x}{opacity:02x}{opacity:02x}'
        bbox = [x - radius * (1 + i*0.3), y - radius * (1 + i*0.3),
                x + radius * (1 + i*0.3), y + radius * (1 + i*0.3)]
        draw.ellipse(bbox, fill=glow_color)

    # 主体
    bbox = [x - radius, y - radius, x + radius, y + radius]
    draw.ellipse(bbox, fill=color, outline=color)

def generate_main_icon():
    """生成主图标 icon.png (144x144)"""
    size = 144
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 深蓝黑色背景圆角矩形
    bg_color = '#0a0e27'
    corner_radius = 20
    draw.rounded_rectangle([(0, 0), (size, size)], corner_radius, fill=bg_color)

    # 绘制吃豆人
    pacman_x = size // 2 - 10
    pacman_y = size // 2
    pacman_radius = 35
    draw_pacman(draw, pacman_x, pacman_y, pacman_radius, mouth_angle=60, direction='right')

    # 绘制豆子轨迹
    dot_radius = 4
    dot_spacing = 20
    for i in range(4):
        dot_x = pacman_x + pacman_radius + 15 + i * dot_spacing
        dot_y = pacman_y
        if dot_x < size - 10:
            draw_dot(draw, dot_x, dot_y, dot_radius)

    # 添加微弱的边缘光晕
    glow_color = '#1a2f5f'
    draw.rounded_rectangle([(2, 2), (size-2, size-2)], corner_radius, outline=glow_color, width=2)

    return img

def generate_category_icon():
    """生成分类图标 categoryIcon.png (196x196)"""
    size = 196
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 深色背景
    bg_color = '#0a0e27'
    corner_radius = 25
    draw.rounded_rectangle([(0, 0), (size, size)], corner_radius, fill=bg_color)

    # 绘制简化迷宫网格 (3x3)
    grid_color = '#2a4a8a'
    grid_margin = 30
    grid_size = size - 2 * grid_margin
    cell_size = grid_size // 3

    # 画网格线
    for i in range(4):
        x = grid_margin + i * cell_size
        y = grid_margin + i * cell_size
        # 竖线
        draw.line([(x, grid_margin), (x, size - grid_margin)], fill=grid_color, width=3)
        # 横线
        draw.line([(grid_margin, y), (size - grid_margin, y)], fill=grid_color, width=3)

    # 在四个角放置小豆子
    dot_radius = 6
    corners = [
        (grid_margin + 15, grid_margin + 15),
        (size - grid_margin - 15, grid_margin + 15),
        (grid_margin + 15, size - grid_margin - 15),
        (size - grid_margin - 15, size - grid_margin - 15)
    ]
    for x, y in corners:
        draw_dot(draw, x, y, dot_radius)

    # 在中心绘制吃豆人
    pacman_radius = 25
    draw_pacman(draw, size // 2, size // 2, pacman_radius, mouth_angle=60, direction='right')

    return img

def generate_action_icon():
    """生成动作图标 actionIcon.png (40x40)"""
    size = 40
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 深色背景圆形
    bg_color = '#0a0e27'
    draw.ellipse([(0, 0), (size, size)], fill=bg_color)

    # 绘制小吃豆人
    pacman_x = size // 2 - 4
    pacman_y = size // 2
    pacman_radius = 12
    draw_pacman(draw, pacman_x, pacman_y, pacman_radius, mouth_angle=60, direction='right')

    # 绘制一个发光能量豆
    pellet_x = pacman_x + pacman_radius + 8
    pellet_y = pacman_y
    draw_power_pellet(draw, pellet_x, pellet_y, 3, color='#FFFFFF')

    # 添加几个速度线
    line_color = '#FFD700'
    for i in range(3):
        y_offset = (i - 1) * 6
        x_start = pacman_x - pacman_radius - 5
        x_end = pacman_x - pacman_radius - 2
        draw.line([(x_start, pacman_y + y_offset), (x_end, pacman_y + y_offset)],
                  fill=line_color, width=2)

    return img

def main():
    """生成所有图标"""
    output_dir = 'com.ulanzi.pacman.ulanziPlugin/assets/icons'

    print('正在生成吃豆人插件图标...')

    # 生成主图标
    print('  生成 icon.png (144x144)...')
    main_icon = generate_main_icon()
    main_icon.save(f'{output_dir}/icon.png', 'PNG')

    # 生成分类图标
    print('  生成 categoryIcon.png (196x196)...')
    category_icon = generate_category_icon()
    category_icon.save(f'{output_dir}/categoryIcon.png', 'PNG')

    # 生成动作图标
    print('  生成 actionIcon.png (40x40)...')
    action_icon = generate_action_icon()
    action_icon.save(f'{output_dir}/actionIcon.png', 'PNG')

    print('✅ 所有图标生成完成！')
    print(f'\n图标位置：{output_dir}/')
    print('  - icon.png (144x144)')
    print('  - categoryIcon.png (196x196)')
    print('  - actionIcon.png (40x40)')

if __name__ == '__main__':
    main()
