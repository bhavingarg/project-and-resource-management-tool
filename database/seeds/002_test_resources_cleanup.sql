-- =============================================================
-- PRM Test Cleanup — Remove AI Skill Match Test Resources
-- File  : database/seeds/002_test_resources_cleanup.sql
-- Run this after finishing AI skill match / team staffing tests.
-- =============================================================
USE prm_db;

SET
    FOREIGN_KEY_CHECKS = 0;

-- Capture the IDs of all test users
CREATE TEMPORARY TABLE IF NOT EXISTS _test_user_ids AS
SELECT
    id
FROM
    users
WHERE
    username LIKE '%.test';

-- Remove allocations
DELETE FROM allocations
WHERE
    resource_id IN (
        SELECT
            id
        FROM
            _test_user_ids
    );

-- Remove resource skills
DELETE FROM resource_skills
WHERE
    user_id IN (
        SELECT
            id
        FROM
            _test_user_ids
    );

-- Remove resource profiles
DELETE FROM resource_profiles
WHERE
    user_id IN (
        SELECT
            id
        FROM
            _test_user_ids
    );

-- Remove users
DELETE FROM users
WHERE
    id IN (
        SELECT
            id
        FROM
            _test_user_ids
    );

DROP TEMPORARY TABLE _test_user_ids;

SET
    FOREIGN_KEY_CHECKS = 1;

SELECT
    'Test resources removed.' AS status;