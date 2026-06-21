-- =============================================================
-- Test Seed — Timesheet Reminder & Freeze Email Trigger
--
-- Creates:
--   • Manager  : Vani Chaturvedi  (vani.chaturvedi@intimetec.com)
--   • Resource : Bhavin Garg      (bhavin.garg@intimetec.com)
--   • Resource : Lakshit Ladha    (lakshit.ladha@intimetec.com)
--
-- Both resources have an active allocation covering week 2026-06-08
-- (13 days ago) with NO submitted timesheet — old enough to trigger
-- Reminder 1 (day 7), Reminder 2 (day 8), and Freeze (day 9+).
--
-- Remove with: database/seeds/003_reminder_freeze_test_cleanup.sql
-- =============================================================
USE prm_db;

-- ── Manager: Vani Chaturvedi ─────────────────────────────────
-- password = Vani@123
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES (
    'Vani Chaturvedi',
    'vani.chaturvedi',
    'vani.chaturvedi@intimetec.com',
    '$2b$12$a2p0K6/CHREIImeWWxBRUOGzaCQTVeSO7dsheFs6z0un0FRZcywl6',
    2,   -- role_id 2 = MANAGER
    1,
    0
);
SET @vani = LAST_INSERT_ID();

-- ── Resource: Bhavin Garg ────────────────────────────────────
-- password = Test@123
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES (
    'Bhavin Garg',
    'bhavin.garg',
    'bhavin.garg@intimetec.com',
    '$2b$12$LO13XV1crcHzO/B/PxQ7yOvc3EZEY/Z2s1uDTp/9O89ezP3veXbZi',
    3,   -- role_id 3 = RESOURCE
    1,
    0
);
SET @bhavin = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@bhavin, @vani, 'ALLOCATED', 'Engineering', 'Software Developer');

-- ── Resource: Lakshit Ladha ──────────────────────────────────
-- password = Test@123
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES (
    'Lakshit Ladha',
    'lakshit.ladha',
    'lakshit.ladha@intimetec.com',
    '$2b$12$LO13XV1crcHzO/B/PxQ7yOvc3EZEY/Z2s1uDTp/9O89ezP3veXbZi',
    3,   -- role_id 3 = RESOURCE
    1,
    0
);
SET @lakshit = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@lakshit, @vani, 'ALLOCATED', 'Engineering', 'Software Developer');

-- ── Project for the test allocations ────────────────────────
INSERT INTO projects (name, description, start_date, end_date, status, manager_id, health)
VALUES (
    'Reminder Freeze Test Project',
    'Dummy project used to trigger the timesheet reminder & freeze workflow.',
    '2026-01-01',
    '2026-12-31',
    'ACTIVE',
    @vani,
    'ON_TRACK'
);
SET @project = LAST_INSERT_ID();

-- ── Allocations covering week 2026-06-08 (13 days ago) ──────
-- No timesheets inserted → scheduler will detect miss and fire
-- Reminder 1, Reminder 2, and Freeze on next run.
INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@bhavin, @project, 100, '2026-05-01', '2026-12-31', 1);

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@lakshit, @project, 100, '2026-05-01', '2026-12-31', 1);
