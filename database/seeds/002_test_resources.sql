-- =============================================================
-- PRM Test Seed — AI Skill Match / Team Staffing Resources
-- File  : database/seeds/002_test_resources.sql
-- Remove: database/seeds/002_test_resources_cleanup.sql
--
-- Inserts 10 dummy RESOURCE users that cover every test scenario:
--
--  #  Name            Skills                    Util  Free  Notes
--  1  Arjun Mehta     Java, Spring Boot          0%  100%  BENCH
--  2  Priya Nair      React, TypeScript, Redux  30%   70%  Partial
--  3  Rohan Verma     Python, Django, FastAPI   50%   50%  Partial
--  4  Sneha Patel     AWS, Terraform, Kubernetes 0%  100%  BENCH
--  5  Karan Singh     Salesforce, Apex, LWC     60%   40%  Partial
--  6  Ananya Rao      Selenium, Cypress          0%  100%  BENCH (QA)
--  7  Dev Malhotra    Angular, TypeScript        80%   20%  Heavy
--  8  Neha Joshi      .NET, C#, ASP.NET Core     0%  100%  BENCH
--  9  Rahul Kapoor    Java, Kafka               100%    0%  FULL → all_allocated gap
-- 10  Ishaan Bose     React, Next.js, GraphQL   90%   10%  Near-full
--
-- Managers used: Manoj Sharma (id=9), Raunak Shah (id=12)
-- Projects used: HP ITSM (id=2), HP OMNI (id=3)
-- =============================================================
USE prm_db;

-- password_hash is a bcrypt hash of "Test@123" (matches existing test accounts)
SET @hash = '$2b$12$acXiNFLNIjR4oEwha5ISfe7HGWbaSI8Kj7NThJMxwjfWlbQMaGLp6';

