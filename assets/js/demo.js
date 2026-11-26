/* Local demo data + in-browser API. Used when PHP/MySQL is not available.
   Demo only: passwords are stored in plain text here. Never do this in production. */

const KEY = 'hano_demo_v1';

const DEPARTMENTS = [
  { id: 1, name_en: 'Waste Management', name_rw: 'Gucunga Imyanda', description: 'Collection and disposal of waste' },
  { id: 2, name_en: 'Water & Sanitation', name_rw: 'Amazi n’Isuku', description: 'Public taps, drainage and sanitation' },
  { id: 3, name_en: 'Roads & Transport', name_rw: 'Imihanda n’Ubwikorezi', description: 'Roads and potholes' },
  { id: 4, name_en: 'Electrical & Lighting', name_rw: 'Amashanyarazi n’Itara', description: 'Street lighting' },
  { id: 5, name_en: 'General Services', name_rw: 'Serivisi Rusange', description: 'Other community facilities' },
];

const USERS = [
  { id: 1, name: 'HANO Administrator', email: 'admin@hano.rw', phone: '+250780000001', password: 'Admin123!', role: 'admin', department_id: null },
  { id: 2, name: 'Alice Uwimana', email: 'alice@hano.rw', phone: '+250780000002', password: 'Officer123!', role: 'officer', department_id: 1 },
  { id: 3, name: 'Jean Nkurunziza', email: 'jean@hano.rw', phone: '+250780000003', password: 'Officer123!', role: 'officer', department_id: 2 },
  { id: 4, name: 'Remy Niyogushimwa', email: 'remy@example.com', phone: '+250793138244', password: 'Citizen123!', role: 'citizen', department_id: null },
  { id: 5, name: 'Marie Mukamana', email: 'marie@example.com', phone: '+250780000005', password: 'Citizen123!', role: 'citizen', department_id: null },
];

const REPORTS = [
  ['HANO-1001', 4, 'waste', 'Uncollected garbage near the market', 'Waste has not been collected for over a week behind Kimironko market. It is affecting shops and children.', -1.9470, 30.1420, 'Kimironko, Gasabo, Kigali', 'in_progress', 1, '2026-11-10 08:20:00'],
  ['HANO-1002', 5, 'water', 'Broken public water tap', 'The public tap in Ngoma sector has been broken for four days. Families walk long distances for water.', -2.6020, 29.7300, 'Ngoma, Huye', 'assigned', 2, '2026-11-12 14:10:00'],
  ['HANO-1003', 4, 'roads', 'Deep potholes on the main road', 'Several potholes appeared on the road to the district office. Motorbikes are falling after rain.', -1.9600, 30.0600, 'Kaciru, Nyarugenge, Kigali', 'under_review', 3, '2026-11-18 07:45:00'],
  ['HANO-1004', 5, 'drainage', 'Blocked drainage causing floods', 'The drainage channel is full of plastic waste. After heavy rain the road and homes are flooded.', -1.9330, 30.0900, 'Nyabugogo, Nyarugenge, Kigali', 'submitted', 2, '2026-11-20 16:30:00'],
  ['HANO-1005', 4, 'streetlights', 'Streetlight out near the school', 'Three lights are not working near the primary school. The area is dark in the morning.', -2.5900, 29.7400, 'Rwakada, Huye', 'resolved', 4, '2026-11-01 06:15:00'],
  ['HANO-1006', 5, 'waste', 'Illegal dumping site beside the river', 'People are dumping household waste near the river bank. It smells and pollutes the water.', -2.1000, 30.1500, 'Rwamagana Sector, Rwamagana', 'in_progress', 1, '2026-11-05 11:00:00'],
  ['HANO-1007', 4, 'infrastructure', 'Damaged classroom desks', 'Several desks in the community classroom are broken and children cannot sit comfortably.', -2.4500, 29.8300, 'Kigoma, Huye', 'submitted', 5, '2026-11-21 09:25:00'],
  ['HANO-1008', 5, 'roads', 'Broken bridge railing', 'The railing of the small bridge is broken. This is dangerous for children crossing to school.', -2.7200, 29.5100, 'Kicukiro, Ntungamo', 'resolved', 3, '2026-10-25 13:00:00'],
  ['HANO-1009', 4, 'water', 'Leaking pipe wasting water', 'A public pipe is leaking continuously and the road is becoming muddy.', -1.9700, 30.1100, 'Kibagabaga, Gasabo, Kigali', 'rejected', 2, '2026-11-02 10:00:00'],
  ['HANO-1010', 5, 'streetlights', 'Light needed at the bus stop', 'The bus stop area has no lighting and passengers wait in the dark.', -1.9450, 30.0500, 'Kigali Bus Park area', 'assigned', 4, '2026-11-16 18:20:00'],
  ['HANO-1011', 4, 'waste', 'Market waste piles after closing', 'Traders leave vegetable waste in the market after closing. It attracts flies and rats.', -2.6000, 29.7500, 'Huye Main Market', 'under_review', 1, '2026-11-19 17:05:00'],
  ['HANO-1012', 5, 'other', 'Community notice board destroyed', 'The notice board for job and training information was destroyed by the wind.', -2.5500, 29.7700, 'Rusumo, Huye', 'submitted', 5, '2026-11-22 07:50:00'],
].map((r) => ({
  id: r[0], user_id: r[1], category: r[2], title: r[3], description: r[4],
  photo: null, latitude: r[5], longitude: r[6], location_name: r[7], status: r[8],
  department_id: r[9], created_at: r[10], updated_at: r[10], rejected_reason: r[0] === 'HANO-1009' ? 'Duplicate of an existing report in the same area.' : null,
  resolved_confirmed: r[0] === 'HANO-1005' ? 1 : 0,
}));

