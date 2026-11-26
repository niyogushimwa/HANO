<?php
/** Shared helpers for the HANO JSON API. */

function send($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ok($data = [], $code = 200)
{
    send(array_merge(['ok' => true], $data), $code);
}

function fail($message, $code = 400, $extra = [])
{
    send(array_merge(['ok' => false, 'error' => $message], $extra), $code);
}

function body()
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    $cached = is_array($decoded) ? $decoded : [];
    return $cached;
}

function val($key, $default = '')
{
    $b = body();
    $v = $b[$key] ?? $_POST[$key] ?? $_GET[$key] ?? $default;
    return is_string($v) ? trim($v) : $v;
}

function user()
{
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
}

function current_user($pdo)
{
    if (!user()) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, name, email, phone, role, department_id, created_at FROM users WHERE id = ?');
    $stmt->execute([user()]);
    return $stmt->fetch() ?: null;
}

function require_auth($pdo)
{
    $u = current_user($pdo);
    if (!$u) {
        fail('Please sign in to continue.', 401);
    }
    return $u;
}

function require_role($pdo, array $roles)
{
    $u = require_auth($pdo);
    if (!in_array($u['role'], $roles, true)) {
        fail('You do not have permission for this action.', 403);
    }
    return $u;
}

function next_report_id($pdo)
{
    $stmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(id, 6) AS UNSIGNED)) AS n FROM reports WHERE id LIKE 'HANO-%'");
    $n = (int) ($stmt->fetchColumn() ?: 1000);
    return 'HANO-' . str_pad((string) ($n + 1), 4, '0', STR_PAD_LEFT);
}

function add_update($pdo, $reportId, $actorId, $from, $to, $note = null)
{
    $stmt = $pdo->prepare('INSERT INTO report_updates (report_id, actor_id, from_status, to_status, note) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$reportId, $actorId, $from ?: null, $to, $note ?: null]);
}

function notify($pdo, $userId, $reportId, $title, $bodyMessage)
{
    $stmt = $pdo->prepare('INSERT INTO notifications (user_id, report_id, title, body) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, $reportId, $title, $bodyMessage]);
}

function notify_report_owner($pdo, $reportId, $title, $bodyMessage)
{
    $stmt = $pdo->prepare('SELECT user_id FROM reports WHERE id = ?');
    $stmt->execute([$reportId]);
    $uid = $stmt->fetchColumn();
    if ($uid) {
        notify($pdo, (int) $uid, $reportId, $title, $bodyMessage);
    }
}

function notify_role($pdo, $role, $reportId, $title, $bodyMessage)
{
    $stmt = $pdo->prepare('SELECT id FROM users WHERE role = ?');
    $stmt->execute([$role]);
    foreach ($stmt->fetchAll() as $row) {
        notify($pdo, (int) $row['id'], $reportId, $title, $bodyMessage);
    }
}

function fetch_report($pdo, $id)
{
    $stmt = $pdo->prepare('SELECT r.*, u.name AS reporter_name, d.name_en AS department_en, d.name_rw AS department_rw
                            FROM reports r
                            LEFT JOIN users u ON u.id = r.user_id
                            LEFT JOIN departments d ON d.id = r.department_id
                            WHERE r.id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function fetch_updates($pdo, $id)
{
    $stmt = $pdo->prepare('SELECT hu.to_status, hu.from_status, hu.note, hu.created_at, u.name AS actor
                            FROM report_updates hu JOIN users u ON u.id = hu.actor_id
                            WHERE hu.report_id = ? ORDER BY hu.created_at ASC');
    $stmt->execute([$id]);
    return $stmt->fetchAll();
}

function save_photo($file)
{
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK || empty($file['tmp_name'])) {
        return null;
    }
    if ($file['size'] > MAX_UPLOAD_BYTES) {
        fail('Photo is too large (maximum 5 MB).', 400);
    }
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $type = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : '';
    if (!isset($allowed[$type])) {
        fail('Only JPG, PNG and WebP photos are accepted.', 400);
    }
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }
    $name = 'hano_' . date('Ymd_His') . '_' . bin2hex(random_bytes(5)) . '.' . $allowed[$type];
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name)) {
        fail('Could not save the photo. Check folder permissions.', 500);
    }
    return UPLOAD_URL . $name;
}

function valid_lat($v)
{
    return is_numeric($v) && $v >= -90 && $v <= 90;
}

function valid_lng($v)
{
    return is_numeric($v) && $v >= -180 && $v <= 180;
}
