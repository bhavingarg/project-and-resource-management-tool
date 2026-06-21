-- =============================================================
-- Fix: Remove old Lakshit Ladha and complete the test seed
--
-- 1. Deletes old Lakshit (id=13) and all his dependent data
-- 2. Inserts new Lakshit with lakshit.ladha@intimetec.com
--    reporting to Vani (id=25), allocated to project id=4
-- 3. Ensures Bhavin (id=26) also has an allocation to project 4
-- =============================================================
USE prm_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ── Clean up old Lakshit (id=13) ────────────────────────────
DELETE tt FROM timesheet_tags tt
JOIN timesheets ts ON ts.id = tt.timesheet_id
JOIN allocations a ON a.id = ts.allocation_id
WHERE a.resource_id = 13;

DELETE ts FROM timesheets ts
JOIN allocations a ON a.id = ts.allocation_id
WHERE a.resource_id = 13;

DELETE FROM timesheet_reminders WHERE user_id = 13;
DELETE FROM allocations WHERE resource_id = 13;
DELETE FROM resource_skills WHERE user_id = 13;
DELETE FROM resource_profiles WHERE user_id = 13;
DELETE FROM users WHERE id = 13;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Insert new Lakshit Ladha ─────────────────────────────────
-- password = Test@123
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES (
    'Lakshit Ladha',
    'lakshit.ladha',
    'lakshit.ladha@intimetec.com',
    '$2b$12$LO13XV1crcHzO/B/PxQ7yOvc3EZEY/Z2s1uDTp/9O89ezP3veXbZi',
    3,
    1,
    0
);
SET @lakshit = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@lakshit, 25, 'ALLOCATED', 'Engineering', 'Software Developer');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@lakshit, 4, 100, '2026-05-01', '2026-12-31', 1);

-- ── Ensure Bhavin (id=26) also has an allocation to project 4 ─
INSERT IGNORE INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (26, 4, 100, '2026-05-01', '2026-12-31', 1);
