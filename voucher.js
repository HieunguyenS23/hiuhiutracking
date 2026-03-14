const API_BASE = '';
const VOUCHER_KEY = 'ts_saved_vouchers';
const AUTOPEE_100K_CODE = 'CRMNUICL80T3';
const BULK_EMAIL_INPUT_KEY = 'ts_bulk_email_input';
const VOUCHER_LIST_COLLAPSED_KEY = 'ts_voucher_list_collapsed';

const state = {
  qrSessionId: '',
  qrPollTimer: null,
  currentSpcSt: '',
  vouchers: readJson(VOUCHER_KEY, []),
  activeToast: null,
  activeToastTimer: null,
  bulkInput: localStorage.getItem(BULK_EMAIL_INPUT_KEY) || '',
  bulkResults: [],
  voucherListCollapsed: localStorage.getItem(VOUCHER_LIST_COLLAPSED_KEY) !== '0'
};

const els = {
  loginInput: document.getElementById('voucher-login-input'),
  loginButton: document.getElementById('voucher-login-btn'),
  save100kButton: document.getElementById('voucher-save-100k-btn'),
  saveHotButton: document.getElementById('voucher-save-hot-btn'),
  qrButton: document.getElementById('voucher-qr-btn'),
  qrDisplay: document.getElementById('voucher-qr-display'),
  qrImage: document.getElementById('voucher-qr-img'),
  qrStatus: document.getElementById('voucher-qr-status'),
  toastContainer: document.getElementById('toast-container'),
  cookieValue: document.getElementById('voucher-cookie-value'),
  copyCookieButton: document.getElementById('voucher-copy-cookie-btn'),
  copyFullCurrentButton: document.getElementById('voucher-copy-full-current-btn'),
  copyReplacedCurrentButton: document.getElementById('voucher-copy-replaced-current-btn'),
  copyImageButton: document.getElementById('voucher-copy-image-btn'),
  cancelButton: document.getElementById('voucher-cancel-btn'),
  clearCurrentButton: document.getElementById('voucher-clear-current-btn'),
  reloadButton: document.getElementById('voucher-reload-btn'),
  toggleButton: document.getElementById('voucher-toggle-btn'),
  listWrap: document.getElementById('voucher-list-wrap'),
  list: document.getElementById('voucher-list'),
  bulkInput: document.getElementById('bulk-email-input'),
  bulkUploadButton: document.getElementById('bulk-upload-btn'),
  bulkFileInput: document.getElementById('bulk-file-input'),
  bulkClearButton: document.getElementById('bulk-clear-btn'),
  bulkSubmitButton: document.getElementById('bulk-submit-btn'),
  bulkEntryCount: document.getElementById('bulk-entry-count'),
  bulkResultSummary: document.getElementById('bulk-result-summary'),
  bulkResultsEmpty: document.getElementById('bulk-results-empty'),
  bulkResultsWrap: document.getElementById('bulk-results-wrap'),
  bulkResultsBody: document.getElementById('bulk-results-body')
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

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
  window.setTimeout(() => {
    toast.remove();
  }, 180);
}

function showToast(message, type = 'info', duration = 2400) {
  if (!els.toastContainer || !message) return;
  clearToast(true);

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  state.activeToast = toast;

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  state.activeToastTimer = window.setTimeout(() => {
    clearToast();
  }, duration);
}

function showError(message) {
  showToast(message, 'error', 3200);
}

function showSuccess(message) {
  showToast(message, 'success', 2300);
}

