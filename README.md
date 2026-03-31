# Ulanzi Plugin 项目

这是一个优篮子(Ulanzi Deck)插件开发项目。

## 📁 项目结构

```
ulanzi-plugin/
├── docs/                                    # 设计文档
│   ├── 设计方案.md                          # 原始设计方案（已废弃）
│   └── 吃豆人插件设计.md                    # 吃豆人插件详细设计
│
└── com.ulanzi.pacman.ulanziPlugin/          # 🎮 吃豆人插件
    ├── manifest.json                        # 插件配置
    ├── README.md                            # 插件使用说明
    ├── zh_CN.json                           # 中文本地化
    ├── en.json                              # 英文本地化
    ├── assets/icons/                        # 图标资源
    ├── libs/                                # SDK库文件（从demo复制）
    ├── plugin/
    │   ├── app.html                         # 主服务入口
    │   ├── app.js                           # 主服务逻辑
    │   └── actions/
    │       ├── GameEngine.js                # 游戏引擎
    │       └── RenderManager.js             # 渲染管理器
    └── property-inspector/pacman/
        ├── inspector.html                   # 配置界面
        └── inspector.js                     # 配置逻辑
```

## 🎮 吃豆人插件

一个创新的多Action协同工作示例，吃豆人会在多个按键组成的网格中移动。

### 核心特性

- ✅ 游戏引擎：独立的游戏逻辑和状态管理
- ✅ 渲染系统：完整Canvas绘制 + 切分显示
- ✅ 性能优化：8 FPS稳定帧率 + 智能渲染 + 避免通信阻塞
- ✅ 智能寻路：吃豆人会主动寻找并吃掉最近的豆子
- ✅ 可配置网格布局（2x5, 3x3, 3x5等）
- ✅ 全局设置：支持动态配置网格大小
- ✅ 交互控制（暂停/继续）
- ✅ 坐标验证：自动检测重复坐标，防止配置错误

### 快速开始

1. **复制插件到UlanziStudio**:
   ```bash
   # Windows
   cp -r "com.ulanzi.pacman.ulanziPlugin" "%APPDATA%/UlanziStudio/plugins/"

   # macOS
   cp -r "com.ulanzi.pacman.ulanziPlugin" "~/Library/Application Support/UlanziStudio/plugins/"
   ```

2. **重启UlanziStudio**

3. **配置按键**:
   - 将 "Pac-Man Cell" 添加到多个按键（建议3x3或2x5）
   - 为每个按键配置其在网格中的位置（行、列）

4. **开始游戏**！

详细说明请查看：`com.ulanzi.pacman.ulanziPlugin/README.md`

## 📚 设计文档

- **吃豆人插件设计**: `docs/吃豆人插件设计.md`
  - 完整的技术设计方案
  - 核心架构说明
  - API和数据流设计
  - 实现细节

## 🔧 开发环境

- SDK: UlanziDeckPlugin-SDK (位于 `G:/projects/UlanziDeckPlugin-SDK`)
- 参考示例: analogclock demo
- 语言: JavaScript (HTML主服务)
- 支持平台: Windows 10+, macOS 10.11+

## 📖 技术要点

### 多Action协同工作

这个插件展示了如何让多个Action实例共享状态并协同工作：

1. **统一游戏场景**: 主服务维护完整的游戏状态
2. **Canvas切分**: 在大Canvas上绘制，切分给各个按键
3. **位置映射**: 用户配置每个按键的网格坐标
4. **状态同步**: 所有按键同步更新（60 FPS）

### 核心代码流程

```
GameEngine.update()                    // 更新游戏逻辑
    ↓
RenderManager.renderFullScene()        // 绘制完整画面
    ↓
RenderManager.splitToBlocks()          // 切分为小块
    ↓
updateAllKeys()                        // 更新所有按键图标
    ↓
$UD.setBaseDataIcon()                  // SDK API设置图标
```

## 🚀 未来扩展

可以基于这个框架实现更多多Action协同的插件：

- 🖼️ **拼图游戏**: 图片拼图、滑块拼图
- 📊 **仪表板**: 系统监控、数据可视化
- 🎨 **像素画**: 多按键组成的像素画布
- 🎯 **打地鼠**: 互动游戏
- 🌊 **动态背景**: 波浪、粒子效果

## 📝 开发日志

- ✅ 2024-03-31: 吃豆人插件完成
  - GameEngine游戏引擎（智能寻路算法）
  - RenderManager渲染管理（智能更新）
  - PropertyInspector配置界面
  - 全局设置界面（网格配置）
  - 8 FPS稳定动画循环（约1秒移动1格）
  - 性能优化，避免通信阻塞
  - 坐标冲突检测和验证

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
