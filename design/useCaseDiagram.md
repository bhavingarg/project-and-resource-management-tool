# PRM Tool — Use Case Diagram

Three human actors (Admin, Manager, Employee) plus two system actors (Background Scheduler
and the external LLM service).

```mermaid
flowchart LR
    Admin["🧑‍💼 Admin<br/>(system operator)"]
    Manager["🧑‍💼 Manager<br/>(delivery manager)"]
    Employee["🧑‍💻 Employee<br/>(individual contributor)"]
    Scheduler["⏱️ Background Scheduler"]
    LLM["🤖 LLM Service<br/>Gemini / Groq"]

    subgraph AUTH["Authentication"]
        UC_Login(["Login"])
        UC_ChangePwd(["Change Password"])
        UC_Logout(["Logout"])
    end

    subgraph ADM["Master Data & System Administration"]
        UC_ManageUsers(["Manage User Accounts"])
        UC_ManageEmployees(["Manage Employees"])
        UC_ManageSkills(["Manage Employee Skills"])
        UC_AssignManager(["Assign Manager to Employee"])
        UC_ManageProjects(["Manage Projects"])
        UC_ManageMilestones(["Manage Milestones"])
        UC_ViewAllAlloc(["View All Allocations"])
        UC_SysConfig(["Configure System"])
    end

    subgraph MGR["Resource & Project Management"]
        UC_Dashboard(["View Resource Dashboard"])
        UC_DrillDown(["View Employee Detail"])
        UC_Allocate(["Allocate Resource"])
        UC_AIFind(["Find Resource using AI"])
        UC_EndAlloc(["End an Allocation"])
        UC_MyProjects(["View My Projects"])
        UC_RiskSummary(["Get AI Risk Summary"])
        UC_SkillMatch(["AI Skill Match"])
        UC_TeamTS(["View Team Timesheets"])
    end

    subgraph EMP["Employee Self-Service"]
        UC_SubmitTS(["Submit Weekly Timesheet"])
        UC_TagWork(["Tag Work Activities"])
        UC_MyTS(["View My Timesheets"])
        UC_MyAlloc(["View My Allocations"])
    end

    subgraph SYS["Automated Jobs"]
        UC_Recompute(["Recompute Employee Status"])
        UC_FlagHealth(["Flag Project Health"])
        UC_MarkMissed(["Mark Missed Timesheets"])
    end

    Admin --- UC_Login
    Manager --- UC_Login
    Employee --- UC_Login
    Admin --- UC_Logout
    Manager --- UC_Logout
    Employee --- UC_Logout

    Admin --- UC_ManageUsers & UC_ManageEmployees & UC_ManageSkills & UC_AssignManager
    Admin --- UC_ManageProjects & UC_ManageMilestones & UC_ViewAllAlloc & UC_SysConfig

    Manager --- UC_Dashboard & UC_Allocate & UC_EndAlloc & UC_MyProjects & UC_TeamTS
    Manager --- UC_SkillMatch & UC_RiskSummary & UC_AIFind

    Employee --- UC_SubmitTS & UC_MyTS & UC_MyAlloc

    Scheduler --- UC_Recompute & UC_FlagHealth & UC_MarkMissed
    UC_AIFind --- LLM
    UC_SkillMatch --- LLM
    UC_RiskSummary --- LLM
```

Key rules attached to use cases (enforced server-side):

| Use case | Rule |
|---|---|
| Login | Inactive users are rejected; `force_password_change` redirects to Change Password |
| Create User Account | Username and email unique; password ≥ 8 chars, 1 uppercase, 1 number; MANAGER/EMPLOYEE roles also get an employee profile |
| Allocate Resource | Total overlapping utilisation ≤ 100%; from < to; project must be ACTIVE or PLANNED; employee must be on the manager's team |
| End Allocation | Only the project's manager can end it; employee status recomputed (BENCH if nothing remains) |
| Deactivate Employee | Ends all active allocations today, blocks the linked login, preserves history |
| Submit Timesheet | Only for allocated projects that week; hours per project ≤ allocation% × max weekly hours; total ≤ max weekly hours; no duplicates; no future weeks |
| AI Skill Match | Candidates filtered by free capacity first; only qualified employees sent to LLM; results are recommendations only |
| AI Risk Summary | Built from milestone status, allocations, and recent timesheet hours; output is a plain-English risk paragraph |
