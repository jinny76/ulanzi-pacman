/**
 * 渲染管理器
 * 负责将游戏状态渲染到Canvas并切分给各个按键
 */
class RenderManager {
  constructor(gridConfig) {
    this.config = gridConfig;

    // 创建完整游戏画面的Canvas
    this.fullCanvas = document.createElement('canvas');
    this.fullCanvas.width = gridConfig.cols * gridConfig.cellSize;
    this.fullCanvas.height = gridConfig.rows * gridConfig.cellSize;
    this.fullCtx = this.fullCanvas.getContext('2d');

    // 为每个格子预创建小Canvas（避免重复创建）
    this.cellCanvases = {};

    // 上一帧的吃豆人位置
    this.lastPacmanPos = { row: -1, col: -1 };
  }

  /**
   * 渲染完整游戏画面
   */
  renderFullScene(gameState) {
    const ctx = this.fullCtx;
    const { pacman, dots, luckyDots, specialEffect, effectTimer } = gameState;

    // 清空画布 - 黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.fullCanvas.width, this.fullCanvas.height);

    // 如果有特殊效果，先绘制背景效果
    if (specialEffect) {
      this.drawSpecialBackground(ctx, specialEffect, effectTimer);
    }

    // 绘制格子网格线
    this.drawGrid(ctx);

    // 绘制豆子（包括幸运豆）
    this.drawDots(ctx, dots, luckyDots, specialEffect);

    // 绘制吃豆人
    this.drawPacman(ctx, pacman);
  }

  /**
   * 绘制网格线
   */
  drawGrid(ctx) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;

