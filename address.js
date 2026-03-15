const API_BASE = '';

const state = {
  addresses: [],
  selectedIds: [],
  lastViewSpcSt: '',
  lastViewProxy: '',
  activeToast: null,
  activeToastTimer: null
};

const els = {
  toastContainer: document.getElementById('toast-container'),
  viewSpcSt: document.getElementById('address-view-spcst'),
  viewProxy: document.getElementById('address-view-proxy'),
  loadButton: document.getElementById('address-load-btn'),
  selectAllButton: document.getElementById('address-select-all-btn'),
  deleteButton: document.getElementById('address-delete-btn'),
  clearViewButton: document.getElementById('address-clear-view-btn'),
  viewResult: document.getElementById('address-view-result'),
  list: document.getElementById('address-list'),
  addSpcSt: document.getElementById('address-add-spcst'),
  addProxy: document.getElementById('address-add-proxy'),
  addName: document.getElementById('address-add-name'),
  addPhoneAccount: document.getElementById('address-add-phone-account'),
  addPhoneCall: document.getElementById('address-add-phone-call'),
  addFull: document.getElementById('address-add-full'),
  addButton: document.getElementById('address-add-btn'),
  clearAddButton: document.getElementById('address-clear-add-btn'),
  addResult: document.getElementById('address-add-result')
};

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = '/login.html?next=' + next;
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
  showToast(message, 'success', 2300);
}

function showProgress(message) {
  showToast(message, 'progress', 1800);
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
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      showError('Phiên đăng nhập đã hết hạn. Đang quay lại trang đăng nhập...');
      window.setTimeout(redirectToLogin, 800);
    }
    throw new Error(data?.message || data?.error || ('HTTP ' + response.status));
  }

  return data || {};
}

function setResult(node, message, type) {
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('hidden', !message);
  node.classList.remove('is-success', 'is-error');
  if (message && type === 'success') node.classList.add('is-success');
  if (message && type === 'error') node.classList.add('is-error');
}

function clearViewInputs() {
  els.viewSpcSt.value = '';
  els.viewProxy.value = '';
}

function clearAddInputs() {
  els.addSpcSt.value = '';
  els.addProxy.value = '';
  els.addName.value = '';
  els.addPhoneAccount.value = '';
  els.addPhoneCall.value = '';
  els.addFull.value = '';
}

