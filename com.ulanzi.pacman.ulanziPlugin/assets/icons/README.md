# 图标资源说明

插件需要以下图标文件：

## 必需的图标

1. **icon.png** (144x144px)
   - 插件主图标
   - 建议：黄色吃豆人图案

2. **actionIcon.png** (40x40px)
   - Action列表图标
   - 建议：小尺寸吃豆人图案

3. **categoryIcon.png** (196x196px)
   - 分类图标
   - 建议：吃豆人 + 游戏主题

## 临时解决方案

如果暂时没有图标，可以：

1. 从网上搜索"pac-man icon png"下载免费图标
2. 使用图片编辑工具调整到对应尺寸
3. 或者复制analogclock demo的图标作为占位符：

```bash
cp "G:/projects/UlanziDeckPlugin-SDK/demo/com.ulanzi.analogclock.ulanziPlugin/assets/icons/icon.png" "./icon.png"
cp "G:/projects/UlanziDeckPlugin-SDK/demo/com.ulanzi.analogclock.ulanziPlugin/assets/icons/actionIcon.png" "./actionIcon.png"
cp "G:/projects/UlanziDeckPlugin-SDK/demo/com.ulanzi.analogclock.ulanziPlugin/assets/icons/categoryIcon.png" "./categoryIcon.png"
```

## 图标设计建议

- **背景**: 透明或纯黑色
- **主色**: 黄色 (#FFFF00) 代表吃豆人
- **辅助色**: 粉色/红色 (#FFB8AE) 代表豆子
- **风格**: 简约、像素化或现代扁平