function showProgress(message) {
  showToast(message, 'progress', 1600);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function extractVoucherTitle(sourceText) {
  const source = String(sourceText || '').trim();
  if (!source) return 'QR Login';

  const parts = source.split('|').map((item) => item.trim()).filter(Boolean);
  if (parts.length >= 2 && !/^SPC_/i.test(parts[0])) {
    return parts[0];
  }
  return 'QR Login';
}

function syncVoucherListVisibility() {
  if (!els.listWrap || !els.toggleButton) return;
  els.listWrap.classList.toggle('hidden', state.voucherListCollapsed);
  els.toggleButton.textContent = state.voucherListCollapsed ? 'Hiện danh mục' : 'Ẩn danh mục';
}

function toggleVoucherList() {
  state.voucherListCollapsed = !state.voucherListCollapsed;
  localStorage.setItem(VOUCHER_LIST_COLLAPSED_KEY, state.voucherListCollapsed ? '1' : '0');
  syncVoucherListVisibility();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok || data.error) {
    let fallback = 'HTTP ' + response.status;
    if (response.status === 400) fallback = 'Thong tin dang nhap khong hop le hoac thieu SPC_F.';
    if (response.status === 401) fallback = 'Thong tin xac thuc khong hop le.';
    throw new Error(data.error || fallback);
  }

  return data;
}

async function autopeeRequest(path, options = {}) {
  const requestOnce = async (actualPath) => {
    const response = await fetch(API_BASE + '/autopee-api' + actualPath, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    return { response, data };
  };

  let result = await requestOnce(path);
  if (result.response.status === 404 && !String(path).startsWith('/api/')) {
    result = await requestOnce('/api' + path);
  }

  if (!result.response.ok) {
    const message = result.data?.error?.message || result.data?.error || result.data?.message || ('HTTP ' + result.response.status);
    throw new Error(message);
  }

  if (result.data && result.data.success === false) {
    const message = result.data?.error?.message || result.data?.error || result.data?.message || 'Yeu cau Autopee that bai.';
    throw new Error(message);
  }

  return result.data;
}

async function otistxRequest(path, options = {}) {
  const response = await fetch(API_BASE + '/otistx-api' + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('API key otistx khong hop le hoac da het han.');
    }
    const message = data?.message || data?.error || ('HTTP ' + response.status);
    throw new Error(message);
  }

  return data;
}

