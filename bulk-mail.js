const API_BASE = '';
const BULK_EMAIL_INPUT_KEY = 'ts_bulk_email_input';

const state = {
  bulkInput: localStorage.getItem(BULK_EMAIL_INPUT_KEY) || '',
  bulkResults: [],
  activeToast: null,
  activeToastTimer: null,
};

const els = {
  toastContainer: document.getElementById('toast-container'),
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

function showToast(message, type = 'info', duration = 2600) {
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

function showError(message) { showToast(message, 'error', 3400); }
function showSuccess(message) { showToast(message, 'success', 2300); }
function showProgress(message) { showToast(message, 'progress', 1800); }

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
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      showError('Phien dang nhap da het han. Dang quay lai trang dang nhap...');
      window.setTimeout(redirectToLogin, 800);
    }
    if (response.status === 403) {
      throw new Error('API key otistx khong hop le hoac da het han.');
    }
    const message = data?.message || data?.error || ('HTTP ' + response.status);
    throw new Error(message);
  }

  return data;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
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

function syncBulkEntryCount() {
  const entries = parseBulkEntries(els.bulkInput.value || '');
  els.bulkEntryCount.textContent = entries.length + ' dong hop le';
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
  els.bulkResultSummary.textContent = successCount + ' thanh cong, ' + failCount + ' that bai';
  els.bulkResultsEmpty.classList.add('hidden');
  els.bulkResultsWrap.classList.remove('hidden');
  els.bulkResultsBody.innerHTML = state.bulkResults.map((item) => {
    const cookieId = item.cookieId || item.cookie || item.cookieFull || item.cookiePreview || '-';
    return `
      <tr>
        <td class="wrap">${escapeHtml(cookieId)}</td>
        <td class="wrap">${escapeHtml(item.email || '-')}</td>
        <td class="wrap">${item.status ? '<span class="bulk-status bulk-status-ok">Thanh cong</span>' : '<span class="bulk-status bulk-status-fail">That bai</span>'}</td>
        <td class="wrap">${escapeHtml(item.message || '-')}</td>
        <td class="wrap">${escapeHtml(item.proxy || '-')}</td>
      </tr>`;
  }).join('');
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
    showSuccess('Da tai file bulk mail.');
  };
  reader.readAsText(file);
}

function clearBulkInput() {
  els.bulkInput.value = '';
  persistBulkInput();
  showSuccess('Da xoa du lieu them mail.');
}

async function submitBulkEmailAdd() {
  persistBulkInput();
  const entries = parseBulkEntries(state.bulkInput);
  if (!entries.length) {
    showError('Ban chua nhap du lieu bulk mail hop le.');
    els.bulkInput.focus();
    return;
  }

  const previousText = els.bulkSubmitButton.textContent;
  els.bulkSubmitButton.disabled = true;
  els.bulkSubmitButton.textContent = 'Dang gui...';
  showProgress('Dang gui yeu cau them mail hang loat...');

  try {
    const data = await otistxRequest('/api/email-additions/bulk', {
      method: 'POST',
      body: { entries }
    });
    state.bulkResults = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
    renderBulkResults();
    if (!state.bulkResults.length) {
      showSuccess('Da gui yeu cau nhung API khong tra danh sach ket qua.');
      return;
    }
    const successCount = state.bulkResults.filter((item) => item.status).length;
    const failCount = state.bulkResults.length - successCount;
    showSuccess('Da xu ly ' + state.bulkResults.length + ' dong: ' + successCount + ' thanh cong, ' + failCount + ' that bai.');
  } catch (error) {
    showError(error.message || 'Khong the them mail hang loat.');
  } finally {
    els.bulkSubmitButton.disabled = false;
    els.bulkSubmitButton.textContent = 'Bat dau them mail';
  }
}

function bindEvents() {
  els.bulkInput.addEventListener('input', persistBulkInput);
  els.bulkUploadButton.addEventListener('click', () => els.bulkFileInput.click());
  els.bulkFileInput.addEventListener('change', handleBulkFileUpload);
  els.bulkClearButton.addEventListener('click', clearBulkInput);
  els.bulkSubmitButton.addEventListener('click', submitBulkEmailAdd);
}

function hydrate() {
  els.bulkInput.value = state.bulkInput;
  syncBulkEntryCount();
  renderBulkResults();
}

bindEvents();
hydrate();
