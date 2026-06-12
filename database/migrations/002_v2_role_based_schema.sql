-- =============================================================
-- Migration 002 — V2 Role-Based Schema
--
-- Transforms the V1 schema into the V2 role-based design:
--   • Introduces a `roles` table (replaces inline enum on users)
--   • Introduces a `role_access` table for future permission enforcement
--   • Merges employee profile fields (department, designation) into users
--   • Introduces `resource_profiles` for RESOURCE-only fields
--     (status, reporting_to) — eliminates nulls on users
--   • Renames employee_skills → resource_skills (user_id FK)
--   • Renames allocations.employee_id → resource_id (points to users)
--   • Replaces timesheets (employee_id + project_id) → allocation_id FK
--   • Drops the now-redundant `employees` table
--
-- Run against an existing prm_db that has migration 001 applied.
-- =============================================================
USE prm_db;

-- ─────────────────────────────────────────────────────────────
-- STEP 1 — Create roles table and seed the three roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE
    IF NOT EXISTS roles (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_role_name (name)
    ) ENGINE = InnoDB;

INSERT INTO
    roles (name, description)
VALUES
    (
        'ADMIN',
        'System operator — manages master data and configuration'
    ),
    (
        'MANAGER',
        'Delivery manager — manages team allocations and projects'
    ),
    (
        'RESOURCE',
        'Individual contributor — submits timesheets and views own data'
    );

-- ─────────────────────────────────────────────────────────────
-- STEP 2 — Create role_access table and seed base permissions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE
    IF NOT EXISTS role_access (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        role_id INT UNSIGNED NOT NULL,
        entity VARCHAR(50) NOT NULL,
        permission ENUM ('NONE', 'READ', 'WRITE', 'MANAGE') NOT NULL DEFAULT 'NONE',
        PRIMARY KEY (id),
        UNIQUE KEY uq_role_entity (role_id, entity),
        CONSTRAINT fk_role_access_role FOREIGN KEY (role_id) REFERENCES roles (id)
    ) ENGINE = InnoDB;

-- ADMIN permissions
INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'USERS',
    'MANAGE'
FROM
    roles
WHERE
    name = 'ADMIN';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'PROJECTS',
    'MANAGE'
FROM
    roles
WHERE
    name = 'ADMIN';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'ALLOCATIONS',
    'READ'
FROM
    roles
WHERE
    name = 'ADMIN';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'TIMESHEETS',
    'READ'
FROM
    roles
WHERE
    name = 'ADMIN';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'RESOURCE_SKILLS',
    'READ'
FROM
    roles
WHERE
    name = 'ADMIN';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'SYSTEM_CONFIG',
    'MANAGE'
FROM
    roles
WHERE
    name = 'ADMIN';

-- MANAGER permissions
INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'USERS',
    'READ'
FROM
    roles
WHERE
    name = 'MANAGER';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'PROJECTS',
    'WRITE'
FROM
    roles
WHERE
    name = 'MANAGER';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'ALLOCATIONS',
    'MANAGE'
FROM
    roles
WHERE
    name = 'MANAGER';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'TIMESHEETS',
    'READ'
FROM
    roles
WHERE
    name = 'MANAGER';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'RESOURCE_SKILLS',
    'READ'
FROM
    roles
WHERE
    name = 'MANAGER';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'SYSTEM_CONFIG',
    'NONE'
FROM
    roles
WHERE
    name = 'MANAGER';

-- RESOURCE permissions
INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'USERS',
    'READ'
FROM
    roles
WHERE
    name = 'RESOURCE';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'PROJECTS',
    'READ'
FROM
    roles
WHERE
    name = 'RESOURCE';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'ALLOCATIONS',
    'READ'
FROM
    roles
WHERE
    name = 'RESOURCE';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'TIMESHEETS',
    'WRITE'
FROM
    roles
WHERE
    name = 'RESOURCE';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'RESOURCE_SKILLS',
    'MANAGE'
FROM
    roles
WHERE
    name = 'RESOURCE';

INSERT INTO
    role_access (role_id, entity, permission)
SELECT
    id,
    'SYSTEM_CONFIG',
    'NONE'
FROM
    roles
WHERE
    name = 'RESOURCE';

-- ─────────────────────────────────────────────────────────────
-- STEP 3 — Add role_id + profile fields to users
--          Migrate role enum → role_id FK, then drop enum column
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
ADD COLUMN role_id INT UNSIGNED NULL AFTER id,
ADD COLUMN department VARCHAR(100) NOT NULL DEFAULT '' AFTER password_hash,
ADD COLUMN designation VARCHAR(100) NOT NULL DEFAULT '' AFTER department;

-- Populate role_id from the existing role enum
-- EMPLOYEE maps to RESOURCE in V2
UPDATE users u
JOIN roles r ON r.name = CASE u.role
    WHEN 'ADMIN' THEN 'ADMIN'
    WHEN 'MANAGER' THEN 'MANAGER'
    WHEN 'EMPLOYEE' THEN 'RESOURCE'
