const DEFAULT_REGEX = 'https://vn.shp.ee/dlink/[a-zA-Z0-9]+';
const DEFAULT_LINK_REGEX = /https:\/\/vn\.shp\.ee\/dlink\/[a-zA-Z0-9]+/g;

const state = {
  allLinks: new Set(),
  freshLinks: new Set(),
  openedLinks: new Set(),
  activeToast: null,
  activeToastTimer: null,
};

const els = {
  mailList: document.getElementById('mail-list'),
  regexInput: document.getElementById('mail-regex'),
  processButton: document.getElementById('mail-process-btn'),
  openAllButton: document.getElementById('mail-open-all-btn'),
  status: document.getElementById('mail-status'),
  totalAccounts: document.getElementById('mail-total-accounts'),
  totalLinks: document.getElementById('mail-total-links'),
  totalFreshLinks: document.getElementById('mail-total-fresh-links'),
  linksEmpty: document.getElementById('mail-links-empty'),
  linksList: document.getElementById('mail-links-list'),
  results: document.getElementById('mail-results'),
  toastContainer: document.getElementById('toast-container'),
};

function clearToast() {
  if (state.activeToastTimer) {
    clearTimeout(state.activeToastTimer);
    state.activeToastTimer = null;
  }
  if (state.activeToast) {
    state.activeToast.remove();
    state.activeToast = null;
  }
}

function showToast(message, type = 'info', duration = 2800) {
  if (!els.toastContainer) return;
  clearToast();
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  state.activeToast = toast;
  state.activeToastTimer = window.setTimeout(() => {
    if (state.activeToast === toast) {
      toast.remove();
      state.activeToast = null;
      state.activeToastTimer = null;
    }
  }, duration);
}

function showError(message) { showToast(message, 'error', 3600); }
function showInfo(message) { showToast(message, 'info', 2400); }
function showSuccess(message) { showToast(message, 'success', 2400); }
function showProgress(message) { showToast(message, 'progress', 2200); }

function setBusy(isBusy) {
  els.processButton.disabled = isBusy;
  els.openAllButton.disabled = isBusy;
  els.status.textContent = isBusy ? 'Đang xử lý...' : '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeRegex() {
  const value = els.regexInput.value.trim();
  if (!value) {
    els.regexInput.value = DEFAULT_REGEX;
    return DEFAULT_REGEX;
  }
  return value;
}

function resetView() {
  state.allLinks.clear();
  state.freshLinks.clear();
  els.results.innerHTML = '';
  els.linksList.innerHTML = '';
  els.linksEmpty.style.display = 'block';
  els.totalLinks.textContent = '0';
  els.totalFreshLinks.textContent = '0';
}

function addDiscoveredLinks(links) {
  links.forEach((link) => {
    if (!state.allLinks.has(link)) {
      state.allLinks.add(link);
      if (!state.openedLinks.has(link)) {
        state.freshLinks.add(link);
      }
    }
  });
}

function updateLinkList() {
  const links = Array.from(state.allLinks).sort();
  els.totalLinks.textContent = String(links.length);
  els.totalFreshLinks.textContent = String(state.freshLinks.size);
  els.linksList.innerHTML = '';
  els.linksEmpty.style.display = links.length ? 'none' : 'block';

  links.forEach((link, index) => {
    const isFresh = state.freshLinks.has(link);
    const item = document.createElement('div');
    item.className = 'mail-link-item' + (isFresh ? ' mail-link-item-fresh' : '');
    item.innerHTML = '<span class="mail-link-index">' + (index + 1) + '</span>'
      + '<div class="mail-link-body"><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(link) + '</a>'
      + '<span class="mail-link-flag">' + (isFresh ? 'Mới' : 'Đã mở') + '</span></div>';
    els.linksList.appendChild(item);
  });
}

function collectLinksFromText(text, regexPattern) {
  const found = [];
  const seen = new Set();

  const hrefRegex = /href=["']([^"']+)["']/g;
  let hrefMatch;
  while ((hrefMatch = hrefRegex.exec(text)) !== null) {
    const url = hrefMatch[1];
    if (!seen.has(url) && /shp\.ee\/dlink/i.test(url)) {
      seen.add(url);
      found.push(url);
    }
  }

  try {
    const customRegex = new RegExp(regexPattern, 'g');
    let match;
    while ((match = customRegex.exec(text)) !== null) {
      if (!seen.has(match[0])) {
        seen.add(match[0]);
        found.push(match[0]);
      }
    }
  } catch (error) {
    showError('Regex không hợp lệ: ' + error.message);
  }

  return found;
}

function deepSearchLinks(value, output = []) {
  if (!value) return output;
  if (typeof value === 'string') {
    const matches = value.match(DEFAULT_LINK_REGEX) || [];
    matches.forEach((match) => output.push(match));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => deepSearchLinks(item, output));
    return output;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => deepSearchLinks(item, output));
  }
  return output;
}