function extractSpcSt(rawCookie, fallbackSpcSt) {
  const source = rawCookie || fallbackSpcSt || '';
  const cookieMatch = source.match(/SPC_ST=([^;|\s"]+)/);
  if (cookieMatch) return cookieMatch[1];
  return source.trim();
}

function buildCookieFromCurrentSpcSt() {
  if (!state.currentSpcSt) {
    throw new Error('Chưa có SPC_ST mới nhất để lưu voucher. Hãy lấy SPC_ST trước.');
  }
  return 'SPC_ST=' + state.currentSpcSt;
}

function extractSpcF(source) {
  const match = String(source || '').match(/SPC_F=[^;|\s"]+/);
  return match ? match[0] : '';
}

function buildReplacementValue(source) {
  if (!state.currentSpcSt) {
    throw new Error('Chưa có SPC_ST mới để thay thế.');
  }

  const baseSource = source || '';
  if (/SPC_ST=/.test(baseSource)) {
    return baseSource.replace(/SPC_ST=[^|\s"]+/, 'SPC_ST=' + state.currentSpcSt);
  }
  if (baseSource) {
    return baseSource + '|SPC_ST=' + state.currentSpcSt;
  }
  return 'SPC_ST=' + state.currentSpcSt;
}

function setCurrentSpcSt(rawCookie, fallbackSpcSt) {
  const spcSt = extractSpcSt(rawCookie, fallbackSpcSt);
  state.currentSpcSt = spcSt;
  els.cookieValue.textContent = spcSt || 'Chưa có cookie nào được lưu.';
}

function saveVoucherEntry(spcSt, rawCookie, sourceText = '') {
  if (!spcSt) return;
  const normalizedSource = sourceText || rawCookie || ('SPC_ST=' + spcSt);
  const next = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    spcSt,
    rawCookie: rawCookie || ('SPC_ST=' + spcSt),
    sourceText: normalizedSource,
    title: extractVoucherTitle(normalizedSource)
  };
  state.vouchers.unshift(next);
  state.vouchers = state.vouchers.slice(0, 30);
  writeJson(VOUCHER_KEY, state.vouchers);
}

function formatTime(isoString) {
  return new Date(isoString || Date.now()).toLocaleString('vi-VN');
}

function renderVoucherList() {
  syncVoucherListVisibility();

  if (!state.vouchers.length) {
    els.list.innerHTML = '<div class="voucher-empty">Chưa có voucher nào được lưu.</div>';
    return;
  }

  els.list.innerHTML = state.vouchers.map((item) => {
    const title = item.title || extractVoucherTitle(item.sourceText || item.rawCookie || '');
    return `
    <div class="voucher-item">
      <div class="voucher-item-top">
        <span class="voucher-item-name">${escapeHtml(title)}</span>
        <span class="voucher-item-time">${escapeHtml(formatTime(item.createdAt))}</span>
      </div>
      <div class="voucher-code-box" style="margin-bottom:10px">
        <span class="voucher-code">${escapeHtml(item.spcSt)}</span>
      </div>
      <div class="voucher-item-actions">
        <button class="nav-btn" type="button" onclick="deleteVoucher(${item.id})">Xóa</button>
      </div>
    </div>
  `;
  }).join('');
}

function syncBulkEntryCount() {
  const entries = parseBulkEntries(els.bulkInput.value || '');
  els.bulkEntryCount.textContent = entries.length + ' dòng hợp lệ';
}

function renderBulkResults() {
  if (!state.bulkResults.length) {
    els.bulkResultsEmpty.classList.remove('hidden');
    els.bulkResultsWrap.classList.add('hidden');
    els.bulkResultsBody.innerHTML = '';
    els.bulkResultSummary.textContent = '';
    return;
  }

  const successCount = state.bulkResults.filter((item) => item.status).length;
  const failCount = state.bulkResults.length - successCount;
  els.bulkResultSummary.textContent = successCount + ' thành công, ' + failCount + ' thất bại';
  els.bulkResultsEmpty.classList.add('hidden');
  els.bulkResultsWrap.classList.remove('hidden');
  els.bulkResultsBody.innerHTML = state.bulkResults.map((item) => {
    const cookieId = item.cookieId || item.cookie || item.cookieFull || item.cookiePreview || '-';
    return `
      <tr>
        <td class="wrap">${escapeHtml(cookieId)}</td>
        <td class="wrap">${escapeHtml(item.email || '-')}</td>
        <td class="wrap">${item.status ? '<span class="bulk-status bulk-status-ok">Thành công</span>' : '<span class="bulk-status bulk-status-fail">Thất bại</span>'}</td>
        <td class="wrap">${escapeHtml(item.message || '-')}</td>
        <td class="wrap">${escapeHtml(item.proxy || '-')}</td>
      </tr>`;
  }).join('');
}

function resetQrDisplay() {
  state.qrSessionId = '';
  if (state.qrPollTimer) {
    clearInterval(state.qrPollTimer);
    state.qrPollTimer = null;
  }
  els.qrDisplay.classList.add('hidden');
  els.qrImage.src = '';
  els.qrStatus.textContent = 'Chờ quét QR trên app Shopee...';
  els.qrButton.disabled = false;
  els.qrButton.textContent = 'Quét QR code';
}

async function handleVoucherSuccess(rawCookie, fallbackSpcSt, successMessage, sourceText = '') {
  const spcSt = extractSpcSt(rawCookie, fallbackSpcSt);
  if (!spcSt) throw new Error('API không trả về SPC_ST.');
  setCurrentSpcSt(rawCookie, fallbackSpcSt);
  saveVoucherEntry(spcSt, rawCookie || ('SPC_ST=' + spcSt), sourceText || rawCookie || ('SPC_ST=' + spcSt));
  renderVoucherList();
  showSuccess(successMessage);
}

async function loginByAccount() {
  const input = (els.loginInput.value || '').trim();
  if (!input) {
    showError('Bạn chưa nhập user|pass|SPC_F.');
    els.loginInput.focus();
    return;
  }

  els.loginButton.disabled = true;
  els.loginButton.textContent = 'Đang lấy...';
  showProgress('Đang lấy SPC_ST từ tài khoản...');

  try {
    const data = await apiRequest('/api/login', { method: 'POST', body: { input } });
    await handleVoucherSuccess(data.cookie || '', data.spcST || '', 'Đã lấy SPC_ST từ tài khoản thành công.', input);
  } catch (error) {
    showError(error.message);
  } finally {
    els.loginButton.disabled = false;
    els.loginButton.textContent = 'Lấy SPC_ST';
  }
}

async function startQrLogin() {
  els.qrButton.disabled = true;
  els.qrButton.textContent = 'Đang tạo QR...';
  showProgress('Đang tạo mã QR đăng nhập...');

  try {
    const data = await apiRequest('/api/qr/generate', { method: 'POST', body: {} });
    state.qrSessionId = data.sessionId;
    els.qrImage.src = String(data.qrBase64 || '').startsWith('data:') ? data.qrBase64 : ('data:image/png;base64,' + data.qrBase64);
    els.qrDisplay.classList.remove('hidden');
    els.qrStatus.textContent = 'Chờ quét QR trên app Shopee...';
    if (state.qrPollTimer) clearInterval(state.qrPollTimer);
    state.qrPollTimer = setInterval(pollQrStatus, 2000);
    showSuccess('Đã tạo QR, hãy mở app Shopee để quét.');
  } catch (error) {
    els.qrButton.disabled = false;
    els.qrButton.textContent = 'Quét QR code';
    showError(error.message);
  }
}

async function pollQrStatus() {
  if (!state.qrSessionId) return;

  try {
    const data = await apiRequest('/api/qr/status/' + state.qrSessionId);
    if (data.status === 'waiting') {
      els.qrStatus.textContent = 'Chờ quét QR trên app Shopee...';
      return;
    }
    if (data.status === 'scanned') {
      els.qrStatus.textContent = 'Đã quét, vui lòng xác nhận trên app Shopee...';
      showProgress('Đã quét QR, chờ xác nhận trên app Shopee.');
      return;
    }
    if (data.status === 'success' || data.status === 'done') {
      await handleVoucherSuccess(data.cookie || '', data.spcST || '', 'Đã lấy và lưu SPC_ST thành công.');
      resetQrDisplay();
      return;
    }
    if (data.status === 'failed' || data.status === 'expired' || data.status === 'error') {
      showError(data.error || 'QR đã hết hạn hoặc thất bại.');
      resetQrDisplay();
    }
  } catch (error) {
    showError(error.message);
    resetQrDisplay();
  }
}

async function cancelQrLogin() {
  if (state.qrSessionId) {
    try {
      await apiRequest('/api/qr/cancel', { method: 'POST', body: { sessionId: state.qrSessionId } });
    } catch {
    }
  }
  resetQrDisplay();
  showSuccess('Đã hủy phiên QR hiện tại.');
}

async function copyQrImage() {
  if (!els.qrImage.src) {
    showError('Chưa có ảnh QR để copy.');
    return;
  }

  try {
    await navigator.clipboard.writeText(els.qrImage.src);
    showSuccess('Đã copy dữ liệu ảnh QR.');
  } catch (error) {
    showError(error.message);
  }
}

async function copyCurrentCookie() {
  if (!state.currentSpcSt) {
    showError('Chưa có SPC_ST để copy.');
    return;
  }

  try {
    await navigator.clipboard.writeText(buildCookieFromCurrentSpcSt());
    showSuccess('Đã copy chuỗi SPC_ST=...');
  } catch (error) {
    showError(error.message);
  }
}

async function copyCurrentFullCookie() {
  const latest = state.vouchers[0];
  const source = latest ? (latest.sourceText || latest.rawCookie || '') : '';
  const spcF = extractSpcF(source);

  if (!spcF) {
    showError('Không tìm thấy SPC_F để copy.');
    return;
  }

  try {
    await navigator.clipboard.writeText(spcF);
    showSuccess('Đã copy SPC_F.');
  } catch (error) {
    showError(error.message);
  }
}

async function copyCurrentReplacedValue() {
  if (!state.currentSpcSt) {
    showError('Chưa có SPC_ST mới để thay.');
    return;
  }

  const latest = state.vouchers[0];
  const source = latest ? (latest.sourceText || latest.rawCookie || '') : '';
  try {
    const nextValue = buildReplacementValue(source);
    await navigator.clipboard.writeText(nextValue);
    showSuccess('Đã tạo chuỗi thay SPC_ST mới và copy.');
  } catch (error) {
    showError(error.message);
  }
}

function clearCurrentCookie() {
  if (!state.currentSpcSt) {
    showError('Không có kết quả hiện tại để xóa.');
    return;
  }

  state.currentSpcSt = '';
  els.cookieValue.textContent = 'Chưa có cookie nào được lưu.';
  showSuccess('Đã xóa SPC_ST hiện tại.');
}

function getVoucherById(id) {
  return state.vouchers.find((item) => item.id === id);
}

function deleteVoucher(id) {
  const item = getVoucherById(id);
  if (!item) {
    showError('Không tìm thấy voucher cần xóa.');
    return;
  }

  state.vouchers = state.vouchers.filter((entry) => entry.id !== id);
  writeJson(VOUCHER_KEY, state.vouchers);
  renderVoucherList();
  showSuccess('Đã xóa SPC_ST đã lưu.');
}

async function findAutopeeVoucherByCode(voucherCode) {
  const data = await autopeeRequest('/shopee/vouchers?limit=200');
  const items = Array.isArray(data?.data) ? data.data : [];
  const found = items.find((item) => String(item.voucherCode || '').trim().toUpperCase() === voucherCode.toUpperCase());
  if (!found) {
    throw new Error('Không tìm thấy mã ' + voucherCode + ' trong danh sách voucher Autopee.');
  }
  return found;
}

function buildAutopeeSavePayload(voucher, cookie) {
  return {
    cookie,
    voucher_promotionid: voucher.promotionId,
    signature: voucher.signature,
    voucher_code: voucher.voucherCode
  };
}

function getAutopeeSaveResultMessage(result, voucherCode) {
  const payload = result?.data || result;
  if (payload?.error === 0) return 'Đã lưu voucher ' + voucherCode + ' thành công.';
  if (payload?.error === 5) return 'Voucher ' + voucherCode + ' đã được lưu trước đó.';
  if (payload?.error === 19) throw new Error('SPC_ST hiện tại không hợp lệ hoặc đã hết hạn.');
  if (payload?.error_msg) throw new Error(payload.error_msg);
  if (result?.message) return result.message;
  return 'Đã gửi yêu cầu lưu voucher ' + voucherCode + '.';
}

async function saveAutopeeVoucherByCode(voucherCode, triggerButton) {
  const previousText = triggerButton.textContent;
  triggerButton.disabled = true;
  triggerButton.textContent = 'Đang lưu...';
  showProgress('Đang gửi yêu cầu lưu voucher ' + voucherCode + '...');

  try {
    const cookie = buildCookieFromCurrentSpcSt();
    const voucher = await findAutopeeVoucherByCode(voucherCode);
    const result = await autopeeRequest('/shopee/save-voucher', {
      method: 'POST',
      body: buildAutopeeSavePayload(voucher, cookie)
    });
    showSuccess(getAutopeeSaveResultMessage(result, voucherCode));
  } catch (error) {
    showError(error.message || 'Có lỗi xảy ra khi lưu voucher.');
  } finally {
    triggerButton.disabled = false;
    triggerButton.textContent = previousText;
  }
}

function save100kVoucher() {
  return saveAutopeeVoucherByCode(AUTOPEE_100K_CODE, els.save100kButton);
}

function saveHotVoucher() {
  showError('Nút Hỏa tốc đã thêm vào giao diện nhưng chưa có mã voucher tương ứng để gọi Autopee.');
}

function reloadVoucherList() {
  renderVoucherList();
  renderBulkResults();
  showSuccess('Đã tải lại danh sách SPC_ST đã lưu.');
}

function parseBulkEntries(rawText) {
  return String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|');
      if (parts.length < 2) return null;
      return {
        email: (parts[0] || '').trim(),
        cookie: (parts[1] || '').trim(),
        proxy: (parts[2] || '').trim() || undefined,
        index
      };
    })
    .filter((entry) => entry && entry.email && entry.cookie);
}

function persistBulkInput() {
  state.bulkInput = els.bulkInput.value || '';
  localStorage.setItem(BULK_EMAIL_INPUT_KEY, state.bulkInput);
  syncBulkEntryCount();
}

function handleBulkFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const text = String(loadEvent.target?.result || '');
    els.bulkInput.value = text;
    persistBulkInput();
    showSuccess('Đã tải file bulk mail.');
  };
  reader.readAsText(file);
}

function clearBulkInput() {
  els.bulkInput.value = '';
  persistBulkInput();
  showSuccess('Đã xóa dữ liệu thêm mail.');
}

async function submitBulkEmailAdd() {
  persistBulkInput();

  const entries = parseBulkEntries(state.bulkInput);
  if (!entries.length) {
    showError('Bạn chưa nhập dữ liệu bulk mail hợp lệ.');
    els.bulkInput.focus();
    return;
  }

  const previousText = els.bulkSubmitButton.textContent;
  els.bulkSubmitButton.disabled = true;
  els.bulkSubmitButton.textContent = 'Đang gửi...';
  showProgress('Đang gửi yêu cầu thêm mail hàng loạt...');

  try {
    const data = await otistxRequest('/api/email-additions/bulk', {
      method: 'POST',
      body: { entries }
    });
    state.bulkResults = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
    renderBulkResults();
    if (!state.bulkResults.length) {
      showSuccess('Đã gửi yêu cầu nhưng API không trả danh sách kết quả.');
      return;
    }
    const successCount = state.bulkResults.filter((item) => item.status).length;
    const failCount = state.bulkResults.length - successCount;
    showSuccess('Đã xử lý ' + state.bulkResults.length + ' dòng: ' + successCount + ' thành công, ' + failCount + ' thất bại.');
  } catch (error) {
    showError(error.message || 'Không thể thêm mail hàng loạt.');
  } finally {
    els.bulkSubmitButton.disabled = false;
    els.bulkSubmitButton.textContent = previousText;
  }
}

function bindEvents() {
  els.loginButton.addEventListener('click', loginByAccount);
  els.loginInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loginByAccount();
  });
  els.save100kButton.addEventListener('click', save100kVoucher);
  els.saveHotButton.addEventListener('click', saveHotVoucher);
  els.qrButton.addEventListener('click', startQrLogin);
  els.cancelButton.addEventListener('click', cancelQrLogin);
  els.copyImageButton.addEventListener('click', copyQrImage);
  els.copyCookieButton.addEventListener('click', copyCurrentCookie);
  els.copyFullCurrentButton.addEventListener('click', copyCurrentFullCookie);
  els.copyReplacedCurrentButton.addEventListener('click', copyCurrentReplacedValue);
  els.clearCurrentButton.addEventListener('click', clearCurrentCookie);
  els.reloadButton.addEventListener('click', reloadVoucherList);
  els.bulkInput.addEventListener('input', persistBulkInput);
  els.bulkUploadButton.addEventListener('click', () => els.bulkFileInput.click());
  els.bulkFileInput.addEventListener('change', handleBulkFileUpload);
  els.bulkClearButton.addEventListener('click', clearBulkInput);
  els.bulkSubmitButton.addEventListener('click', submitBulkEmailAdd);
  if (els.toggleButton) els.toggleButton.addEventListener('click', toggleVoucherList);
}

function hydrateInputs() {
  els.bulkInput.value = state.bulkInput;
  syncBulkEntryCount();
}

window.loginByAccount = loginByAccount;
window.deleteVoucher = deleteVoucher;

bindEvents();
hydrateInputs();
renderVoucherList();
renderBulkResults();
