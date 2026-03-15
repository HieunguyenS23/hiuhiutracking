const API_BASE = '';
const REQUEST_TIMEOUT_MS = 20000;

const FIXED_VOUCHERS = [
  { code: 'CRMNUICL80T3', label: '100K' },
  { code: 'FSV-1363693662932996', label: 'Hoa toc' }
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
  updateSpcStButton: document.getElementById('voucher-update-spcst-btn'),
  checkCookies: document.getElementById('voucher-check-cookies'),
  checkQuery: document.getElementById('voucher-check-query'),
  checkButton: document.getElementById('voucher-check-btn'),
  checkSummary: document.getElementById('voucher-check-summary'),
  checkResults: document.getElementById('voucher-check-results')
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
  els.apiDebug.textContent = content || 'Chua co log.';
}

function appendApiDebug(lines) {
  if (!els.apiDebug) return;
  const nextLines = Array.isArray(lines) ? lines : [String(lines || '')];
  const current = els.apiDebug.textContent && els.apiDebug.textContent !== 'Chua co log.'
    ? els.apiDebug.textContent.split('\n')
    : [];
  els.apiDebug.textContent = current.concat(nextLines).slice(-120).join('\n') || 'Chua co log.';
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

function parseCookieList(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => normalizeSpcStInput(line))
    .filter(Boolean);
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
    els.cookieValue.textContent = state.currentSpcSt ? ('SPC_ST=' + state.currentSpcSt) : 'Chua co SPC_ST.';
  }
}

function maybeSyncCheckCookies(preferredCookie) {
  if (!els.checkCookies) return;
  const nextValue = normalizeSpcStInput(preferredCookie || '');
  if (!nextValue) return;
  const currentCookies = parseCookieList(els.checkCookies.value);
  if (!currentCookies.length || (currentCookies.length === 1 && currentCookies[0] !== nextValue)) {
    els.checkCookies.value = nextValue;
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
  maybeSyncCheckCookies(spcSt ? ('SPC_ST=' + spcSt) : '');
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
    els.save100kButton.title = fixed100k ? (fixed100k.voucherName || fixed100k.voucherCode) : 'Chua tai duoc metadata cho ma 100K.';
  }

  if (els.saveHotButton) {
    els.saveHotButton.disabled = !fixedHot || state.savingCode === 'FSV-1363693662932996';
    els.saveHotButton.title = fixedHot ? (fixedHot.voucherName || fixedHot.voucherCode) : 'Chua tai duoc metadata cho ma Hoa toc.';
  }
}

function normalizeVoucherItem(item, source) {
  return {
    source,
    promotionId: item.promotionId || item.promotionid,
    voucherCode: item.voucherCode || item.voucher_code,
    signature: item.signature,
    voucherName: item.voucherName || item.voucher_name || item.title || item.voucherCode || item.voucher_code || source,
    description: item.description || '',
    discountValue: Number(item.discountValue || item.discount_value || 0),
    discountPercentage: Number(item.discountPercentage || item.discount_percentage || 0),
    minSpend: Number(item.minSpend || item.min_spend || 0)
  };
}

