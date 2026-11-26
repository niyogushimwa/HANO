# HANO — Your Community, Your Voice, Your Solutions

A community problem-reporting and public-service monitoring platform built for Rwanda.

**Repository:** <https://github.com/niyogushimwa/HANO>

**Branding:** the HANO mark was redesigned from the uploaded red pin (`Image/hano logo.jpg`) into a clean geometric location pin with a white **H**. The app palette was retuned to match: `#DB2227` primary, `#A51B20` dark, `#FDECEC` soft, with charcoal `#2A3439` as the secondary accent. Source assets are `assets/img/logo.svg` and `assets/img/logo.png`; the PWA and Android adaptive icons are generated from the same mark.

This repository contains:

1. **A working installable PWA** (HTML/CSS/JavaScript + PHP/MySQL) — run it today in XAMPP.
2. **A Kotlin/Jetpack Compose + Firebase scaffold** in [`android/`](android/README.md) — source layout only, **not runnable yet** because it needs Android Studio, the Android SDK and your own Firebase project files.

---

## 1. What works right now

| Feature | Status | Notes |
| --- | --- | --- |
| Register / sign in / sign out | ✅ Working | PHP sessions in server mode; localStorage in demo mode |
| Community feed with search + filters | ✅ Working | Public feed, 12 realistic sample reports in Kigali/Huye/Rwamagana |
| Report form (category, title, description, photo, GPS, place name) | ✅ Working | JPG/PNG/WebP up to 5 MB; browser geolocation |
| Interactive community map | ✅ Working | Stylised Rwanda map with status-coloured pins |
| Status tracking + full update history | ✅ Working | Submitted → Under Review → Assigned → In Progress → Resolved / Rejected |
| Notifications (in-app) | ✅ Working | Created automatically on status changes and new reports |
| Citizen confirmation of resolution | ✅ Working | Only the reporter can confirm a resolved report |
| Admin dashboard: stats, repeated areas, officer performance | ✅ Working | Requires admin/officer session |
| Review, assign, comment, change status | ✅ Working | Requires officer/admin session |
| User management (role + department) | ✅ Working | Admin only |
| English + Kinyarwanda | ✅ Working | Switch with the globe icon in the header or in Profile |
| Offline install (PWA) | ✅ Working | App shell cached by `sw.js`; demo data stored locally |
| Loading, empty and error states | ✅ Working | Shown throughout the UI |
| Push notifications (FCM/Web Push) | ❌ Not implemented | Only in-app notifications exist. See "Not included yet" below |
| Native Android app | ❌ Scaffold only | See `android/README.md` |

### Two data modes

The app detects the mode automatically on startup:

- **CONNECTED** — `api/api.php` answers successfully → real MySQL database, shared between users, real photo uploads, hashed passwords.
- **DEMO MODE** — the API/database is unavailable → the app uses `assets/js/demo.js` with localStorage. Everything is clickable and persistent on that device, but data is **not shared** and demo passwords are stored in plain text **in the browser only**.

The yellow `DEMO MODE` badge in the header always tells you which mode is active.

---

## 2. Run it in XAMPP (recommended)

### Step 1 — Place the files

The project is already at:

```
C:\xampp\htdocs\HANO
```

### Step 2 — Create the database

1. Start **Apache** and **MySQL** in XAMPP Control Panel.
2. Open <http://localhost/phpmyadmin>.
3. Click **Import** → choose `C:\xampp\htdocs\HANO\database\hano.sql` → **Go**.
   (This creates database `hano`, all tables, 5 departments, 5 users and 12 sample reports.)

### Step 3 — Check database credentials

Open `api/config.php`. Default XAMPP values are:

```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'hano');
define('DB_USER', 'root');
define('DB_PASS', '');
```

Change them if you set a MySQL password.

### Step 4 — Make uploads writable

`uploads/reports/` must be writable by Apache. On Windows/XAMPP this is normally true.
The folder's `.htaccess` blocks PHP execution and only serves images.

### Step 5 — Open the app

Visit <http://localhost/HANO/>.

The header should show red-badged **CONNECTED**. If it shows yellow **DEMO MODE**, check:
- MySQL is running;
- the SQL file was imported;
- `api/config.php` credentials are correct;
- `pdo_mysql` is enabled in Apache's `php.ini` (the CLI PHP on this machine does **not** have it, but XAMPP Apache does).

---

## 3. Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@hano.rw` | `Admin123!` |
| Officer (Waste Management) | `alice@hano.rw` | `Officer123!` |
| Officer (Water & Sanitation) | `jean@hano.rw` | `Officer123!` |
| Citizen | `remy@example.com` | `Citizen123!` |
| Citizen | `marie@example.com` | `Citizen123!` |

