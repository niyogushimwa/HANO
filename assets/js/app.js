/* HANO - Progressive Web App logic
   Works in two modes:
   1) "server" - PHP/MySQL API (shared data, real accounts, real uploads)
   2) "demo"   - localStorage fallback when the API/database is not available
   The UI and API operations are identical in both modes. */

import { dictionary } from './i18n.js';
import { demoApi, reset as resetDemo } from './demo.js';

const API = 'api/api.php';
const USER_KEY = 'hano_user';
const LANG_KEY = 'hano_lang';

const app = document.querySelector('#app');
const topbar = document.querySelector('#topbar');
const bottomnav = document.querySelector('#bottomnav');
const toastEl = document.querySelector('#toast');
const modal = document.querySelector('#modal');

const CATS = ['waste', 'water', 'drainage', 'roads', 'streetlights', 'infrastructure', 'other'];
const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected'];
const STATUS_COLOR = {
  submitted: '#DB2227', under_review: '#B7791F', assigned: '#6B46C1',
  in_progress: '#A51B20', resolved: '#157A4A', rejected: '#7A1C1C',
};

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9S14.5 18.3 12 21c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.3"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 7.8-8 9-4.6-1.2-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
};

const state = {
  lang: localStorage.getItem(LANG_KEY) || 'en',
  user: readUser(),
  mode: 'demo',
  serverError: '',
  view: 'home',
  adminTab: 'dashboard',
  authTab: 'login',
  reports: [],
  notifications: [],
  departments: [],
  users: [],
  stats: null,
  filters: { category: 'all', status: 'all', q: '' },
  detail: null,
  photoData: null,
  photoFile: null,
  gps: null,
};

function readUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
}
function persistUser() {
  if (state.user) localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  else localStorage.removeItem(USER_KEY);
}
function t(key) {
  const d = dictionary(state.lang);
  return d[key] || dictionary('en')[key] || key;
}
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.style.background = isError ? '#C2413A' : '#10241F';
  toastEl.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* ------------------------------------------------------------------ API */

const WRITE_OPS = new Set([
  'auth:register', 'auth:login', 'auth:logout', 'reports:create',
  'report:update', 'report:comment', 'report:confirm',
  'notifications:read', 'users:update',
]);

