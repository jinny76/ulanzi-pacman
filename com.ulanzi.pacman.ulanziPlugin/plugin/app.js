/**
 * 吃豆人插件主服务
 */

// 全局状态
const ACTION_CACHES = {};
let gameEngine = null;
let renderManager = null;
let updateTimer = null;

// 按键位置映射（从配置中加载）
let keyPositionMap = {};

// Lucky Text 实例映射（position: 0-3 -> context）
let luckyTextMap = {};

// 当前显示的成语和显示时间
let currentIdiom = null;
let idiomDisplayTimer = 0;
const IDIOM_DISPLAY_DURATION = 40; // 5秒 (8 FPS * 5)

// 网格配置（默认3x3）
const GRID_CONFIG = {
  rows: 3,
  cols: 3,
  cellSize: 144
};

// 豆子刷新延迟（毫秒）
const DOT_RESPAWN_DELAY = 2000; // 2秒

// 连接
$UD.connect('com.ulanzi.pacman');

$UD.onConnected(() => {
  console.log('[PacMan] Connected');
  $UD.logMessage('🎮 吃豆人插件已连接', 'info');

  // 获取全局设置
  $UD.getGlobalSettings();

  // 初始化游戏引擎
  gameEngine = new GameEngine(GRID_CONFIG);
  renderManager = new RenderManager(GRID_CONFIG);

  // 延迟显示配置状态（等待所有Action加载完成）
  setTimeout(() => {
    showConfigStatus();
  }, 3000);  // 增加到3秒

  // 启动游戏循环
  startGameLoop();
});

/**
 * 检查坐标唯一性
 * @returns {Object} { isUnique: boolean, duplicates: Array }
 */
function checkCoordinateUniqueness() {
  const coordMap = {};
  const duplicates = [];

  Object.entries(keyPositionMap).forEach(([key, position]) => {
    const coordKey = `${position.row},${position.col}`;

    if (coordMap[coordKey]) {
      // 发现重复坐标
      duplicates.push({
        keys: [coordMap[coordKey], key],
        position: { row: position.row, col: position.col }
      });
    } else {
      coordMap[coordKey] = key;
    }
  });

  return {
    isUnique: duplicates.length === 0,
    duplicates
  };
}

/**
 * 启动游戏循环
 */