You can also register a new citizen account from **Profile → Create account**.

> ⚠️ Change these passwords before putting the app online.

---

## 4. Suggested test walkthrough

1. Open <http://localhost/HANO/> while **not signed in** — browse the feed and map.
2. Go to **Profile → Create account** and register `test@example.com`.
3. Tap the red **+** button, fill in the report, optionally take a photo, tap **Use my GPS location**, then **Submit report**.
4. Your report appears under **Profile → My reports** with status **Submitted**.
5. Sign out, sign in as `alice@hano.rw`, open **Officer dashboard**, open your report, assign the **Waste Management** department and set status **In Progress**.
6. Sign out, sign in as `test@example.com` — **Notifications** now has a message and the report shows the new status and history.
7. Sign in as `admin@hano.rw` — open **Admin dashboard** to see statistics, repeated areas and officer performance; use **Manage users** to change someone's role.
8. Tap the globe icon to switch to **Kinyarwanda**.

---

## 5. Install it as an app (PWA)

- **Android (Chrome)**: open the site → menu ⋮ → **Add to Home screen** / **Install app**.
- **iPhone (Safari)**: Share → **Add to Home Screen**.
- **Desktop (Chrome/Edge)**: click the install icon in the address bar.

Requirements: served over `http://localhost` or HTTPS. Once installed, the interface works offline; online it uses the PHP/MySQL API.

---

## 6. API reference

Base URL: `api/api.php`. Reads are `GET`, writes are `POST`.
`POST` with `FormData` (photo upload) **must** include the header `X-HANO: 1`. JSON posts do not need it.

| Action | Operation | Access | Purpose |
| --- | --- | --- | --- |
| `auth` | `register`, `login`, `logout`, `me` | public / session | Authentication |
| `reports` | `list` | public (`mine` needs session) | Community feed + filters |
| `reports` | `create` | citizen+ | Create a report (multipart photo) |
| `report` | `get` | public | Report detail + update history |
| `report` | `update` | officer, admin | Status, department, rejection reason |
| `report` | `comment` | officer, admin | Add an internal/public note |
| `report` | `confirm` | reporter only | Confirm a resolved report |
| `notifications` | `list`, `read` | session | In-app notifications |
| `users` | `list`, `update` | admin | Role and department management |
| `departments` | `list` | session | Department list |
| `stats` | — | officer, admin | Counts, repeated areas, officer performance |

---

## 7. Project structure

```
HANO/
├── index.html                 # App shell
├── manifest.webmanifest       # PWA manifest
├── sw.js                      # Offline service worker
├── README.md
├── api/
│   ├── api.php                # JSON API router
│   ├── config.php             # DB + upload configuration  ← EDIT THIS
│   ├── db.php                 # PDO connection
│   └── helpers.php            # Auth, validation, upload, notifications
├── assets/
│   ├── css/styles.css
│   ├── js/app.js              # UI, navigation, views, API client
│   ├── js/i18n.js             # English + Kinyarwanda strings
│   ├── js/demo.js             # localStorage fallback API
│   └── img/                   # Logo + PWA icons
├── database/hano.sql          # Schema + demonstration data
├── uploads/reports/           # Uploaded photos (protected .htaccess)
└── android/                   # Kotlin scaffold — NOT RUNNABLE, see its README
```

---

## 8. Not included yet (explicitly)

These items were **not** claimed as finished:

- **Push notifications / FCM** — the app has in-app notifications only. Web Push needs VAPID keys and a push service; Android needs `google-services.json`.
- **Real-time updates** — refresh the view to see changes; no WebSocket/listener yet.
- **Offline report sync queue** — offline mode writes to localStorage only; those reports are not uploaded later.
- **Native Android build** — `android/` is a source scaffold, not a compiled APK. It needs Android Studio, SDK, Firebase config and rules.
- **Production hardening** — HTTPS, rate limiting, CSRF tokens beyond the `X-HANO` header, account recovery/e-mail verification, audit logs and backups are not implemented.
- **Geocoding** — GPS coordinates and a typed place name are stored; reverse geocoding to an official address is not.
- **Photos in demo mode** are stored as data URLs in localStorage, so large photos can fill browser storage quickly.

---

## 9. Resetting the demo

In **DEMO MODE**, open **Profile → Reset demo data**. This clears localStorage and restores the 12 original sample reports.
Importing `database/hano.sql` again resets the MySQL database (this deletes all reports and users).

---

Built by Remy Niyogushimwa — <https://remyportfolio.vercel.app/> · GitHub: <https://github.com/niyogushimwa>