END
SET
    u.role_id = r.id;

-- Copy department and designation from employees into users
UPDATE users u
JOIN employees e ON e.user_id = u.id
SET
    u.department = e.department,
    u.designation = e.designation;

-- Now make role_id NOT NULL and add FK
ALTER TABLE users MODIFY COLUMN role_id INT UNSIGNED NOT NULL,
ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles (id);

-- Drop the old enum column
ALTER TABLE users
DROP COLUMN role;

-- ─────────────────────────────────────────────────────────────
-- STEP 4 — Create resource_profiles
--          Migrate status + manager_id from employees
-- ─────────────────────────────────────────────────────────────
CREATE TABLE
    IF NOT EXISTS resource_profiles (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        reporting_to INT UNSIGNED NOT NULL,
        status ENUM ('BENCH', 'ALLOCATED') NOT NULL DEFAULT 'BENCH',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_resource_profile_user (user_id),
        CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_rp_manager FOREIGN KEY (reporting_to) REFERENCES users (id)
    ) ENGINE = InnoDB;

-- Migrate from employees — only rows that have a manager assigned
-- Resources without a manager are not inserted here yet;
-- the application will require a manager to be assigned before a profile is complete.
INSERT INTO
    resource_profiles (user_id, reporting_to, status)
SELECT
    e.user_id,
    e.manager_id,
    e.status
FROM
    employees e
WHERE
    e.manager_id IS NOT NULL
    AND e.user_id IN (
        SELECT
            u.id
        FROM
            users u
            JOIN roles r ON r.id = u.role_id
        WHERE
            r.name = 'RESOURCE'
    );

-- ─────────────────────────────────────────────────────────────
-- STEP 5 — Create resource_skills (replaces employee_skills)
--          FK points directly to users, not employees
-- ─────────────────────────────────────────────────────────────
CREATE TABLE
    IF NOT EXISTS resource_skills (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        skill_name VARCHAR(100) NOT NULL,
        category ENUM ('BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'OTHER') NOT NULL,
        proficiency_level ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_resource_skill (user_id, skill_name),
        CONSTRAINT fk_rs_user FOREIGN KEY (user_id) REFERENCES users (id)
    ) ENGINE = InnoDB;

-- Migrate skills from employee_skills → resource_skills
INSERT INTO
    resource_skills (
        user_id,
        skill_name,
        category,
        proficiency_level,
        created_at
    )
SELECT
    e.user_id,
    es.skill_name,
    es.category,
    es.proficiency_level,
    es.created_at
FROM
    employee_skills es
    JOIN employees e ON e.id = es.employee_id;

-- ─────────────────────────────────────────────────────────────
-- STEP 6 — Update allocations
--          Rename employee_id → resource_id, re-point FK to users
-- ─────────────────────────────────────────────────────────────
-- First convert employee_id values to the corresponding user_id
UPDATE allocations a
JOIN employees e ON e.id = a.employee_id
SET
    a.employee_id = e.user_id;

-- Drop old FK
ALTER TABLE allocations
DROP FOREIGN KEY fk_allocation_employee;

-- Rename column
ALTER TABLE allocations CHANGE COLUMN employee_id resource_id INT UNSIGNED NOT NULL;

-- Add new FK pointing to users
ALTER TABLE allocations ADD CONSTRAINT fk_allocation_resource FOREIGN KEY (resource_id) REFERENCES users (id);

-- ─────────────────────────────────────────────────────────────
-- STEP 7 — Rebuild timesheets with allocation_id FK
--          Old: (employee_id, project_id, week_start_date)
--          New: (allocation_id, week_start_date)
-- ─────────────────────────────────────────────────────────────
-- Drop child rows first to allow table rebuild
DELETE FROM timesheet_tags;

DELETE FROM timesheets;

-- Drop old FKs and unique key
ALTER TABLE timesheets
DROP FOREIGN KEY fk_timesheet_employee,
DROP FOREIGN KEY fk_timesheet_project,
DROP KEY uq_timesheet_entry;

-- Drop old columns, add allocation_id
ALTER TABLE timesheets
DROP COLUMN employee_id,
DROP COLUMN project_id,
ADD COLUMN allocation_id INT UNSIGNED NOT NULL AFTER id;

-- Add new unique constraint and FK
ALTER TABLE timesheets ADD UNIQUE KEY uq_timesheet_allocation_week (allocation_id, week_start_date),
ADD CONSTRAINT fk_timesheet_allocation FOREIGN KEY (allocation_id) REFERENCES allocations (id);

-- ─────────────────────────────────────────────────────────────
-- STEP 8 — Drop legacy tables (safe now that data is migrated)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS employee_skills;

DROP TABLE IF EXISTS employees;