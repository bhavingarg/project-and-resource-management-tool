# Project & Resource Management (PRM) Tool

A console-based client-server application for managing employees, projects, allocations,
and timesheets — with an AI assistant for skill matching and project health analysis.

Built with **TypeScript**, **Node.js (Express)**, and **MySQL**.

---

## Project Structure

```
project-and-resource-management-tool/
├── server/          # REST API (Express + MySQL)
│   └── src/
│       ├── config/        — App and database configuration
│       ├── controllers/   — HTTP request/response handlers
│       ├── middleware/     — Auth guard, error handler
│       ├── models/        — TypeScript interfaces and enums
│       ├── repositories/  — All SQL queries (Repository pattern)
│       ├── routes/        — Express route definitions
│       └── services/      — Business logic
│
├── console/         # Console client (Node.js readline + axios)
│   └── src/
│       ├── screens/       — Screen flows per role (Admin, Manager, Employee)
│       ├── services/      — HTTP calls to the server
│       └── utils/         — Input prompting and display helpers
│
└── database/
    ├── schema.sql              — Full schema (run once on a fresh database)
    ├── seeds/                  — Reference SQL files
└── server/scripts/seed.ts    — Bootstrap seed script (run once)
```

---

## Prerequisites

- Node.js 20+
- MySQL 8.0+

---

## Setup

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install console dependencies
cd ../console
npm install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env — set DB_HOST, DB_PASSWORD, JWT_SECRET, LLM_API_KEY

# Console
cp console/.env.example console/.env
# Default SERVER_BASE_URL=http://localhost:3001/api is fine for local dev
```

### 3. Create the database and schema

```sql
-- In a MySQL client:
SOURCE database/schema.sql;
```

### 4. Seed the bootstrap Admin account

```bash
cd server
npx ts-node -P scripts/tsconfig.json scripts/seed.ts
```

Default credentials: **admin / Admin@1234** — you will be forced to change the password on first login.

---

## Running the Application

### Start the server

```bash
cd server
npm run dev
```

Server starts on `http://localhost:3001`.

### Start the console client

```bash
cd console
npm run dev
```

---

## Engineering Practices

### SOLID Principles

| Principle | Where Applied |
|-----------|---------------|
| **Single Responsibility** | Each class/module has one reason to change — controllers handle HTTP, services handle logic, repositories handle SQL |
| **Open/Closed** | New roles and features are added via new route/service/repository files without modifying existing ones |
| **Liskov Substitution** | Repository interfaces allow swapping implementations (e.g. in-memory for testing) without breaking service code |
| **Interface Segregation** | Role-specific interfaces (`IAdminService`, `IManagerService`) expose only what each role needs |
| **Dependency Inversion** | Services depend on repository interfaces, not concrete implementations |

### Design Patterns

| Pattern | Where Used |
|---------|------------|
| **Repository** | All database access goes through repository classes; services never write SQL directly |

### Design Principles

| Principle | Where Applied |
|-----------|---------------|
| **Separation of Concerns** | Console (presentation), server (API), database (persistence) are fully independent layers |
| **DRY** | Shared display helpers and input utilities in `console/src/utils/`; shared validation in `server/src/middleware/` |