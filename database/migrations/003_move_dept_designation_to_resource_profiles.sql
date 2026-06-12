-- Migration 003: Move department and designation from users → resource_profiles
-- Clears all non-admin user data (dev reset) and restructures the columns.
SET
    FOREIGN_KEY_CHECKS = 0;

-- Wipe all non-admin user data
DELETE FROM timesheet_tags;

DELETE FROM timesheets;

DELETE FROM allocations;

DELETE FROM resource_skills;

DELETE FROM milestones;

DELETE FROM projects;

DELETE FROM resource_profiles;

DELETE FROM users
WHERE
    id NOT IN (
        SELECT
            id
        FROM
            (
                SELECT
                    u.id
                FROM
                    users u
                    JOIN roles r ON r.id = u.role_id
                WHERE
                    r.name = 'ADMIN'
            ) t
    );

-- Drop department and designation from users
ALTER TABLE users
DROP COLUMN department,
DROP COLUMN designation;

-- Add department and designation to resource_profiles
ALTER TABLE resource_profiles
ADD COLUMN department VARCHAR(100) NULL AFTER status,
ADD COLUMN designation VARCHAR(100) NULL AFTER department;

SET
    FOREIGN_KEY_CHECKS = 1;