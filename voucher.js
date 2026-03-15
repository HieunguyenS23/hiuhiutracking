const API_BASE = '';

const FIXED_VOUCHERS = [
  { code: 'CRMNUICL80T3', label: '100K', source: 'voucher' },
  { code: 'FSV-1363693662932996', label: 'Hỏa tốc', source: 'freeship' }
];

const state = {
  activeToast: null,
  activeToastTimer: null,
  savingCode: '',
  voucherMap: new Map(),
  currentSpcSt: '',
  currentSpcF: '',
  loginSourceRaw: ''
};

const REQUEST_TIMEOUT_MS = 20000;

const els = {
  manualCookieInput: document.getElementById('voucher-manual-cookie-input'),
  loginInput: document.getElementById('voucher-login-input'),
  loginButton: document.getElementById('voucher-login-btn'),
  save100kButton: document.getElementById('voucher-save-100k-btn'),
  saveHotButton: document.getElementById('voucher-save-hot-btn'),
  actionStatus: document.getElementById('voucher-action-status'),
  apiDebug: document.getElementById('voucher-api-debug'),
  toastContainer: document.getElementById('toast-container'),
  cookieValue: document.getElementById('voucher-cookie-value'),
  copyCookieButton: document.getElementById('voucher-copy-cookie-btn'),
  copySpcFButton: document.getElementById('voucher-copy-spcf-btn'),
  updateSpcStButton: document.getElementById('voucher-update-spcst-btn')
};

function clearToast(force = false) {
  if (!state.activeToast) return;
  if (state.activeToastTimer) {
    clearTimeout(state.activeToastTimer);
    state.activeToastTimer = null;
  }

  const toast = state.activeToast;
  state.activeToast = null;

  if (force) {
    toast.remove();
    return;
  }

  toast.classList.remove('is-visible');
  window.setTimeout(() => toast.remove(), 180);
}

function showToast(message, type = 'info', duration = 2400) {
  if (!els.toastContainer || !message) return;
  clearToast(true);

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  state.activeToast = toast;

  requestAnimationFrame(() => toast.classList.add('is-visible'));
  state.activeToastTimer = window.setTimeout(() => clearToast(), duration);
}

function showError(message) {
  showToast(message, 'error', 3200);
}

function showSuccess(message) {
  showToast(message, 'success', 2200);
}

function showProgress(message) {
  showToast(message, 'progress', 1600);
}

function setActionStatus(message, type) {
  if (!els.actionStatus) return;
  if (!message) {
    els.actionStatus.style.display = 'none';
    els.actionStatus.textContent = '';
    els.actionStatus.style.borderColor = '';
    return;
  }

  els.actionStatus.style.display = 'block';
  els.actionStatus.textContent = message;
  if (type === 'success') {
    els.actionStatus.style.borderColor = 'rgba(34,197,94,.45)';
  } else if (type === 'error') {
    els.actionStatus.style.borderColor = 'rgba(248,113,113,.45)';
  } else {
    els.actionStatus.style.borderColor = 'rgba(96,165,250,.45)';
  }
}

function setApiDebug(lines) {
  if (!els.apiDebug) return;
  const content = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
  els.apiDebug.textContent = content || 'Chưa có log.';
}

function appendApiDebug(lines) {
  if (!els.apiDebug) return;
  const nextLines = Array.isArray(lines) ? lines : [String(lines || '')];
  const current = els.apiDebug.textContent && els.apiDebug.textContent !== 'Chưa có log.'
    ? els.apiDebug.textContent.split('\n')
    : [];
  els.apiDebug.textContent = current.concat(nextLines).slice(-120).join('\n') || 'Chưa có log.';
}

function normalizeSpcStInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/SPC_ST=[^;|\s"]+/);
  if (match) return match[0];
  if (!/=/.test(raw)) return 'SPC_ST=' + raw;
  return raw;
}