function appendResult(email, error, content, rawResponse, links) {
  const item = document.createElement('div');
  item.className = 'mail-result-card';

  const header = document.createElement('div');
  header.className = 'mail-result-head';
  header.innerHTML = '<strong>' + escapeHtml(email || 'Dòng lỗi') + '</strong>'
    + '<span class="mail-result-badge ' + (error ? 'mail-result-error' : 'mail-result-success') + '">'
    + (error ? 'Lỗi' : 'Thành công') + '</span>';
  item.appendChild(header);

  if (error) {
    const errorBox = document.createElement('div');
    errorBox.className = 'mail-error-box';
    errorBox.textContent = error;
    item.appendChild(errorBox);
  } else {
    if (links && links.length) {
      const linkWrap = document.createElement('div');
      linkWrap.className = 'mail-inline-links';
      linkWrap.innerHTML = links.map((link) => '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(link) + '</a>').join('');
      item.appendChild(linkWrap);
    }

    const contentBox = document.createElement('pre');
    contentBox.className = 'mail-content-box';
    contentBox.textContent = content;
    item.appendChild(contentBox);
  }

  if (rawResponse) {
    const details = document.createElement('details');
    details.className = 'mail-raw-box';
    details.innerHTML = '<summary>Phản hồi gốc</summary><pre>' + escapeHtml(rawResponse) + '</pre>';
    item.appendChild(details);
  }

  els.results.appendChild(item);
}

async function getMessages(email, refreshToken, clientId, apiType) {
  const path = apiType === 'graph' ? '/mail-api/graph_messages' : '/mail-api/get_messages_oauth2';
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw { message: 'Lỗi phân tích JSON: ' + error.message, rawResponse: responseText };
  }

  if (
    (data.status === false || data.success === false) &&
    (data.code === '' || typeof data.code === 'undefined') &&
    (data.messages === null || typeof data.messages === 'undefined') &&
    (data.content === '' || typeof data.content === 'undefined')
  ) {
    throw { message: 'Đọc thất bại, thử đổi kiểu API.', rawResponse: responseText };
  }

  if (!response.ok || data.success === false) {
    throw {
      message: (data && data.message) ? data.message : ('Lỗi API (mã ' + response.status + ')'),
      rawResponse: responseText,
    };
  }

  return {
    result: typeof data.data === 'object' ? JSON.stringify(data.data, null, 2) : String(data.data || ''),
    rawResponse: responseText,
  };
}

async function processEmails() {
  const raw = els.mailList.value.trim();
  const regexPattern = normalizeRegex();
  const apiType = document.querySelector('input[name="mail-api-type"]:checked').value;

  resetView();

  if (!raw) {
    showError('Bạn chưa nhập danh sách tài khoản.');
    return;
  }

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  els.totalAccounts.textContent = String(lines.length);
  setBusy(true);
  showProgress('Đang gửi yêu cầu đọc mail...');

  let successCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const parts = line.split('|');
    if (parts.length < 4) {
      appendResult(line, 'Sai định dạng. Cần email|pass|refresh_token|client_id.', '', null, []);
      continue;
    }

    const [email, _pass, refreshToken, clientId] = parts;
    els.status.textContent = 'Đang xử lý ' + (index + 1) + '/' + lines.length + ': ' + email;

    try {
      const { result, rawResponse } = await getMessages(email, refreshToken, clientId, apiType);
      const links = collectLinksFromText(rawResponse, regexPattern);
      try {
        const parsed = JSON.parse(result);
        deepSearchLinks(parsed).forEach((link) => links.push(link));
      } catch (_error) {
      }

      const uniqueLinks = Array.from(new Set(links));
      addDiscoveredLinks(uniqueLinks);
      appendResult(email, '', result, rawResponse, uniqueLinks);
      successCount += 1;
      updateLinkList();
    } catch (error) {
      appendResult(email, error.message || 'Có lỗi khi đọc mail.', '', error.rawResponse || null, []);
    }
  }

  setBusy(false);
  els.status.textContent = successCount + '/' + lines.length + ' tài khoản xử lý xong.';
  if (successCount > 0) {
    showSuccess('Đã xử lý xong danh sách mail.');
  } else {
    showInfo('Không có tài khoản nào đọc thành công.');
  }
}

function openAllLinks() {
  const links = Array.from(state.freshLinks);
  if (!links.length) {
    showInfo('Không có link mới để mở.');
    return;
  }
  if (links.length > 5 && !window.confirm('Bạn sắp mở ' + links.length + ' tab mới. Tiếp tục?')) {
    return;
  }
  links.forEach((link, index) => {
    window.setTimeout(() => {
      window.open(link, '_blank', 'noopener');
      state.openedLinks.add(link);
      state.freshLinks.delete(link);
      updateLinkList();
    }, index * 140);
  });
  showSuccess('Đang mở ' + links.length + ' link mới.');
}

els.processButton.addEventListener('click', processEmails);
els.openAllButton.addEventListener('click', openAllLinks);
els.regexInput.value = DEFAULT_REGEX;
updateLinkList();
