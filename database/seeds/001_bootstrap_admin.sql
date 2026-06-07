-- =============================================================
-- Seed 001 — Bootstrap Admin Account
-- Creates the first Admin user with default credentials.
-- Password: Admin@1234  (bcrypt hash — replace if you regenerate)
--
-- The user is flagged force_password_change = 1 so they must
-- set a new password on first login, as required by the BRD.
--
-- Run ONCE on a fresh database after applying the schema.
-- =============================================================
USE prm_db;

INSERT INTO
    users (
        username,
        email,
        password_hash,
        role,
        is_active,
        force_password_change
    )
VALUES
    (
        'admin',
        'admin@techserve.local',
        -- bcrypt hash of 'Admin@1234' with cost factor 12
        -- Regenerate with: bcrypt.hash('Admin@1234', 12)
        '$2b$12$PLACEHOLDER_REPLACE_WITH_REAL_HASH',
        'ADMIN',
        1,
        1
    );

INSERT INTO
    system_config (config_key, config_value)
VALUES
    ('llm_provider', 'gemini'),
    ('llm_api_key', ''),
    ('scheduler_interval_hours', '4'),
    ('max_weekly_hours', '40');