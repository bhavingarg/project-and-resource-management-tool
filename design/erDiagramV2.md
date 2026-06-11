# PRM Tool — ER Diagram (V2 · Role-Based)

## Design Philosophy

Everyone in the system is a **resource** — admin, manager, and normal employees alike.
There is a single **USERS** table that holds all people. Their capabilities and permissions
are determined entirely by the role assigned to them via the **ROLES** table.

Role-specific fields are kept out of USERS and stored in dedicated mapping/profile tables:

| Mapping Table | Who has a row | What it stores |
|---|---|---|
| `ROLE_ACCESS` | Every role | Permission level per entity |
| `RESOURCE_PROFILES` | RESOURCE role only | `status` (BENCH/ALLOCATED) and `reporting_to` |

This eliminates nulls:
- `status` only exists for RESOURCEs → lives in `RESOURCE_PROFILES`, never null
- `reporting_to` only exists for RESOURCEs → lives in `RESOURCE_PROFILES`, never null
- MANAGERs report to no one — they simply have no entry in any reporting table

| Role | Interacts with |
|---|---|
| `ADMIN` | USERS (full CRUD), PROJECTS (full CRUD), SYSTEM_CONFIG (read/write) |
| `MANAGER` | PROJECTS (own — read/update), ALLOCATIONS (create/end for own team), RESOURCE_SKILLS (read), TIMESHEETS (read team's) |
| `RESOURCE` | RESOURCE_PROFILES (own), RESOURCE_SKILLS (own — CRUD), ALLOCATIONS (own — read only), TIMESHEETS (own — submit/view) |

**Many-to-many relationships** resolved through junction tables:
- `USERS` ↔ `PROJECTS` → via `ALLOCATIONS` (a resource can be on many projects; a project has many resources)
- `TIMESHEETS` are accessed through `ALLOCATIONS` — there are no direct FK links from TIMESHEETS to USERS or PROJECTS

The manager-resource relationship is captured directly via `RESOURCE_PROFILES.reporting_to → users.id`.

```mermaid
erDiagram
    ROLES ||--o{ USERS : "is assigned to"
    ROLES ||--o{ ROLE_ACCESS : "defines access rules in"
    USERS ||--o| RESOURCE_PROFILES : "RESOURCE: has profile"
    RESOURCE_PROFILES }o--|| USERS : "RESOURCE: reports to manager via"
    USERS ||--o{ PROJECTS : "MANAGER: is assigned as manager of"
    USERS ||--o{ RESOURCE_SKILLS : "RESOURCE & MANAGER: has skills"
    PROJECTS ||--o{ MILESTONES : "contains milestones"
    USERS ||--o{ ALLOCATIONS : "RESOURCE: is subject of allocation"
    PROJECTS ||--o{ ALLOCATIONS : "MANAGER: staffs project via"
    ALLOCATIONS ||--o{ TIMESHEETS : "timesheet is logged against"
    TIMESHEETS ||--o{ TIMESHEET_TAGS : "is tagged with"

    ROLES {
        int id PK
        varchar name UK "ADMIN | MANAGER | RESOURCE"
        varchar description
    }

    ROLE_ACCESS {
        int id PK
        int role_id FK "roles.id"
        varchar entity "USERS | PROJECTS | ALLOCATIONS | TIMESHEETS | RESOURCE_SKILLS | SYSTEM_CONFIG"
        varchar permission "NONE | READ | WRITE | MANAGE"
    }

    USERS {
        int id PK
        int role_id FK "roles.id"
        varchar full_name
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar department
        varchar designation
        boolean is_active
        boolean force_password_change
        datetime created_at
        datetime updated_at
    }

    RESOURCE_PROFILES {
        int id PK
        int user_id FK,UK "users.id (1:1, RESOURCE only)"
        int reporting_to FK "users.id (MANAGER)"
        enum status "BENCH | ALLOCATED"
        datetime created_at
        datetime updated_at
    }

    RESOURCE_SKILLS {
        int id PK
        int user_id FK "unique with skill_name"
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
        int manager_id FK "users.id (MANAGER role)"
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
        int resource_id FK "users.id (RESOURCE role)"
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
        int allocation_id FK "allocations.id — proves resource is allocated to the project"
        date week_start_date "unique (allocation, week) · always a Monday"
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
    }

    SYSTEM_CONFIG {
        varchar config_key PK "llm_api_key | llm_provider | scheduler_interval_hours | max_weekly_hours"
        varchar config_value
        datetime updated_at
    }
```

        varchar tag_name
    }

    SYSTEM_CONFIG {
        varchar config_key PK "llm_api_key | llm_provider | scheduler_interval_hours | max_weekly_hours"
        varchar config_value
        datetime updated_at
    }
```
