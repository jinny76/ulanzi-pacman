# 🎮 Pac-Man Runner - UlanziDeck 吃豆人插件

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)

一个有趣的 UlanziDeck 插件，让经典的吃豆人在你的按键网格上奔跑！

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [技术架构](#-技术架构) • [开发指南](#-开发指南)

</div>

---

## ✨ 功能特性

### 🎯 零配置设计
- **自动位置识别**: 利用 SDK 的 `key` 参数自动检测按键位置
- **拖拽即用**: 无需手动配置坐标，拖拽到 3x5 网格即可开始游戏
- **即时反馈**: 每个按键拖入时立即显示游戏画面

### 🎮 完整游戏体验
- **智能寻路**: 曼哈顿距离算法 + 随机游荡，模拟真实游戏体验
- **3x3 游戏区域**: 吃豆人在 9 个格子组成的网格中移动
- **8 FPS 稳定帧率**: 约 1 秒移动 1 格，流畅不卡顿
- **暂停/继续**: 点击任意游戏格子控制游戏

### ⭐ 幸运豆系统
- **金色幸运豆**: 每轮游戏随机生成 1 个金色幸运豆
- **特殊效果**: 吃到后触发随机特效（彩虹背景/闪烁/豆子变大）
- **80 个吉利词语**: 精选四字吉利词语，涵盖财富、事业、健康、幸福等主题
- **2x2 显示区域**: 金色渐变背景，5 秒自动消失

### 🎨 视觉效果
- **经典街机风格**: 黄色吃豆人 + 粉色豆子 + 黑色背景
- **动态动画**: 吃豆人朝向旋转 + 张嘴闭嘴动画
- **连贯画面**: 所有按键组合成完整的游戏场景

---

## 🚀 快速开始

### 安装

#### 方式 1: 使用部署脚本（推荐）

```bash
# Windows
.\deploy.bat

# 或手动运行
xcopy "com.ulanzi.pacman.ulanziPlugin" "%APPDATA%\Ulanzi\UlanziDeck\Plugins\com.ulanzi.pacman.ulanziPlugin\" /E /I /Y /Q
```

#### 方式 2: 手动安装

1. 将 `com.ulanzi.pacman.ulanziPlugin` 文件夹复制到插件目录：
   - **Windows**: `%APPDATA%\Ulanzi\UlanziDeck\Plugins\`
   - **macOS**: `~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/`

2. 重启 UlanziStudio

### 使用

将 "Pac-Man Runner" Action 拖拽到设备的 **3 行 5 列** 按键网格上：

```
       列0   列1   列2   列3   列4
行0:   [🟡] [🟡] [🟡] [马] [到]
行1:   [🟡] [🟡] [🟡] [成] [功]
行2:   [🟡] [🟡] [🟡] [  ] [  ]
```

**布局说明**:
- **左侧 3x3 区域** (列 0-2，行 0-2): 游戏区域
- **右侧 4 个按键** (列 3-4，行 0-1): 幸运词显示区域

**就这么简单！** ✨
- ✅ 无需配置坐标
- ✅ 拖拽完成后立即开始
- ✅ 点击游戏区域暂停/继续

---

## 📁 项目结构

```
ulanzi-plugin/
├── com.ulanzi.pacman.ulanziPlugin/   # 插件主目录
│   ├── manifest.json                 # 插件配置
│   ├── README.md                     # 插件使用说明
│   ├── SUBMISSION.md                 # 市场提交文档
│   ├── zh_CN.json, en.json           # 国际化
│   ├── assets/icons/                 # 图标资源
│   │   ├── icon.png                  # 144x144 主图标
│   │   ├── categoryIcon.png          # 196x196 分类图标
│   │   └── actionIcon.png            # 40x40 动作图标
│   ├── libs/                         # UlanziDeck SDK
│   └── plugin/
│       ├── app.html                  # 主服务入口
│       ├── app.js                    # 主服务逻辑
│       └── actions/
│           ├── GameEngine.js         # 游戏引擎
│           └── RenderManager.js      # 渲染管理器
│
├── generate_icons.py                 # Python 图标生成脚本
├── deploy.bat, deploy.ps1            # 部署脚本
├── docs/                             # 设计文档
├── CLAUDE.md                         # AI 开发指南
└── README.md                         # 本文件
```

---

## 🏗️ 技术架构

### 核心设计模式：零配置单 Action

利用 UlanziDeck SDK 的 `key` 参数自动识别按键位置，无需用户手动配置：

```javascript
// SDK 提供 key 格式："列_行" (例如 "3_1")
const decoded = $UD.decodeContext(context);
const key = decoded.key;

// 自动分配角色
function parseKeyRole(key) {
  const [col, row] = key.split('_').map(Number);

  if (col <= 2 && row <= 2) return { role: 'game', col, row };
  if (key === '3_0') return { role: 'blessing', index: 0 };
  // ...
}
```

### 三层架构

1. **GameEngine** (`plugin/actions/GameEngine.js`)
   - 纯游戏逻辑：吃豆人移动、寻路、吃豆、特效
   - 曼哈顿距离寻路 + 随机性（70% 最优路径，30% 随机）
   - 幸运豆系统 + 3 种特效（彩虹/闪烁/巨大）
   - 80 个吉利词语库

2. **RenderManager** (`plugin/actions/RenderManager.js`)
   - 在大 Canvas (432x432px) 上绘制完整场景
   - 切分为 144x144px 的小块分配给各个按键
   - **性能优化**: 增量渲染，仅更新变化的格子

3. **Main Service** (`plugin/app.js`)
   - WebSocket 通信 (`$UD` API)
   - Context 映射管理
   - 游戏循环 (8 FPS, 125ms 间隔)
   - 事件处理 (onAdd/onRun/onClear)

### 渲染优化策略

```javascript
// 初始/刷新：渲染所有格子
renderManager.splitAllBlocks(gameCells)

// 正常游戏：仅更新吃豆人附近格子
renderManager.splitToBlocks(gameCells, pacman)
```

### 游戏循环

```
setInterval(125ms) →
  gameEngine.update() → movePacman() / eat dots / trigger effects
  renderManager.renderFullScene() → draw on full canvas
  IF dots respawned: update ALL cells
  ELSE: update only changed cells
  $UD.setBaseDataIcon() → send to device
```

---

## 🛠️ 开发指南

### 环境要求

- **SDK**: UlanziDeckPlugin-SDK (JavaScript)
- **语言**: JavaScript (ES5+)
- **平台**: Windows 10+, macOS 10.11+
- **运行时**: HTML WebView (主服务)
- **Python**: 3.6+ (仅用于生成图标)

### 常用命令

```bash
# 部署到本地 UlanziStudio
.\deploy.bat

# 生成图标
python generate_icons.py

# 测试
# 1. 运行部署脚本
# 2. 重启 UlanziStudio
# 3. 拖拽 13-15 个按键到 3x5 网格
```

### UUID 规范

UlanziDeck 插件必须遵循严格的 UUID 命名规则：

```
插件 UUID:  com.ulanzi.ulanzistudio.pacman          (4 段)
动作 UUID:  com.ulanzi.ulanzistudio.pacman.runner   (5 段)
```

使用位置：
1. `manifest.json` → "UUID" 和 "Actions[].UUID"
2. `app.js` → `$UD.connect('com.ulanzi.ulanzistudio.pacman')`

### 关键技术点

#### 1. 数据格式（重要！）

RenderManager 期望 `{row, col}` 格式，**不是** `{col, row}`:

```javascript
// ✅ 正确
gameCells[context] = { row: keyInfo.row, col: keyInfo.col };

// ❌ 错误 - 会导致渲染失败
gameCells[context] = { col: keyInfo.col, row: keyInfo.row };
```

#### 2. 日志系统

使用 SDK 日志方法，不要用 console:

```javascript
// ✅ 正确
$UD.logMessage('Game started', 'info');

// ❌ 错误 - 不会写入日志文件
console.log('Game started');
```

日志位置: `%APPDATA%\Ulanzi\UlanziDeck\logs\`

#### 3. 即时渲染

按键拖入时立即显示内容：

```javascript
$UD.onAdd(jsn => {
  // 渲染完整场景
  renderManager.renderFullScene(gameEngine.getState());

  // 仅切分这一个格子
  const singleCellMap = { [context]: { row, col } };
  const blocks = renderManager.splitAllBlocks(singleCellMap);

  // 立即显示
  $UD.setBaseDataIcon(context, blocks[context]);
});
```

---

## 📊 性能优化

### 关键优化策略

1. **8 FPS 游戏循环** (125ms)
   - 足够流畅的动画
   - 避免通信阻塞

2. **增量渲染**
   - 正常游戏：仅更新 1-2 个格子/帧
   - 豆子刷新：全局更新所有格子

3. **Canvas 复用**
   - 预分配小 Canvas，避免重复创建

4. **触发全局刷新的时机**
   - 游戏启动（所有格子）
   - 豆子刷新（所有格子）
   - 新按键添加（单个格子）

---

## 📦 提交到市场

准备提交到 UlanziDeck 官方市场：

### 提交材料

1. **插件包**: `com.ulanzi.pacman.ulanziPlugin.zip`
2. **文档**: `SUBMISSION.md`
3. **邮件**: 使用 `SUBMISSION_EMAIL.md` 模板

### 提交流程

1. 发送邮件到: **ustudioservice@ulanzi.com**
2. 主题: `[插件提交] Pac-Man Runner v1.0.0`
3. 附上插件包和 SUBMISSION.md
4. 等待审核反馈

可选：先在官方论坛发布获取社区反馈
- 论坛地址: https://bbs.ulanzistudio.com

---

## 📝 版本历史

### v1.0.0 (2026-04-01)

✨ **初始版本发布**

- 🎮 完整的吃豆人游戏系统
  - 智能寻路（曼哈顿距离 + 随机游荡）
  - 8 FPS 稳定游戏循环
  - 暂停/继续控制

- ⭐ 幸运豆与吉利词语功能
  - 80 个精选吉利词语
  - 3 种随机特效（彩虹/闪烁/巨大）
  - 金色渐变显示

- 🚀 零配置设计
  - 自动位置识别（SDK key 参数）
  - 拖拽即用
  - 即时渲染

- 🎨 Python 生成的经典街机风格图标
  - icon.png (144x144)
  - categoryIcon.png (196x196)
  - actionIcon.png (40x40)

- 📝 详细的日志记录系统
- 🔧 高性能优化（增量更新）

---

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/jinny76/ulanzi-pacman
- **UlanziStudio 下载**: https://www.ulanzi.cn/software/ulanzi_studio
- **官方论坛**: https://bbs.ulanzistudio.com
- **SDK 文档**: [UlanziDeckPlugin-SDK](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发建议

1. 阅读 `CLAUDE.md` 了解项目架构
2. 查看 `docs/` 目录的设计文档
3. 遵循 UUID 命名规范
4. 使用 `$UD.logMessage()` 记录日志
5. 保持 `{row, col}` 数据格式一致性

---

## 📄 许可证

MIT License

Copyright (c) 2026 Jinni

---

## 🙏 致谢

- **UlanziTechnology** 提供的优秀 SDK
- **Pac-Man** 经典游戏的灵感
- **Claude Code** AI 辅助开发

---

<div align="center">

**Enjoy your Pac-Man game on UlanziDeck! 🎮**

Made with ❤️ by [Jinni](https://github.com/jinny76)

</div>