function extractVoucherList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  if (payload && payload.data && payload.data.items && Array.isArray(payload.data.items)) return payload.data.items;
  return [];
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(url, {
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
      throw new Error('API phan hoi qua lau, da tu dung sau 20 giay.');
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

async function autopeeApi(path, options = {}) {
  return fetchJson(API_BASE + '/autopee-api' + path, options);
}

async function otisApi(path, options = {}) {
  return fetchJson(API_BASE + '/otistx-api' + path, options);
}

async function apiRequest(path, options = {}) {
  const result = await fetchJson(API_BASE + path, options);
  const data = result && typeof result.data === 'object' && result.data !== null ? result.data : {};
  if (!result.ok || data.error) {
    throw new Error(data.error || ('HTTP ' + result.status));
  }
  return data;
}

async function loadVoucherMetadata() {
  setActionStatus('Dang tai metadata cho 2 ma voucher...', 'progress');

  const [voucherResult, freeshipResult] = await Promise.all([
    autopeeApi('/api/shopee/vouchers?limit=200'),
    autopeeApi('/api/shopee/freeships?limit=200')
  ]);

  setApiDebug([
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
  ]);

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
    setActionStatus('Khong tai duoc metadata voucher tu Autopee.', 'error');
    return;
  }

  setActionStatus('Da tai metadata cho ' + loaded + '/2 ma voucher.', loaded === FIXED_VOUCHERS.length ? 'success' : 'error');
}

function parseSaveResult(result, voucherCode) {
  const payload = result && typeof result.data === 'object' && result.data !== null ? result.data : result;
  const inner = payload && typeof payload.data === 'object' && payload.data !== null ? payload.data : payload;
  const voucherInfo = inner && inner.data && inner.data.voucher ? inner.data.voucher : inner && inner.voucher ? inner.voucher : null;
  const errorCode = inner && typeof inner.error === 'number' ? inner.error : payload && typeof payload.error === 'number' ? payload.error : null;
  const claimedBefore = Boolean(voucherInfo && voucherInfo.is_claimed_before === true);

  if (errorCode === 0) {
    return { ok: true, message: 'Da luu voucher ' + voucherCode + ' thanh cong.' };
  }
  if (errorCode === 5 || claimedBefore) {
    return { ok: true, message: 'Voucher ' + voucherCode + ' da duoc luu truoc do.', claimedBefore: true };
  }

  const message = (inner && inner.error_msg) || (payload && payload.error) || (payload && payload.message) || 'API chua xac nhan da luu voucher.';
  return { ok: false, message };
}

async function saveVoucherByCode(code, button, label) {
  const voucher = state.voucherMap.get(String(code || '').trim().toUpperCase());
  if (!voucher) {
    showError('Chua co metadata cho ma ' + label + '.');
    setActionStatus('Chua co metadata cho ma ' + label + '.', 'error');
    return;
  }

  const cookie = getCookieInput();
  if (!cookie) {
    showError('Ban chua nhap SPC_ST.');
    setActionStatus('Ban chua nhap SPC_ST.', 'error');
    if (els.manualCookieInput) els.manualCookieInput.focus();
    return;
  }

  state.savingCode = code;
  updateFixedButtons();
  setButtonBusy(button, true, 'Dang luu...');
  showProgress('Dang luu ' + label + '...');
  setActionStatus('Dang luu ' + voucher.voucherCode + '...', 'progress');
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
    const message = error.message || 'Co loi xay ra khi luu voucher.';
    appendApiDebug([
      '[save-error] ' + voucher.voucherCode,
      message,
      ''
    ]);
    setActionStatus('Luu that bai: ' + message, 'error');
    showError(message);
  } finally {
    state.savingCode = '';
    updateFixedButtons();
    setButtonBusy(button, false, 'Dang luu...');
  }
}

async function loginByAccount() {
  const input = String(els.loginInput ? els.loginInput.value : '').trim();
  if (!input) {
    showError('Ban chua nhap user|pass|SPC_F.');
    setActionStatus('Ban chua nhap user|pass|SPC_F.', 'error');
    if (els.loginInput) els.loginInput.focus();
    return;
  }

  setButtonBusy(els.loginButton, true, 'Dang lay...');
  showProgress('Dang lay SPC_ST...');
  setActionStatus('Dang lay SPC_ST tu tai khoan...', 'progress');

  try {
    const data = await apiRequest('/api/login', {
      method: 'POST',
      body: { input }
    });
    const cookie = data.cookie || data.spcST || '';
    if (!cookie) {
      throw new Error('API khong tra ve SPC_ST.');
    }
    setCurrentSpcData(cookie, data.spcST || '', input);
    setActionStatus('Da lay SPC_ST thanh cong.', 'success');
    showSuccess('Da lay SPC_ST thanh cong.');
  } catch (error) {
    const message = error.message || 'Khong the lay SPC_ST.';
    setActionStatus(message, 'error');
    showError(message);
  } finally {
    setButtonBusy(els.loginButton, false, 'Dang lay...');
  }
}

