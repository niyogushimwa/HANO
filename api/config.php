<?php
/** HANO API configuration - edit these values for your XAMPP/MySQL setup. */
date_default_timezone_set('Africa/Kigali');

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'hano');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

define('UPLOAD_DIR', __DIR__ . '/../uploads/reports/');
define('UPLOAD_URL', 'uploads/reports/');
define('MAX_UPLOAD_BYTES', 5 * 1024 * 1024);
