/**
 * 吃豆人游戏引擎
 */
class GameEngine {
  constructor(gridConfig) {
    this.config = gridConfig;
    this.pacman = {
      row: 0,
      col: 0,
      direction: 'right',
      frame: 0,
      mouthOpen: true
    };

    // 豆子地图（true表示有豆子）
    this.dots = this.initializeDots();

    // 幸运豆地图（true表示这是幸运豆）
    this.luckyDots = this.initializeLuckyDots();

    // 特殊效果状态
    this.specialEffect = null; // 'rainbow', 'flash', 'big'
    this.effectTimer = 0;

    // 吉利成语显示
    this.luckyIdiom = null; // 当前显示的成语
    this.idiomTimer = 0;

    // 马年吉利成语库（四字成语）
    this.luckyIdioms = [
      '马到成功', '龙马精神', '一马当先', '万马奔腾',
      '快马加鞭', '马不停蹄', '马上得胜', '骏马奔驰',
      '天马行空', '马上封侯', '马踏飞燕', '汗马功劳',
      '兵强马壮', '马到凯旋', '马首是瞻', '金戈铁马',
      '千军万马', '指日成功', '跃马扬鞭', '驷马难追'
    ];

    // 当前目标豆子
    this.targetDot = null;

    // 等待豆子刷新状态
    this.waitingForRespawn = false;
    this.respawnTimer = 0;

    // 随机游荡计数器
    this.wanderCounter = 0;

    this.frameCount = 0;
  }

  /**
   * 初始化豆子分布
   */
  initializeDots() {
    const dots = [];
    for (let r = 0; r < this.config.rows; r++) {
      dots[r] = [];
      for (let c = 0; c < this.config.cols; c++) {
        dots[r][c] = true; // 每个格子都有豆子
      }
    }
    return dots;
  }

  /**
   * 初始化幸运豆（确保至少有一个幸运豆）
   */
  initializeLuckyDots() {
    const luckyDots = [];

    // 先全部初始化为false
    for (let r = 0; r < this.config.rows; r++) {
      luckyDots[r] = [];
      for (let c = 0; c < this.config.cols; c++) {
        luckyDots[r][c] = false;
      }
    }

    // 收集所有豆子位置
    const allPositions = [];
    for (let r = 0; r < this.config.rows; r++) {
      for (let c = 0; c < this.config.cols; c++) {
        allPositions.push({ row: r, col: c });
      }
    }

    // 确保至少有一个幸运豆（随机选择一个位置）
    if (allPositions.length > 0) {
      const luckyIndex = Math.floor(Math.random() * allPositions.length);
      const luckyPos = allPositions[luckyIndex];
      luckyDots[luckyPos.row][luckyPos.col] = true;
      console.log('[GameEngine] 🌟 Lucky dot placed at:', luckyPos.row, luckyPos.col);
    }

    return luckyDots;
  }

  /**
   * 找到目标豆子（带随机性）
   */
  findNearestDot() {
    // 收集所有豆子及其距离
    const allDots = [];

    for (let r = 0; r < this.config.rows; r++) {
      for (let c = 0; c < this.config.cols; c++) {
        if (this.dots[r][c]) {
          // 曼哈顿距离
          const dist = Math.abs(r - this.pacman.row) + Math.abs(c - this.pacman.col);
          allDots.push({ row: r, col: c, dist });
        }
      }
    }

    if (allDots.length === 0) return null;

    // 按距离排序
    allDots.sort((a, b) => a.dist - b.dist);

    // 70% 概率选择最近的，30% 概率从前3个中随机选
    const random = Math.random();

    if (random < 0.7 || allDots.length === 1) {
      // 选择最近的
      return { row: allDots[0].row, col: allDots[0].col };
    } else {
      // 从前3个中随机选择
      const topN = Math.min(3, allDots.length);
      const randomIndex = Math.floor(Math.random() * topN);
      return { row: allDots[randomIndex].row, col: allDots[randomIndex].col };
    }
  }

  /**
   * 计算朝目标移动的方向（带随机性）
   */
  getDirectionToTarget(target) {
    if (!target) return null;

    const rowDiff = target.row - this.pacman.row;
    const colDiff = target.col - this.pacman.col;

    // 如果已经在目标位置
    if (rowDiff === 0 && colDiff === 0) return null;

    // 计算所有可能的方向及其得分
    const directions = [];

    // 垂直方向
    if (rowDiff !== 0) {
      const vDir = rowDiff > 0 ? 'down' : 'up';
      directions.push({ dir: vDir, score: Math.abs(rowDiff), isToward: true });
    }

    // 水平方向
    if (colDiff !== 0) {
      const hDir = colDiff > 0 ? 'right' : 'left';
      directions.push({ dir: hDir, score: Math.abs(colDiff), isToward: true });
    }

    // 添加其他方向（包括回头）
    const allDirs = ['up', 'down', 'left', 'right'];
    allDirs.forEach(dir => {
      if (!directions.find(d => d.dir === dir)) {
        directions.push({ dir: dir, score: 0, isToward: false });
      }
    });

    // 80% 选择朝向目标的方向，20% 随机选择任意方向（包括回头）
    const random = Math.random();

    if (random < 0.8) {
      // 选择朝向目标的方向
      const towardDirs = directions.filter(d => d.isToward);

      if (towardDirs.length === 1) {
        return towardDirs[0].dir;
      } else if (towardDirs.length === 2) {
        // 如果有两个方向都朝向目标，70% 选择距离更大的，30% 选择另一个
        towardDirs.sort((a, b) => b.score - a.score);
        return Math.random() < 0.7 ? towardDirs[0].dir : towardDirs[1].dir;
      }
    } else {
      // 20% 概率完全随机选择方向（包括回头）
      const randomIndex = Math.floor(Math.random() * allDirs.length);
      return allDirs[randomIndex];
    }

    // 默认返回第一个朝向目标的方向
    return directions.find(d => d.isToward)?.dir || directions[0].dir;
  }