function renderAddressList() {
  const removable = state.addresses.filter((item) => !item.isDefault);
  const defaultCount = state.addresses.length - removable.length;

  if (!state.addresses.length) {
    els.list.innerHTML = '<div class="address-empty">Chưa có danh sách địa chỉ.</div>';
    els.selectAllButton.disabled = true;
    els.deleteButton.disabled = true;
    return;
  }

  els.selectAllButton.disabled = !removable.length;
  els.deleteButton.disabled = !state.selectedIds.length;

  const summary = `
    <div class="address-item">
      <div class="address-item-top">
        <span class="address-name">Tổng ${state.addresses.length} địa chỉ</span>
        <span class="address-badge">${defaultCount} mặc định</span>
      </div>
      <div class="address-meta">${removable.length} địa chỉ có thể xóa, ${state.selectedIds.length} địa chỉ đang chọn.</div>
    </div>
  `;

  els.list.innerHTML = summary + state.addresses.map((item) => {
    const selected = state.selectedIds.includes(item.id);
    const canDelete = !item.isDefault;
    return `
      <div class="address-item ${selected ? 'is-selected' : ''}" data-address-id="${item.id}">
        <div class="address-item-top">
          <span class="address-name">${escapeHtml(item.name || 'Không rõ tên')}</span>
          <span class="address-badge ${canDelete ? 'danger' : 'warn'}">${canDelete ? 'Có thể xóa' : 'Mặc định'}</span>
        </div>
        <div class="address-phone">${escapeHtml(item.phone || '-')}</div>
        <div class="address-full">${escapeHtml(item.fullAddress || '-')}</div>
        <div class="address-meta">
          ${canDelete ? '<label><input type="checkbox" class="address-checkbox"' + (selected ? ' checked' : '') + '> Chọn để xóa</label>' : 'Địa chỉ mặc định không thể xóa.'}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function toggleSelected(id) {
  if (!id) return;
  const address = state.addresses.find((item) => item.id === id);
  if (!address || address.isDefault) return;
  if (state.selectedIds.includes(id)) {
    state.selectedIds = state.selectedIds.filter((item) => item !== id);
  } else {
    state.selectedIds = state.selectedIds.concat(id);
  }
  renderAddressList();
}

function toggleSelectAll() {
  const removableIds = state.addresses.filter((item) => !item.isDefault).map((item) => item.id);
  if (!removableIds.length) return;
  state.selectedIds = state.selectedIds.length === removableIds.length ? [] : removableIds;
  renderAddressList();
}

async function loadAddresses() {
  const spcSt = (els.viewSpcSt.value || '').trim();
  const proxy = (els.viewProxy.value || '').trim();

  if (!spcSt) {
    showError('Bạn chưa nhập cookie SPC_ST.');
    els.viewSpcSt.focus();
    return;
  }

  els.loadButton.disabled = true;
  els.loadButton.textContent = 'Đang tải...';
  showProgress('Đang lấy danh sách địa chỉ...');
  setResult(els.viewResult, '', '');

  try {
    const data = await apiRequest('/api/shopee/addresses/view', {
      method: 'POST',
      body: {
        spcSt,
        proxy: proxy || undefined
      }
    });

    if (!data.success) {
      throw new Error(data.message || 'Không thể lấy danh sách địa chỉ.');
    }

    state.addresses = Array.isArray(data.addresses) ? data.addresses : [];
    state.selectedIds = [];
    state.lastViewSpcSt = spcSt;
    state.lastViewProxy = proxy;
    renderAddressList();
    setResult(els.viewResult, 'Đã tải ' + (data.totalCount || state.addresses.length) + ' địa chỉ.', 'success');
    showSuccess('Đã tải danh sách địa chỉ.');
    clearViewInputs();
  } catch (error) {
    setResult(els.viewResult, error.message || 'Không thể lấy danh sách địa chỉ.', 'error');
    showError(error.message || 'Không thể lấy danh sách địa chỉ.');
  } finally {
    els.loadButton.disabled = false;
    els.loadButton.textContent = 'Xem địa chỉ';
  }
}

async function deleteSelectedAddresses() {
  const spcSt = (els.viewSpcSt.value || '').trim() || state.lastViewSpcSt;
  const proxy = (els.viewProxy.value || '').trim() || state.lastViewProxy;

  if (!spcSt) {
    showError('Bạn cần nhập lại cookie SPC_ST để xóa địa chỉ.');
    els.viewSpcSt.focus();
    return;
  }
  if (!state.selectedIds.length) {
    showError('Bạn chưa chọn địa chỉ để xóa.');
    return;
  }

  els.deleteButton.disabled = true;
  els.deleteButton.textContent = 'Đang xóa...';
  showProgress('Đang xóa địa chỉ đã chọn...');
  setResult(els.viewResult, '', '');

  try {
    const data = await apiRequest('/api/shopee/address-processing', {
      method: 'POST',
      body: {
        spcSt,
        addressIds: state.selectedIds.slice(),
        proxy: proxy || undefined
      }
    });

    if (!data.success) {
      throw new Error(data.message || 'Không thể xóa địa chỉ.');
    }

    const removedIds = new Set(state.selectedIds);
    state.addresses = state.addresses.filter((item) => !removedIds.has(item.id));
    state.selectedIds = [];
    renderAddressList();
    setResult(
      els.viewResult,
      'Đã xóa ' + (data.deletedCount || 0) + ' địa chỉ' + (data.serviceCost ? '. Phí: ' + data.serviceCost : '') + '.',
      'success'
    );
    showSuccess('Đã xóa địa chỉ đã chọn.');
    clearViewInputs();
  } catch (error) {
    setResult(els.viewResult, error.message || 'Không thể xóa địa chỉ.', 'error');
    showError(error.message || 'Không thể xóa địa chỉ.');
  } finally {
    els.deleteButton.disabled = false;
    els.deleteButton.textContent = 'Xóa địa chỉ đã chọn';
  }
}

async function addAddress() {
  const spcSt = (els.addSpcSt.value || '').trim();
  const address = (els.addFull.value || '').trim();

  if (!spcSt) {
    showError('Bạn chưa nhập cookie SPC_ST.');
    els.addSpcSt.focus();
    return;
  }
  if (!address) {
    showError('Bạn chưa nhập địa chỉ đầy đủ.');
    els.addFull.focus();
    return;
  }

  els.addButton.disabled = true;
  els.addButton.textContent = 'Đang thêm...';
  showProgress('Đang thêm địa chỉ mới...');
  setResult(els.addResult, '', '');

  try {
    const data = await apiRequest('/api/shopee/address/add', {
      method: 'POST',
      body: {
        spcSt,
        name: (els.addName.value || '').trim(),
        phoneAccount: (els.addPhoneAccount.value || '').trim(),
        phoneCall: (els.addPhoneCall.value || '').trim(),
        address,
        proxy: (els.addProxy.value || '').trim() || undefined
      }
    });

    if (!data.success) {
      throw new Error(data.message || 'Không thể thêm địa chỉ.');
    }

    const parsed = data.parsedData || {};
    const detail = parsed.detailedAddress || [parsed.ward, parsed.district, parsed.city].filter(Boolean).join(', ');
    setResult(
      els.addResult,
      'Đã thêm địa chỉ thành công' + (detail ? ': ' + detail : '.') ,
      'success'
    );
    showSuccess('Đã thêm địa chỉ mới.');
    clearAddInputs();
  } catch (error) {
    setResult(els.addResult, error.message || 'Không thể thêm địa chỉ.', 'error');
    showError(error.message || 'Không thể thêm địa chỉ.');
  } finally {
    els.addButton.disabled = false;
    els.addButton.textContent = 'Thêm địa chỉ';
  }
}

function clearViewForm() {
  clearViewInputs();
  state.lastViewSpcSt = '';
  state.lastViewProxy = '';
  setResult(els.viewResult, '', '');
}

function clearAddForm() {
  clearAddInputs();
  setResult(els.addResult, '', '');
}

function bindEvents() {
  els.loadButton.addEventListener('click', loadAddresses);
  els.selectAllButton.addEventListener('click', toggleSelectAll);
  els.deleteButton.addEventListener('click', deleteSelectedAddresses);
  els.clearViewButton.addEventListener('click', clearViewForm);
  els.addButton.addEventListener('click', addAddress);
  els.clearAddButton.addEventListener('click', clearAddForm);

  els.viewSpcSt.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') loadAddresses();
  });
  els.addFull.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') addAddress();
  });

  els.list.addEventListener('click', (event) => {
    const item = event.target.closest('[data-address-id]');
    if (!item) return;
    const id = item.getAttribute('data-address-id');
    toggleSelected(id);
  });
}

bindEvents();
renderAddressList();