function startGameLoop() {
  if (updateTimer) clearInterval(updateTimer);

  // 检查是否有足够的按键配置了位置（至少2个）
  const configuredCount = Object.keys(keyPositionMap).length;
  console.log('[PacMan] startGameLoop called, configured keys:', configuredCount);

  if (configuredCount < 2) {
    console.log('[PacMan] ❌ Need at least 2 keys configured, current:', configuredCount);
    $UD.logMessage(`❌ 游戏无法启动：需要至少2个格子，当前只有${configuredCount}个`, 'error');
    return;
  }

  // 检查坐标唯一性
  const uniquenessCheck = checkCoordinateUniqueness();
  if (!uniquenessCheck.isUnique) {
    console.warn('[PacMan] Duplicate coordinates detected:', uniquenessCheck.duplicates);
    $UD.logMessage(`❌ 游戏无法启动：坐标冲突！`, 'error');
    uniquenessCheck.duplicates.forEach(dup => {
      console.warn(`[PacMan] Keys ${dup.keys.join(', ')} have same position (${dup.position.row}, ${dup.position.col})`);
      // 为冲突的按键显示错误图标
      dup.keys.forEach(key => {
        const context = Object.keys(ACTION_CACHES).find(ctx => {
          const { key: k } = $UD.decodeContext(ctx);
          return k === key;
        });
        if (context) {
          showConflictIcon(context, dup.position.row, dup.position.col);
        }
      });
    });
    return;
  }

  console.log('[PacMan] Starting game loop with', configuredCount, 'keys');
  $UD.logMessage(`✅ 游戏启动成功！已配置${configuredCount}个吃豆人格子`, 'info');

  // 首次渲染所有格子
  const gameState = gameEngine.getState();
  renderManager.renderFullScene(gameState);
  const initialBlocks = renderManager.splitAllBlocks(keyPositionMap);
  updateAllKeys(initialBlocks);

  // 降低到 8 FPS 避免通信阻塞
  let lastWaitingState = false;
  let lastLuckyEffect = null;

  updateTimer = setInterval(() => {
    try {
      // 更新游戏逻辑
      gameEngine.update();

      // 渲染游戏画面
      const gameState = gameEngine.getState();
      renderManager.renderFullScene(gameState);

      // 检测幸运豆特效触发（新的特效开始）
      if (gameState.specialEffect && gameState.specialEffect !== lastLuckyEffect) {
        console.log('[PacMan] 🎉 Lucky dot effect triggered! Effect:', gameState.specialEffect);
        console.log('[PacMan] Lucky Text Map:', luckyTextMap);
        console.log('[PacMan] Configured Lucky Text count:', Object.keys(luckyTextMap).length);

        // 界面提示
        const configuredCount = Object.keys(luckyTextMap).length;

        triggerLuckyIdiom();
        lastLuckyEffect = gameState.specialEffect;
      } else if (!gameState.specialEffect) {
        lastLuckyEffect = null;
      }

      // 更新成语显示计时器
      if (currentIdiom && idiomDisplayTimer > 0) {
        idiomDisplayTimer--;
        if (idiomDisplayTimer === 0) {
          console.log('[PacMan] Idiom display ended');
          currentIdiom = null;
          clearLuckyText();
        }
      }

      // 检测是否从等待状态切换到正常状态（豆子刚刷新）
      const justRespawned = lastWaitingState && !gameEngine.waitingForRespawn;
      lastWaitingState = gameEngine.waitingForRespawn;

      // 如果豆子刚刷新，更新所有格子显示新豆子
      if (justRespawned) {
        console.log('[PacMan] Refreshing all keys after dot respawn');
        const allBlocks = renderManager.splitAllBlocks(keyPositionMap);
        updateAllKeys(allBlocks);
      }
      // 正常运行时，只更新吃豆人附近的格子
      else if (!gameEngine.waitingForRespawn) {
        const blocks = renderManager.splitToBlocks(keyPositionMap, gameState.pacman);
        updateAllKeys(blocks);
      }
      // 等待期间不更新（避免不必要的通信）
    } catch (e) {
      console.error('[PacMan] Error in game loop:', e);
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }, 1000 / 8);
}

/**
 * 更新所有按键的图标
 */
function updateAllKeys(blocks) {
  Object.entries(ACTION_CACHES).forEach(([context, instance]) => {
    if (!instance.allowSend) return;
    if (!instance.configured) return; // 未配置的不更新

    const { key } = $UD.decodeContext(context);
    const iconData = blocks[key];

    if (iconData) {
      $UD.setBaseDataIcon(context, iconData);
    }
  });
}

/**
 * 显示未配置提示图标（纯黑屏）
 */
function showUnconfiguredIcon(context) {
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  // 纯黑屏
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 144, 144);

  const iconData = canvas.toDataURL('image/png');
  $UD.setBaseDataIcon(context, iconData);
}

/**
 * 显示坐标冲突图标
 */
function showConflictIcon(context, row, col) {
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  // 深红色背景
  ctx.fillStyle = '#3a1a1a';
  ctx.fillRect(0, 0, 144, 144);

  // 红色边框
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 124, 124);

  // 错误图标 (X)
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(50, 30);
  ctx.lineTo(94, 74);
  ctx.moveTo(94, 30);
  ctx.lineTo(50, 74);
  ctx.stroke();

  // 文字提示
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('坐标冲突', 72, 95);

  // 坐标信息
  ctx.fillStyle = '#FF6666';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`(${row}, ${col})`, 72, 115);

  // 提示信息
  ctx.fillStyle = '#888888';
  ctx.font = '10px Arial';
  ctx.fillText('请修改位置', 72, 135);

  const iconData = canvas.toDataURL('image/png');
  $UD.setBaseDataIcon(context, iconData);
}

/**
 * Action 添加
 */