async function api(action, op, params = {}, file = null) {
  if (state.mode === 'demo') {
    return demoApi(action, op, params, {
      get user() { return state.user; },
      setUser(u) { state.user = u; persistUser(); },
    });
  }

  const isWrite = WRITE_OPS.has(`${action}:${op}`);
  let options;
  if (isWrite && file) {
    const fd = new FormData();
    fd.append('action', action);
    fd.append('op', op);
    Object.entries(params).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
    fd.append('photo', file);
    options = { method: 'POST', body: fd, headers: { 'X-HANO': '1' } };
  } else if (isWrite) {
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, op, ...params }),
    };
  } else {
    const q = new URLSearchParams({ action, op });
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
    options = { method: 'GET' };
    var url = `${API}?${q.toString()}`;
  }

  let res;
  try {
    res = await fetch(url || API, { ...options, credentials: 'same-origin', headers: { ...(options.headers || {}), Accept: 'application/json' } });
  } catch (e) {
    throw new Error(state.lang === 'rw' ? 'Nta rubuga. Amakuru y’aho arakoreshwa.' : 'Cannot reach the server. Switching to local data.');
  }
  let data;
  try { data = await res.json(); } catch (e) { throw new Error('The server returned an invalid response.'); }
  if (!data.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

async function detectMode() {
  try {
    const res = await fetch(API, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (data && data.ok === true) {
      state.mode = 'server';
      state.user = data.user || null;
      persistUser();
      return;
    }
    if (data && data.ok === false && /database|import|config/i.test(data.error || '')) {
      state.serverError = data.error;
    }
  } catch (e) { /* use local demo data */ }
  state.mode = 'demo';
}

/* --------------------------------------------------------------- pieces */

function statusLabel(s) {
  const map = {
    submitted: 'submitted', under_review: 'underReview', assigned: 'assigned',
    in_progress: 'inProgress', resolved: 'resolved', rejected: 'rejected',
  };
  return t(map[s] || s);
}
function statusBadge(s) {
  return `<span class="badge ${esc(s)}">${esc(statusLabel(s))}</span>`;
}
function categoryLabel(c) { return t(c) || c; }
function dateLabel(d) {
  if (!d) return '';
  const s = String(d).replace(' ', 'T');
  const dt = new Date(s);
  if (isNaN(dt)) return String(d).slice(0, 10);
  return dt.toLocaleDateString(state.lang === 'rw' ? 'rw-RW' : 'en-GB', { day: 'numeric', month: 'short' });
}
function reportCard(r) {
  const confirmed = Number(r.resolved_confirmed) === 1;
  return `<article class="report-item" data-act="open-detail" data-id="${esc(r.id)}" tabindex="0" role="button">
    <div class="top">
      <h3>${esc(r.title)}</h3>${statusBadge(r.status)}
    </div>
    <p>${esc(r.description)}</p>
    <div class="report-meta">
      <span><i class="cat-dot" style="background:${STATUS_COLOR[r.status] || '#DB2227'}"></i>${esc(categoryLabel(r.category))}</span>
      <span>${icon('pin')} ${esc(r.location_name || '—')}</span>
      <span>${esc(r.id)}</span>
      <span>${dateLabel(r.created_at)}</span>
      ${confirmed ? `<span style="color:var(--green)">✓ ${esc(t('confirmed'))}</span>` : ''}
    </div>
  </article>`;
}
function emptyState(title, hint) {
  return `<div class="empty"><div class="emoji">📍</div><h3>${esc(title)}</h3><p class="small">${esc(hint)}</p></div>`;
}
function listHtml(reports, title, hint) {
  if (!reports || !reports.length) return emptyState(title, hint);
  return `<div class="list">${reports.map(reportCard).join('')}</div>`;
}
function errorHtml(message) {
  return `<div class="card"><h3>${esc(t('error'))}</h3><p class="muted small" style="margin-top:8px">${esc(message || '')}</p>
    <button class="btn btn-outline btn-sm" data-act="retry" style="margin-top:12px">${esc(t('home'))}</button></div>`;
}

function mapSvg(reports) {
  const pts = (reports || []).filter((r) => Number(r.latitude) && Number(r.longitude));
  const xOf = (lng) => 4 + ((Number(lng) - 28.9) / 1.95) * 92;
  const yOf = (lat) => 4 + ((-1.05 - Number(lat)) / 1.79) * 62;
  const pins = pts.map((r) => {
    const x = Math.min(96, Math.max(4, xOf(r.longitude)));
    const y = Math.min(66, Math.max(4, yOf(r.latitude)));
    return `<g class="map-pin" data-act="open-detail" data-id="${esc(r.id)}" role="button" tabindex="0">
      <title>${esc(r.title)}</title>
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.6" fill="${STATUS_COLOR[r.status] || '#DB2227'}" stroke="#fff" stroke-width="0.8"/>
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.8" fill="#fff"/>
    </g>`;
  }).join('');
  return `<div class="map-wrap">
    <svg class="map-svg" viewBox="0 0 100 70" preserveAspectRatio="none" aria-label="${esc(t('mapTitle'))}">
      <rect width="100" height="70" fill="#FCEEEE"/>
      <g stroke="#F0D3D4" stroke-width="0.35">
        <path d="M0 14H100M0 28H100M0 42H100M0 56H100M20 0V70M40 0V70M60 0V70M80 0V70"/>
      </g>
      <path d="M48 5 62 9 73 14 87 17 92 27 84 35 88 45 78 52 70 64 55 60 44 66 34 58 22 52 14 42 18 30 10 22 26 14 40 10Z"
            fill="#F6DADA" stroke="#E7B9BA" stroke-width="0.5"/>
      <path d="M14 42 22 52 34 58" fill="none" stroke="#B9CED6" stroke-width="1.2"/>
      ${pins}
    </svg>
    <span class="map-note">${esc(t('mapHint'))} · ${pts.length}</span>
  </div>`;
}

function renderTopbar() {
  const unread = state.notifications.filter((n) => !Number(n.is_read)).length;
  topbar.innerHTML = `
    <button class="brand" data-act="nav" data-view="home" aria-label="HANO home">
      <img src="assets/img/logo.png" alt="HANO logo" onerror="this.style.display='none'">
      <span><strong>HANO</strong><small>${esc(t('tagline'))}</small></span>
    </button>
    <span class="spacer"></span>
    <span class="mode-badge ${state.mode === 'demo' ? 'demo' : ''}">${esc(state.mode === 'demo' ? t('demo') : t('live'))}</span>
    <button class="icon-btn" data-act="lang" title="${esc(t('language'))}" aria-label="${esc(t('language'))}">${icon('globe')}</button>
    <button class="icon-btn" data-act="nav" data-view="notifications" aria-label="${esc(t('notifications'))}" style="position:relative">
      ${icon('bell')}
      ${unread ? `<span style="position:absolute;top:4px;right:4px;background:#C2413A;color:#fff;border-radius:99px;font-size:9px;padding:1px 5px;font-weight:800">${unread}</span>` : ''}
    </button>`;
}
function renderNav() {
  const items = [
    ['home', 'home', 'home'], ['explore', 'explore', 'explore'],
    ['report', 'plus', 'report'], ['notifications', 'bell', 'notifications'], ['profile', 'user', 'profile'],
  ];
  bottomnav.innerHTML = items.map(([view, ico, label]) => `
    <button class="${view === 'report' ? 'fab' : ''} ${state.view === view ? 'active' : ''}"
      data-act="nav" data-view="${view}" aria-label="${esc(t(label))}">
      ${icon(ico)}<span>${esc(t(label))}</span>
    </button>`).join('');
}

/* ---------------------------------------------------------------- views */

async function render() {
  renderTopbar();
  renderNav();
  app.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>${esc(t('loading'))}</p></div>`;
  try {
    let html;
    switch (state.view) {
      case 'explore': html = await viewExplore(); break;
      case 'report': html = await viewReport(); break;
      case 'notifications': html = await viewNotifications(); break;
      case 'profile': html = await viewProfile(); break;
      case 'admin': html = await viewAdmin(); break;
      case 'officer': html = await viewOfficer(); break;
      default: html = await viewHome();
    }
    app.innerHTML = html;
  } catch (e) {
    app.innerHTML = errorHtml(e.message);
  }
}
async function go(view) {
  state.view = view;
  closeModal();
  app.scrollTop = 0;
  await render();
}

async function viewHome() {
  state.reports = (await api('reports', 'list')).reports || [];
  if (state.user) {
    try { state.notifications = (await api('notifications', 'list')).notifications || []; } catch (e) { state.notifications = []; }
    const mine = state.reports.filter((r) => r.user_id === state.user.id);
    const count = (s) => mine.filter((r) => r.status === s).length;
    return `
      <div class="hero">
        <span class="eyebrow">HANO · ${esc(state.mode === 'demo' ? t('demo') : t('live'))}</span>
        <h1>${esc(t('hello'))}, ${esc(state.user.name.split(' ')[0])} 👋</h1>
        <p>${esc(t('trackIt'))}</p>
        <button class="btn btn-ghost btn-sm" data-act="nav" data-view="report" style="margin-top:14px;background:#fff;color:#A51B20">${icon('plus')} ${esc(t('quickReport'))}</button>
      </div>
      <div class="stat-grid">
        <div class="stat"><b>${mine.length}</b><span>${esc(t('myReports'))}</span></div>
        <div class="stat"><b>${count('submitted') + count('under_review')}</b><span>${esc(t('pending'))}</span></div>
        <div class="stat"><b>${count('assigned') + count('in_progress')}</b><span>${esc(t('inProgress'))}</span></div>
        <div class="stat"><b>${count('resolved')}</b><span>${esc(t('resolved'))}</span></div>
      </div>
      ${state.serverError ? `<div class="demo-note" style="margin-top:12px">${esc(state.serverError)} — ${esc(t('offline'))}</div>` : ''}
      <div class="section"><h2>${esc(t('recentActivity'))}</h2><button class="text-link" data-act="nav" data-view="explore">${esc(t('seeAll'))} →</button></div>
      ${listHtml(state.reports.slice(0, 5), t('noReports'), t('noReportsHint'))}`;
  }
  return `
    <div class="hero">
      <span class="eyebrow">${esc(t('tagline'))}</span>
      <h1>${esc(t('hello'))}! 👋</h1>
      <p>${esc(t('noReportsHint'))}</p>
      <div class="row" style="margin-top:16px">
        <button class="btn btn-ghost btn-sm" data-act="nav" data-view="profile" style="background:#fff;color:#A51B20">${esc(t('signIn'))}</button>
        <button class="btn btn-outline btn-sm" data-act="nav" data-view="report" style="border-color:#fff;color:#fff">${icon('plus')} ${esc(t('quickReport'))}</button>
      </div>
    </div>
    ${state.serverError ? `<div class="demo-note" style="margin-top:12px">${esc(state.serverError)} — ${esc(t('offline'))}</div>` : ''}
    <div class="section"><h2>${esc(t('category'))}</h2></div>
    <div class="stat-grid">
      ${CATS.slice(0, 6).map((c) => `<button class="stat" data-act="filter-cat" data-cat="${c}" style="text-align:left;cursor:pointer">
        <b style="font-size:22px">${esc(categoryLabel(c))}</b><span>${esc(t(c + 'Desc'))}</span></button>`).join('')}
    </div>
    <div class="section"><h2>${esc(t('recentActivity'))}</h2><button class="text-link" data-act="nav" data-view="explore">${esc(t('seeAll'))} →</button></div>
    ${listHtml(state.reports.slice(0, 5), t('noReports'), t('noReportsHint'))}`;
}

async function viewExplore() {
  const f = state.filters;
  state.reports = (await api('reports', 'list', f)).reports || [];
  const cats = ['all', ...CATS];
  const statuses = ['all', ...STATUSES];
  return `
    <div class="card">
      <div style="position:relative">
        <span style="position:absolute;left:12px;top:12px;color:var(--muted)">${icon('search')}</span>
        <input id="search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(f.q)}" style="padding-left:40px">
      </div>
      <div class="chip-row" style="margin-top:10px">
        ${cats.map((c) => `<button class="chip ${f.category === c ? 'active' : ''}" data-act="filter-cat" data-cat="${c}">${c === 'all' ? esc(t('all')) : esc(categoryLabel(c))}</button>`).join('')}
      </div>
      <div class="chip-row">
        ${statuses.map((s) => `<button class="chip ${f.status === s ? 'active' : ''}" data-act="filter-status" data-status="${s}">${s === 'all' ? esc(t('all')) : esc(statusLabel(s))}</button>`).join('')}
      </div>
    </div>
    <div class="section"><h2>${esc(t('mapTitle'))}</h2></div>
    <div id="exploreMap">${mapSvg(state.reports)}</div>
    <div class="section"><h2>${esc(t('recentActivity'))}</h2><span class="small muted">${state.reports.length}</span></div>
    <div id="exploreList">${listHtml(state.reports, t('noReports'), t('noReportsHint'))}</div>`;
}

async function refreshExplore() {
  try {
    state.reports = (await api('reports', 'list', state.filters)).reports || [];
    const map = document.querySelector('#exploreMap');
    const list = document.querySelector('#exploreList');
    if (map) map.innerHTML = mapSvg(state.reports);
    if (list) list.innerHTML = listHtml(state.reports, t('noReports'), t('noReportsHint'));
  } catch (e) { toast(e.message, true); }
}

async function viewReport() {
  if (!state.user) {
    return `<div class="card auth">
      <h1 style="font-size:20px">${esc(t('signIn'))}</h1>
      <p class="muted small" style="margin:8px 0 16px">${esc(t('noReportsHint'))}</p>
      <button class="btn btn-primary btn-block" data-act="nav" data-view="profile">${esc(t('signIn'))}</button>
    </div>`;
  }
  if (!state.departments.length) {
    try { state.departments = (await api('departments', 'list')).departments || []; } catch (e) { /* optional */ }
  }
  return `
    <div class="hero" style="padding:16px 18px">
      <span class="eyebrow">${esc(t('quickReport'))}</span>
      <h1 style="font-size:20px">${esc(t('yourReport'))}</h1>
      <p>${esc(t('trackIt'))}</p>
    </div>
    <form id="reportForm" style="margin-top:14px">
      <div class="card">
        <div class="form-group">
          <label for="cat">${esc(t('category'))} *</label>
          <select id="cat" name="category" required>
            ${CATS.map((c) => `<option value="${c}">${esc(categoryLabel(c))} — ${esc(t(c + 'Desc'))}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="title">${esc(t('title'))} *</label>
          <input id="title" name="title" required minlength="5" maxlength="180" placeholder="e.g. Broken water tap on Main Road">
        </div>
        <div class="form-group">
          <label for="description">${esc(t('description'))} *</label>
          <textarea id="description" name="description" required minlength="10" placeholder="${esc(t('additional'))}"></textarea>
        </div>
      </div>
      <div class="card">
        <div class="form-group">
          <label>${esc(t('photo'))}</label>
          <label class="photo-drop" for="photoInput">
            ${icon('camera')}<div>${esc(t('photo'))}</div>
            <span class="small muted">JPG, PNG or WebP · max 5 MB</span>
            <img id="photoPreview" class="photo-preview" alt="Selected photo" hidden>
          </label>
          <input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp">
        </div>
        <div class="form-group">
          <label for="location_name">${esc(t('location'))}</label>
          <input id="location_name" name="location_name" placeholder="e.g. Huye Main Market, Rwanda">
        </div>
        <button type="button" class="btn btn-outline btn-block" data-act="gps">${icon('pin')} ${esc(t('getGps'))}</button>
        <p id="gpsStatus" class="small muted" style="margin-top:6px">${state.gps ? '✓ ' + esc(t('gpsDone')) : ''}</p>
        <input type="hidden" id="latitude" name="latitude" value="${state.gps ? state.gps.lat : ''}">
        <input type="hidden" id="longitude" name="longitude" value="${state.gps ? state.gps.lng : ''}">
      </div>
      <button type="button" class="btn btn-primary btn-block" data-act="submit-report" id="submitBtn" style="margin-top:14px">${icon('plus')} ${esc(t('sendReport'))}</button>
    </form>`;
}

async function viewNotifications() {
  if (!state.user) {
    return `<div class="card"><h2>${esc(t('notifications'))}</h2><p class="muted small" style="margin:8px 0 14px">${esc(t('noNotificationsHint'))}</p>
      <button class="btn btn-primary btn-block" data-act="nav" data-view="profile">${esc(t('signIn'))}</button></div>`;
  }
  state.notifications = (await api('notifications', 'list')).notifications || [];
  return `
    <div class="section" style="margin-top:2px"><h2>${esc(t('notifications'))}</h2>
      ${state.notifications.some((n) => !Number(n.is_read)) ? `<button class="text-link" data-act="mark-all-read">${esc(t('markAllRead'))}</button>` : ''}
    </div>
    ${state.notifications.length ? `<div class="list">${state.notifications.map((n) => `
      <article class="report-item ${Number(n.is_read) ? '' : 'unread'}" data-act="read-one" data-id="${n.id}" data-report="${esc(n.report_id || '')}" style="${Number(n.is_read) ? 'opacity:.7' : 'border-left:4px solid var(--green)'}">
        <div class="top"><h3>${esc(n.title)}</h3><span class="small muted">${dateLabel(n.created_at)}</span></div>
        <p style="-webkit-line-clamp:3">${esc(n.body || '')}</p>
        ${n.report_id ? `<div class="report-meta"><span>${esc(n.report_id)}</span><span>${esc(t('viewDetails'))} →</span></div>` : ''}
      </article>`).join('')}</div>` : emptyState(t('noNotifications'), t('noNotificationsHint'))}`;
}

async function viewProfile() {
  if (!state.user) {
    const login = state.authTab === 'login';
    return `
      <div class="auth">
        <img class="auth-logo" src="assets/img/logo.png" alt="HANO logo" onerror="this.style.display='none'">
        <h1>HANO</h1>
        <p class="tagline">${esc(t('tagline'))}</p>
        <div class="card">
          <div class="tabs">
            <button class="${login ? 'active' : ''}" data-act="auth-tab" data-tab="login">${esc(t('signIn'))}</button>
            <button class="${!login ? 'active' : ''}" data-act="auth-tab" data-tab="register">${esc(t('register'))}</button>
          </div>
          <form id="authForm">
            ${login ? '' : `<div class="form-group"><label for="authName">${esc(t('name'))}</label><input id="authName" required></div>`}
            <div class="form-group">
              <label for="authIdentifier">${esc(t('identifier'))}</label>
              <input id="authIdentifier" type="text" autocomplete="username" required placeholder="you@example.com">
            </div>
            ${login ? '' : `<div class="form-group"><label for="authPhone">${esc(t('phone'))}</label><input id="authPhone" type="tel"></div>`}
            <div class="form-group"><label for="authPassword">${esc(t('password'))}</label><input id="authPassword" type="password" autocomplete="${login ? 'current-password' : 'new-password'}" minlength="8" required></div>
            <button type="button" class="btn btn-primary btn-block" data-act="submit-auth">${esc(login ? t('signIn') : t('register'))}</button>
          </form>
          <div class="demo-note">${esc(t('demoHint'))}</div>
          ${state.serverError ? `<div class="demo-note">${esc(state.serverError)}</div>` : ''}
        </div>
      </div>`;
  }
  const u = state.user;
  const mine = (await api('reports', 'list', { mine: 1 })).reports || [];
  const roleLabel = t(u.role) || u.role;
  return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:52px;height:52px;border-radius:16px;background:var(--green-soft);display:grid;place-items:center;color:var(--green);font-size:22px;font-weight:800">${esc((u.name || 'H')[0].toUpperCase())}</div>
        <div style="min-width:0"><h2>${esc(u.name)}</h2><p class="small muted">${esc(u.email || '')}</p>
          <span class="badge submitted" style="margin-top:4px;display:inline-block">${esc(roleLabel)}</span></div>
      </div>
      ${u.phone ? `<p class="small muted" style="margin-top:10px">${esc(u.phone)}</p>` : ''}
    </div>
    ${(u.role === 'admin' || u.role === 'officer') ? `
      <button class="btn btn-primary btn-block" data-act="nav" data-view="${u.role === 'admin' ? 'admin' : 'officer'}" style="margin-top:12px">
        ${icon('shield')} ${esc(t('dashboard'))} · ${esc(roleLabel)}</button>` : ''}
    <div class="section"><h2>${esc(t('myReports'))}</h2><span class="small muted">${mine.length}</span></div>
    ${listHtml(mine, t('noReports'), t('noReportsHint'))}
    <div class="section"><h2>${esc(t('language'))}</h2></div>
    <div class="card">
      <div class="chip-row" style="margin:0">
        <button class="chip ${state.lang === 'en' ? 'active' : ''}" data-act="set-lang" data-lang="en">English</button>
        <button class="chip ${state.lang === 'rw' ? 'active' : ''}" data-act="set-lang" data-lang="rw">Kinyarwanda</button>
      </div>
    </div>
    ${state.mode === 'demo' ? `<button class="btn btn-ghost btn-block" data-act="reset-demo" style="margin-top:12px">${icon('trash')} ${esc(t('resetDemo'))}</button>` : ''}
    <button class="btn btn-danger btn-block" data-act="logout" style="margin-top:10px">${esc(t('signOut'))}</button>`;
}

async function loadAdminData() {
  [state.reports, state.notifications] = await Promise.all([
    api('reports', 'list').then((r) => r.reports || []),
    api('notifications', 'list').then((r) => r.notifications || []).catch(() => []),
  ]);
  if (!state.departments.length) state.departments = (await api('departments', 'list')).departments || [];
  try { state.stats = (await api('stats', '')).stats || null; } catch (e) { state.stats = null; }
}

function statsHtml(stats) {
  if (!stats) return `<div class="card"><p class="muted small">${esc(t('onlyAdmin'))}</p></div>`;
  const statuses = STATUSES.filter((s) => stats.by_status && stats.by_status[s]);
  const cats = CATS.filter((c) => stats.by_category && stats.by_category[c]);
  const max = Math.max(1, ...cats.map((c) => Number(stats.by_category[c])));
  return `
    <div class="card">
      <div class="mini-grid">
        ${statuses.map((s) => `<div><b>${stats.by_status[s]}</b><span class="tiny">${esc(statusLabel(s))}</span></div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h3>${esc(t('category'))}</h3>
      ${cats.map((c) => { const n = Number(stats.by_category[c]); return `<div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px"><span>${esc(categoryLabel(c))}</span><b>${n}</b></div>
        <div style="height:6px;background:var(--green-soft);border-radius:99px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${(n / max) * 100}%;background:var(--green)"></div></div>
      </div>`; }).join('')}
    </div>
    <div class="card">
      <h3>${esc(t('repeatedAreas'))}</h3>
      ${(stats.repeated_areas || []).length ? (stats.repeated_areas || []).map((a) => `
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:8px 0;font-size:12px">
          <span>${esc(a.location_name)}</span><b class="badge under_review">${a.n}×</b>
        </div>`).join('') : `<p class="muted small" style="margin-top:8px">${esc(t('empty'))}</p>`}
    </div>
    <div class="card">
      <h3>${esc(t('officers'))}</h3>
      ${(stats.officers || []).map((o) => `<div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:8px 0;font-size:12px">
        <span>${esc(o.name)}</span><b>${o.n}</b></div>`).join('')}
    </div>`;
}

async function viewAdmin() {
  if (!state.user || state.user.role !== 'admin') return `<div class="card"><p>${esc(t('onlyAdmin'))}</p></div>`;
  await loadAdminData();
  const tab = state.adminTab;
  const tabs = [['dashboard', t('dashboard')], ['reports', t('reviewReports')], ['users', t('manageUsers')]];
  let content = '';
  if (tab === 'dashboard') {
    content = statsHtml(state.stats) + `<div class="section"><h2>${esc(t('recentActivity'))}</h2></div>` +
      listHtml(state.reports.slice(0, 6), t('noReports'), t('noReportsHint'));
  } else if (tab === 'reports') {
    content = `<div class="chip-row">${['all', ...STATUSES].map((s) => `<button class="chip ${s === 'all' ? 'active' : ''}" data-act="admin-filter" data-status="${s}">${s === 'all' ? esc(t('all')) : esc(statusLabel(s))}</button>`).join('')}</div>
      <div id="adminReports" style="margin-top:10px">${listHtml(state.reports, t('noReports'), t('noReportsHint'))}</div>`;
  } else {
    try { state.users = (await api('users', 'list')).users || []; } catch (e) { state.users = []; }
    content = `<div class="card">${state.users.length ? state.users.map((u) => `
      <div class="manage-row">
        <div style="display:flex;justify-content:space-between;gap:8px"><div style="min-width:0"><b>${esc(u.name)}</b><div class="small muted">${esc(u.email)}</div></div><span class="badge submitted">${esc(t(u.role) || u.role)}</span></div>
        <div class="row">
          <select class="small-input" id="role-${u.id}">
            ${['citizen', 'officer', 'admin'].map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${esc(t(r))}</option>`).join('')}
          </select>
          <select class="small-input" id="dept-${u.id}">
            <option value="">—</option>
            ${state.departments.map((d) => `<option value="${d.id}" ${Number(u.department_id) === Number(d.id) ? 'selected' : ''}>${esc(d.name_en)}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" data-act="change-role" data-id="${u.id}">${esc(t('change'))}</button>
        </div>
      </div>`).join('') : emptyState(t('empty'), '')}</div>`;
  }
  return `
    <div class="section" style="margin-top:2px"><h2>${esc(t('dashboard'))}</h2><span class="badge submitted">${esc(t('admin'))}</span></div>
    <div class="admin-tabs">${tabs.map(([id, label]) => `<button class="${tab === id ? 'active' : ''}" data-act="admin-tab" data-tab="${id}">${esc(label)}</button>`).join('')}</div>
    ${content}`;
}

async function viewOfficer() {
  if (!state.user || !['officer', 'admin'].includes(state.user.role)) return `<div class="card"><p>${esc(t('onlyAdmin'))}</p></div>`;
  await loadAdminData();
  try { state.stats = (await api('stats', '')).stats || null; } catch (e) { state.stats = null; }
  return `
    <div class="section" style="margin-top:2px"><h2>${esc(t('dashboard'))}</h2><span class="badge submitted">${esc(t('officer'))}</span></div>
    <div class="admin-tabs">
      <button class="${state.adminTab === 'dashboard' ? 'active' : ''}" data-act="admin-tab" data-tab="dashboard">${esc(t('dashboard'))}</button>
      <button class="${state.adminTab === 'reports' ? 'active' : ''}" data-act="admin-tab" data-tab="reports">${esc(t('reviewReports'))}</button>
    </div>
    ${state.adminTab === 'dashboard' ? statsHtml(state.stats) + `<div class="section"><h2>${esc(t('recentActivity'))}</h2></div>` + listHtml(state.reports.slice(0, 8), t('noReports'), t('noReportsHint')) :
      listHtml(state.reports, t('noReports'), t('noReportsHint'))}`;
}

/* --------------------------------------------------------------- detail */

function closeModal() { modal.hidden = true; modal.innerHTML = ''; state.detail = null; }

async function openDetail(id) {
  try {
    const data = await api('report', 'get', { id });
    state.detail = data;
    const r = data.report;
    if (!state.departments.length && state.user && ['admin', 'officer'].includes(state.user.role)) {
      try { state.departments = (await api('departments', 'list')).departments || []; } catch (e) { /* optional */ }
    }
    const canManage = state.user && ['admin', 'officer'].includes(state.user.role);
    const isOwner = state.user && state.user.id === r.user_id;
    const canConfirm = isOwner && r.status === 'resolved' && !Number(r.resolved_confirmed);
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="${esc(r.title)}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><span class="eyebrow">${esc(r.id)}</span><h2 style="margin-top:4px">${esc(r.title)}</h2></div>
        <button class="icon-btn" data-act="close-modal" aria-label="${esc(t('close'))}">${icon('close')}</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">${statusBadge(r.status)}
        <span class="badge submitted">${esc(categoryLabel(r.category))}</span>
        ${Number(r.resolved_confirmed) ? `<span class="badge resolved">✓ ${esc(t('confirmed'))}</span>` : ''}
      </div>
      ${r.photo ? `<img class="detail-photo" src="${esc(r.photo)}" alt="Report photo">` : ''}
      <p style="margin-top:12px">${esc(r.description)}</p>
      ${r.rejected_reason ? `<div class="demo-note" style="margin-top:10px">${esc(r.rejected_reason)}</div>` : ''}
      <div class="card" style="margin-top:12px;box-shadow:none">
        <div class="small muted">${icon('pin')} ${esc(r.location_name || '—')}</div>
        <div class="small muted" style="margin-top:4px">${esc(t('reporter'))}: ${esc(r.reporter_name || '—')} · ${dateLabel(r.created_at)}</div>
        ${r.department_en ? `<div class="small muted" style="margin-top:4px">${esc(t('department'))}: ${esc(state.lang === 'rw' && r.department_rw ? r.department_rw : r.department_en)}</div>` : ''}
      </div>
      <h3 style="margin-top:16px">${esc(t('history'))}</h3>
      <ul class="timeline">${(data.updates || []).length ? data.updates.map((u) => `<li>
        <b>${esc(statusLabel(u.to_status) === u.to_status ? u.to_status : statusLabel(u.to_status))}</b>
        ${u.note ? `<div>${esc(u.note)}</div>` : ''}
        <time>${esc(u.actor || 'HANO')} · ${dateLabel(u.created_at)}</time></li>`).join('') : `<li class="muted">—</li>`}</ul>
      ${canManage ? `<div class="card" style="box-shadow:none">
        <h3>${esc(t('approve'))}</h3>
        <div class="form-group" style="margin-top:10px"><label>${esc(t('status'))}</label>
          <select id="updStatus">${['under_review', 'assigned', 'in_progress', 'resolved', 'rejected'].map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${esc(statusLabel(s))}</option>`).join('')}</select></div>
        <div class="form-group"><label>${esc(t('assign'))}</label>
          <select id="updDept"><option value="">—</option>${state.departments.map((d) => `<option value="${d.id}" ${Number(r.department_id) === Number(d.id) ? 'selected' : ''}>${esc(d.name_en)}</option>`).join('')}</select></div>
        <div class="form-group"><label>${esc(t('description'))}</label><textarea id="updNote" style="min-height:70px" placeholder="Optional note"></textarea></div>
        <button class="btn btn-primary btn-block" data-act="update-status" data-id="${esc(r.id)}">${esc(t('approve'))}</button>
        <div class="form-group" style="margin-top:12px"><label>${esc(t('comment'))}</label><textarea id="cmtNote" style="min-height:60px"></textarea></div>
        <button class="btn btn-outline btn-block" data-act="add-comment" data-id="${esc(r.id)}">${esc(t('comment'))}</button>
      </div>` : ''}
      ${canConfirm ? `<button class="btn btn-primary btn-block" data-act="confirm-fixed" data-id="${esc(r.id)}" style="margin-top:12px">${icon('check')} ${esc(t('confirmFixed'))}</button>` : ''}
      ${!state.user ? `<button class="btn btn-primary btn-block" data-act="nav" data-view="profile" style="margin-top:12px">${esc(t('signIn'))}</button>` : ''}
    </div>`;
    modal.hidden = false;
  } catch (e) { toast(e.message, true); }
}

async function refreshDetail() {
  if (!state.detail) return;
  const id = state.detail.report.id;
  await openDetail(id);
}

/* ------------------------------------------------------------- actions */

async function submitAuth() {
  const form = document.querySelector('#authForm');
  if (!form) return;
  const isLogin = state.authTab === 'login';
  const params = isLogin ? {
    identifier: form.querySelector('#authIdentifier').value.trim(),
    password: form.querySelector('#authPassword').value,
  } : {
    name: form.querySelector('#authName').value.trim(),
    email: form.querySelector('#authIdentifier').value.trim(),
    phone: form.querySelector('#authPhone').value.trim(),
    password: form.querySelector('#authPassword').value,
  };
  const valid = isLogin
    ? Boolean(params.identifier && params.password)
    : Boolean(params.name && params.identifier && params.password);
  if (!valid) { toast(t('fillFields'), true); return; }
  const btn = document.querySelector('[data-act="submit-auth"]');
  if (btn) { btn.disabled = true; btn.textContent = t('sending'); }
  try {
    const data = await api('auth', isLogin ? 'login' : 'register', params);
    state.user = data.user;
    persistUser();
    toast(isLogin ? t('welcomeBack') : t('saved'));
    await go('home');
  } catch (e) { toast(e.message, true); }
}

async function submitReport() {
  const form = document.querySelector('#reportForm');
  if (!form) return;
  const params = {
    category: form.querySelector('#cat').value,
    title: form.querySelector('#title').value.trim(),
    description: form.querySelector('#description').value.trim(),
    location_name: form.querySelector('#location_name').value.trim(),
    latitude: form.querySelector('#latitude').value,
    longitude: form.querySelector('#longitude').value,
  };
  if (!params.title || !params.description || params.title.length < 5 || params.description.length < 10) {
    toast(t('fillFields'), true); return;
  }
  const btn = document.querySelector('#submitBtn');
  if (btn) { btn.disabled = true; btn.textContent = t('sending'); }
  try {
    if (state.mode === 'demo') params.photo = state.photoData;
    await api('reports', 'create', params, state.photoFile);
    state.photoData = null; state.photoFile = null; state.gps = null;
    toast(t('reportSent'));
    await go('profile');
  } catch (e) { toast(e.message, true); }
  if (btn) { btn.disabled = false; btn.textContent = t('sendReport'); }
}

function captureGps() {
  const label = document.querySelector('#gpsStatus');
  if (!navigator.geolocation) { toast('GPS is not supported on this device.', true); return; }
  if (label) label.textContent = t('loading');
  navigator.geolocation.getCurrentPosition((pos) => {
    state.gps = { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) };
    const lat = document.querySelector('#latitude'); const lng = document.querySelector('#longitude');
    if (lat) lat.value = state.gps.lat;
    if (lng) lng.value = state.gps.lng;
    if (label) label.textContent = '✓ ' + t('gpsDone') + ` (${state.gps.lat}, ${state.gps.lng})`;
    toast(t('gpsDone'));
  }, (err) => {
    if (label) label.textContent = '';
    toast(err.code === 1 ? 'Location permission was denied.' : 'Could not get your location.', true);
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
}

async function submitStatusUpdate(id) {
  const status = document.querySelector('#updStatus')?.value;
  const department_id = document.querySelector('#updDept')?.value;
  const note = document.querySelector('#updNote')?.value.trim() || '';
  if (!status) return;
  try {
    await api('report', 'update', { id, status, department_id, note });
    toast(t('changeStatus'));
    await refreshDetail();
    await render();
  } catch (e) { toast(e.message, true); }
}
async function submitComment(id) {
  const note = document.querySelector('#cmtNote')?.value.trim();
  if (!note) { toast(t('fillFields'), true); return; }
  try {
    await api('report', 'comment', { id, note });
    toast(t('newUpdate'));
    await refreshDetail();
    await render();
  } catch (e) { toast(e.message, true); }
}

document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-act]');
  if (!target) return;
  const act = target.dataset.act;

  if (act === 'nav') { await go(target.dataset.view); return; }
  if (act === 'lang') {
    state.lang = state.lang === 'en' ? 'rw' : 'en';
    localStorage.setItem(LANG_KEY, state.lang);
    document.documentElement.lang = state.lang;
    await render(); return;
  }
  if (act === 'set-lang') {
    state.lang = target.dataset.lang;
    localStorage.setItem(LANG_KEY, state.lang);
    await render(); return;
  }
  if (act === 'auth-tab') { state.authTab = target.dataset.tab; await render(); return; }
  if (act === 'submit-auth') { await submitAuth(); return; }
  if (act === 'submit-report') { await submitReport(); return; }
  if (act === 'gps') { captureGps(); return; }
  if (act === 'open-detail') { await openDetail(target.dataset.id); return; }
  if (act === 'close-modal') { closeModal(); return; }
  if (act === 'retry') { await go('home'); return; }
  if (act === 'filter-cat') {
    state.filters.category = target.dataset.cat;
    if (state.view !== 'explore') { await go('explore'); } else { await render(); }
    return;
  }
  if (act === 'filter-status') { state.filters.status = target.dataset.status; await render(); return; }
  if (act === 'mark-all-read') {
    try { await api('notifications', 'read', {}); toast(t('saved')); await render(); } catch (err) { toast(err.message, true); }
    return;
  }
  if (act === 'read-one') {
    try { await api('notifications', 'read', { id: target.dataset.id }); } catch (err) { /* continue */ }
    if (target.dataset.report) await openDetail(target.dataset.report); else await render();
    return;
  }
  if (act === 'admin-tab') { state.adminTab = target.dataset.tab; await render(); return; }
  if (act === 'admin-filter') {
    const s = target.dataset.status;
    const all = (await api('reports', 'list')).reports || [];
    state.reports = s === 'all' ? all : all.filter((r) => r.status === s);
    const box = document.querySelector('#adminReports');
    if (box) box.innerHTML = listHtml(state.reports, t('noReports'), t('noReportsHint'));
    document.querySelectorAll('[data-act="admin-filter"]').forEach((b) => b.classList.toggle('active', b === target));
    return;
  }
  if (act === 'update-status') { await submitStatusUpdate(target.dataset.id); return; }
  if (act === 'add-comment') { await submitComment(target.dataset.id); return; }
  if (act === 'confirm-fixed') {
    try { await api('report', 'confirm', { id: target.dataset.id }); toast(t('saved')); await refreshDetail(); await render(); }
    catch (err) { toast(err.message, true); }
    return;
  }
  if (act === 'change-role') {
    const id = target.dataset.id;
    const role = document.querySelector(`#role-${id}`)?.value;
    const department_id = document.querySelector(`#dept-${id}`)?.value;
    try { await api('users', 'update', { id, role, department_id }); toast(t('roleUpdated')); await render(); }
    catch (err) { toast(err.message, true); }
    return;
  }
  if (act === 'reset-demo') {
    resetDemo();
    state.user = null; persistUser();
    state.notifications = []; state.reports = [];
    toast(t('resetDone')); await go('home'); return;
  }
  if (act === 'logout') {
    try { await api('auth', 'logout', {}); } catch (err) { /* local logout still works */ }
    state.user = null; persistUser();
    toast(t('saved')); await go('home');
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'search') {
    state.filters.q = e.target.value;
    clearTimeout(window._hanoSearch);
    window._hanoSearch = setTimeout(refreshExplore, 180);
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'photoInput') {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Photo is too large (maximum 5 MB).', true); e.target.value = ''; return; }
    state.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      state.photoData = String(reader.result);
      const preview = document.querySelector('#photoPreview');
      if (preview) { preview.src = state.photoData; preview.hidden = false; }
    };
    reader.readAsDataURL(file);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act="open-detail"]')) {
    e.preventDefault(); openDetail(e.target.dataset.id);
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

(async function init() {
  document.documentElement.lang = state.lang;
  await detectMode();
  await render();
})();