const UPDATES = [
  { report_id: 'HANO-1001', actor_id: 1, from_status: 'submitted', to_status: 'under_review', note: 'Report received and verified.', created_at: '2026-11-10 09:00:00' },
  { report_id: 'HANO-1001', actor_id: 2, from_status: 'under_review', to_status: 'assigned', note: 'Assigned to Waste Management.', created_at: '2026-11-12 08:30:00' },
  { report_id: 'HANO-1001', actor_id: 2, from_status: 'assigned', to_status: 'in_progress', note: 'Collection truck scheduled.', created_at: '2026-11-15 10:05:00' },
  { report_id: 'HANO-1002', actor_id: 1, from_status: 'submitted', to_status: 'under_review', note: 'Confirmed by local officer.', created_at: '2026-11-13 08:00:00' },
  { report_id: 'HANO-1002', actor_id: 3, from_status: 'under_review', to_status: 'assigned', note: 'Water team will inspect.', created_at: '2026-11-14 09:00:00' },
];

const NOTIFICATIONS = [
  { id: 1, user_id: 4, report_id: 'HANO-1001', title: 'Your report is in progress', body: 'Waste Management has scheduled collection for Kimironko.', is_read: 0, created_at: '2026-11-15 10:06:00' },
  { id: 2, user_id: 4, report_id: 'HANO-1003', title: 'Report under review', body: 'An officer is reviewing your road report.', is_read: 0, created_at: '2026-11-18 07:46:00' },
  { id: 3, user_id: 5, report_id: 'HANO-1002', title: 'Report assigned', body: 'The water report in Ngoma was assigned to a team.', is_read: 0, created_at: '2026-11-14 09:01:00' },
  { id: 4, user_id: 5, report_id: 'HANO-1008', title: 'Report resolved', body: 'The bridge railing has been repaired. Please confirm.', is_read: 1, created_at: '2026-11-03 15:11:00' },
];