$UD.onAdd(jsn => {
  const context = jsn.context;
  const { uuid: action } = $UD.decodeContext(context);

  console.log('[PacMan] ============= onAdd 被调用 =============');
  console.log('[PacMan] - Context:', context);
  console.log('[PacMan] - Action type:', action);
  console.log('[PacMan] - 完整参数对象 jsn.param:', JSON.stringify(jsn.param, null, 2));

  if (!ACTION_CACHES[context]) {
    ACTION_CACHES[context] = {
      context,
      allowSend: true,
      position: null,
      configured: false,
      actionType: action // 保存action类型
    };
    console.log('[PacMan] ✅ 创建新实例，actionType:', action);
  } else {
    console.log('[PacMan] ⚠️ 实例已存在');
  }

  // 判断Action类型
  if (action === 'com.ulanzi.pacman.luckytext') {
    // 祝福语 Action
    console.log('[PacMan] 🎊 这是祝福语 Action');
    $UD.logMessage('发现祝福语 Action', 'info');

    // 检查参数
    console.log('[PacMan] - jsn.param 类型:', typeof jsn.param);
    console.log('[PacMan] - jsn.param 是否为 null:', jsn.param === null);
    console.log('[PacMan] - jsn.param 是否为 undefined:', jsn.param === undefined);

    // 兼容旧参数名 textPosition 和新参数名 index
    if (jsn.param && typeof jsn.param === 'object') {
      console.log('[PacMan] - jsn.param 是对象，键列表:', Object.keys(jsn.param));
      console.log('[PacMan] - jsn.param.index:', jsn.param.index);
      console.log('[PacMan] - jsn.param.textPosition:', jsn.param.textPosition);

      if (jsn.param.textPosition !== undefined && jsn.param.index === undefined) {
        // 转换旧参数名为新参数名
        jsn.param.index = jsn.param.textPosition;
        console.log('[PacMan] 🔄 转换旧参数 textPosition 为 index:', jsn.param.index);
      }

      if (jsn.param.index !== undefined) {
        console.log('[PacMan] ✅ 找到 index 参数:', jsn.param.index);
        $UD.logMessage(`✅ 加载祝福语位置${jsn.param.index}`, 'info');
        onSetLuckyTextSettings(jsn);
      } else {
        // 未配置时显示黑屏
        console.log('[PacMan] ❌ jsn.param 中没有 index 或 textPosition');
        if (Object.keys(jsn.param).length === 0) {
          console.log('[PacMan] ⚠️ jsn.param 是空对象 {}');
        }
        $UD.logMessage('⚠️ 祝福语参数为空，需要配置', 'warn');
        showLuckyTextUnconfiguredIcon(context);
      }
    } else {
      console.log('[PacMan] ❌ jsn.param 为空、undefined 或不是对象');
      $UD.logMessage('❌ 祝福语参数无效', 'error');
      showLuckyTextUnconfiguredIcon(context);
    }
  } else if (action === 'com.ulanzi.pacman.cell') {
    // Pac-Man Cell Action
    console.log('[PacMan] 👾 这是吃豆人格子 Action');
    if (jsn.param && jsn.param.position_row !== undefined && jsn.param.position_col !== undefined) {
      console.log('[PacMan] ✅ 找到位置参数:', jsn.param.position_row, jsn.param.position_col);
      onSetSettings(jsn);
    } else {
      console.log('[PacMan] ❌ 缺少位置参数');
      showUnconfiguredIcon(context);
    }
  } else {
    console.log('[PacMan] ⚠️ 未知的 action 类型:', action);
    $UD.logMessage(`⚠️ 未知的 action 类型: ${action}`, 'warn');
  }

  console.log('[PacMan] ============= onAdd 处理完成 =============\n');
});

/**
 * 设置活跃状态
 */
$UD.onSetActive(jsn => {
  const instance = ACTION_CACHES[jsn.context];
  if (instance) {
    instance.allowSend = jsn.active;
  }
});

/**
 * 按键按下（可用于暂停/继续游戏）
 */
