-- Migration 001 — Add full_name to users
-- Run this against any database set up before feature/user-management.
-- The bootstrap admin row gets an empty string as a safe default.
USE prm_db;

ALTER TABLE users
ADD COLUMN full_name VARCHAR(100) NOT NULL DEFAULT '' AFTER id;

-- Remove the default so future inserts must supply full_name explicitly
ALTER TABLE users
ALTER COLUMN full_name
DROP DEFAULT;