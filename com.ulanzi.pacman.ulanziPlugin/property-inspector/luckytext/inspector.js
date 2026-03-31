/**
 * 祝福语配置界面
 */

let ACTION_SETTING = {};
let form = '';
let needAutoSend = true; // 标记是否需要自动发送

$UD.connect();

$UD.onConnected(conn => {
  console.log('[祝福语 Inspector] Connected');

  // 获取表单
  form = document.querySelector('#property-inspector');

  // 连接上socket，显示配置项
  const el = document.querySelector('.uspi-wrapper');
  el.classList.remove('hidden');

  // 发送参数的函数
  const sendSettings = () => {
    const value = Utils.getFormValue(form);
    ACTION_SETTING = value;

    // 转换为数字
    if (ACTION_SETTING.index !== undefined) {
      ACTION_SETTING.index = parseInt(ACTION_SETTING.index);
    }

    console.log('[祝福语 Inspector] Sending settings:', ACTION_SETTING);
    console.log('[祝福语 Inspector] Current form value:', value);

    // 立即发送，不debounce
    $UD.sendParamFromPlugin(ACTION_SETTING);
    needAutoSend = false; // 已经发送过了，不需要再自动发送
  };

  // 监听表单变化（同时监听input和change事件）
  form.addEventListener('input', sendSettings);
  form.addEventListener('change', sendSettings);

  console.log('[祝福语 Inspector] Form listeners attached');
});

// 获取初始化参数
$UD.onAdd(jsonObj => {
  console.log('[祝福语 Inspector] onAdd:', jsonObj);
  if (jsonObj && jsonObj.param) {
    settingSaveParam(jsonObj.param);
  }
});

// 获取初始化参数
$UD.onParamFromApp(jsonObj => {
  console.log('[祝福语 Inspector] onParamFromApp:', jsonObj);
  if (jsonObj && jsonObj.param) {
    settingSaveParam(jsonObj.param);
  }
});

// 重载表单数据
function settingSaveParam(params) {
  console.log('[祝福语 Inspector] Setting params:', params);

  // 如果没有参数或参数为空，使用默认值
  if (!params || Object.keys(params).length === 0) {
    console.log('[祝福语 Inspector] No params found, using default index: 0');
    ACTION_SETTING = { index: 0 };
  } else {
    ACTION_SETTING = params;
  }

  // 渲染表单数据
  Utils.setFormValue(ACTION_SETTING, form);

  // 只有在需要时才自动发送（避免重复发送）
  if (needAutoSend) {
    setTimeout(() => {
      console.log('[祝福语 Inspector] 自动发送参数');
      const value = Utils.getFormValue(form);
      if (value.index !== undefined) {
        value.index = parseInt(value.index);
      }
      $UD.sendParamFromPlugin(value);
      needAutoSend = false;
    }, 100);
  }
}
