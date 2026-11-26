-- HANO - Community Problem Reporting
-- Database schema + demonstration data (XAMPP / MySQL 8+)
-- Import in phpMyAdmin, then set credentials in api/config.php

CREATE DATABASE IF NOT EXISTS hano CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hano;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS report_updates;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

CREATE TABLE departments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(120) NOT NULL,
    name_rw VARCHAR(120) NOT NULL,
    description VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    phone VARCHAR(30) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('citizen','officer','admin') NOT NULL DEFAULT 'citizen',
    department_id INT UNSIGNED DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
    id CHAR(12) NOT NULL PRIMARY KEY,                 -- HANO-2026-0001 style
    user_id INT UNSIGNED NOT NULL,
    category VARCHAR(40) NOT NULL,                    -- waste|water|drainage|roads|streetlights|infrastructure|other
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    photo VARCHAR(255) DEFAULT NULL,
    latitude DECIMAL(10,7) DEFAULT NULL,
    longitude DECIMAL(10,7) DEFAULT NULL,
    location_name VARCHAR(180) DEFAULT NULL,
    status ENUM('submitted','under_review','assigned','in_progress','resolved','rejected') NOT NULL DEFAULT 'submitted',
    department_id INT UNSIGNED DEFAULT NULL,
    rejected_reason VARCHAR(255) DEFAULT NULL,
    resolved_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_reports_status (status),
    INDEX idx_reports_category (category),
    INDEX idx_reports_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_updates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id CHAR(12) NOT NULL,
    actor_id INT UNSIGNED NOT NULL,
    from_status VARCHAR(30) DEFAULT NULL,
    to_status VARCHAR(30) NOT NULL,
    note VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_update_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_update_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    report_id CHAR(12) DEFAULT NULL,
    title VARCHAR(180) NOT NULL,
    body VARCHAR(300) DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- departments
INSERT INTO departments (id, name_en, name_rw, description) VALUES
(1, 'Waste Management', 'Gucunga Imyanda', 'Collection and disposal of household and public waste'),
(2, 'Water & Sanitation', 'Amazi n’Isuku', 'Public taps, drainage and sanitation infrastructure'),
(3, 'Roads & Transport', 'Imihanda n’Ubwikorezi', 'Public roads, potholes and street lighting'),
(4, 'Electrical & Lighting', 'Amashanyarazi n’Itara', 'Streetlights and public electricity'),
(5, 'General Services', 'Serivisi Rusange', 'Other public infrastructure and community concerns');

-- ---------------------------------------------------------------- users
-- Demo passwords: Admin123! / Officer123! / Citizen123!
INSERT INTO users (id, name, email, phone, password_hash, role, department_id) VALUES
(1, 'HANO Administrator', 'admin@hano.rw', '+250780000001', '$2y$10$JCx22wqSp.mVwgjPBwMiA.18pQoSqcF2REDDWdLWADm9LMtGkzxYW', 'admin', NULL),
(2, 'Alice Uwimana', 'alice@hano.rw', '+250780000002', '$2y$10$TZSjPq9Q25aGCr1/fvlSweL3QHslwzszphup6NREUvz8EMkBkTZBi', 'officer', 1),
(3, 'Jean Nkurunziza', 'jean@hano.rw', '+250780000003', '$2y$10$TZSjPq9Q25aGCr1/fvlSweL3QHslwzszphup6NREUvz8EMkBkTZBi', 'officer', 2),
(4, 'Remy Niyogushimwa', 'remy@example.com', '+250793138244', '$2y$10$irEIvqo.293bDdHN9LLaLOW0zgW8wey68gBBd.xrbeNgkrz0P1YnW', 'citizen', NULL),
(5, 'Marie Mukamana', 'marie@example.com', '+250780000005', '$2y$10$irEIvqo.293bDdHN9LLaLOW0zgW8wey68gBBd.xrbeNgkrz0P1YnW', 'citizen', NULL);

