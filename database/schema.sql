-- =============================================================
-- PRM Tool — Database Schema
--
-- Run this file once on a fresh database to create the full schema.
-- For future BRD changes, alter this file and apply the changes
-- manually to any existing database.
-- =============================================================
CREATE DATABASE IF NOT EXISTS prm_db CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE prm_db;

-- -------------------------------------------------------------
-- users
-- Holds login credentials and role for every person in the system.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE') NOT NULL,
        is_active TINYINT (1) NOT NULL DEFAULT 1,
        force_password_change TINYINT (1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- employees
-- Work profile for MANAGER and EMPLOYEE roles.
-- Admin users do NOT have an employee record.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS employees (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        status ENUM ('BENCH', 'ALLOCATED') NOT NULL DEFAULT 'BENCH',
        manager_id INT UNSIGNED NULL,
        is_active TINYINT (1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_employee_manager FOREIGN KEY (manager_id) REFERENCES users (id)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- employee_skills
-- Skills assigned to an employee by Admin.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS employee_skills (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id INT UNSIGNED NOT NULL,
        skill_name VARCHAR(100) NOT NULL,
        category ENUM ('BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'OTHER') NOT NULL,
        proficiency_level ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_employee_skill (employee_id, skill_name),
        CONSTRAINT fk_skill_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- projects
-- Projects managed by a Manager.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS projects (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED') NOT NULL DEFAULT 'PLANNED',
        manager_id INT UNSIGNED NOT NULL,
        health ENUM ('ON_TRACK', 'ATTENTION', 'AT_RISK') NOT NULL DEFAULT 'ON_TRACK',
        total_story_points INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_project_manager FOREIGN KEY (manager_id) REFERENCES users (id)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- milestones
-- Checkpoints within a project tracked by Admin/Manager.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS milestones (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        project_id INT UNSIGNED NOT NULL,
        title VARCHAR(200) NOT NULL,
        due_date DATE NOT NULL,
        story_points INT UNSIGNED NOT NULL DEFAULT 0,
        status ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE') NOT NULL DEFAULT 'NOT_STARTED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects (id)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- allocations
-- Records which employee works on which project, how much, and when.
-- is_active = 0 means the allocation was ended early.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS allocations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id INT UNSIGNED NOT NULL,
        project_id INT UNSIGNED NOT NULL,
        utilisation_percent TINYINT UNSIGNED NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        is_active TINYINT (1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_allocation_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
        CONSTRAINT fk_allocation_project FOREIGN KEY (project_id) REFERENCES projects (id),
        CONSTRAINT chk_utilisation CHECK (utilisation_percent BETWEEN 1 AND 100),
        CONSTRAINT chk_dates CHECK (from_date < to_date)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- timesheets
-- One row per employee per project per week.
-- week_start_date is always a Monday.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS timesheets (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id INT UNSIGNED NOT NULL,
        project_id INT UNSIGNED NOT NULL,
        week_start_date DATE NOT NULL,
        hours_worked DECIMAL(4, 1) NOT NULL DEFAULT 0,
        status ENUM ('SUBMITTED', 'MISSED') NOT NULL DEFAULT 'SUBMITTED',
        submitted_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_timesheet_entry (employee_id, project_id, week_start_date),
        CONSTRAINT fk_timesheet_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
        CONSTRAINT fk_timesheet_project FOREIGN KEY (project_id) REFERENCES projects (id),
        CONSTRAINT chk_hours CHECK (hours_worked >= 0)
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- timesheet_tags
-- Activity tags attached to a timesheet entry by the employee.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS timesheet_tags (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        timesheet_id INT UNSIGNED NOT NULL,
        tag_name VARCHAR(100) NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_tag_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets (id) ON DELETE CASCADE
    ) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- system_config
-- Key-value store for runtime configuration managed by Admin.
-- -------------------------------------------------------------
CREATE TABLE
    IF NOT EXISTS system_config (
        config_key VARCHAR(100) NOT NULL,
        config_value VARCHAR(500) NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (config_key)
    ) ENGINE = InnoDB;