-- ── 1. Arjun Mehta — Java / Spring Boot — BENCH (100% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Arjun Mehta', 'arjun.mehta.test', 'arjun.mehta@test.prm', @hash, 3, 1, 0);
SET @arjun = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@arjun, 9, 'BENCH', 'Engineering', 'Senior Java Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@arjun, 'Java',        'BACKEND', 'ADVANCED'),
  (@arjun, 'Spring Boot', 'BACKEND', 'ADVANCED'),
  (@arjun, 'Hibernate',   'BACKEND', 'INTERMEDIATE');

-- ── 2. Priya Nair — React / TypeScript — 30% allocated (70% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Priya Nair', 'priya.nair.test', 'priya.nair@test.prm', @hash, 3, 1, 0);
SET @priya = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@priya, 9, 'ALLOCATED', 'Engineering', 'Frontend Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@priya, 'React',      'FRONTEND', 'INTERMEDIATE'),
  (@priya, 'TypeScript', 'FRONTEND', 'INTERMEDIATE'),
  (@priya, 'Redux',      'FRONTEND', 'INTERMEDIATE');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@priya, 2, 30, '2026-05-01', '2026-09-30', 1);

-- ── 3. Rohan Verma — Python / Django — 50% allocated (50% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Rohan Verma', 'rohan.verma.test', 'rohan.verma@test.prm', @hash, 3, 1, 0);
SET @rohan = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@rohan, 12, 'ALLOCATED', 'Engineering', 'Python Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@rohan, 'Python',  'BACKEND', 'ADVANCED'),
  (@rohan, 'Django',  'BACKEND', 'ADVANCED'),
  (@rohan, 'FastAPI', 'BACKEND', 'INTERMEDIATE');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@rohan, 3, 50, '2026-05-15', '2026-10-31', 1);

-- ── 4. Sneha Patel — AWS / Terraform / Kubernetes — BENCH (100% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Sneha Patel', 'sneha.patel.test', 'sneha.patel@test.prm', @hash, 3, 1, 0);
SET @sneha = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@sneha, 12, 'BENCH', 'DevOps', 'DevOps Engineer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@sneha, 'AWS',        'DEVOPS', 'INTERMEDIATE'),
  (@sneha, 'Terraform',  'DEVOPS', 'INTERMEDIATE'),
  (@sneha, 'Kubernetes', 'DEVOPS', 'INTERMEDIATE'),
  (@sneha, 'Docker',     'DEVOPS', 'ADVANCED');

-- ── 5. Karan Singh — Salesforce / Apex — 60% allocated (40% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Karan Singh', 'karan.singh.test', 'karan.singh@test.prm', @hash, 3, 1, 0);
SET @karan = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@karan, 9, 'ALLOCATED', 'CRM', 'Salesforce Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@karan, 'Salesforce',     'OTHER', 'ADVANCED'),
  (@karan, 'Apex',           'OTHER', 'ADVANCED'),
  (@karan, 'Salesforce LWC', 'OTHER', 'INTERMEDIATE');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@karan, 2, 60, '2026-04-01', '2026-08-31', 1);

-- ── 6. Ananya Rao — Selenium / Cypress — BENCH (100% free, QA) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Ananya Rao', 'ananya.rao.test', 'ananya.rao@test.prm', @hash, 3, 1, 0);
SET @ananya = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@ananya, 12, 'BENCH', 'QA', 'QA Engineer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@ananya, 'Selenium', 'QA', 'INTERMEDIATE'),
  (@ananya, 'Cypress',  'QA', 'INTERMEDIATE'),
  (@ananya, 'Postman',  'QA', 'BEGINNER');

-- ── 7. Dev Malhotra — Angular / TypeScript — 80% allocated (20% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Dev Malhotra', 'dev.malhotra.test', 'dev.malhotra@test.prm', @hash, 3, 1, 0);
SET @dev = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@dev, 9, 'ALLOCATED', 'Engineering', 'Frontend Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@dev, 'Angular',    'FRONTEND', 'BEGINNER'),
  (@dev, 'TypeScript', 'FRONTEND', 'BEGINNER'),
  (@dev, 'RxJS',       'FRONTEND', 'BEGINNER');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@dev, 3, 80, '2026-06-01', '2026-11-30', 1);

-- ── 8. Neha Joshi — .NET / C# — BENCH (100% free) ──
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Neha Joshi', 'neha.joshi.test', 'neha.joshi@test.prm', @hash, 3, 1, 0);
SET @neha = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@neha, 12, 'BENCH', 'Engineering', '.NET Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@neha, '.NET',           'BACKEND', 'INTERMEDIATE'),
  (@neha, 'C#',             'BACKEND', 'INTERMEDIATE'),
  (@neha, 'ASP.NET Core',   'BACKEND', 'INTERMEDIATE');

-- ── 9. Rahul Kapoor — Java / Kafka — 100% allocated (FULLY ALLOCATED) ──
-- Purpose: tests the "all_allocated" gap type for Java skill
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Rahul Kapoor', 'rahul.kapoor.test', 'rahul.kapoor@test.prm', @hash, 3, 1, 0);
SET @rahul = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@rahul, 9, 'ALLOCATED', 'Engineering', 'Java Backend Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@rahul, 'Java',          'BACKEND', 'INTERMEDIATE'),
  (@rahul, 'Kafka',         'BACKEND', 'INTERMEDIATE'),
  (@rahul, 'Microservices', 'BACKEND', 'INTERMEDIATE');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@rahul, 2, 100, '2026-03-01', '2026-12-31', 1);

-- ── 10. Ishaan Bose — React / Next.js — 90% allocated (10% free) ──
-- Purpose: tests that a heavily-loaded person still shows (< 100%), but ranks lower
INSERT INTO users (full_name, username, email, password_hash, role_id, is_active, force_password_change)
VALUES ('Ishaan Bose', 'ishaan.bose.test', 'ishaan.bose@test.prm', @hash, 3, 1, 0);
SET @ishaan = LAST_INSERT_ID();

INSERT INTO resource_profiles (user_id, reporting_to, status, department, designation)
VALUES (@ishaan, 12, 'ALLOCATED', 'Engineering', 'Senior Frontend Developer');

INSERT INTO resource_skills (user_id, skill_name, category, proficiency_level) VALUES
  (@ishaan, 'React',    'FRONTEND', 'ADVANCED'),
  (@ishaan, 'Next.js',  'FRONTEND', 'ADVANCED'),
  (@ishaan, 'GraphQL',  'BACKEND',  'INTERMEDIATE');

INSERT INTO allocations (resource_id, project_id, utilisation_percent, from_date, to_date, is_active)
VALUES (@ishaan, 3, 90, '2026-06-01', '2026-09-30', 1);

-- ── Summary ──────────────────────────────────────────────────
SELECT
    u.id,
    u.full_name,
    u.username,
    rp.department,
    rp.designation,
    rp.status,
    COALESCE((
        SELECT SUM(a.utilisation_percent) FROM allocations a
        WHERE a.resource_id = u.id AND a.is_active = 1
          AND CURDATE() BETWEEN a.from_date AND a.to_date
    ), 0) AS util_pct,
    GROUP_CONCAT(rs.skill_name ORDER BY rs.skill_name SEPARATOR ', ') AS skills,
    mgr.full_name AS manager
FROM users u
JOIN resource_profiles rp ON rp.user_id = u.id
JOIN users mgr ON mgr.id = rp.reporting_to
LEFT JOIN resource_skills rs ON rs.user_id = u.id
WHERE u.username LIKE '%.test'
GROUP BY u.id, u.full_name, u.username, rp.department, rp.designation, rp.status, mgr.full_name
ORDER BY util_pct ASC;
