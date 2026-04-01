/**
 * 吃豆人插件主服务 - 完整版本
 */

// 全局状态
const ACTION_CACHES = {};
let gameEngine = null;
let renderManager = null;
let updateTimer = null;

// 游戏格子映射 (context -> {col, row})
let gameCells = {};

// 幸运词格子映射 (index: 0-3 -> context)
let blessingCells = {};

// 当前显示的成语
let currentIdiom = null;
let idiomDisplayTimer = 0;
const IDIOM_DISPLAY_DURATION = 40; // 5秒

// 固定网格配置
const GRID_CONFIG = {
  rows: 3,
  cols: 5,
  gameArea: { rows: 3, cols: 3 },
  cellSize: 144
};

/**
 * 解析按键位置
 */
function parseKeyRole(key) {
  const [col, row] = key.split('_').map(Number);

  if (col <= 2 && row <= 2) {
    return { role: 'game', col, row };
  }

  const blessingMap = { '3_0': 0, '4_0': 1, '3_1': 2, '4_1': 3 };
  if (blessingMap.hasOwnProperty(key)) {
    return { role: 'blessing', col, row, index: blessingMap[key] };
  }

  return { role: 'unused', col, row };
}

// 连接
$UD.connect('com.ulanzi.ulanzistudio.pacman');

$UD.onConnected(() => {
  $UD.logMessage('Connected', 'info');

  // 初始化游戏引擎
  gameEngine = new GameEngine({
    rows: GRID_CONFIG.gameArea.rows,
    cols: GRID_CONFIG.gameArea.cols,
    cellSize: GRID_CONFIG.cellSize
  });

  renderManager = new RenderManager({
    rows: GRID_CONFIG.gameArea.rows,
    cols: GRID_CONFIG.gameArea.cols,
    cellSize: GRID_CONFIG.cellSize
  });

  $UD.logMessage('Engines initialized', 'info');
});

// onAdd
$UD.onAdd(jsn => {
  const context = jsn.context;
  const decoded = $UD.decodeContext(context);
  const key = decoded.key;

  $UD.logMessage(`onAdd: key="${key}", decoded=${JSON.stringify(decoded)}`, 'info');

  const keyInfo = parseKeyRole(key);
  $UD.logMessage(`parsed: role=${keyInfo.role}, col=${keyInfo.col}, row=${keyInfo.row}`, 'info');

  if (keyInfo.role === 'game') {
    gameCells[context] = { row: keyInfo.row, col: keyInfo.col };
    ACTION_CACHES[context] = { type: 'game', ...keyInfo };

    // 如果游戏引擎已初始化，立即渲染这个按键
    if (gameEngine && renderManager) {
      const gameState = gameEngine.getState();
      renderManager.renderFullScene(gameState);

      // 创建只包含这个按键的map
      const singleCellMap = { [context]: { row: keyInfo.row, col: keyInfo.col } };
      const blocks = renderManager.splitAllBlocks(singleCellMap);

      if (blocks[context]) {
        $UD.setBaseDataIcon(context, blocks[context]);
        $UD.logMessage(`Rendered cell at (${keyInfo.row}, ${keyInfo.col})`, 'info');
      }
    } else {
      // 渲染初始空白（引擎未初始化时）
      const canvas = document.createElement('canvas');
      canvas.width = 144;
      canvas.height = 144;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 144, 144);
      $UD.setBaseDataIcon(context, canvas.toDataURL());
    }

  } else if (keyInfo.role === 'blessing') {
    blessingCells[keyInfo.index] = context;
    ACTION_CACHES[context] = { type: 'blessing', ...keyInfo };

    // 渲染初始空白
    const canvas = document.createElement('canvas');
    canvas.width = 144;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2C2C2C';
    ctx.fillRect(0, 0, 144, 144);
    $UD.setBaseDataIcon(context, canvas.toDataURL());
  }

  // 启动游戏
  const total = Object.keys(gameCells).length;
  const blessTotal = Object.keys(blessingCells).length;
  $UD.logMessage(`Current total: game=${total}, blessing=${blessTotal}`, 'info');
  $UD.logMessage(`gameCells keys: ${JSON.stringify(Object.keys(gameCells))}`, 'info');
  $UD.logMessage(`blessingCells: ${JSON.stringify(blessingCells)}`, 'info');

  if (total >= 2 && !updateTimer) {
    $UD.logMessage(`Starting game with ${total} cells`, 'info');
    startGame();
  }
});

