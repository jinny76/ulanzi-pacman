/**
 * 吃豆人全局设置界面
 */
let currentSettings = {
  grid_rows: 3,
  grid_cols: 3
};

$UD.connect();

$UD.onConnected(() => {
  const wrapper = document.querySelector('.uspi-wrapper');
  wrapper.classList.remove('hidden');

  // 绑定表单变化事件
  const gridRows = document.getElementById('gridRows');
  const gridCols = document.getElementById('gridCols');

  gridRows.addEventListener('change', () => {
    sendSettings();
  });

  gridCols.addEventListener('change', () => {
    sendSettings();
  });

  console.log('[PacMan Global Settings] Connected');

  // 请求当前的全局设置
  $UD.getGlobalSettings();
});

$UD.onDidReceiveGlobalSettings(jsn => {
  if (jsn.param) {
    loadSettings(jsn.param);
  }
});

function loadSettings(settings) {
  currentSettings = settings;

  if (settings.grid_rows !== undefined) {
    document.getElementById('gridRows').value = settings.grid_rows;
  } else {
    // 默认值 3
    document.getElementById('gridRows').value = 3;
  }

  if (settings.grid_cols !== undefined) {
    document.getElementById('gridCols').value = settings.grid_cols;
  } else {
    // 默认值 3
    document.getElementById('gridCols').value = 3;
  }

  console.log('[PacMan Global Settings] Loaded:', currentSettings);
}

function sendSettings() {
  const settings = {
    grid_rows: parseInt(document.getElementById('gridRows').value),
    grid_cols: parseInt(document.getElementById('gridCols').value)
  };

  console.log('[PacMan Global Settings] Saving:', settings);
  $UD.setGlobalSettings(settings);
}
