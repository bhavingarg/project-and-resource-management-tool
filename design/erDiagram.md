# PRM Tool — ER Diagram

**USERS** holds all system actors — a single user has one of three roles: `ADMIN`, `MANAGER`, or `EMPLOYEE`.
**EMPLOYEES** holds the work profiles for both `MANAGER` and `EMPLOYEE` role users. `ADMIN` users have no employee profile.

`employees.manager_id` and `projects.manager_id` both reference `users.id`.
A project has exactly **one** assigned manager. An employee may or may not have a manager assigned yet (nullable).

**Many-to-many relationships** are resolved through junction tables:
- `EMPLOYEES` ↔ `PROJECTS` → via `ALLOCATIONS` (1 employee can be allocated to many projects; 1 project can have many employees)
- `EMPLOYEES` ↔ `PROJECTS` → via `TIMESHEETS` (1 employee logs time against many projects; 1 project receives timesheets from many employees)

```mermaid
erDiagram
    USERS ||--o| EMPLOYEES : "has work profile (MANAGER or EMPLOYEE role only)"
    USERS |o--o{ EMPLOYEES : "manages team (manager_id, nullable)"
    USERS ||--o{ PROJECTS : "is assigned as manager of (1 project = 1 manager)"
    EMPLOYEES ||--o{ EMPLOYEE_SKILLS : "has skills"
    PROJECTS ||--o{ MILESTONES : "contains milestones"
    EMPLOYEES ||--o{ ALLOCATIONS : "is allocated to projects via"
    PROJECTS ||--o{ ALLOCATIONS : "is staffed with employees via"
    EMPLOYEES ||--o{ TIMESHEETS : "submits timesheet for"
    PROJECTS ||--o{ TIMESHEETS : "receives timesheet entries from"
    TIMESHEETS ||--o{ TIMESHEET_TAGS : "is tagged with"

    USERS {
        int id PK
        varchar full_name
        varchar username UK
        varchar email UK
        varchar password_hash
        enum role "ADMIN | MANAGER | EMPLOYEE"
        boolean is_active
        boolean force_password_change
        datetime created_at
        datetime updated_at
    }

    EMPLOYEES {
        int id PK
        int user_id FK,UK "users.id (1:1)"
        varchar full_name
        varchar email
        varchar department
        varchar designation
        enum status "BENCH | ALLOCATED"
        int manager_id FK "users.id (nullable)"
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    EMPLOYEE_SKILLS {
        int id PK
        int employee_id FK "unique with skill_name"
        varchar skill_name
        enum category "BACKEND | FRONTEND | DEVOPS | QA | OTHER"
        enum proficiency_level "BEGINNER | INTERMEDIATE | ADVANCED"
        datetime created_at
    }

    PROJECTS {
        int id PK
        varchar name
        text description
        date start_date
        date end_date
        enum status "PLANNED | ACTIVE | ON_HOLD | COMPLETED"
        int manager_id FK "users.id"
        enum health "ON_TRACK | ATTENTION | AT_RISK"
        int total_story_points
        datetime created_at
        datetime updated_at
    }

    MILESTONES {
        int id PK
        int project_id FK
        varchar title
        date due_date
        int story_points
        enum status "NOT_STARTED | IN_PROGRESS | DONE"
        datetime created_at
        datetime updated_at
    }

    ALLOCATIONS {
        int id PK
        int employee_id FK
        int project_id FK
        tinyint utilisation_percent "CHECK 1..100"
        date from_date "CHECK from < to"
        date to_date
        boolean is_active "0 = ended early"
        datetime created_at
        datetime updated_at
    }

    TIMESHEETS {
        int id PK
        int employee_id FK "unique (emp, proj, week)"
        int project_id FK
        date week_start_date "always a Monday"
        decimal hours_worked "CHECK >= 0"
        enum status "SUBMITTED | MISSED"
        datetime submitted_at "nullable"
        datetime created_at
    }

    TIMESHEET_TAGS {
        int id PK
        int timesheet_id FK "ON DELETE CASCADE"
        varchar tag_name
    }

    SYSTEM_CONFIG {
        varchar config_key PK "llm_api_key | llm_provider | scheduler_interval_hours | max_weekly_hours"
        varchar config_value
        datetime updated_at
    }
```
