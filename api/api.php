<?php
/**
 * HANO JSON API
 * All requests: GET for reads, POST (JSON or FormData) for writes.
 * Send header X-HANO: 1 on writes. Uses PHP sessions for authentication.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
session_start();

header('Access-Control-Allow-Credentials: true');
header('X-Content-Type-Options: nosniff');

$action = val('action', '');
$op = val('op', '');

if (!empty($_POST) && $_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_SERVER['HTTP_X_HANO'])) {
    fail('Missing request header.', 403);
}

try {
    switch ($action) {
        /* ------------------------------------------------------------ auth */
        case 'auth':
            if ($op === 'register') {
                $name = val('name');
                $email = val('email');
                $phone = val('phone');
                $password = val('password');
                if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
                    fail('Please enter your name.');
                }
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    fail('Please enter a valid email address.');
                }
                if (mb_strlen($password) < 8) {
                    fail('Password must be at least 8 characters.');
                }
                $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? OR (phone IS NOT NULL AND phone = ?)');
                $stmt->execute([$email, $phone]);
                if ($stmt->fetch()) {
                    fail('An account with this email or phone already exists.', 409);
                }
                $stmt = $pdo->prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, "citizen")');
                $stmt->execute([$name, $email, $phone ?: null, password_hash($password, PASSWORD_DEFAULT)]);
                $_SESSION['user_id'] = (int) $pdo->lastInsertId();
                ok(['user' => current_user($pdo)], 201);
            }
            if ($op === 'login') {
                $identifier = val('identifier');
                $password = val('password');
                $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1');
                $stmt->execute([$identifier, $identifier]);
                $row = $stmt->fetch();
                if (!$row || !password_verify($password, $row['password_hash'])) {
                    fail('Incorrect email/phone or password.', 401);
                }
                $_SESSION['user_id'] = (int) $row['id'];
                ok(['user' => current_user($pdo)]);
            }
            if ($op === 'logout') {
                $_SESSION = [];
                session_destroy();
                ok();
            }
            if ($op === 'me' || $op === '') {
                $u = current_user($pdo);
                ok(['user' => $u]);
            }
            fail('Unknown auth operation.', 404);
            break;

        /* -------------------------------------------------------- reports */
        case 'reports':
            if ($op === 'list') {
                // Public community feed. The "mine" filter still requires a session.
                if (val('mine')) { require_auth($pdo); }
                $where = [];
                $params = [];
                if (val('category')) { $where[] = 'r.category = ?'; $params[] = val('category'); }
                if (val('status')) { $where[] = 'r.status = ?'; $params[] = val('status'); }
                if (val('mine')) { $where[] = 'r.user_id = ?'; $params[] = user(); }
                if (val('department')) { $where[] = 'r.department_id = ?'; $params[] = (int) val('department'); }
                if (val('q')) { $where[] = '(r.title LIKE ? OR r.description LIKE ? OR r.location_name LIKE ?)'; $like = '%' . val('q') . '%'; $params[] = $like; $params[] = $like; $params[] = $like; }
                $sql = 'SELECT r.*, u.name AS reporter_name, d.name_en AS department_en, d.name_rw AS department_rw
                        FROM reports r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN departments d ON d.id = r.department_id';
                if ($where) { $sql .= ' WHERE ' . implode(' AND ', $where); }
                $sql .= ' ORDER BY r.created_at DESC LIMIT 200';
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                ok(['reports' => $stmt->fetchAll()]);
            }
            if ($op === 'create') {
                $u = require_auth($pdo);
                $category = val('category');
                $title = val('title');
                $description = val('description');
                $allowedCats = ['waste', 'water', 'drainage', 'roads', 'streetlights', 'infrastructure', 'other'];
                if (!in_array($category, $allowedCats, true)) { fail('Please choose a valid category.'); }
                if (mb_strlen($title) < 5 || mb_strlen($title) > 180) { fail('Title must be between 5 and 180 characters.'); }
                if (mb_strlen($description) < 10) { fail('Please describe the problem in at least 10 characters.'); }
                $lat = val('latitude', null);
                $lng = val('longitude', null);
                if (($lat !== null && $lat !== '' && !valid_lat($lat)) || ($lng !== null && $lng !== '' && !valid_lng($lng))) {
                    fail('Invalid GPS coordinates.');
                }
                $photo = save_photo($_FILES['photo'] ?? null);
                $id = next_report_id($pdo);
                $stmt = $pdo->prepare('INSERT INTO reports (id, user_id, category, title, description, photo, latitude, longitude, location_name, status)
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "submitted")');
                $stmt->execute([
                    $id, $u['id'], $category, $title, $description, $photo,
                    $lat !== '' ? $lat : null, $lng !== '' ? $lng : null, val('location_name') ?: null,
                ]);
                add_update($pdo, $id, $u['id'], null, 'submitted', 'Report submitted by citizen.');
                notify_role($pdo, 'admin', $id, 'New report submitted', $title);
                notify_role($pdo, 'officer', $id, 'New report in your area', $title);
                ok(['report' => fetch_report($pdo, $id)], 201);
            }
            fail('Unknown reports operation.', 404);
            break;

        /* --------------------------------------------------------- report */
        case 'report':
            $id = val('id');
            if ($op === 'get') {
                $report = fetch_report($pdo, $id);
                if (!$report) { fail('Report not found.', 404); }
                ok(['report' => $report, 'updates' => fetch_updates($pdo, $id)]);
            }
            if ($op === 'update') {
                $u = require_role($pdo, ['officer', 'admin']);
                $report = fetch_report($pdo, $id);
                if (!$report) { fail('Report not found.', 404); }
                $status = val('status');
                $allowed = ['under_review', 'assigned', 'in_progress', 'resolved', 'rejected'];
                if (!in_array($status, $allowed, true)) { fail('Invalid status.'); }
                $dept = val('department_id') ?: $report['department_id'];
                if (($status === 'assigned' || $status === 'in_progress') && !$dept) {
                    fail('Choose a department before assigning or progressing this report.');
                }
                if ($status === 'rejected' && mb_strlen(val('note')) < 5) {
                    fail('Please explain why the report is rejected.');
                }
                $stmt = $pdo->prepare('UPDATE reports SET status = ?, department_id = ?, rejected_reason = ?, resolved_confirmed = 0 WHERE id = ?');
                $stmt->execute([
                    $status, $dept ?: null,
                    $status === 'rejected' ? val('note') : null, $id,
                ]);
                add_update($pdo, $id, $u['id'], $report['status'], $status, val('note') ?: null);
                notify_report_owner($pdo, $id, 'Report status changed', 'Your report ' . $id . ' is now: ' . $status . '.');
                ok(['report' => fetch_report($pdo, $id)]);
            }
            if ($op === 'comment') {
                $u = require_role($pdo, ['officer', 'admin']);
                $note = val('note');
                if (mb_strlen($note) < 2) { fail('Please write a comment.'); }
                add_update($pdo, $id, $u['id'], null, val('status') ?: 'comment', $note);
                notify_report_owner($pdo, $id, 'New update on your report', $note);
                ok(['updates' => fetch_updates($pdo, $id)]);
            }
            if ($op === 'confirm') {
                $u = require_auth($pdo);
                $stmt = $pdo->prepare('SELECT user_id, status FROM reports WHERE id = ?');
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                if (!$row) { fail('Report not found.', 404); }
                if ((int) $row['user_id'] !== $u['id']) { fail('Only the reporter can confirm this.', 403); }
                if ($row['status'] !== 'resolved') { fail('Only resolved reports can be confirmed.'); }
                $pdo->prepare('UPDATE reports SET resolved_confirmed = 1 WHERE id = ?')->execute([$id]);
                add_update($pdo, $id, $u['id'], 'resolved', 'resolved', 'Citizen confirmed the issue is fixed.');
                ok();
            }
            fail('Unknown report operation.', 404);
            break;

        /* -------------------------------------------------- notifications */
        case 'notifications':
            if ($op === 'list') {
                require_auth($pdo);
                $stmt = $pdo->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100');
                $stmt->execute([user()]);
                ok(['notifications' => $stmt->fetchAll()]);
            }
            if ($op === 'read') {
                require_auth($pdo);
                $id = (int) val('id');
                if ($id) {
                    $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
                    $stmt->execute([$id, user()]);
                } else {
                    $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')->execute([user()]);
                }
                ok();
            }
            fail('Unknown notifications operation.', 404);
            break;

        /* ---------------------------------------------------------- users */
        case 'users':
            require_role($pdo, ['admin']);
            if ($op === 'list') {
                $stmt = $pdo->query('SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, u.created_at, d.name_en AS department
                                     FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.id');
                ok(['users' => $stmt->fetchAll()]);
            }
            if ($op === 'update') {
                $id = (int) val('id');
                $role = val('role');
                $dept = (int) val('department_id') ?: null;
                if (!in_array($role, ['citizen', 'officer', 'admin'], true)) { fail('Invalid role.'); }
                if ($id === user()) { fail('You cannot change your own role.'); }
                $stmt = $pdo->prepare('UPDATE users SET role = ?, department_id = ? WHERE id = ?');
                $stmt->execute([$role, $dept, $id]);
                ok();
            }
            fail('Unknown users operation.', 404);
            break;

        /* --------------------------------------------------- departments */
        case 'departments':
            if ($op === 'list') {
                require_auth($pdo);
                ok(['departments' => $pdo->query('SELECT * FROM departments ORDER BY id')->fetchAll()]);
            }
            fail('Unknown departments operation.', 404);
            break;

        /* --------------------------------------------------------- stats */
        case 'stats':
            require_role($pdo, ['admin', 'officer']);
            $stats = [
                'by_status' => [],
                'by_category' => [],
                'repeated_areas' => [],
                'officers' => [],
            ];
            foreach ($pdo->query('SELECT status, COUNT(*) AS n FROM reports GROUP BY status')->fetchAll() as $r) {
                $stats['by_status'][$r['status']] = (int) $r['n'];
            }
            foreach ($pdo->query('SELECT category, COUNT(*) AS n FROM reports GROUP BY category')->fetchAll() as $r) {
                $stats['by_category'][$r['category']] = (int) $r['n'];
            }
            foreach ($pdo->query('SELECT location_name, COUNT(*) AS n FROM reports WHERE location_name IS NOT NULL GROUP BY location_name HAVING n > 1 ORDER BY n DESC LIMIT 10')->fetchAll() as $r) {
                $stats['repeated_areas'][] = $r;
            }
            foreach ($pdo->query('SELECT u.name, COUNT(r.id) AS n FROM users u LEFT JOIN reports r ON r.department_id = u.department_id WHERE u.role = "officer" GROUP BY u.id ORDER BY n DESC')->fetchAll() as $r) {
                $stats['officers'][] = $r;
            }
            ok(['stats' => $stats]);
            break;

        default:
            fail('Unknown API action.', 404);
    }
} catch (PDOException $e) {
    fail('Database error. Check that database/hano.sql was imported.', 500, ['detail' => $e->getMessage()]);
} catch (Throwable $e) {
    fail('Unexpected server error.', 500, ['detail' => $e->getMessage()]);
}