// 启动游戏循环
function startGame() {
  $UD.logMessage('startGame called', 'info');
  $UD.logMessage(`gameCells: ${JSON.stringify(gameCells)}`, 'info');

  // 首次渲染所有格子
  const initialState = gameEngine.getState();
  renderManager.renderFullScene(initialState);
  const initialBlocks = renderManager.splitAllBlocks(gameCells);
  for (const [ctx, base64] of Object.entries(initialBlocks)) {
    if (ACTION_CACHES[ctx]) {
      $UD.setBaseDataIcon(ctx, base64);
    }
  }
  $UD.logMessage(`Initial render: ${Object.keys(initialBlocks).length} blocks`, 'info');

  let frameCount = 0;
  let lastSpecialEffect = null;
  let lastWaitingState = false;

  updateTimer = setInterval(() => {
    try {
      // 更新游戏状态
      gameEngine.update();

      // 渲染完整场景
      const gameState = gameEngine.getState();
      renderManager.renderFullScene(gameState);

      // 检测豆子是否刚重新生成
      const justRespawned = lastWaitingState && !gameEngine.waitingForRespawn;
      lastWaitingState = gameEngine.waitingForRespawn;

      // 如果豆子刚重新生成，渲染所有格子
      if (justRespawned) {
        $UD.logMessage('Dots respawned, refreshing all cells', 'info');
        const allBlocks = renderManager.splitAllBlocks(gameCells);
        for (const [ctx, base64] of Object.entries(allBlocks)) {
          if (ACTION_CACHES[ctx]) {
            $UD.setBaseDataIcon(ctx, base64);
          }
        }
      }
      // 正常运行时，只更新吃豆人附近的格子
      else if (!gameEngine.waitingForRespawn) {
        const blocks = renderManager.splitToBlocks(gameCells, gameState.pacman);

        // 首帧调试
        if (frameCount === 0) {
          $UD.logMessage(`Frame 0: blocks=${Object.keys(blocks).length}, cells=${Object.keys(gameCells).length}, pacman=(${gameState.pacman.row},${gameState.pacman.col})`, 'info');
        }

        for (const [ctx, base64] of Object.entries(blocks)) {
          if (ACTION_CACHES[ctx]) {
            $UD.setBaseDataIcon(ctx, base64);
          }
        }
      }
      // 等待期间不更新（避免不必要的通信）

      // 检测幸运豆被吃（特效刚触发）
      if (gameState.specialEffect && !lastSpecialEffect) {
        triggerLuckyIdiom();
      }
      lastSpecialEffect = gameState.specialEffect;

      // 处理成语显示
      if (currentIdiom) {
        idiomDisplayTimer++;
        if (idiomDisplayTimer >= IDIOM_DISPLAY_DURATION) {
          clearIdiom();
        }
      }

      frameCount++;
    } catch (err) {
      $UD.logMessage(`Loop error: ${err.message}`, 'error');
    }
  }, 125);
}

// 触发幸运成语
function triggerLuckyIdiom() {
  // 吉利四字词语库（传统+网络流行语）
  const idioms = [
    // 财富prosperity
    '恭喜发财', '财源广进', '财源滚滚', '日进斗金', '生意兴隆',
    '八方来财', '招财进宝', '金玉满堂', '腰缠万贯', '富贵吉祥',

    // 事业成功
    '马到成功', '一马当先', '大展宏图', '鹏程万里', '飞黄腾达',
    '步步高升', '事业有成', '蒸蒸日上', '锦绣前程', '前程似锦',

    // 好运顺利
    '吉星高照', '万事如意', '心想事成', '一帆风顺', '顺风顺水',
    '六六大顺', '十全十美', '如意顺利', '吉祥如意', '好运常在',

    // 健康平安
    '身体健康', '福寿安康', '平安喜乐', '四季平安', '一生平安',
    '健康长寿', '龙马精神', '精神焕发', '活力满满', '笑口常开',

    // 幸福美满
    '花好月圆', '阖家欢乐', '合家幸福', '喜气洋洋', '欢天喜地',
    '五福临门', '福星高照', '喜事连连', '双喜临门', '花开富贵',

    // 网络流行/现代祝福
    '暴富暴美', '逢考必过', '心想事成', '吃嘛嘛香', '天天开心',
    '爱你哟嘿', '冲鸭冲鸭', '越来越好', '永远快乐', '实现梦想',

    // 2026马年特色
    '龙马精神', '万马奔腾', '快马加鞭', '天马行空', '马上得胜',
    '马踏飞燕', '汗马功劳', '骏马奔驰', '跃马扬鞭', '马到凯旋'
  ];
  currentIdiom = idioms[Math.floor(Math.random() * idioms.length)];
  idiomDisplayTimer = 0;

  $UD.logMessage(`Lucky idiom triggered: ${currentIdiom}`, 'info');

  for (let i = 0; i < 4; i++) {
    const context = blessingCells[i];
    if (context && ACTION_CACHES[context]) {
      const char = currentIdiom.charAt(i) || '？';
      renderBlessingChar(context, char);
    }
  }
}

// 渲染祝福语文字
function renderBlessingChar(context, char) {
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  // 金色渐变
  const gradient = ctx.createLinearGradient(0, 0, 144, 144);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.5, '#FFA500');
  gradient.addColorStop(1, '#FF8C00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 144, 144);

  // 白色文字
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 72, 72);

  $UD.setBaseDataIcon(context, canvas.toDataURL());
}

// 清除成语
function clearIdiom() {
  currentIdiom = null;
  idiomDisplayTimer = 0;

  for (let i = 0; i < 4; i++) {
    const context = blessingCells[i];
    if (context && ACTION_CACHES[context]) {
      const canvas = document.createElement('canvas');
      canvas.width = 144;
      canvas.height = 144;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2C2C2C';
      ctx.fillRect(0, 0, 144, 144);
      $UD.setBaseDataIcon(context, canvas.toDataURL());
    }
  }
}

// onRun - 暂停/继续
$UD.onRun(jsn => {
  const cache = ACTION_CACHES[jsn.context];
  if (cache && cache.type === 'game' && gameEngine) {
    gameEngine.togglePause();
    const paused = gameEngine.isPaused();
    $UD.logMessage(paused ? 'Game paused' : 'Game playing', 'info');
  }
});

// onClear
$UD.onClear(jsn => {
  if (jsn.param) {
    for (let i = 0; i < jsn.param.length; i++) {
      const context = jsn.param[i].context;
      const cache = ACTION_CACHES[context];
      if (cache) {
        if (cache.type === 'game') {
          delete gameCells[context];
        } else if (cache.type === 'blessing') {
          delete blessingCells[cache.index];
        }
        delete ACTION_CACHES[context];
      }
    }

    if (Object.keys(gameCells).length < 2 && updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
      $UD.logMessage('Game stopped - not enough cells', 'info');
    }
  }
});