function fresh() {
  return JSON.parse(JSON.stringify({
    users: USERS, departments: DEPARTMENTS, reports: REPORTS,
    updates: UPDATES, notifications: NOTIFICATIONS,
  }));
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const d = fresh();
  save(d);
  return d;
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function reset() {
  localStorage.removeItem(KEY);
  return load();
}

function now() {
  const d = new Date();
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function notify(db, userId, reportId, title, body) {
  db.notifications.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), user_id: userId, report_id: reportId, title, body, is_read: 0, created_at: now() });
}

function enrich(db, r) {
  const reporter = db.users.find((u) => u.id === r.user_id);
  const dept = db.departments.find((d) => d.id === r.department_id);
  return { ...r, reporter_name: reporter ? reporter.name : '', department_en: dept ? dept.name_en : null, department_rw: dept ? dept.name_rw : null };
}

/** Local implementation of the same operations as api/api.php */
export function demoApi(action, op, p, ctx) {
  const db = load();
  const user = ctx.user;

  const saveDb = () => save(db);
  const requireUser = () => { if (!user) throw new Error('Please sign in to continue.'); return user; };
  const requireRole = (roles) => { const u = requireUser(); if (!roles.includes(u.role)) throw new Error('You do not have permission for this action.'); return u; };

  switch (action) {
    case 'auth':
      if (op === 'me') return { user };
      if (op === 'login') {
        const found = db.users.find((u) => (u.email === p.identifier || u.phone === p.identifier) && u.password === p.password);
        if (!found) throw new Error('Incorrect details. Try again.');
        const { password, ...safe } = found;
        ctx.setUser(safe);
        return { user: safe };
      }
      if (op === 'register') {
        if (db.users.some((u) => u.email === p.email || u.phone === p.phone)) throw new Error('An account with this email or phone already exists.');
        const safe = { id: Math.max(...db.users.map((u) => u.id)) + 1, name: p.name, email: p.email, phone: p.phone, role: 'citizen', department_id: null };
        db.users.push({ ...safe, password: p.password });
        saveDb(); ctx.setUser(safe);
        return { user: safe };
      }
      if (op === 'logout') { ctx.setUser(null); return {}; }
      break;

    case 'reports':
      if (op === 'list') {
        if (p.mine) requireUser();
        let rows = db.reports.slice();
        if (p.category && p.category !== 'all') rows = rows.filter((r) => r.category === p.category);
        if (p.status && p.status !== 'all') rows = rows.filter((r) => r.status === p.status);
        if (p.mine) rows = rows.filter((r) => r.user_id === user.id);
        if (p.q) { const q = p.q.toLowerCase(); rows = rows.filter((r) => (r.title + r.description + r.location_name).toLowerCase().includes(q)); }
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { reports: rows.map((r) => enrich(db, r)) };
      }
      if (op === 'create') {
        const u = requireUser();
        if (!p.category || !p.title || p.title.length < 5 || !p.description || p.description.length < 10) throw new Error('Please complete the required fields.');
        const n = Math.max(...db.reports.map((r) => Number(r.id.replace('HANO-', '')))) + 1;
        const report = {
          id: 'HANO-' + n, user_id: u.id, category: p.category, title: p.title,
          description: p.description, photo: p.photo || null, latitude: p.latitude || null, longitude: p.longitude || null,
          location_name: p.location_name || '', status: 'submitted', department_id: null,
          rejected_reason: null, resolved_confirmed: 0, created_at: now(), updated_at: now(),
        };
        db.reports.unshift(report);
        db.updates.push({ report_id: report.id, actor_id: u.id, from_status: null, to_status: 'submitted', note: 'Report submitted by citizen.', created_at: now() });
        db.users.filter((x) => x.role === 'admin' || x.role === 'officer').forEach((x) => notify(db, x.id, report.id, 'New report submitted', p.title));
        saveDb();
        return { report: enrich(db, report) };
      }
      break;

    case 'report':
      if (op === 'get') {
        const r = db.reports.find((x) => x.id === p.id);
        if (!r) throw new Error('Report not found.');
        const updates = db.updates.filter((u) => u.report_id === p.id).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((u) => ({ ...u, actor: (db.users.find((x) => x.id === u.actor_id) || {}).name || 'HANO' }));
        return { report: enrich(db, r), updates };
      }
      if (op === 'update') {
        const u = requireRole(['officer', 'admin']);
        const r = db.reports.find((x) => x.id === p.id);
        if (!r) throw new Error('Report not found.');
        if (!['under_review', 'assigned', 'in_progress', 'resolved', 'rejected'].includes(p.status)) throw new Error('Invalid status.');
        if ((p.status === 'assigned' || p.status === 'in_progress') && !p.department_id) throw new Error('Choose a department first.');
        const from = r.status;
        r.status = p.status;
        r.department_id = Number(p.department_id) || r.department_id;
        r.rejected_reason = p.status === 'rejected' ? p.note : null;
        r.resolved_confirmed = 0;
        r.updated_at = now();
        db.updates.push({ report_id: r.id, actor_id: u.id, from_status: from, to_status: p.status, note: p.note || '', created_at: now() });
        notify(db, r.user_id, r.id, 'Report status changed', 'Your report ' + r.id + ' is now: ' + p.status + '.');
        saveDb();
        return { report: enrich(db, r) };
      }
      if (op === 'comment') {
        const u = requireRole(['officer', 'admin']);
        db.updates.push({ report_id: p.id, actor_id: u.id, from_status: null, to_status: p.status || 'comment', note: p.note, created_at: now() });
        const r = db.reports.find((x) => x.id === p.id);
        if (r) notify(db, r.user_id, r.id, 'New update on your report', p.note);
        saveDb(); return {};
      }
      if (op === 'confirm') {
        const u = requireUser();
        const r = db.reports.find((x) => x.id === p.id);
        if (!r || r.user_id !== u.id) throw new Error('Only the reporter can confirm this.');
        if (r.status !== 'resolved') throw new Error('Only resolved reports can be confirmed.');
        r.resolved_confirmed = 1;
        db.updates.push({ report_id: r.id, actor_id: u.id, from_status: 'resolved', to_status: 'resolved', note: 'Citizen confirmed the issue is fixed.', created_at: now() });
        saveDb(); return {};
      }
      break;

    case 'notifications':
      if (op === 'list') { requireUser(); return { notifications: db.notifications.filter((n) => n.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)) }; }
      if (op === 'read') {
        requireUser();
        db.notifications.forEach((n) => { if (n.user_id === user.id && (!p.id || n.id === Number(p.id))) n.is_read = 1; });
        saveDb(); return {};
      }
      break;

    case 'users':
      if (op === 'list') {
        requireRole(['admin']);
        return { users: db.users.map(({ password, ...u }) => ({ ...u, department: (db.departments.find((d) => d.id === u.department_id) || {}).name_en || '' })) };
      }
      if (op === 'update') {
        requireRole(['admin']);
        if (Number(p.id) === user.id) throw new Error('You cannot change your own role.');
        const target = db.users.find((u) => u.id === Number(p.id));
        if (!target) throw new Error('User not found.');
        target.role = p.role; target.department_id = Number(p.department_id) || null;
        saveDb(); return {};
      }
      break;

    case 'departments':
      if (op === 'list') { requireUser(); return { departments: db.departments }; }
      break;

    case 'stats':
      requireRole(['admin', 'officer']);
      return { stats: {
        by_status: db.reports.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}),
        by_category: db.reports.reduce((a, r) => (a[r.category] = (a[r.category] || 0) + 1, a), {}),
        repeated_areas: Object.entries(db.reports.reduce((a, r) => (a[r.location_name] = (a[r.location_name] || 0) + 1, a), {})).filter((x) => x[1] > 1).map((x) => ({ location_name: x[0], n: x[1] })),
        officers: db.users.filter((u) => u.role === 'officer').map((u) => ({ name: u.name, n: db.reports.filter((r) => r.department_id === u.department_id).length })),
      } };
  }
  throw new Error('Unknown operation.');
}
