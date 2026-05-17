// ClassVault — Dashboard Application Logic
(function () {
  const API = '/api';
  let state = { user: null, sessions: [], activeSession: null, searchQuery: '' };

  function getToken() { return localStorage.getItem('cv_token'); }
  function getUser() { try { return JSON.parse(localStorage.getItem('cv_user')); } catch { return null; } }

  function logout() {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_user');
    window.location.href = 'index.html';
  }

  async function apiFetch(url, opts = {}) {
    const token = getToken();
    const headers = { ...(opts.headers || {}), 'Authorization': `Bearer ${token}` };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API}${url}`, { ...opts, headers });
    if (res.status === 401) { logout(); return null; }
    return res;
  }

  // ---- Init ----
  function init() {
    const token = getToken();
    if (!token) { window.location.href = 'index.html'; return; }
    state.user = getUser();
    if (!state.user) { logout(); return; }
    setupNav();
    loadSessions();
    document.getElementById('searchInput').addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase();
      renderSessions();
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }

  function setupNav() {
    const badge = document.getElementById('roleBadge');
    badge.textContent = state.user.role === 'moderator' ? 'Moderator' : 'User';
    badge.className = `role-badge ${state.user.role}`;
    document.getElementById('userGreeting').textContent = state.user.username;
  }

  // ---- Sessions ----
  async function loadSessions() {
    const res = await apiFetch('/sessions');
    if (!res) return;
    const data = await res.json();
    state.sessions = data.sessions;
    const totalFiles = state.sessions.reduce((sum, s) => sum + s.file_count, 0);
    document.getElementById('statFiles').textContent = totalFiles;
    renderSessions();
  }

  const AVATAR_COLORS = [
    ['#3b82f6','#1d4ed8'],['#8b5cf6','#6d28d9'],['#06b6d4','#0891b2'],
    ['#f59e0b','#d97706'],['#ef4444','#dc2626'],['#10b981','#059669'],['#ec4899','#db2777']
  ];

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024; const sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getFileIcon(type) {
    const icons = {
      pdf: { color: '#ef4444', label: 'PDF' },
      doc: { color: '#3b82f6', label: 'DOC' }, docx: { color: '#3b82f6', label: 'DOCX' },
      ppt: { color: '#f97316', label: 'PPT' }, pptx: { color: '#f97316', label: 'PPTX' },
      xls: { color: '#10b981', label: 'XLS' }, xlsx: { color: '#10b981', label: 'XLSX' },
      zip: { color: '#f59e0b', label: 'ZIP' }, rar: { color: '#f59e0b', label: 'RAR' },
      png: { color: '#8b5cf6', label: 'PNG' }, jpg: { color: '#8b5cf6', label: 'JPG' },
      mp4: { color: '#ec4899', label: 'MP4' }, txt: { color: '#6b7280', label: 'TXT' },
    };
    return icons[type] || { color: '#6b7280', label: (type || 'FILE').toUpperCase() };
  }

  function renderSessions() {
    const grid = document.getElementById('sessionGrid');
    const noRes = document.getElementById('noResults');
    const filtered = state.sessions.filter(s =>
      s.title.toLowerCase().includes(state.searchQuery) ||
      s.speaker_name.toLowerCase().includes(state.searchQuery)
    );

    if (filtered.length === 0) {
      grid.innerHTML = '';
      noRes.classList.remove('hidden');
      return;
    }
    noRes.classList.add('hidden');

    grid.innerHTML = filtered.map((s, i) => {
      const colors = AVATAR_COLORS[s.session_number - 1] || AVATAR_COLORS[0];
      const initials = getInitials(s.speaker_name);
      return `
        <div class="session-card" onclick="window._openSession(${s.id})" style="animation-delay:${i * 0.08}s">
          <div class="card-header">
            <span class="session-number">Session ${s.session_number}</span>
            <span class="session-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(s.date)}
            </span>
          </div>
          <h3 class="card-title">${s.title}</h3>
          <div class="card-speaker">
            <div class="speaker-avatar-sm" style="background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})">${initials}</div>
            <div class="speaker-info-sm">
              <span class="speaker-name-sm">${s.speaker_name}</span>
              <span class="speaker-role-sm">${s.speaker_role || ''}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="file-count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              ${s.file_count} file${s.file_count !== 1 ? 's' : ''}
            </span>
            <span class="view-link">View Details →</span>
          </div>
        </div>`;
    }).join('');
  }

  // ---- Session Detail ----
  window._openSession = async function(id) {
    const res = await apiFetch(`/sessions/${id}`);
    if (!res) return;
    const data = await res.json();
    state.activeSession = data;
    renderDetail(data);
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('sessionDetailView').classList.remove('hidden');
    window.scrollTo(0, 0);
  };

  function goHome() {
    document.getElementById('sessionDetailView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    state.activeSession = null;
    loadSessions();
  }

  function renderDetail(data) {
    const s = data.session;
    const files = data.files;
    const colors = AVATAR_COLORS[s.session_number - 1] || AVATAR_COLORS[0];
    const initials = getInitials(s.speaker_name);
    const isMod = state.user.role === 'moderator';

    const container = document.getElementById('sessionDetailView');
    container.innerHTML = `
      <div class="detail-wrapper">
        <button class="btn-back" onclick="window._goHome()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Sessions
        </button>
        <div class="detail-header">
          <div class="detail-meta">
            <span class="session-number">Session ${s.session_number}</span>
            <span class="session-date"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDate(s.date)}</span>
          </div>
          <h1 class="detail-title">${s.title}</h1>
          <p class="detail-desc">${s.description || ''}</p>
        </div>
        <div class="detail-speaker-card">
          <div class="speaker-avatar-lg" style="background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})">${initials}</div>
          <div class="speaker-details">
            <h3>${s.speaker_name}</h3>
            <p class="speaker-role-lg">${s.speaker_role || ''}</p>
            <p class="speaker-bio">${s.speaker_bio || ''}</p>
          </div>
        </div>
        ${isMod ? `
        <div class="upload-section">
          <h3>Upload Files</h3>
          <div class="upload-zone" id="uploadZone">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p>Drag & drop files here or <label for="fileInput" class="upload-label">browse</label></p>
            <span class="upload-hint">Max 50MB per file</span>
            <input type="file" id="fileInput" multiple hidden>
          </div>
          <div id="uploadProgress" class="hidden"></div>
        </div>` : ''}
        <div class="files-section">
          <h3>Files <span class="file-total">(${files.length})</span></h3>
          <div class="file-list" id="fileList">
            ${files.length === 0 ? '<p class="no-files">No files uploaded yet.</p>' : files.map(f => renderFileItem(f, isMod)).join('')}
          </div>
        </div>
      </div>`;

    if (isMod) setupUpload(s.id);
  }

  function renderFileItem(f, isMod) {
    const icon = getFileIcon(f.file_type);
    return `
      <div class="file-item" id="file-${f.id}">
        <div class="file-icon" style="background:${icon.color}15;color:${icon.color}">${icon.label}</div>
        <div class="file-info">
          <span class="file-name">${f.original_name}</span>
          <span class="file-meta">${formatSize(f.file_size)} · Uploaded by ${f.uploader_name}</span>
        </div>
        <div class="file-actions">
          <button class="btn-download" onclick="window._downloadFile(${f.id})" title="Download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          ${isMod ? `<button class="btn-delete" onclick="window._deleteFile(${f.id})" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>` : ''}
        </div>
      </div>`;
  }

  // ---- Upload ----
  function setupUpload(sessionId) {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');
    if (!zone || !input) return;

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) uploadFiles(sessionId, e.dataTransfer.files);
    });
    input.addEventListener('change', () => {
      if (input.files.length) uploadFiles(sessionId, input.files);
    });
  }

  async function uploadFiles(sessionId, fileList) {
    const form = new FormData();
    for (const f of fileList) form.append('files', f);

    const prog = document.getElementById('uploadProgress');
    prog.classList.remove('hidden');
    prog.innerHTML = '<div class="upload-bar"><div class="upload-fill"></div></div><span>Uploading...</span>';

    try {
      const res = await apiFetch(`/sessions/${sessionId}/files`, { method: 'POST', body: form });
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.files.length} file(s) uploaded successfully`, 'success');
        window._openSession(sessionId);
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      prog.classList.add('hidden');
    }
  }

  // ---- Download & Delete ----
  window._downloadFile = function(id) {
    const token = getToken();
    fetch(`${API}/files/${id}/download`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileEl = document.querySelector(`#file-${id} .file-name`);
        link.download = fileEl ? fileEl.textContent : 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Download failed', 'error'));
  };

  window._deleteFile = async function(id) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await apiFetch(`/files/${id}`, { method: 'DELETE' });
      if (!res) return;
      if (res.ok) {
        showToast('File deleted', 'success');
        const el = document.getElementById(`file-${id}`);
        if (el) el.remove();
        loadSessions();
      } else {
        const data = await res.json();
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  window._goHome = goHome;

  // ---- Toast ----
  function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ---- Start ----
  init();
})();
