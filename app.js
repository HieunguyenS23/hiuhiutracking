const API_BASE = '';
const STORAGE_KEYS = {
  device: 'ts_device_id',
  cookie: 'ts_cookie',
  orders: 'ts_orders',
  sheet: 'ts_sheet',
  autoCheck: 'ts_autocheck'
};
const AUTO_CHECK_MS = 30 * 60 * 1000;

const state = {
  deviceId: getDeviceId(),
  currentCookie: localStorage.getItem(STORAGE_KEYS.cookie) || '',
  currentOrders: readJson(STORAGE_KEYS.orders, []),
  sheetData: readJson(STORAGE_KEYS.sheet, []),
  qrSessionId: '',
  qrPollTimer: null,
  autoCheckTimer: null,
  autoCountdownTimer: null,
  autoRemainingSeconds: 0,
  currentView: 'card',
  activeToast: null,
  activeToastTimer: null
};

const els = {
  cookieInput: byId('cookie-input'),
  loginInput: byId('login-input'),
  checkButton: byId('btn-check'),
  loginButton: byId('btn-login'),
  qrButton: byId('btn-qr'),
  qrDisplay: byId('qr-display'),
  qrImage: byId('qr-img'),
  qrStatus: byId('qr-status'),
  toastContainer: byId('toast-container'),
  stats: byId('stats'),
  statTotal: byId('stat-total'),
  statShipping: byId('stat-shipping'),
  statDone: byId('stat-done'),
  statCancel: byId('stat-cancel'),
  viewToggle: byId('view-toggle'),
  viewCard: byId('view-card'),
  viewSheet: byId('view-sheet'),
  orders: byId('orders'),
  refreshButton: byId('btn-refresh'),
  spxProgress: byId('spx-progress'),
  autoToggle: byId('auto-toggle'),
  autoLabel: byId('auto-label'),
  autoCountdown: byId('auto-countdown'),
  filterTinhTrang: byId('filter-tt'),
  sheetActions: byId('sheet-actions'),
  selectedCount: byId('selected-count'),
  checkAll: byId('chk-all'),
  sheetBody: byId('sheet-body'),
  historySection: byId('history-section'),
  historyList: byId('history-list'),
  spxOverlay: byId('spx-overlay'),
  spxInput: byId('spx-input'),
  spxResult: byId('spx-result'),
};

function byId(id) {
  return document.getElementById(id);
}

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

