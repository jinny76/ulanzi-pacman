/**
 * 吃豆人配置界面
 */
let currentSettings = {};

$UD.connect();

$UD.onConnected(() => {
  const wrapper = document.querySelector('.uspi-wrapper');
  wrapper.classList.remove('hidden');

  // 绑定表单变化事件
  const positionRow = document.getElementById('positionRow');
  const positionCol = document.getElementById('positionCol');

  positionRow.addEventListener('change', () => {
    sendSettings();
  });

  positionCol.addEventListener('change', () => {
    sendSettings();
  });

  console.log('[PacMan Inspector] Connected');
});

$UD.onAdd(jsn => {
  if (jsn.param) {
    loadSettings(jsn.param);
  }
});

$UD.onParamFromApp(jsn => {
  if (jsn.param) {
    loadSettings(jsn.param);
  }
});

function loadSettings(settings) {
  currentSettings = settings;

  if (settings.position_row !== undefined) {
    document.getElementById('positionRow').value = settings.position_row;
  } else {
    // 默认值 0
    document.getElementById('positionRow').value = 0;
  }

  if (settings.position_col !== undefined) {
    document.getElementById('positionCol').value = settings.position_col;
  } else {
    // 默认值 0
    document.getElementById('positionCol').value = 0;
  }
}

function sendSettings() {
  const settings = {
    position_row: parseInt(document.getElementById('positionRow').value),
    position_col: parseInt(document.getElementById('positionCol').value)
  };

  console.log('[PacMan Inspector] Sending settings:', settings);
  $UD.sendParamFromPlugin(settings);
}