  /**
   * 更新游戏状态（每帧调用）
   */
  update() {
    this.frameCount++;

    // 更新特殊效果计时器
    if (this.specialEffect && this.effectTimer > 0) {
      this.effectTimer--;
      if (this.effectTimer === 0) {
        console.log('[GameEngine] Special effect ended:', this.specialEffect);
        this.specialEffect = null;
      }
    }

    // 如果在等待豆子刷新
    if (this.waitingForRespawn) {
      this.respawnTimer++;

      // 等待16帧（约2秒）后刷新豆子
      if (this.respawnTimer >= 16) {
        this.dots = this.initializeDots();
        this.luckyDots = this.initializeLuckyDots(); // 重新生成幸运豆
        this.targetDot = this.findNearestDot();
        this.waitingForRespawn = false;
        this.respawnTimer = 0;
        console.log('[GameEngine] Dots respawned!');
      }

      // 等待期间不更新任何内容（包括动画），完全静止
      return;
    }

    // 动画帧更新（每3帧切换一次张嘴/闭嘴）
    if (this.frameCount % 3 === 0) {
      this.pacman.mouthOpen = !this.pacman.mouthOpen;
      this.pacman.frame = (this.pacman.frame + 1) % 4;
    }

    // 位置更新（每8帧移动一格）- 约1秒移动1格，避免残影
    if (this.frameCount % 8 === 0) {
      this.movePacman();
    }
  }

  /**
   * 移动吃豆人
   */
  movePacman() {
    // 如果当前位置有豆子，吃掉它
    if (this.dots[this.pacman.row][this.pacman.col]) {
      // 检查是否是幸运豆
      const isLucky = this.luckyDots[this.pacman.row][this.pacman.col];

      this.dots[this.pacman.row][this.pacman.col] = false;
      this.luckyDots[this.pacman.row][this.pacman.col] = false;
      this.targetDot = null; // 目标已达成，寻找新目标

      if (isLucky) {
        console.log('[GameEngine] 🎉 Ate LUCKY dot at', this.pacman.row, this.pacman.col);

        // 随机选择一种特殊效果
        const effects = ['rainbow', 'flash', 'big'];
        this.specialEffect = effects[Math.floor(Math.random() * 3)];
        this.effectTimer = 24; // 持续3秒（8 FPS * 3）

        console.log('[GameEngine] Special effect activated:', this.specialEffect);
      } else {
        console.log('[GameEngine] Ate dot at', this.pacman.row, this.pacman.col);
      }

      // 40% 概率进入随机游荡模式（1-2步）
      if (Math.random() < 0.4) {
        this.wanderCounter = Math.floor(Math.random() * 2) + 1;
        console.log('[GameEngine] Entering wander mode for', this.wanderCounter, 'steps');
      }
    }

    // 如果在随机游荡中
    if (this.wanderCounter > 0) {
      this.wanderCounter--;

      // 随机选择一个方向
      const allDirs = ['up', 'down', 'left', 'right'];
      this.pacman.direction = allDirs[Math.floor(Math.random() * 4)];

      // 继续移动
      let newRow = this.pacman.row;
      let newCol = this.pacman.col;

      switch (this.pacman.direction) {
        case 'up':
          newRow = Math.max(0, newRow - 1);
          break;
        case 'down':
          newRow = Math.min(this.config.rows - 1, newRow + 1);
          break;
        case 'left':
          newCol = Math.max(0, newCol - 1);
          break;
        case 'right':
          newCol = Math.min(this.config.cols - 1, newCol + 1);
          break;
      }

      this.pacman.row = newRow;
      this.pacman.col = newCol;
      return; // 游荡期间不寻找目标
    }

    // 如果没有目标或目标已被吃掉，寻找新目标
    if (!this.targetDot || !this.dots[this.targetDot.row]?.[this.targetDot.col]) {
      this.targetDot = this.findNearestDot();
    }

    // 如果所有豆子都吃完了，进入等待刷新状态
    if (!this.targetDot) {
      console.log('[GameEngine] All dots eaten! Waiting for respawn...');
      this.waitingForRespawn = true;
      this.respawnTimer = 0;
      return; // 不再移动
    }

    // 计算朝目标的移动方向
    const direction = this.getDirectionToTarget(this.targetDot);
    if (direction) {
      this.pacman.direction = direction;
    }

    // 计算新位置
    let newRow = this.pacman.row;
    let newCol = this.pacman.col;

    switch (this.pacman.direction) {
      case 'up':
        newRow = Math.max(0, newRow - 1);
        break;
      case 'down':
        newRow = Math.min(this.config.rows - 1, newRow + 1);
        break;
      case 'left':
        newCol = Math.max(0, newCol - 1);
        break;
      case 'right':
        newCol = Math.min(this.config.cols - 1, newCol + 1);
        break;
    }

    // 更新位置
    this.pacman.row = newRow;
    this.pacman.col = newCol;
  }

  /**
   * 检查是否所有豆子都被吃掉
   */
  allDotsEaten() {
    for (let r = 0; r < this.config.rows; r++) {
      for (let c = 0; c < this.config.cols; c++) {
        if (this.dots[r][c]) return false;
      }
    }
    return true;
  }

  /**
   * 获取游戏状态（供渲染使用）
   */
  getState() {
    return {
      pacman: { ...this.pacman },
      dots: this.dots,
      luckyDots: this.luckyDots,
      specialEffect: this.specialEffect,
      effectTimer: this.effectTimer
    };
  }
}
