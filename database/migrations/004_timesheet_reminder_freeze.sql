-- =============================================================
-- Migration 004 — Timesheet Reminder & Account Freeze
--
-- Adds support for the automated timesheet reminder → freeze workflow:
--   1. track reminder / freeze lifecycle per employee per missed week
--   2. flag individual resource profiles as frozen
--
-- Run against an existing prm_db that has migrations 001–003 applied.
-- =============================================================
USE prm_db;

-- ─────────────────────────────────────────────────────────────
-- STEP 1 — Add timesheet_frozen flag to resource_profiles
--          0 = normal access  |  1 = frozen (cannot submit)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE resource_profiles
ADD COLUMN timesheet_frozen TINYINT (1) NOT NULL DEFAULT 0 COMMENT '1 when timesheet submission is frozen pending manager review';

-- ─────────────────────────────────────────────────────────────
-- STEP 2 — Create timesheet_reminders
--          One row per employee per missed week; tracks each
--          reminder and the eventual freeze / restore event.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE
    IF NOT EXISTS timesheet_reminders (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        week_start_date DATE NOT NULL,
        reminder1_sent_at DATETIME NULL DEFAULT NULL COMMENT 'When the first reminder email was sent',
        reminder2_sent_at DATETIME NULL DEFAULT NULL COMMENT 'When the second reminder email was sent',
        frozen_at DATETIME NULL DEFAULT NULL COMMENT 'When timesheet access was frozen',
        restored_at DATETIME NULL DEFAULT NULL COMMENT 'When the manager restored access',
        restored_by INT UNSIGNED NULL DEFAULT NULL COMMENT 'user_id of the manager who restored access',
        PRIMARY KEY (id),
        UNIQUE KEY uq_tr_user_week (user_id, week_start_date),
        CONSTRAINT fk_tr_user FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_tr_restored_by FOREIGN KEY (restored_by) REFERENCES users (id)
    ) ENGINE = InnoDB;