$UD.onRun(jsn => {
  console.log('[PacMan] Button pressed, context:', jsn.context);

  const instance = ACTION_CACHES[jsn.context];
  if (!instance) {
    console.log('[PacMan] Instance not found');
    return;
  }

  const { uuid: action } = $UD.decodeContext(jsn.context);

  // 如果是祝福语按键，显示调试信息
  if (action === 'com.ulanzi.pacman.luckytext') {
    const configuredCount = Object.keys(luckyTextMap).length;
    const positionInfo = [];
    for (let i = 0; i < 4; i++) {
      if (luckyTextMap[i]) {
        positionInfo.push(`位置${i}✓`);
      } else {
        positionInfo.push(`位置${i}✗`);
      }
    }

    // 显示这个按键的详细信息
    console.log('[PacMan] ========== 按键信息 ==========');
    console.log('[PacMan] Context:', jsn.context);
    console.log('[PacMan] Instance:', instance);
    console.log('[PacMan] Current luckyTextMap:', luckyTextMap);
    console.log('[PacMan] =====================================');


    // 显示全局状态
    showConfigStatus();
    return;
  }

  // 吃豆人按键：切换游戏暂停状态
  if (updateTimer) {
    console.log('[PacMan] Pausing game');
    clearInterval(updateTimer);
    updateTimer = null;
  } else {
    console.log('[PacMan] Resuming game');
    startGameLoop();
  }
});

/**
 * 清除 Action
 */
$UD.onClear(jsn => {
  if (jsn.param) {
    jsn.param.forEach(item => {
      const { key, uuid: action } = $UD.decodeContext(item.context);
      const instance = ACTION_CACHES[item.context];

      if (action === 'com.ulanzi.pacman.luckytext') {
        // 清除Lucky Text映射
        if (instance && instance.position !== undefined) {
          delete luckyTextMap[instance.position];
          console.log(`[PacMan] Lucky Text removed from position ${instance.position}`);
        }
      } else {
        // 清除Pac-Man Cell映射
        delete keyPositionMap[key];
      }

      delete ACTION_CACHES[item.context];
    });
  }
});

/**
 * 接收全局设置
 */
$UD.onDidReceiveGlobalSettings(jsn => {
  const settings = jsn.param || {};
  let configChanged = false;

  if (settings.grid_rows) {
    const newRows = parseInt(settings.grid_rows);
    if (newRows !== GRID_CONFIG.rows) {
      GRID_CONFIG.rows = newRows;
      configChanged = true;
    }
  }
  if (settings.grid_cols) {
    const newCols = parseInt(settings.grid_cols);
    if (newCols !== GRID_CONFIG.cols) {
      GRID_CONFIG.cols = newCols;
      configChanged = true;
    }
  }

  console.log('[PacMan] Grid config:', GRID_CONFIG);

  // 如果网格配置改变且游戏引擎已初始化，重新初始化
  if (configChanged && gameEngine) {
    console.log('[PacMan] Reinitializing game engine with new grid config');
    gameEngine = new GameEngine(GRID_CONFIG);
    renderManager = new RenderManager(GRID_CONFIG);

    // 重启游戏循环
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
    startGameLoop();
  }
});

/**
 * 更新设置
 */