async function copyCurrentSpcSt() {
  if (!state.currentSpcSt) {
    showError('Chua co SPC_ST de copy.');
    return;
  }
  await navigator.clipboard.writeText('SPC_ST=' + state.currentSpcSt);
  showSuccess('Da copy SPC_ST=...');
}

async function copyCurrentSpcF() {
  if (!state.currentSpcF) {
    showError('Chua co SPC_F de copy.');
    return;
  }
  await navigator.clipboard.writeText(state.currentSpcF);
  showSuccess('Da copy SPC_F=...');
}

function buildUpdatedLoginSource() {
  if (!state.currentSpcSt) {
    throw new Error('Chua co SPC_ST moi de cap nhat.');
  }

  const source = String(state.loginSourceRaw || (els.loginInput ? els.loginInput.value : '') || '').trim();
  if (!source) {
    throw new Error('Chua co chuoi goc de cap nhat.');
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
    showSuccess('Da cap nhat SPC_ST moi va copy.');
    setActionStatus('Da thay SPC_ST cu bang SPC_ST moi va copy.', 'success');
  } catch (error) {
    const message = error.message || 'Khong the cap nhat SPC_ST.';
    showError(message);
    setActionStatus(message, 'error');
  }
}

function setCheckSummary(message, type) {
  if (!els.checkSummary) return;
  if (!message) {
    els.checkSummary.style.display = 'none';
    els.checkSummary.textContent = '';
    els.checkSummary.style.borderColor = '';
    return;
  }
  els.checkSummary.style.display = 'block';
  els.checkSummary.textContent = message;
  if (type === 'success') {
    els.checkSummary.style.borderColor = 'rgba(34,197,94,.45)';
  } else if (type === 'error') {
    els.checkSummary.style.borderColor = 'rgba(248,113,113,.45)';
  } else {
    els.checkSummary.style.borderColor = 'rgba(96,165,250,.45)';
  }
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return '';
  return Math.floor(number / 100000).toLocaleString('vi-VN') + 'd';
}