-- ---------------------------------------------------------------- reports
INSERT INTO reports (id, user_id, category, title, description, photo, latitude, longitude, location_name, status, department_id, created_at, updated_at) VALUES
('HANO-1001', 4, 'waste', 'Uncollected garbage near the market', 'Waste has not been collected for over a week behind Kimironko market. It is affecting shops and children walking home.', NULL, -1.9470, 30.1420, 'Kimironko, Gasabo, Kigali', 'in_progress', 1, '2026-11-10 08:20:00', '2026-11-15 10:05:00'),
('HANO-1002', 5, 'water', 'Broken public water tap', 'The public tap in Ngoma sector has been broken for four days. Families are walking long distances for water.', NULL, -2.6020, 29.7300, 'Ngoma, Huye', 'assigned', 2, '2026-11-12 14:10:00', '2026-11-14 09:00:00'),
('HANO-1003', 4, 'roads', 'Deep potholes on the main road', 'Several potholes have appeared on the road to the district office. Motorbikes are falling, especially after rain.', NULL, -1.9600, 30.0600, 'Kaciru, Nyarugenge, Kigali', 'under_review', 3, '2026-11-18 07:45:00', '2026-11-18 07:45:00'),
('HANO-1004', 5, 'drainage', 'Blocked drainage causing floods', 'The drainage channel is full of plastic waste. After heavy rain the road and nearby homes are flooded.', NULL, -1.9330, 30.0900, 'Nyabugogo, Nyarugenge, Kigali', 'submitted', 2, '2026-11-20 16:30:00', '2026-11-20 16:30:00'),
('HANO-1005', 4, 'streetlights', 'Streetlight out near the school', 'Three lights are not working near the primary school. The area is dark in the early morning and evening.', NULL, -2.5900, 29.7400, 'Rwakada, Huye', 'resolved', 4, '2026-11-01 06:15:00', '2026-11-08 17:40:00'),
('HANO-1006', 5, 'waste', 'Illegal dumping site beside the river', 'People are dumping household waste near the river bank. It smells and pollutes the water.', NULL, -2.1000, 30.1500, 'Rwamagana Sector, Rwamagana', 'in_progress', 1, '2026-11-05 11:00:00', '2026-11-11 08:30:00'),
('HANO-1007', 4, 'infrastructure', 'Damaged classroom desks', 'Several desks in the community classroom are broken and children cannot sit comfortably.', NULL, -2.4500, 29.8300, 'Kigoma, Huye', 'submitted', 5, '2026-11-21 09:25:00', '2026-11-21 09:25:00'),
('HANO-1008', 5, 'roads', 'Broken bridge railing', 'The railing of the small bridge is broken. This is dangerous for children crossing to school.', NULL, -2.7200, 29.5100, 'Kicukiro, Ntungamo', 'resolved', 3, '2026-10-25 13:00:00', '2026-11-03 15:10:00'),
('HANO-1009', 4, 'water', 'Leaking pipe wasting water', 'A public pipe is leaking continuously and the road is becoming muddy.', NULL, -1.9700, 30.1100, 'Kibagabaga, Gasabo, Kigali', 'rejected', 2, '2026-11-02 10:00:00', '2026-11-04 12:00:00'),
('HANO-1010', 5, 'streetlights', 'Light needed at the bus stop', 'The bus stop area has no lighting and passengers wait in the dark.', NULL, -1.9450, 30.0500, 'Kigali Bus Park area', 'assigned', 4, '2026-11-16 18:20:00', '2026-11-17 08:00:00'),
('HANO-1011', 4, 'waste', 'Market waste piles after closing', 'Traders leave vegetable waste in the market after closing. It attracts flies and rats.', NULL, -2.6000, 29.7500, 'Huye Main Market', 'under_review', 1, '2026-11-19 17:05:00', '2026-11-19 17:05:00'),
('HANO-1012', 5, 'other', 'Community notice board destroyed', 'The notice board where job and training information is posted was destroyed by the wind.', NULL, -2.5500, 29.7700, 'Rusumo, Huye', 'submitted', 5, '2026-11-22 07:50:00', '2026-11-22 07:50:00');

UPDATE reports SET rejected_reason = 'Duplicate of an existing report in the same area. Thank you for reporting.' WHERE id = 'HANO-1009';
UPDATE reports SET resolved_confirmed = 1 WHERE id = 'HANO-1005';

-- ---------------------------------------------------------------- update history
INSERT INTO report_updates (report_id, actor_id, from_status, to_status, note, created_at) VALUES
('HANO-1001', 1, 'submitted', 'under_review', 'Report received and verified.', '2026-11-10 09:00:00'),
('HANO-1001', 2, 'under_review', 'assigned', 'Assigned to Waste Management team.', '2026-11-12 08:30:00'),
('HANO-1001', 2, 'assigned', 'in_progress', 'Collection truck scheduled for this week.', '2026-11-15 10:05:00'),
('HANO-1002', 1, 'submitted', 'under_review', 'Confirmed by local officer.', '2026-11-13 08:00:00'),
('HANO-1002', 3, 'under_review', 'assigned', 'Water team will inspect the tap.', '2026-11-14 09:00:00'),
('HANO-1005', 4, 'resolved', 'resolved', 'Citizen confirmed the light is working again.', '2026-11-09 07:30:00');

-- ---------------------------------------------------------------- notifications
INSERT INTO notifications (user_id, report_id, title, body, is_read, created_at) VALUES
(4, 'HANO-1001', 'Your report is in progress', 'Waste Management has scheduled collection for Kimironko.', 0, '2026-11-15 10:06:00'),
(4, 'HANO-1003', 'Report under review', 'An officer is reviewing your road report.', 0, '2026-11-18 07:46:00'),
(5, 'HANO-1002', 'Report assigned', 'The water report in Ngoma was assigned to a team.', 0, '2026-11-14 09:01:00'),
(5, 'HANO-1008', 'Report resolved', 'The bridge railing has been repaired. Please confirm.', 1, '2026-11-03 15:11:00');