function onSetSettings(jsn) {
  const settings = jsn.param || {};
  const context = jsn.context;
  const instance = ACTION_CACHES[context];

  if (!instance) return;

  // 保存按键位置信息
  if (settings.position_row !== undefined && settings.position_col !== undefined) {
    const { key } = $UD.decodeContext(context);
    const newPosition = {
      row: parseInt(settings.position_row),
      col: parseInt(settings.position_col)
    };

    keyPositionMap[key] = newPosition;
    instance.position = newPosition;
    instance.configured = true; // 标记为已配置
    console.log(`[PacMan] Key ${key} positioned at (${newPosition.row}, ${newPosition.col})`);

    // 检查是否有坐标冲突（警告但允许配置）
    const uniquenessCheck = checkCoordinateUniqueness();
    if (!uniquenessCheck.isUnique) {
      const conflictInfo = uniquenessCheck.duplicates.find(dup =>
        dup.position.row === newPosition.row && dup.position.col === newPosition.col
      );
      if (conflictInfo) {
        console.warn(`[PacMan] Warning: Coordinate (${newPosition.row}, ${newPosition.col}) is used by multiple keys:`, conflictInfo.keys);
      }
    }

    // 立即渲染这个按键（避免等到吃豆人走到这里才显示）
    if (gameEngine && renderManager) {
      const gameState = gameEngine.getState();
      renderManager.renderFullScene(gameState);

      // 获取这个按键的图像
      const position = keyPositionMap[key];
      if (!renderManager.cellCanvases[key]) {
        renderManager.cellCanvases[key] = document.createElement('canvas');
        renderManager.cellCanvases[key].width = GRID_CONFIG.cellSize;
        renderManager.cellCanvases[key].height = GRID_CONFIG.cellSize;
      }

      const cellCanvas = renderManager.cellCanvases[key];
      const cellCtx = cellCanvas.getContext('2d');
      cellCtx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);

      cellCtx.drawImage(
        renderManager.fullCanvas,
        position.col * GRID_CONFIG.cellSize,
        position.row * GRID_CONFIG.cellSize,
        GRID_CONFIG.cellSize,
        GRID_CONFIG.cellSize,
        0, 0,
        GRID_CONFIG.cellSize,
        GRID_CONFIG.cellSize
      );

      const iconData = cellCanvas.toDataURL('image/png');
      $UD.setBaseDataIcon(context, iconData);
      console.log(`[PacMan] Immediately rendered key ${key} at position (${position.row}, ${position.col})`);
    }

    // 检查是否需要启动游戏循环（至少2个按键配置后）
    const configuredCount = Object.keys(keyPositionMap).length;
    if (!updateTimer && configuredCount >= 2) {
      console.log('[PacMan] Starting game loop with', configuredCount, 'keys...');
      startGameLoop();
    } else if (configuredCount < 2) {
      console.log('[PacMan] Need', 2 - configuredCount, 'more key(s) to start game');
    }
  }
}

/**
 * 参数更新
 */
$UD.onParamFromApp((jsn) => {
  const { uuid: action } = $UD.decodeContext(jsn.context);
  if (action === 'com.ulanzi.pacman.luckytext') {
    onSetLuckyTextSettings(jsn);
  } else {
    onSetSettings(jsn);
  }
});

$UD.onParamFromPlugin((jsn) => {
  const { uuid: action } = $UD.decodeContext(jsn.context);
  if (action === 'com.ulanzi.pacman.luckytext') {
    onSetLuckyTextSettings(jsn);
  } else {
    onSetSettings(jsn);
  }
});

/**
 * 更新祝福语设置
 */
function onSetLuckyTextSettings(jsn) {
  const settings = jsn.param || {};
  const context = jsn.context;
  const instance = ACTION_CACHES[context];

  console.log('[PacMan] 祝福语 settings update:', settings, 'context:', context);

  if (!instance) {
    console.warn('[PacMan] Instance not found for context:', context);
    return;
  }

  // 保存位置信息（使用index参数）
  if (settings.index !== undefined) {
    const position = parseInt(settings.index);

    console.log(`[PacMan] ========== 配置祝福语位置 ${position} ==========`);
    console.log(`[PacMan] - settings.index 原始值:`, settings.index);
    console.log(`[PacMan] - 转换后的 position:`, position);
    console.log(`[PacMan] - context:`, context);

    // 检查是否有其他context已经占用这个位置
    const existingContext = luckyTextMap[position];
    if (existingContext && existingContext !== context) {
      console.warn(`[PacMan] 祝福语 position ${position} already occupied, replacing`);

      // 从旧的context移除
      delete luckyTextMap[position];
    }

    // 如果这个context之前占用了其他位置，也要清除
    for (let pos = 0; pos < 4; pos++) {
      if (luckyTextMap[pos] === context && pos !== position) {
        console.log(`[PacMan] Removing context from previous position ${pos}`);
        delete luckyTextMap[pos];
      }
    }

    // 设置新的映射
    console.log(`[PacMan] 执行: luckyTextMap[${position}] = ${context.substring(0, 40)}...`);
    luckyTextMap[position] = context;
    instance.position = position;
    instance.configured = true;

    console.log(`[PacMan] ✅ 祝福语 configured at position ${position}`);
    console.log('[PacMan] 验证设置: luckyTextMap[' + position + '] =', luckyTextMap[position]);
    console.log('[PacMan] Current luckyTextMap 完整内容:', JSON.stringify(luckyTextMap, null, 2));
    console.log('[PacMan] Total configured positions:', Object.keys(luckyTextMap).length);
    console.log('[PacMan] ===========================================');

    // 界面提示
    const totalConfigured = Object.keys(luckyTextMap).length;

    // 立即渲染这个按键（黑屏）
    renderLuckyTextCharacter(context, '', position);
  } else {
    console.warn('[PacMan] ⚠️ No index parameter found in settings:', settings);
  }
}