    // 垂直线
    for (let col = 0; col <= this.config.cols; col++) {
      const x = col * this.config.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.fullCanvas.height);
      ctx.stroke();
    }

    // 水平线
    for (let row = 0; row <= this.config.rows; row++) {
      const y = row * this.config.cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.fullCanvas.width, y);
      ctx.stroke();
    }
  }

  /**
   * 绘制特殊效果背景
   */
  drawSpecialBackground(ctx, effect, effectTimer) {
    const alpha = Math.min(0.3, effectTimer / 80); // 渐淡效果

    if (effect === 'rainbow') {
      // 彩虹渐变背景
      const gradient = ctx.createLinearGradient(0, 0, this.fullCanvas.width, this.fullCanvas.height);
      const hue = (Date.now() / 20) % 360; // 动态变化的色相
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${(hue + 120) % 360}, 100%, 50%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${(hue + 240) % 360}, 100%, 50%, ${alpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.fullCanvas.width, this.fullCanvas.height);
    } else if (effect === 'flash') {
      // 闪烁效果
      const flash = Math.sin(effectTimer * 0.5) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 0, ${flash * 0.2})`;
      ctx.fillRect(0, 0, this.fullCanvas.width, this.fullCanvas.height);
    }
  }

  /**
   * 绘制豆子（包括幸运豆）
   */
  drawDots(ctx, dots, luckyDots, specialEffect) {
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (dots[row][col]) {
          const centerX = col * this.config.cellSize + this.config.cellSize / 2;
          const centerY = row * this.config.cellSize + this.config.cellSize / 2;

          // 检查是否是幸运豆
          const isLucky = luckyDots && luckyDots[row][col];

          if (isLucky) {
            // 幸运豆 - 金色大豆子，带闪烁效果
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 1;
            const radius = 12 * pulse;

            // 外发光
            const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 5);
            glow.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
            ctx.fill();

            // 主体
            ctx.fillStyle = '#FFD700'; // 金色
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // 高光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(centerX - 3, centerY - 3, radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // 普通豆子
            let dotRadius = 8;

            // 如果有'big'效果，豆子变大
            if (specialEffect === 'big') {
              dotRadius = 12;
            }

            ctx.fillStyle = '#FFB8AE';
            ctx.beginPath();
            ctx.arc(centerX, centerY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  /**
   * 绘制吃豆人
   */
  drawPacman(ctx, pacman) {
    const centerX = pacman.col * this.config.cellSize + this.config.cellSize / 2;
    const centerY = pacman.row * this.config.cellSize + this.config.cellSize / 2;
    const radius = 50;

    // 吃豆人颜色
    ctx.fillStyle = '#FFFF00';

    // 根据方向旋转
    const rotationMap = {
      'right': 0,
      'down': Math.PI / 2,
      'left': Math.PI,
      'up': -Math.PI / 2
    };
    const rotation = rotationMap[pacman.direction];

    // 嘴巴张开角度
    const mouthAngle = pacman.mouthOpen ? Math.PI / 6 : 0.01;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // 绘制吃豆人（缺口扇形）
    ctx.beginPath();
    ctx.arc(0, 0, radius, mouthAngle, Math.PI * 2 - mouthAngle);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-10, -20, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 初始渲染所有格子（首次加载时使用）
   */
  splitAllBlocks(keyPositionMap) {
    const blocks = {};

    Object.entries(keyPositionMap).forEach(([key, position]) => {
      const { row, col } = position;

      // 复用或创建小Canvas
      if (!this.cellCanvases[key]) {
        this.cellCanvases[key] = document.createElement('canvas');
        this.cellCanvases[key].width = this.config.cellSize;
        this.cellCanvases[key].height = this.config.cellSize;
      }

      const cellCanvas = this.cellCanvases[key];
      const cellCtx = cellCanvas.getContext('2d');

      // 清空
      cellCtx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);

      // 从完整画面中裁剪对应区域
      cellCtx.drawImage(
        this.fullCanvas,
        col * this.config.cellSize,
        row * this.config.cellSize,
        this.config.cellSize,
        this.config.cellSize,
        0, 0,
        this.config.cellSize,
        this.config.cellSize
      );

      blocks[key] = cellCanvas.toDataURL('image/png');
    });

    return blocks;
  }

  /**
   * 切分完整画面为多个格子（只更新需要更新的格子）
   */
  splitToBlocks(keyPositionMap, pacmanPos) {
    const blocks = {};

    // 需要更新的格子：吃豆人当前位置和上一帧位置
    const needUpdateKeys = new Set();

    // 找出需要更新的按键
    Object.entries(keyPositionMap).forEach(([key, position]) => {
      const { row, col } = position;

      // 吃豆人当前位置需要更新
      if (row === pacmanPos.row && col === pacmanPos.col) {
        needUpdateKeys.add(key);
      }

      // 吃豆人上一帧位置需要更新（清除残影）- 只有位置真的改变时才需要
      if (this.lastPacmanPos.row !== -1 &&
          (this.lastPacmanPos.row !== pacmanPos.row || this.lastPacmanPos.col !== pacmanPos.col)) {
        if (row === this.lastPacmanPos.row && col === this.lastPacmanPos.col) {
          needUpdateKeys.add(key);
        }
      }
    });

    // 只处理需要更新的格子
    needUpdateKeys.forEach(key => {
      const position = keyPositionMap[key];
      if (!position) return;

      const { row, col } = position;

      // 复用或创建小Canvas
      if (!this.cellCanvases[key]) {
        this.cellCanvases[key] = document.createElement('canvas');
        this.cellCanvases[key].width = this.config.cellSize;
        this.cellCanvases[key].height = this.config.cellSize;
      }

      const cellCanvas = this.cellCanvases[key];
      const cellCtx = cellCanvas.getContext('2d');

      // 清空
      cellCtx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);

      // 从完整画面中裁剪对应区域
      cellCtx.drawImage(
        this.fullCanvas,
        col * this.config.cellSize,
        row * this.config.cellSize,
        this.config.cellSize,
        this.config.cellSize,
        0, 0,
        this.config.cellSize,
        this.config.cellSize
      );

      blocks[key] = cellCanvas.toDataURL('image/png');
    });

    // 记录当前吃豆人位置
    this.lastPacmanPos = { ...pacmanPos };

    return blocks;
  }
}
