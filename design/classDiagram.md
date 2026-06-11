# Class Diagram — Full System

Single unified class diagram covering the **Console Client**, **Domain Model**, **Server Architecture**, and **Infrastructure** layers.

```mermaid
classDiagram
    direction LR

    namespace ConsoleClient {
        class LoginScreen
        class ChangePasswordScreen
        class RoleRouter
        class AdminMenuScreen
        class ManagerMenuScreen
        class EmployeeMenuScreen
        class AllocateResourceScreen
        class AiAssistantScreen
        class authService
        class userService
        class employeeService
        class projectService
        class allocationService
        class managerService
        class timesheetService
        class configApiService
        class aiService
        class apiClient {
            +get(path)
            +post(path, body)
            +put(path, body)
            +patch(path, body)
            +delete(path)
        }
        class sessionStore {
            +getToken()
            +setToken(token)
            +clearToken()
        }
    }

    namespace DomainModel {
        class User {
            +int id
            +string fullName
            +string username
            +string email
            +string passwordHash
            +UserRole role
            +boolean isActive
            +boolean forcePasswordChange
        }
        class Employee {
            +int id
            +int userId
            +string fullName
            +string email
            +string department
            +string designation
            +EmployeeStatus status
            +int managerId
            +boolean isActive
        }
        class EmployeeSkill {
            +int id
            +int employeeId
            +string skillName
            +SkillCategory category
            +ProficiencyLevel proficiencyLevel
        }
        class Project {
            +int id
            +string name
            +string description
            +string startDate
            +string endDate
            +ProjectStatus status
            +int managerId
            +ProjectHealth health
            +int totalStoryPoints
        }
        class Milestone {
            +int id
            +int projectId
            +string title
            +string dueDate
            +int storyPoints
            +MilestoneStatus status
        }
        class Allocation {
            +int id
            +int employeeId
            +int projectId
            +int utilisationPercent
            +string fromDate
            +string toDate
            +boolean isActive
        }
        class Timesheet {
            +int id
            +int employeeId
            +int projectId
            +string weekStartDate
            +number hoursWorked
            +TimesheetStatus status
            +string[] tags
        }
        class SystemConfig {
            +string configKey
            +string configValue
            +datetime updatedAt
        }
        class UserRole {
            <<enumeration>>
            ADMIN
            MANAGER
            EMPLOYEE
        }
        class EmployeeStatus {
            <<enumeration>>
            BENCH
            ALLOCATED
        }
        class SkillCategory {
            <<enumeration>>
            BACKEND
            FRONTEND
            DEVOPS
            QA
            OTHER
        }
        class ProficiencyLevel {
            <<enumeration>>
            BEGINNER
            INTERMEDIATE
            ADVANCED
        }
        class ProjectStatus {
            <<enumeration>>
            PLANNED
            ACTIVE
            ON_HOLD
            COMPLETED
        }
        class ProjectHealth {
            <<enumeration>>
            ON_TRACK
            ATTENTION
            AT_RISK
        }
        class MilestoneStatus {
            <<enumeration>>
            NOT_STARTED
            IN_PROGRESS
            DONE
        }
        class TimesheetStatus {
            <<enumeration>>
            SUBMITTED
            MISSED
        }
    }

    namespace ServerLayer {
        class requireAuth {
            <<middleware>>
            verifies JWT
            sets req.user
        }
        class requireRole {
            <<middleware>>
            guards by UserRole
        }
        class AuthController {
            +login(req, res)
            +changePassword(req, res)
        }
        class UserController {
            +createUser(req, res)
            +getAllUsers(req, res)
            +findUser(req, res)
            +resetPassword(req, res)
            +deactivateUser(req, res)
            +reactivateUser(req, res)
        }
        class EmployeeController {
            +getAllEmployees(req, res)
            +getEmployee(req, res)
            +getEmployeeByUserId(req, res)
            +updateEmployee(req, res)
            +getDeactivateWarning(req, res)
            +deactivateEmployee(req, res)
            +assignManager(req, res)
            +getSkills(req, res)
            +addSkill(req, res)
            +updateSkill(req, res)
            +removeSkill(req, res)
        }
        class ProjectController {
            +getAllProjects(req, res)
            +getProject(req, res)
            +createProject(req, res)
            +updateProject(req, res)
            +getMilestones(req, res)
            +addMilestone(req, res)
            +updateMilestoneStatus(req, res)
        }
        class AllocationController {
            +getAllAllocations(req, res)
            +getProjectAllocations(req, res)
            +getMyAllocations(req, res)
            +createAllocation(req, res)
            +endAllocation(req, res)
        }
        class ManagerController {
            +getResourceDashboard(req, res)
            +getEmployeeDrillDown(req, res)
            +getProjects(req, res)
            +getProjectDetail(req, res)
        }
        class TimesheetController {
            +getWeekAllocations(req, res)
            +submit(req, res)
            +getMyTimesheets(req, res)
            +getMyWeekDetail(req, res)
            +getReminder(req, res)
            +getTeamTimesheets(req, res)
            +getEmployeeWeekDetail(req, res)
        }
        class ConfigController {
            +getConfig(req, res)
            +updateApiKey(req, res)
            +updateProvider(req, res)
            +updateSchedulerInterval(req, res)
            +updateMaxWeeklyHours(req, res)
        }
        class AiController {
            +skillMatch(req, res)
            +riskSummary(req, res)
        }
        class IAuthService {
            <<interface>>
            +login(dto) LoginResponseDto
            +changePassword(userId, newPassword)
            +validatePasswordStrength(password) string
        }
        class IUserService {
            <<interface>>
            +createUser(dto) UserSummaryDto
            +getAllUsers() UserSummaryDto[]
            +findByUsernameOrId(usernameOrId) UserSummaryDto
            +resetPassword(userId, dto)
            +deactivateUser(userId)
            +reactivateUser(userId)
        }
        class IEmployeeService {
            <<interface>>
            +getAllEmployees() EmployeeSummaryDto[]
            +getEmployeeById(id) EmployeeDetailDto
            +getEmployeeByUserId(userId) EmployeeDetailDto
            +updateEmployee(id, dto)
            +getDeactivateWarning(id) DeactivateResult
            +deactivateEmployee(id)
            +assignManager(employeeId, managerId)
            +getSkills(employeeId) EmployeeSkillDto[]
            +addSkill(employeeId, dto)
            +updateSkill(employeeId, skillId, dto)
            +removeSkill(employeeId, skillId)
        }
        class IProjectService {
            <<interface>>
            +getAllProjects() ProjectSummaryDto[]
            +getProjectById(id) ProjectDetailDto
            +createProject(dto) number
            +updateProject(id, dto)
            +getMilestones(projectId) MilestoneSummaryDto
            +addMilestone(projectId, dto)
            +updateMilestoneStatus(projectId, milestoneId, status)
        }
        class IAllocationService {
            <<interface>>
            +getAllActiveAllocations() AllocationSummaryDto[]
            +getProjectAllocations(managerUserId, projectId)
            +getMyAllocations(employeeUserId) MyAllocationDto[]
            +createAllocation(managerUserId, dto)
            +endAllocation(managerUserId, allocationId)
        }
        class IManagerService {
            <<interface>>
            +getResourceDashboard(managerUserId) ResourceDashboardDto
            +getEmployeeDrillDown(managerUserId, userId)
            +getManagerProjects(managerUserId) ManagerProjectDto[]
            +getProjectDetail(managerUserId, projectId)
        }
        class ITimesheetService {
            <<interface>>
            +getWeekAllocations(employeeUserId, weekStartDate)
            +submitTimesheet(employeeUserId, dto)
            +getMyTimesheets(employeeUserId) MyTimesheetWeekDto[]
            +getMyWeekDetail(employeeUserId, weekStartDate)
            +getReminder(employeeUserId) TimesheetReminderDto
            +getTeamTimesheets(managerUserId, weekStartDate)
            +getEmployeeWeekDetailForManager(managerUserId, employeeUserId, weekStartDate)
        }
        class IConfigService {
            <<interface>>
            +getConfig() SystemConfigDto
            +getMaxWeeklyHours() number
            +updateApiKey(apiKey)
            +updateProvider(provider)
            +updateSchedulerInterval(hours)
            +updateMaxWeeklyHours(hours)
        }
        class IAiService {
            <<interface>>
            +skillMatch(managerUserId, dto) SkillMatchResultDto[]
            +riskSummary(managerUserId, projectId) RiskSummaryDto
        }
        class ISchedulerService {
            <<interface>>
            +start()
            +stop()
            +runUtilisationRecompute()
            +runProjectHealthFlagging()
            +runMissedTimesheetMarking()
        }
        class IAuthRepository {
            <<interface>>
            +findActiveUserByUsername(username) User
            +updatePassword(userId, passwordHash)
        }
        class IUserRepository {
            <<interface>>
            +findById(id) UserSummaryDto
            +findByUsernameOrId(usernameOrId) UserSummaryDto
            +findAll() UserSummaryDto[]
            +existsByUsername(username) boolean
            +existsByEmail(email) boolean
            +create(fullName, email, username, passwordHash, role) number
            +updatePassword(userId, passwordHash)
            +setActiveStatus(userId, isActive)
        }
        class IEmployeeRepository {
            <<interface>>
            +createForUser(userId, fullName, email, department, designation)
            +findAll() EmployeeSummaryDto[]
            +findById(id) EmployeeDetailDto
            +findByUserId(userId) EmployeeDetailDto
            +update(id, dto)
            +deactivate(id)
            +reactivate(id)
            +assignManager(id, managerId)
            +getActiveAllocationCount(id) number
            +getActiveAllocationSummaries(id) string[]
            +endActiveAllocations(id)
            +deactivateLinkedUser(id)
            +getSkills(employeeId) EmployeeSkillDto[]
            +addSkill(employeeId, skillName, category, proficiencyLevel)
            +updateSkillProficiency(skillId, proficiencyLevel)
            +removeSkill(skillId)
            +findSkillById(skillId) EmployeeSkillDto
        }
        class IProjectRepository {
            <<interface>>
            +findAllSummaries() ProjectSummaryDto[]
            +findById(id) ProjectDetailDto
            +create(dto) number
            +update(id, dto)
            +getMilestones(projectId) MilestoneDto[]
            +findMilestoneById(milestoneId) MilestoneDto
            +addMilestone(projectId, title, dueDate, storyPoints)
            +updateMilestoneStatus(milestoneId, status)
            +updateHealth(projectId, health)
        }
        class IAllocationRepository {
            <<interface>>
            +findAllActive() AllocationSummaryDto[]
            +findById(id) AllocationRecord
            +findActiveByProject(projectId) ProjectAllocationDto[]
            +findActiveLinesByEmployee(employeeId) AllocationLineDto[]
            +findAllByEmployeeUserId(userId) MyAllocationDto[]
            +getOverlappingUtilisation(employeeId, fromDate, toDate) number
            +create(params) number
            +endById(id)
            +recomputeEmployeeStatus(employeeId)
            +recomputeAllEmployeeStatuses()
        }
        class IManagerRepository {
            <<interface>>
            +findTeamMembers(managerUserId) TeamMemberRecord[]
            +findTeamMemberByUserId(managerUserId, userId) TeamMemberRecord
            +findManagerProjects(managerUserId) ManagerProjectRecord[]
            +findManagerProjectById(managerUserId, projectId) ManagerProjectRecord
            +findProjectMilestones(projectId) ManagerMilestoneRecord[]
            +findRecentActivityTags(employeeId) string[]
        }
        class ITimesheetRepository {
            <<interface>>
            +findWeekAllocations(employeeId, weekStartDate) WeekAllocationRow[]
            +existsForWeek(employeeId, weekStartDate) boolean
            +createWeeklyTimesheet(employeeId, weekStartDate, entries)
            +findMyWeeks(employeeId) MyTimesheetWeekDto[]
            +findWeekDetail(employeeId, weekStartDate) TimesheetEntryDetailDto[]
            +findTeamRows(managerUserId, weekStartDate) TeamTimesheetRowDto[]
            +markMissedForWeek(weekStartDate)
        }
        class IConfigRepository {
            <<interface>>
            +getValue(key) string
            +getAll() Record~string,string~
            +upsert(key, value)
        }
    }

    namespace Infrastructure {
        class MySQLPool {
            <<infrastructure>>
            mysql2 connection pool
        }
        class ILlmAdapter {
            <<interface>>
            +complete(prompt) string
        }
        class GeminiAdapter {
            +complete(prompt) string
        }
        class GroqAdapter {
            +complete(prompt) string
        }
    }

    %% ── Console Client ────────────────────────────────────────────────────────────
    LoginScreen --> authService
    LoginScreen --> ChangePasswordScreen : force_password_change
    LoginScreen --> RoleRouter : on success
    RoleRouter --> AdminMenuScreen
    RoleRouter --> ManagerMenuScreen
    RoleRouter --> EmployeeMenuScreen
    AdminMenuScreen --> employeeService
    AdminMenuScreen --> projectService
    AdminMenuScreen --> userService
    AdminMenuScreen --> allocationService
    AdminMenuScreen --> configApiService
    ManagerMenuScreen --> managerService
    ManagerMenuScreen --> AllocateResourceScreen
    ManagerMenuScreen --> AiAssistantScreen
    ManagerMenuScreen --> timesheetService
    AllocateResourceScreen --> allocationService
    AllocateResourceScreen --> aiService
    AiAssistantScreen --> aiService
    EmployeeMenuScreen --> timesheetService
    EmployeeMenuScreen --> allocationService
    authService --> apiClient
    userService --> apiClient
    employeeService --> apiClient
    projectService --> apiClient
    allocationService --> apiClient
    managerService --> apiClient
    timesheetService --> apiClient
    configApiService --> apiClient
    aiService --> apiClient
    apiClient --> sessionStore : Bearer token

    %% ── Server: Middleware ────────────────────────────────────────────────────────
    requireAuth ..> AuthController : guards
    requireRole ..> AuthController : guards

    %% ── Server: Controllers → Services ───────────────────────────────────────────
    AuthController --> IAuthService
    UserController --> IUserService
    EmployeeController --> IEmployeeService
    ProjectController --> IProjectService
    AllocationController --> IAllocationService
    ManagerController --> IManagerService
    TimesheetController --> ITimesheetService
    ConfigController --> IConfigService
    AiController --> IAiService

    %% ── Server: Services → Repositories ──────────────────────────────────────────
    IAuthService ..> IAuthRepository
    IUserService ..> IUserRepository
    IUserService ..> IEmployeeRepository
    IUserService ..> IAuthService : password rules
    IEmployeeService ..> IEmployeeRepository
    IEmployeeService ..> IUserRepository
    IProjectService ..> IProjectRepository
    IProjectService ..> IUserRepository
    IAllocationService ..> IAllocationRepository
    IAllocationService ..> IProjectRepository
    IAllocationService ..> IEmployeeRepository
    IManagerService ..> IManagerRepository
    IManagerService ..> IEmployeeRepository
    IManagerService ..> IAllocationRepository
    ITimesheetService ..> ITimesheetRepository
    ITimesheetService ..> IEmployeeRepository
    ITimesheetService ..> IConfigService : max weekly hours
    IConfigService ..> IConfigRepository
    IAiService ..> IManagerRepository
    IAiService ..> IEmployeeRepository
    IAiService ..> IAllocationRepository
    IAiService ..> IProjectRepository
    IAiService ..> ITimesheetRepository
    IAiService ..> IConfigService : LLM config
    IAiService ..> ILlmAdapter
    ISchedulerService ..> IAllocationRepository
    ISchedulerService ..> IProjectRepository
    ISchedulerService ..> ITimesheetRepository
    ISchedulerService ..> IConfigService : scheduler interval

    %% ── Infrastructure ────────────────────────────────────────────────────────────
    ILlmAdapter <|.. GeminiAdapter
    ILlmAdapter <|.. GroqAdapter
    IAuthRepository ..> MySQLPool
    IUserRepository ..> MySQLPool
    IEmployeeRepository ..> MySQLPool
    IProjectRepository ..> MySQLPool
    IAllocationRepository ..> MySQLPool
    IManagerRepository ..> MySQLPool
    ITimesheetRepository ..> MySQLPool
    IConfigRepository ..> MySQLPool

    %% ── Domain Model Relationships ────────────────────────────────────────────────
    User "1" --> "0..1" Employee : work profile
    User "1" --> "0..*" Employee : manages
    User "1" --> "0..*" Project : manages
    Employee "1" --> "0..*" EmployeeSkill : has
    Project "1" --> "0..*" Milestone : contains
    Employee "1" --> "0..*" Allocation : allocated via
    Project "1" --> "0..*" Allocation : staffed via
    Employee "1" --> "0..*" Timesheet : submits
    Project "1" --> "0..*" Timesheet : logged against
    User ..> UserRole
    Employee ..> EmployeeStatus
    EmployeeSkill ..> SkillCategory
    EmployeeSkill ..> ProficiencyLevel
    Project ..> ProjectStatus
    Project ..> ProjectHealth
    Milestone ..> MilestoneStatus
    Timesheet ..> TimesheetStatus
```