function renderCheckResults(items) {
  if (!els.checkResults) return;
  if (!items.length) {
    els.checkResults.innerHTML = '<div class="voucher-empty">Khong tim thay voucher nao khop.</div>';
    return;
  }

  els.checkResults.innerHTML = items.map((item) => {
    const badgeClass = item.error ? 'is-error' : 'is-success';
    const badgeText = item.error ? 'Loi API' : ('Tim thay ' + item.matches.length);
    const matches = item.error
      ? '<div class="voucher-empty" style="padding:12px;text-align:left">' + escapeHtml(item.error) + '</div>'
      : '<div class="voucher-check-match-list">' + item.matches.map((match) => {
        const discountText = match.discountValue > 0
          ? ('Giam ' + formatMoney(match.discountValue))
          : (match.discountPercentage > 0 ? ('Giam ' + match.discountPercentage + '%') : 'Khong ro muc giam');
        const minSpendText = match.minSpend > 0 ? (' | Don toi thieu ' + formatMoney(match.minSpend)) : '';
        return '<div class="voucher-check-match">' +
          '<strong>' + escapeHtml(match.voucherCode || '-') + ' - ' + escapeHtml(match.voucherName || '-') + '</strong>' +
          '<div class="voucher-check-meta">' + escapeHtml(match.source === 'freeship' ? 'Freeship' : 'Voucher') + ' | ' + escapeHtml(discountText + minSpendText) + '</div>' +
          '</div>';
      }).join('') + '</div>';

    return '<div class="voucher-check-card">' +
      '<div class="voucher-check-card-head">' +
      '<div class="voucher-check-cookie">' + escapeHtml(item.cookie) + '</div>' +
      '<span class="voucher-check-badge ' + badgeClass + '">' + escapeHtml(badgeText) + '</span>' +
      '</div>' +
      matches +
      '</div>';
  }).join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function filterVoucherMatches(query, payload, source) {
  const keyword = String(query || '').trim().toUpperCase();
  return extractVoucherList(payload)
    .map((item) => normalizeVoucherItem(item, source))
    .filter((item) => {
      const code = String(item.voucherCode || '').toUpperCase();
      const name = String(item.voucherName || '').toUpperCase();
      return code.includes(keyword) || name.includes(keyword);
    });
}

async function checkVoucherByOtis() {
  const cookies = parseCookieList(els.checkCookies ? els.checkCookies.value : '');
  const query = String(els.checkQuery ? els.checkQuery.value : '').trim();

  if (!cookies.length) {
    showError('Ban chua nhap SPC_ST de check.');
    setCheckSummary('Ban chua nhap SPC_ST de check.', 'error');
    if (els.checkCookies) els.checkCookies.focus();
    return;
  }

  if (!query) {
    showError('Ban chua nhap ma hoac ten voucher can tim.');
    setCheckSummary('Ban chua nhap ma hoac ten voucher can tim.', 'error');
    if (els.checkQuery) els.checkQuery.focus();
    return;
  }

  setButtonBusy(els.checkButton, true, 'Dang check...');
  setCheckSummary('Dang check voucher qua API Otis...', 'progress');
  if (els.checkResults) {
    els.checkResults.innerHTML = '<div class="voucher-empty">Dang check voucher...</div>';
  }

  const results = [];
  let totalMatches = 0;

  for (const cookie of cookies) {
    try {
      const [voucherResult, freeshipResult] = await Promise.all([
        otisApi('/api/shopee/vouchers?limit=200', {
          headers: { 'X-Proxy-Cookie': cookie }
        }),
        otisApi('/api/shopee/freeships?limit=200', {
          headers: { 'X-Proxy-Cookie': cookie }
        })
      ]);

      appendApiDebug([
        '[check-otis] ' + cookie,
        'query=' + query,
        'voucher-status=' + voucherResult.status + ' freeship-status=' + freeshipResult.status,
        ''
      ]);

      const matches = filterVoucherMatches(query, voucherResult.data, 'voucher')
        .concat(filterVoucherMatches(query, freeshipResult.data, 'freeship'));

      totalMatches += matches.length;
      results.push({ cookie, matches, error: '' });
    } catch (error) {
      results.push({ cookie, matches: [], error: error.message || 'Khong the check voucher.' });
    }
  }

  renderCheckResults(results);

  const successCount = results.filter((item) => !item.error).length;
  if (totalMatches > 0) {
    setCheckSummary('Da check ' + cookies.length + ' SPC_ST, tim thay ' + totalMatches + ' voucher khop tu ' + successCount + ' cookie.', 'success');
    showSuccess('Check voucher xong.');
  } else {
    setCheckSummary('Da check ' + cookies.length + ' SPC_ST nhung chua tim thay voucher khop.', 'error');
    showError('Chua tim thay voucher khop.');
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
    els.saveHotButton.addEventListener('click', () => saveVoucherByCode('FSV-1363693662932996', els.saveHotButton, 'Hoa toc'));
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
  if (els.manualCookieInput) {
    els.manualCookieInput.addEventListener('change', () => maybeSyncCheckCookies(getCookieInput()));
  }
  if (els.checkButton) {
    els.checkButton.addEventListener('click', checkVoucherByOtis);
  }
  if (els.checkQuery) {
    els.checkQuery.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') checkVoucherByOtis();
    });
  }
}

bindEvents();
updateFixedButtons();
syncCurrentCookieDisplay();
maybeSyncCheckCookies(getCookieInput());
loadVoucherMetadata().catch((error) => {
  setActionStatus(error.message || 'Khong the tai metadata voucher.', 'error');
  showError(error.message || 'Khong the tai metadata voucher.');
});