/**
 * 触发成语显示
 */
function triggerLuckyIdiom() {
  // 检查是否有配置的Lucky Text格子
  const configuredPositions = Object.keys(luckyTextMap).length;
  console.log('[PacMan] triggerLuckyIdiom called, configured positions:', configuredPositions);

  if (configuredPositions === 0) {
    console.log('[PacMan] ⚠️ No 祝福语 configured, skipping idiom display');
    console.log('[PacMan] Please add 4 "祝福语" actions and configure positions 0-3');
    return;
  }

  // 从GameEngine中随机选择一个成语
  if (!gameEngine || !gameEngine.luckyIdioms || gameEngine.luckyIdioms.length === 0) {
    console.warn('[PacMan] No lucky idioms available in game engine');
    return;
  }

  currentIdiom = gameEngine.luckyIdioms[Math.floor(Math.random() * gameEngine.luckyIdioms.length)];
  idiomDisplayTimer = IDIOM_DISPLAY_DURATION;

  console.log('[PacMan] 🎊 Displaying lucky idiom:', currentIdiom);
  console.log('[PacMan] Duration: 5 seconds');
  console.log('[PacMan] luckyTextMap 详情:', JSON.stringify(luckyTextMap, null, 2));

  // 界面提示显示的成语

  // 更新每个位置的Lucky Text显示
  let renderedCount = 0;
  for (let pos = 0; pos < 4; pos++) {
    const context = luckyTextMap[pos];
    console.log(`[PacMan] 检查位置 ${pos}:`);
    console.log(`[PacMan]   - luckyTextMap[${pos}]:`, context);
    console.log(`[PacMan]   - context 存在?`, !!context);
    console.log(`[PacMan]   - ACTION_CACHES[context] 存在?`, context ? !!ACTION_CACHES[context] : 'N/A');

    if (context && ACTION_CACHES[context]) {
      const char = currentIdiom.charAt(pos) || '？';
      console.log(`[PacMan]   ✅ 渲染位置 ${pos}: '${char}'`);
      renderLuckyTextCharacter(context, char, pos);
      renderedCount++;
    } else {
      console.log(`[PacMan]   ❌ 位置 ${pos} 未配置或实例不存在`);
      if (!context) {
        console.log(`[PacMan]      原因: 位置${pos}未在luckyTextMap中`);
      } else {
        console.log(`[PacMan]      原因: 位置${pos}的context在ACTION_CACHES中不存在`);
      }
    }
  }

  if (renderedCount < 4) {
    console.warn(`[PacMan] ⚠️ Only rendered ${renderedCount}/4 characters`);
  }
}

/**
 * 清除成语显示
 */
function clearLuckyText() {
  console.log('[PacMan] Clearing lucky text');
  for (let pos = 0; pos < 4; pos++) {
    const context = luckyTextMap[pos];
    if (context && ACTION_CACHES[context]) {
      renderLuckyTextCharacter(context, '', pos);
    }
  }
}

/**
 * 渲染Lucky Text单个文字
 * @param {string} context - Action context
 * @param {string} char - 要显示的文字
 * @param {number} position - 位置（0-3）
 */
function renderLuckyTextCharacter(context, char, position) {
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  if (char) {
    // 有成语时 - 金色渐变背景
    const gradient = ctx.createRadialGradient(72, 72, 20, 72, 72, 100);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FFA500');
    gradient.addColorStop(1, '#FF6347');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 144, 144);

    // 文字 - 白色大字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(char, 72, 72);
    ctx.shadowBlur = 0;

    console.log(`[PacMan] Rendered character '${char}' at position ${position}`);
  } else {
    // 无成语时 - 纯黑屏
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 144, 144);
  }

  const iconData = canvas.toDataURL('image/png');
  $UD.setBaseDataIcon(context, iconData);
}