function extractSpcSt(raw) {
  const source = String(raw || '').trim();
  const match = source.match(/SPC_ST=([^;|\s"]+)/);
  return match ? match[1] : source;
}

function extractSpcF(raw) {
  const source = String(raw || '').trim();
  const match = source.match(/SPC_F=[^;|\s"]+/);
  return match ? match[0] : '';
}

function getCookieInput() {
  const value = normalizeSpcStInput(els.manualCookieInput ? els.manualCookieInput.value : '');
  if (els.manualCookieInput && value && els.manualCookieInput.value.trim() !== value) {
    els.manualCookieInput.value = value;
  }
  return value;
}

function syncCurrentCookieDisplay() {
  if (els.cookieValue) {
    els.cookieValue.textContent = state.currentSpcSt ? ('SPC_ST=' + state.currentSpcSt) : 'Chưa có SPC_ST.';
  }
}

function setCurrentSpcData(cookie, fallbackSpcSt, sourceInput) {
  const spcSt = extractSpcSt(cookie || fallbackSpcSt || '');
  const spcF = extractSpcF(sourceInput || '');
  state.loginSourceRaw = String(sourceInput || '').trim();
  state.currentSpcSt = spcSt || '';
  state.currentSpcF = spcF || '';
  if (spcSt && els.manualCookieInput) {
    els.manualCookieInput.value = 'SPC_ST=' + spcSt;
  }
  syncCurrentCookieDisplay();
}

function setButtonBusy(button, busy, busyLabel) {
  if (!button) return;
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent;
  }
  button.disabled = busy;
  button.textContent = busy ? busyLabel : button.dataset.defaultLabel;
}

function updateFixedButtons() {
  const fixed100k = state.voucherMap.get('CRMNUICL80T3');
  const fixedHot = state.voucherMap.get('FSV-1363693662932996');

  if (els.save100kButton) {
    els.save100kButton.disabled = !fixed100k || state.savingCode === 'CRMNUICL80T3';
    els.save100kButton.title = fixed100k ? fixed100k.voucherName || fixed100k.voucherCode : 'Chưa tải được metadata cho mã 100K.';
  }

  if (els.saveHotButton) {
    els.saveHotButton.disabled = !fixedHot || state.savingCode === 'FSV-1363693662932996';
    els.saveHotButton.title = fixedHot ? fixedHot.voucherName || fixedHot.voucherCode : 'Chưa tải được metadata cho mã Hỏa tốc.';
  }
}

function normalizeVoucherItem(item, source) {
  return {
    source,
    promotionId: item.promotionId || item.promotionid,
    voucherCode: item.voucherCode || item.voucher_code,
    signature: item.signature,
    voucherName: item.voucherName || item.voucher_name || item.title || item.voucherCode || item.voucher_code || source
  };
}

function extractVoucherList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

async function autopeeApi(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(API_BASE + '/autopee-api' + path, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('API Autopee phản hồi quá lâu, đã tự dừng sau 20 giây.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    text
  };
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('API phản hồi quá lâu, đã tự dừng sau 20 giây.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok || data.error) {
    throw new Error(data.error || ('HTTP ' + response.status));
  }

  return data;
}

async function loadVoucherMetadata() {
  setActionStatus('Đang tải metadata cho 2 mã voucher...', 'progress');

  const [voucherResult, freeshipResult] = await Promise.all([
    autopeeApi('/api/shopee/vouchers?limit=200'),
    autopeeApi('/api/shopee/freeships?limit=200')
  ]);

  const logs = [
    '[voucher] /autopee-api/api/shopee/vouchers?limit=200',
    'status=' + voucherResult.status + ' ok=' + voucherResult.ok,
    'sample=' + (typeof voucherResult.data === 'string'
      ? voucherResult.data.slice(0, 300)
      : JSON.stringify(voucherResult.data, null, 2).slice(0, 1200)),
    '',
    '[freeship] /autopee-api/api/shopee/freeships?limit=200',
    'status=' + freeshipResult.status + ' ok=' + freeshipResult.ok,
    'sample=' + (typeof freeshipResult.data === 'string'
      ? freeshipResult.data.slice(0, 300)
      : JSON.stringify(freeshipResult.data, null, 2).slice(0, 1200))
  ];
  setApiDebug(logs);

  const voucherItems = extractVoucherList(voucherResult.data).map((item) => normalizeVoucherItem(item, 'voucher'));
  const freeshipItems = extractVoucherList(freeshipResult.data).map((item) => normalizeVoucherItem(item, 'freeship'));

  state.voucherMap.clear();
  voucherItems.concat(freeshipItems).forEach((item) => {
    if (item.voucherCode && item.promotionId && item.signature) {
      state.voucherMap.set(String(item.voucherCode).trim().toUpperCase(), item);
    }
  });

  updateFixedButtons();

  const loaded = FIXED_VOUCHERS.filter((item) => state.voucherMap.has(item.code)).length;
  if (!loaded) {
    setActionStatus('Không tải được metadata voucher. Theo bundle live, API này thực tế đang ở api.autopee.com và thường yêu cầu phiên Autopee hợp lệ.', 'error');
    return;
  }

  setActionStatus('Đã tải metadata cho ' + loaded + '/2 mã voucher.', loaded === FIXED_VOUCHERS.length ? 'success' : 'error');
}

function parseSaveResult(result, voucherCode) {
  const payload = result && typeof result.data === 'object' && result.data !== null ? result.data : result;
  const inner = payload && typeof payload.data === 'object' && payload.data !== null ? payload.data : payload;
  const voucherInfo = inner && inner.data && inner.data.voucher ? inner.data.voucher : inner && inner.voucher ? inner.voucher : null;
  const errorCode = inner && typeof inner.error === 'number' ? inner.error : payload && typeof payload.error === 'number' ? payload.error : null;
  const claimedBefore = Boolean(voucherInfo && voucherInfo.is_claimed_before === true);

  if (errorCode === 0) {
    return { ok: true, message: 'Đã lưu voucher ' + voucherCode + ' thành công.' };
  }
  if (errorCode === 5 || claimedBefore) {
    return { ok: true, message: 'Voucher ' + voucherCode + ' đã được lưu trước đó.', claimedBefore: true };
  }

  const message = (inner && inner.error_msg) || (payload && payload.error) || (payload && payload.message) || 'API chưa xác nhận đã lưu voucher.';
  return { ok: false, message };
}

async function saveVoucherByCode(code, button, label) {
  const voucher = state.voucherMap.get(String(code || '').trim().toUpperCase());
  if (!voucher) {
    showError('Chưa có metadata cho mã ' + label + '.');
    setActionStatus('Chưa có metadata cho mã ' + label + '.', 'error');
    return;
  }

  const cookie = getCookieInput();
  if (!cookie) {
    showError('Bạn chưa nhập SPC_ST.');
    setActionStatus('Bạn chưa nhập SPC_ST.', 'error');
    if (els.manualCookieInput) els.manualCookieInput.focus();
    return;
  }

  state.savingCode = code;
  updateFixedButtons();
  setButtonBusy(button, true, 'Đang lưu...');
  showProgress('Đang lưu ' + label + '...');
  setActionStatus('Đang lưu ' + voucher.voucherCode + '...', 'progress');
  appendApiDebug([
    '[save] ' + voucher.voucherCode,
    'endpoint=/autopee-api/api/shopee/save-voucher',
    'payload=' + JSON.stringify({
      cookie,
      voucher_promotionid: voucher.promotionId,
      signature: voucher.signature,
      voucher_code: voucher.voucherCode
    }).slice(0, 1200),
    ''
  ]);

  try {
    const result = await autopeeApi('/api/shopee/save-voucher', {
      method: 'POST',
      body: {
        cookie,
        voucher_promotionid: voucher.promotionId,
        signature: voucher.signature,
        voucher_code: voucher.voucherCode
      }
    });

    appendApiDebug([
      '[save-response] ' + voucher.voucherCode,
      'status=' + result.status + ' ok=' + result.ok,
      typeof result.data === 'string' ? result.data.slice(0, 1200) : JSON.stringify(result.data, null, 2).slice(0, 2000),
      ''
    ]);

    if (!result.ok) {
      const message = typeof result.data === 'object' && result.data !== null
        ? result.data.error || result.data.message || ('HTTP ' + result.status)
        : ('HTTP ' + result.status);
      throw new Error(message);
    }

    const parsed = parseSaveResult(result, voucher.voucherCode);
    if (!parsed.ok) {
      throw new Error(parsed.message);
    }

    setActionStatus(parsed.message, parsed.claimedBefore ? 'progress' : 'success');
    showSuccess(parsed.message);
  } catch (error) {
    const message = error.message || 'Có lỗi xảy ra khi lưu voucher.';
    appendApiDebug([
      '[save-error] ' + voucher.voucherCode,
      message,
      ''
    ]);
    setActionStatus('Lưu thất bại: ' + message, 'error');
    showError(message);
  } finally {
    state.savingCode = '';
    updateFixedButtons();
    setButtonBusy(button, false, 'Đang lưu...');
  }
}

async function loginByAccount() {
  const input = String(els.loginInput ? els.loginInput.value : '').trim();
  if (!input) {
    showError('Bạn chưa nhập user|pass|SPC_F.');
    setActionStatus('Bạn chưa nhập user|pass|SPC_F.', 'error');
    if (els.loginInput) els.loginInput.focus();
    return;
  }

  setButtonBusy(els.loginButton, true, 'Đang lấy...');
  showProgress('Đang lấy SPC_ST...');
  setActionStatus('Đang lấy SPC_ST từ tài khoản...', 'progress');

  try {
    const data = await apiRequest('/api/login', {
      method: 'POST',
      body: { input }
    });
    const cookie = data.cookie || data.spcST || '';
    if (!cookie) {
      throw new Error('API không trả về SPC_ST.');
    }
    setCurrentSpcData(cookie, data.spcST || '', input);
    setActionStatus('Đã lấy SPC_ST thành công.', 'success');
    showSuccess('Đã lấy SPC_ST thành công.');
  } catch (error) {
    const message = error.message || 'Không thể lấy SPC_ST.';
    setActionStatus(message, 'error');
    showError(message);
  } finally {
    setButtonBusy(els.loginButton, false, 'Đang lấy...');
  }
}

async function copyCurrentSpcSt() {
  if (!state.currentSpcSt) {
    showError('Chưa có SPC_ST để copy.');
    return;
  }
  await navigator.clipboard.writeText('SPC_ST=' + state.currentSpcSt);
  showSuccess('Đã copy SPC_ST=...');
}

async function copyCurrentSpcF() {
  if (!state.currentSpcF) {
    showError('Chưa có SPC_F để copy.');
    return;
  }
  await navigator.clipboard.writeText(state.currentSpcF);
  showSuccess('Đã copy SPC_F=...');
}

function buildUpdatedLoginSource() {
  if (!state.currentSpcSt) {
    throw new Error('Chưa có SPC_ST mới để cập nhật.');
  }

  const source = String(state.loginSourceRaw || (els.loginInput ? els.loginInput.value : '') || '').trim();
  if (!source) {
    throw new Error('Chưa có chuỗi gốc để cập nhật.');
  }

  if (/SPC_ST=[^|\s"]+/.test(source)) {
    return source.replace(/SPC_ST=[^|\s"]+/, 'SPC_ST=' + state.currentSpcSt);
  }

  return source + '|SPC_ST=' + state.currentSpcSt;
}

async function updateSpcStInSource() {
  try {
    const updated = buildUpdatedLoginSource();
    if (els.loginInput) {
      els.loginInput.value = updated;
    }
    state.loginSourceRaw = updated;
    await navigator.clipboard.writeText(updated);
    showSuccess('Đã cập nhật SPC_ST mới và copy.');
    setActionStatus('Đã thay SPC_ST cũ bằng SPC_ST mới và copy.', 'success');
  } catch (error) {
    const message = error.message || 'Không thể cập nhật SPC_ST.';
    showError(message);
    setActionStatus(message, 'error');
  }
}

function bindEvents() {
  if (els.loginButton) {
    els.loginButton.addEventListener('click', loginByAccount);
  }
  if (els.loginInput) {
    els.loginInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loginByAccount();
    });
  }
  if (els.save100kButton) {
    els.save100kButton.addEventListener('click', () => saveVoucherByCode('CRMNUICL80T3', els.save100kButton, '100K'));
  }
  if (els.saveHotButton) {
    els.saveHotButton.addEventListener('click', () => saveVoucherByCode('FSV-1363693662932996', els.saveHotButton, 'Hỏa tốc'));
  }
  if (els.copyCookieButton) {
    els.copyCookieButton.addEventListener('click', copyCurrentSpcSt);
  }
  if (els.copySpcFButton) {
    els.copySpcFButton.addEventListener('click', copyCurrentSpcF);
  }
  if (els.updateSpcStButton) {
    els.updateSpcStButton.addEventListener('click', updateSpcStInSource);
  }
}

bindEvents();
updateFixedButtons();
syncCurrentCookieDisplay();
loadVoucherMetadata().catch((error) => {
  setActionStatus(error.message || 'Không thể tải metadata voucher.', 'error');
  showError(error.message || 'Không thể tải metadata voucher.');
});