function getDeviceId() {
  const saved = localStorage.getItem(STORAGE_KEYS.device);
  if (saved) return saved;
  const next = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  localStorage.setItem(STORAGE_KEYS.device, next);
  return next;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
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

function showToast(message, type = 'info', duration = 2200) {
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

function showErr(message) {
  showToast(message, 'error', 3200);
}

function showInfo(message) {
  showToast(message, 'info', 2200);
}

function showSuccess(message) {
  showToast(message, 'success', 2300);
}

function showProgress(message) {
  showToast(message, 'progress', 1600);
}
function clearResults() {
  els.orders.innerHTML = '';
  els.stats.classList.add('hidden');
  els.viewToggle.classList.add('hidden');
}

function normalizeCookie(cookie) {
  const value = (cookie || '').trim();
  if (!value) return '';
  if (/SPC_ST=/.test(value)) return value;
  return 'SPC_ST=' + value;
}

function setCurrentCookie(cookie) {
  state.currentCookie = normalizeCookie(cookie);
  if (state.currentCookie) {
    localStorage.setItem(STORAGE_KEYS.cookie, state.currentCookie);
  } else {
    localStorage.removeItem(STORAGE_KEYS.cookie);
  }
}

function setButtonLoading(button, loadingText, idleText, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
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
    data = { error: text || 'Phan hoi khong hop le' };
  }

  if (!response.ok || data.error) {
    throw new Error(data.error || ('HTTP ' + response.status));
  }

  return data;
}

function copyText(text, successMessage = 'Da copy du lieu.') {
  if (!text) {
    showErr('Khong co du lieu de copy.');
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => showSuccess(successMessage))
    .catch(() => showErr('Khong copy duoc du lieu.'));
}

function statusClass(status) {
  const value = (status || '').toLowerCase();
  if (/thanh cong|hoan thanh|da giao|delivered|completed/.test(value)) return 'st-delivered';
  if (/dang giao|shipping|to ship|cho giao|chuan bi/.test(value)) return 'st-shipping';
  if (/huy|cancel|hoan tra|refund/.test(value)) return 'st-cancel';
  if (/cho|pending|xac nhan|thanh toan|pickup/.test(value)) return 'st-pending';
  return 'st-default';
}

function badgeClass(status) {
  const value = statusClass(status);
  if (value === 'st-delivered') return 'badge-done';
  if (value === 'st-shipping') return 'badge-shipping';
  if (value === 'st-cancel') return 'badge-cancel';
  if (value === 'st-pending') return 'badge-pending';
  return 'badge-default';
}

function summarizeProducts(products) {
  if (!products) return '';
  if (Array.isArray(products)) {
    return products.map((item) => {
      if (typeof item === 'string') return item;
      return item?.name || '';
    }).filter(Boolean).join(', ');
  }
  return String(products);
}

function formatOrder(order, fallbackCookie) {
  return {
    orderId: order.orderId || order.id || '',
    username: order.username || '',
    tenKH: order.tenKH || order.recipient || '',
    tinhTrang: order.tinhTrang || 'chua',
    cookie: order.cookie || fallbackCookie || '',
    tracking: order.tracking || order.sls_tn || '',
    statusText: order.statusText || order.status || '',
    spxStatus: order.spxStatus || '',
    total: order.total || order.totalAmount || '',
    shipPhone: order.shipPhone || '',
    recipient: order.recipient || order.tenKH || '',
    phone: order.phone || '',
    address: order.address || '',
    products: summarizeProducts(order.products),
    orderTime: order.orderTime || '',
    shopName: order.shopName || '',
    canCancel: Boolean(order.canCancel),
    isCheckout: Boolean(order.isCheckout),
    carrier: order.carrier || '',
    driverName: order.driverName || ''
  };
}

function persistOrders() {
  writeJson(STORAGE_KEYS.orders, state.currentOrders);
}

function persistSheet() {
  writeJson(STORAGE_KEYS.sheet, state.sheetData);
}

function mergeOrdersIntoSheet(orders, cookie, username) {
  const incoming = (orders || []).map((order) => formatOrder(order, cookie));
  const indexById = new Map(state.sheetData.map((row, index) => [String(row.orderId), index]));
  let added = 0;

  incoming.forEach((order) => {
    const key = String(order.orderId);
    const existingIndex = indexById.get(key);
    if (existingIndex == null) {
      order.username = order.username || username || '';
      state.sheetData.push(order);
      indexById.set(key, state.sheetData.length - 1);
      added += 1;
      return;
    }

    const current = state.sheetData[existingIndex];
    state.sheetData[existingIndex] = {
      ...current,
      ...order,
      tinhTrang: current.tinhTrang || order.tinhTrang || 'chua',
      cookie: order.cookie || current.cookie,
      username: current.username || username || order.username || ''
    };
  });

  persistSheet();
  return added;
}
function renderStats(orders) {
  const source = state.sheetData.length ? state.sheetData : (orders || []);
  if (!source.length) {
    els.stats.classList.add('hidden');
    els.viewToggle.classList.add('hidden');
    return;
  }

  let shipping = 0;
  let done = 0;
  let cancel = 0;
  source.forEach((order) => {
    const cls = statusClass(order.statusText || order.status || '');
    if (cls === 'st-shipping') shipping += 1;
    if (cls === 'st-delivered') done += 1;
    if (cls === 'st-cancel') cancel += 1;
  });

  els.statTotal.textContent = String(source.length);
  els.statShipping.textContent = String(shipping);
  els.statDone.textContent = String(done);
  els.statCancel.textContent = String(cancel);
  els.stats.classList.remove('hidden');
  els.viewToggle.classList.remove('hidden');
}

function renderCards(orders) {
  els.orders.innerHTML = '';
  if (!orders || !orders.length) return;

  orders.forEach((rawOrder, index) => {
    const order = formatOrder(rawOrder, state.currentCookie);
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.animationDelay = (index * 0.03) + 's';
    const tracking = order.tracking
      ? `<span class="tracking-code" onclick="copyText('${escapeHtml(order.tracking)}', 'Da copy ma van don.')">${escapeHtml(order.tracking)}${order.carrier ? ' · ' + escapeHtml(order.carrier) : ''}</span>`
      : '<span class="tracking-empty">Chua co</span>';
    const shipper = [order.driverName, order.shipPhone].filter(Boolean).join(' · ');
    const cancelButton = order.canCancel
      ? `<button class="card-cancel" onclick="cancelOrder('${escapeHtml(order.orderId)}', ${order.isCheckout ? 'true' : 'false'}, this)">Huy don</button>`
      : '';

    card.innerHTML = `
      <div class="order-top">
        <div class="order-left">
          <span class="order-num">#${escapeHtml(order.orderId || 'N/A')}</span>
          <span class="order-shop-name">${escapeHtml(order.shopName || 'Shopee')}</span>
        </div>
        <span class="badge ${badgeClass(order.statusText)}">${escapeHtml(order.statusText || 'Khong ro')}</span>
      </div>
      <div class="order-body">
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Nguoi nhan</span><span class="info-val">${escapeHtml(order.recipient || '—')}</span></div>
          <div class="info-item"><span class="info-label">SDT</span><span class="info-val">${escapeHtml(order.phone || '—')}</span></div>
          <div class="info-item wide"><span class="info-label">Dia chi</span><span class="info-val">${escapeHtml(order.address || '—')}</span></div>
          <div class="info-item wide"><span class="info-label">MVD</span>${tracking}</div>
          <div class="info-item"><span class="info-label">Tong tien</span><span class="info-val">${escapeHtml(order.total || '—')}</span></div>
          <div class="info-item"><span class="info-label">Time dat</span><span class="info-val">${escapeHtml(order.orderTime || '—')}</span></div>
          <div class="info-item wide"><span class="info-label">San pham</span><span class="info-val">${escapeHtml(order.products || '—')}</span></div>
          ${shipper ? `<div class="info-item wide"><span class="info-label">Shipper</span><span class="info-val">${escapeHtml(shipper)}</span></div>` : ''}
        </div>
        <div class="order-bottom">
          <span class="total-text">Trang thai</span>
          <span class="total-amount">${escapeHtml(order.statusText || 'Khong ro')}</span>
        </div>
        ${cancelButton}
      </div>`;
    els.orders.appendChild(card);
  });
}

function updateSelectedCount() {
  const selected = document.querySelectorAll('.row-chk:checked').length;
  els.sheetActions.style.display = selected ? 'flex' : 'none';
  els.selectedCount.textContent = selected ? (selected + ' don da chon') : '';
  const rowChecks = document.querySelectorAll('.row-chk');
  els.checkAll.checked = rowChecks.length > 0 && selected === rowChecks.length;
}

function renderSheet() {
  const filterValue = els.filterTinhTrang.value;
  const rows = state.sheetData.filter((row) => filterValue === 'all' || row.tinhTrang === filterValue);

  if (!rows.length) {
    els.sheetBody.innerHTML = '<tr><td colspan="15" style="text-align:center;color:var(--text3);padding:18px">Chua co du lieu</td></tr>';
    updateSelectedCount();
    return;
  }

  els.sheetBody.innerHTML = rows.map((row, index) => {
    const originalIndex = state.sheetData.findIndex((item) => String(item.orderId) === String(row.orderId));
    const selectClass = row.tinhTrang === 'da' ? 'paid' : 'unpaid';
    return `
      <tr>
        <td class="chk-cell"><input type="checkbox" class="row-chk" data-row-index="${originalIndex}" onchange="updateSelectedCount()"></td>
        <td class="stt">${index + 1}</td>
        <td class="wrap">${escapeHtml(row.username || '—')}</td>
        <td class="wrap">${escapeHtml(row.tenKH || row.recipient || '—')}</td>
        <td>
          <select class="tt-select ${selectClass}" onchange="updateTinhTrang(${originalIndex}, this.value)">
            <option value="chua" ${row.tinhTrang === 'chua' ? 'selected' : ''}>Chua TT</option>
            <option value="da" ${row.tinhTrang === 'da' ? 'selected' : ''}>Da TT</option>
          </select>
        </td>
        <td class="wrap"><span class="cookie-copy" title="Click de copy cookie" onclick="copyText('${escapeHtml(row.cookie || '')}', 'Da copy cookie.')">${escapeHtml((row.cookie || '').slice(0, 24) || '—')}</span></td>
        <td class="col-track" onclick="copyText('${escapeHtml(row.tracking || '')}', 'Da copy ma van don.')">${escapeHtml(row.tracking || '—')}</td>
        <td class="col-status ${statusClass(row.spxStatus || row.statusText)}">${escapeHtml(row.spxStatus || row.statusText || '—')}</td>
        <td class="col-amount">${escapeHtml(row.total || '—')}</td>
        <td>${escapeHtml(row.shipPhone || '—')}</td>
        <td class="wrap">${escapeHtml(row.recipient || '—')}</td>
        <td>${escapeHtml(row.phone || '—')}</td>
        <td class="wrap">${escapeHtml(row.address || '—')}</td>
        <td class="wrap">${escapeHtml(row.products || '—')}</td>
        <td>${escapeHtml(row.orderTime || '—')}</td>
      </tr>`;
  }).join('');

  updateSelectedCount();
}

function renderOrders(orders) {
  state.currentOrders = orders || [];
  persistOrders();
  renderStats(state.currentOrders);
  renderCards(state.currentOrders);
  renderSheet();
}

function switchTab(tab) {
  const tabs = ['cookie', 'login', 'qr'];
  document.querySelectorAll('.tab').forEach((button, index) => {
    button.classList.toggle('active', tabs[index] === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
  byId('tab-' + tab).classList.add('active');
}

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.vt-btn').forEach((button, index) => {
    button.classList.toggle('active', ['card', 'sheet'][index] === view);
  });
  els.viewCard.classList.toggle('active', view === 'card');
  els.viewSheet.classList.toggle('active', view === 'sheet');
  document.querySelector('.main').classList.toggle('sheet-mode', view === 'sheet');
  if (view === 'sheet') renderSheet();
}

function updateTinhTrang(index, value) {
  if (!state.sheetData[index]) return;
  state.sheetData[index].tinhTrang = value;
  persistSheet();
  renderSheet();
}

function toggleCheckAll(input) {
  document.querySelectorAll('.row-chk').forEach((checkbox) => {
    checkbox.checked = input.checked;
  });
  updateSelectedCount();
}

function deleteSelectedRows() {
  const selectedIndexes = Array.from(document.querySelectorAll('.row-chk:checked'))
    .map((checkbox) => Number(checkbox.dataset.rowIndex))
    .filter((value) => Number.isInteger(value));

  if (!selectedIndexes.length) return;
  state.sheetData = state.sheetData.filter((_, index) => !selectedIndexes.includes(index));
  persistSheet();
  renderSheet();
  renderStats(state.currentOrders);
  showSuccess('Da xoa ' + selectedIndexes.length + ' dong khoi Sheet');
}

async function fetchOrdersByCookie(cookie, options = {}) {
  const payload = {
    cookie: normalizeCookie(cookie),
    deviceId: state.deviceId
  };
  const data = await apiRequest('/api/check', { method: 'POST', body: payload });
  const finalCookie = data.cookie || payload.cookie;
  setCurrentCookie(finalCookie);
  const added = mergeOrdersIntoSheet(data.orders || [], finalCookie, data.username || '');
  renderOrders(data.orders || []);
  if (!options.silent) {
    if ((data.orders || []).length) {
      showSuccess(((data.orders || []).length) + ' don, them ' + added + ' dong vao Sheet');
    } else {
      showInfo('Khong co don hang nao duoc tra ve');
    }
  }
  return data;
}

async function checkOrders() {
  const cookie = normalizeCookie(els.cookieInput.value);
  if (!cookie) {
    showErr('Ban chua nhap cookie');
    els.cookieInput.focus();
    return;
  }

  setButtonLoading(els.checkButton, 'Dang kiem tra...', 'Kiem tra', true);
  try {
    await fetchOrdersByCookie(cookie);
  } catch (error) {
    showErr('Loi: ' + error.message);
  } finally {
    setButtonLoading(els.checkButton, 'Dang kiem tra...', 'Kiem tra', false);
  }
}

async function loginAndCheck() {
  const input = els.loginInput.value.trim();
  if (!input) {
    showErr('Ban chua nhap tai khoan');
    els.loginInput.focus();
    return;
  }

  setButtonLoading(els.loginButton, 'Dang nhap...', 'Dang nhap', true);
  try {
    const loginParts = input.split('|');
    const loginData = await apiRequest('/api/login', { method: 'POST', body: { input } });
    const cookie = loginData.cookie || loginData.spcST || '';
    if (!cookie) throw new Error('API khong tra ve cookie sau dang nhap');
    els.cookieInput.value = normalizeCookie(cookie);
    showProgress('Dang nhap thanh cong, dang lay don...');
    await fetchOrdersByCookie(cookie, {
      silent: true,
    });
  } catch (error) {
    showErr('Loi: ' + error.message);
  } finally {
    setButtonLoading(els.loginButton, 'Dang nhap...', 'Dang nhap', false);
  }
}

function stopQrPolling() {
  if (state.qrPollTimer) {
    clearInterval(state.qrPollTimer);
    state.qrPollTimer = null;
  }
}

async function startQR() {
  setButtonLoading(els.qrButton, 'Tao QR...', 'Tao ma QR', true);
  try {
    const data = await apiRequest('/api/qr/generate', { method: 'POST', body: {} });
    state.qrSessionId = data.sessionId || '';
    els.qrImage.src = String(data.qrBase64 || '').startsWith('data:') ? data.qrBase64 : 'data:image/png;base64,' + data.qrBase64;
    els.qrDisplay.classList.remove('hidden');
    els.qrButton.classList.add('hidden');
    els.qrStatus.textContent = 'Cho quet QR...';
    stopQrPolling();
    state.qrPollTimer = setInterval(pollQrStatus, 2000);
  } catch (error) {
    showErr('Loi: ' + error.message);
    setButtonLoading(els.qrButton, 'Tao QR...', 'Tao ma QR', false);
  }
}

async function pollQrStatus() {
  if (!state.qrSessionId) return;
  try {
    const data = await apiRequest('/api/qr/status/' + state.qrSessionId);
    if (data.status === 'waiting') {
      els.qrStatus.textContent = 'Cho quet QR...';
      return;
    }
    if (data.status === 'scanned') {
      els.qrStatus.textContent = 'Da quet, cho xac nhan tren app...';
      return;
    }
    if (data.status === 'success' || data.status === 'done') {
      stopQrPolling();
      const cookie = data.cookie || data.spcST || '';
      if (!cookie) throw new Error('QR thanh cong nhung khong nhan duoc cookie');
      els.qrStatus.textContent = 'Dang lay don hang...';
      els.cookieInput.value = normalizeCookie(cookie);
      await fetchOrdersByCookie(cookie, { silent: true });
      closeQrDisplay();
      showSuccess('Dang nhap QR thanh cong');
      return;
    }
    if (data.status === 'failed' || data.status === 'expired' || data.status === 'error') {
      stopQrPolling();
      els.qrStatus.textContent = data.error || 'QR da het han';
      setTimeout(closeQrDisplay, 1200);
    }
  } catch (error) {
    stopQrPolling();
    showErr('Loi QR: ' + error.message);
    setTimeout(closeQrDisplay, 1200);
  }
}

function closeQrDisplay() {
  state.qrSessionId = '';
  els.qrDisplay.classList.add('hidden');
  els.qrButton.classList.remove('hidden');
  els.qrImage.src = '';
  els.qrStatus.textContent = '';
  setButtonLoading(els.qrButton, 'Tao QR...', 'Tao ma QR', false);
}

async function cancelOrder(orderId, isCheckout, button) {
  if (!state.currentCookie) {
    showErr('Chua co cookie de huy don');
    return;
  }
  if (!window.confirm('Huy don #' + orderId + '?')) return;

  if (button) {
    button.disabled = true;
    button.textContent = 'Dang huy...';
  }

  try {
    await apiRequest('/api/cancel', {
      method: 'POST',
      body: { cookie: state.currentCookie, orderId, isCheckout: Boolean(isCheckout) }
    });
    showSuccess('Da gui lenh huy don #' + orderId);
    await fetchOrdersByCookie(state.currentCookie, { silent: true });
  } catch (error) {
    showErr('Loi: ' + error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Huy don';
    }
  }
}

async function refreshOrders() {
  if (!state.sheetData.length && !state.currentCookie) {
    showErr('Chua co du lieu de lam moi');
    return;
  }

  els.spxProgress.textContent = 'Dang lam moi...';
  setButtonLoading(els.refreshButton, 'Dang cap nhat...', 'Lam moi don hang', true);
  try {
    const cookieList = [...new Set(state.sheetData.map((row) => normalizeCookie(row.cookie)).filter(Boolean))];
    if (!cookieList.length && state.currentCookie) cookieList.push(state.currentCookie);

    let updated = 0;
    for (const cookie of cookieList) {
      try {
        const data = await fetchOrdersByCookie(cookie, { silent: true });
        updated += (data.orders || []).length;
      } catch (error) {
        console.warn(error);
      }
    }

    const spxCodes = state.sheetData.map((row) => row.tracking).filter((tracking) => /^SPX/i.test(tracking || ''));
    if (spxCodes.length) {
      const spxData = await apiRequest('/api/spx', { method: 'POST', body: { trackings: spxCodes.slice(0, 50) } });
      (spxData.results || []).forEach((item) => {
        const row = state.sheetData.find((entry) => entry.tracking === item.tracking);
        if (row) row.spxStatus = item.status || item.error || row.spxStatus;
      });
      persistSheet();
      renderSheet();
    }

    els.spxProgress.textContent = updated ? ('Da cap nhat ' + updated + ' don') : 'Khong co thay doi';
    setTimeout(() => { els.spxProgress.textContent = ''; }, 4000);
  } catch (error) {
    els.spxProgress.textContent = '';
    showErr('Loi: ' + error.message);
  } finally {
    setButtonLoading(els.refreshButton, 'Dang cap nhat...', 'Lam moi don hang', false);
  }
}
function toggleSpx() {
  els.spxOverlay.classList.toggle('active');
}

async function lookupSpx() {
  const trackings = els.spxInput.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (!trackings.length) {
    showErr('Ban chua nhap ma SPX');
    return;
  }

  els.spxResult.innerHTML = '<div style="text-align:center;color:var(--text3);padding:14px">Dang tra ' + trackings.length + ' ma...</div>';
  try {
    const data = await apiRequest('/api/spx', { method: 'POST', body: { trackings: trackings.slice(0, 50) } });
    const results = data.results || [];
    if (!results.length) {
      els.spxResult.innerHTML = '<div style="text-align:center;color:var(--text3);padding:14px">Khong co ket qua</div>';
      return;
    }

    els.spxResult.innerHTML = results.map((item) => {
      const timeline = (item.records || item.timeline || []).slice().reverse();
      const latest = item.latest || timeline[0] || null;
      return `
        <div class="spx-item">
          <div class="spx-head"><span class="spx-tn">${escapeHtml(item.tracking || '')}</span><span class="spx-carrier">${escapeHtml(item.carrier || '')}</span></div>
          ${item.sls_tn ? `<div class="spx-sls">Tracking: ${escapeHtml(item.sls_tn)}</div>` : ''}
          ${item.receiverName ? `<div class="spx-receiver">${escapeHtml(item.receiverName)}</div>` : ''}
          <div class="spx-st ${statusClass(item.status || item.error)}">${escapeHtml(item.status || item.error || '?')}</div>
          ${latest ? `<div style="padding:6px 8px;background:rgba(124,92,252,.06);border-radius:6px;margin:6px 0"><div style="font-size:9px;color:var(--text3);font-weight:600">TRANG THAI MOI NHAT</div><div style="font-size:10px;font-weight:600;margin-top:2px">${escapeHtml((latest.emoji || '') + ' ' + (latest.desc || latest.description || ''))}</div>${latest.time ? `<div style="font-size:8px;color:var(--text3)">${escapeHtml(latest.time)}</div>` : ''}</div>` : ''}
          ${timeline.length ? `<div class="spx-timeline">${timeline.map((step) => `<div class="spx-step"><div class="spx-step-time">${escapeHtml(step.time || '')}</div><div class="spx-step-desc">${escapeHtml((step.emoji || '') + ' ' + (step.desc || step.description || ''))}</div></div>`).join('')}</div>` : ''}
        </div>`;
    }).join('');
  } catch (error) {
    els.spxResult.innerHTML = '<div style="color:var(--red)">' + escapeHtml(error.message) + '</div>';
  }
}

async function loadHistory() {
  els.historySection.classList.toggle('hidden');
  if (els.historySection.classList.contains('hidden')) return;

  els.historyList.innerHTML = '<div class="history-empty">Dang tai...</div>';
  try {
    const data = await apiRequest('/api/history?d=' + encodeURIComponent(state.deviceId));
    const items = data.history || [];
    if (!items.length) {
      els.historyList.innerHTML = '<div class="history-empty">Chua co</div>';
      return;
    }

    els.historyList.innerHTML = items.map((item) => {
      const shops = [...new Set((item.preview || []).map((preview) => preview.shopName).filter(Boolean))].slice(0, 3).join(', ');
      return `<div class="history-item"><div><span class="hi-time">${escapeHtml(item.time || '')}</span><br><span class="hi-info">${escapeHtml(String(item.totalOrders || 0))} don · ${escapeHtml(shops || 'Khong ro')}</span></div><button class="hi-btn" onclick="viewHistory(${item.id})">Xem</button></div>`;
    }).join('');
  } catch (error) {
    els.historyList.innerHTML = '<div class="history-empty">' + escapeHtml(error.message) + '</div>';
  }
}

async function viewHistory(id) {
  try {
    const data = await apiRequest('/api/history/' + id + '?d=' + encodeURIComponent(state.deviceId));
    renderOrders(data.orders || []);
    showSuccess('Da mo lich su ' + (data.time || id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showErr('Loi: ' + error.message);
  }
}

async function copyQRImage() {
  if (!els.qrImage.src) return;
  try {
    await navigator.clipboard.writeText(els.qrImage.src);
    showSuccess('Da copy du lieu QR');
  } catch {
    showErr('Khong copy duoc QR');
  }
}

function updateAutoCountdown() {
  const minutes = Math.floor(state.autoRemainingSeconds / 60);
  const seconds = state.autoRemainingSeconds % 60;
  els.autoCountdown.textContent = '⏱ ' + minutes + ':' + String(seconds).padStart(2, '0');
}

function startAutoCheck() {
  stopAutoCheck();
  localStorage.setItem(STORAGE_KEYS.autoCheck, '1');
  els.autoToggle.classList.add('on');
  els.autoLabel.textContent = 'Auto-check ON';
  state.autoRemainingSeconds = AUTO_CHECK_MS / 1000;
  updateAutoCountdown();

  state.autoCountdownTimer = setInterval(() => {
    state.autoRemainingSeconds -= 1;
    if (state.autoRemainingSeconds <= 0) state.autoRemainingSeconds = AUTO_CHECK_MS / 1000;
    updateAutoCountdown();
  }, 1000);

  state.autoCheckTimer = setInterval(() => {
    state.autoRemainingSeconds = AUTO_CHECK_MS / 1000;
    refreshOrders();
  }, AUTO_CHECK_MS);
}

function stopAutoCheck() {
  if (state.autoCheckTimer) clearInterval(state.autoCheckTimer);
  if (state.autoCountdownTimer) clearInterval(state.autoCountdownTimer);
  state.autoCheckTimer = null;
  state.autoCountdownTimer = null;
  localStorage.removeItem(STORAGE_KEYS.autoCheck);
  els.autoToggle.classList.remove('on');
  els.autoLabel.textContent = 'Auto-check 30p';
  els.autoCountdown.textContent = '';
}

function toggleAutoCheck() {
  if (state.autoCheckTimer) stopAutoCheck();
  else startAutoCheck();
}

function restoreUiState() {
  if (state.currentCookie) {
    const match = state.currentCookie.match(/SPC_ST=([^;]+)/);
    els.cookieInput.value = match ? match[1] : state.currentCookie;
  }
  if (state.currentOrders.length) {
    renderOrders(state.currentOrders);
  } else {
    renderSheet();
    renderStats([]);
  }
  switchView('card');
  if (localStorage.getItem(STORAGE_KEYS.autoCheck) === '1') startAutoCheck();
}

function bindEvents() {
  els.cookieInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') checkOrders();
  });
  els.loginInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loginAndCheck();
  });
}

function initPage() {
  bindEvents();
  restoreUiState();
}

window.copyText = copyText;
window.switchTab = switchTab;
window.switchView = switchView;
window.loadHistory = loadHistory;
window.toggleSpx = toggleSpx;
window.checkOrders = checkOrders;
window.loginAndCheck = loginAndCheck;
window.startQR = startQR;
window.copyQRImage = copyQRImage;
window.refreshOrders = refreshOrders;
window.toggleAutoCheck = toggleAutoCheck;
window.deleteSelectedRows = deleteSelectedRows;
window.lookupSpx = lookupSpx;
window.renderSheet = renderSheet;
window.toggleCheckAll = toggleCheckAll;
window.updateSelectedCount = updateSelectedCount;
window.updateTinhTrang = updateTinhTrang;
window.cancelOrder = cancelOrder;
window.viewHistory = viewHistory;

initPage();