/**
 * 显示Lucky Text未配置图标（纯黑屏）
 */
function showLuckyTextUnconfiguredIcon(context) {
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  // 纯黑屏
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 144, 144);

  const iconData = canvas.toDataURL('image/png');
  $UD.setBaseDataIcon(context, iconData);
}

/**
 * 显示配置状态（调试用）
 */
function showConfigStatus() {
  try {
    const luckyTextCount = Object.keys(luckyTextMap).length;
    const pacmanCount = Object.keys(keyPositionMap).length;

    console.log('[PacMan] ==================== 配置状态 ====================');
    console.log('[PacMan] - Pac-Man cells:', pacmanCount);
    console.log('[PacMan] - Lucky text cells:', luckyTextCount);
    console.log('[PacMan] - Lucky text map:', JSON.stringify(luckyTextMap));
    console.log('[PacMan] - Total ACTION_CACHES:', Object.keys(ACTION_CACHES).length);
    console.log('[PacMan] - keyPositionMap 详情:');
    Object.entries(keyPositionMap).forEach(([key, pos]) => {
      console.log(`[PacMan]   Key ${key}: (${pos.row}, ${pos.col})`);
    });

    // 显示所有ACTION的详细信息
    let luckyTextInstanceCount = 0;
    let pacmanInstanceCount = 0;
    let unknownInstanceCount = 0;

    Object.entries(ACTION_CACHES).forEach(([ctx, instance], index) => {
      if (!instance) return;

      const contextPreview = ctx ? ctx.substring(0, 40) + '...' : 'unknown';

      console.log(`[PacMan] Instance #${index + 1}:`, {
        context: contextPreview,
        actionType: instance.actionType,
        position: instance.position,
        configured: instance.configured
      });

      if (instance.actionType === 'com.ulanzi.pacman.luckytext') {
        luckyTextInstanceCount++;
        console.log(`[PacMan]   └─> 这是祝福语实例 #${luckyTextInstanceCount}`);
      } else if (instance.actionType === 'com.ulanzi.pacman.cell') {
        pacmanInstanceCount++;
        console.log(`[PacMan]   └─> 这是吃豆人实例 #${pacmanInstanceCount}`);
      } else {
        unknownInstanceCount++;
        console.log(`[PacMan]   └─> ⚠️ 未知类型: "${instance.actionType}"`);
      }
    });

    console.log('[PacMan] ---------------------------------------------------');
    console.log('[PacMan] 统计：');
    console.log('[PacMan] - 吃豆人实例数量:', pacmanInstanceCount);
    console.log('[PacMan] - 祝福语实例数量:', luckyTextInstanceCount);
    console.log('[PacMan] - 未知类型实例数量:', unknownInstanceCount);
    console.log('[PacMan] - 已配置的吃豆人格子:', pacmanCount);
    console.log('[PacMan] - 已配置的祝福语格子:', luckyTextCount);
    console.log('[PacMan] ===================================================');

    // 输出到UlanziStudio日志
    $UD.logMessage(`📊 配置统计：吃豆人${pacmanCount}个，祝福语${luckyTextCount}个 | 实例：吃豆人${pacmanInstanceCount}个，祝福语${luckyTextInstanceCount}个，未知${unknownInstanceCount}个`, 'info');

    // 界面提示
    if (luckyTextCount > 0) {
      const positions = Object.keys(luckyTextMap).sort().join(', ');
    } else if (luckyTextInstanceCount > 0) {
      $UD.logMessage(`⚠️ 发现${luckyTextInstanceCount}个祝福语实例，但位置配置未加载！可能需要重新配置`, 'warn');
    } else {
      $UD.logMessage(`❌ 未发现任何祝福语格子！请从插件列表拖拽"祝福语" Action`, 'error');
    }
  } catch (err) {
    console.error('[PacMan] ❌ showConfigStatus 出错:', err);
  }
}
