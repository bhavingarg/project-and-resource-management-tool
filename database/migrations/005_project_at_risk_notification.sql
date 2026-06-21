-- =============================================================
-- Migration 005 — Project At-Risk Email Notification
--
-- Adds `at_risk_notified_at` to projects so the scheduler can
-- send one email per AT_RISK transition and not re-send on every
-- subsequent tick while the project remains AT_RISK.
--
-- Logic:
--   • NULL  → project has not been notified for its current AT_RISK status
--   • value → email was already sent; suppress until health improves then resets
--
-- Run against an existing prm_db with migrations 001–004 applied.
-- =============================================================
USE prm_db;

ALTER TABLE projects
ADD COLUMN at_risk_notified_at DATETIME NULL DEFAULT NULL COMMENT 'Timestamp of the last AT_RISK notification email. Reset to NULL when health improves.';