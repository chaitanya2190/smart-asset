# Implementation Plan: AI-Powered QA Automation & Engineering Assessment

This plan outlines the design, implementation, test automation, AI change loop demonstration, and complete documentation set for the **Tactive Internship Hiring Assessment**.

## System Scenario & Feature Scope

**Domain Choice**: **Smart Corporate Equipment & Asset Reservation System**
A high-integrity web application handling asset reservations with strict business rules:
- **Core Rules & Logic**:
  - Asset availability checking (overlapping date/time ranges prevention).
  - Maximum checkout duration cap based on asset category (e.g., Laptops max 14 days, Monitors max 30 days).
  - User quota limit (max 2 active reservations per user).
  - Maintenance window locks (assets marked for maintenance cannot be reserved).
  - Real-time status transitions (`PENDING`, `APPROVED`, `REJECTED`, `CHECKED_OUT`, `RETURNED`).
  - Audit logging for security and compliance.
- **Edge Cases & Security**:
  - Input validation (preventing past date reservations, start date > end date, SQL/XSS injection payloads).
  - Role-based authorization checks (Users vs Admins).
  - Double-booking concurrency simulation.

---

## Deliverables Matrix & Components

```
assessment/
├── src/                      # Full-stack Web Application (Node.js / Express backend + Modern UI frontend)
│   ├── public/               # Premium HTML5/CSS3 UI with glassmorphism, dynamic animations, modern typography
│   ├── server.js             # Express API server with endpoints, validation middleware & error handlers
│   └── database.js           # Transactional data store with seeded test assets
├── tests/                    # Automated Test Suite (Jest / Supertest)
│   ├── api.test.js           # API unit & integration tests (Normal path, edge cases, invalid inputs)
│   └── e2e.test.js           # Automated end-to-end workflow verification
├── docs/                     # Comprehensive Stage 4 & Deliverable Documentation Set
│   ├── ARCHITECTURE.md       # Stage 4 Architecture Document (Components, Data Flow, Tech Choices & Why)
│   ├── DESIGN.md             # Stage 4 Design Document (Data Models, API Spec, Error Handling Matrix)
│   ├── USER_GUIDE.md         # Stage 4 Non-technical User Guide
│   ├── AI_CHANGE_LOOP_EVIDENCE.md # Stage 3 AI Loop Log (Prompts, breakages, AI corrections, red/green logs)
│   ├── PRESENTATION.html     # Stage 3 Deliverable 5: Interactive HTML Slide Deck (Sleek design)
│   └── VIDEO_SCRIPT.md       # Stage 3 Deliverable 6: 5-minute video outline & transcript
├── test-reports/             # Stage 2 & 3 captured test output files
│   ├── 01_initial_pass.log   # Initial Green test run log
│   ├── 02_deliberate_red.log # Deliberate Red test run (Application break caught by automated test suite)
│   └── 03_healed_pass.log   # Post-AI change loop Green test run log
└── README.md                 # Complete setup, running, and testing instructions
```

---

## User Review Required

> [!IMPORTANT]
> **Scenario Selection Confirmation**:
> We have selected the **Smart Corporate Equipment & Asset Reservation System** as it incorporates complex validation rules (date ranges, duration caps, asset maintenance locks, user quota limits) ideal for showcasing thorough test coverage, deliberate red runs, and AI change-loop self-healing.

---

## Proposed Implementation Stages

### Stage 1: Core Web Application & API
1. Build `src/server.js` and `src/database.js` with structured REST APIs:
   - `GET /api/assets` - List available equipment and maintenance status.
   - `POST /api/reservations` - Create a reservation (enforces date overlapping checks, duration caps, quota limits, input validation).
   - `GET /api/reservations` - View reservations with status filtering.
   - `POST /api/reservations/:id/cancel` - Cancel a reservation and restore quota.
2. Build `src/public/index.html`, `src/public/styles.css`, & `src/public/app.js`:
   - Modern dark/glassmorphic UI with vibrant visual design.
   - Interactive equipment catalog, reservation modal, real-time input validation, toast notifications, status timeline.

### Stage 2: AI-Generated Test Automation & Red Run Capture
1. Implement test suite (`tests/api.test.js` using Jest/Supertest):
   - **Happy Path**: Successful reservation creation, viewing, and cancellation.
   - **Edge Cases**: Boundary dates (e.g. 14-day exact max duration), reservation right after existing reservation ends.
   - **Invalid Inputs & Security**: End date before start date, negative durations, SQL/XSS injections, over-quota attempts.
2. Execute initial pass and save output to `test-reports/01_initial_pass.log`.
3. Introduce a deliberate logic defect into `src/server.js` (e.g., bypassing the date overlap check or allowing start date > end date).
4. Execute test suite, verify failure, and save output to `test-reports/02_deliberate_red.log`.

### Stage 3: The AI Change Loop (Feature Addition & Self-Healing)
1. Request a new feature: **"Asset Maintenance Overlap Enforcement & VIP Priority Queue"**.
2. Have AI implement the feature change in code.
3. Run test suite against the updated codebase.
4. Document any test failure detected by the suite during the feature addition.
5. Have AI automatically correct the codebase until all tests pass cleanly (`test-reports/03_healed_pass.log`).
6. Document step-by-step in `docs/AI_CHANGE_LOOP_EVIDENCE.md`.

### Stage 4: Comprehensive Documentation Set & Deliverables
1. Write `docs/ARCHITECTURE.md` (System components, data flow diagrams, tech stack choices).
2. Write `docs/DESIGN.md` (Data schemas, REST endpoints, error code mapping, edge case handling).
3. Write `docs/USER_GUIDE.md` (Step-by-step guide with diagrams for non-technical users).
4. Build `docs/PRESENTATION.html` (Interactive, beautifully styled 6-slide presentation deck).
5. Write `docs/VIDEO_SCRIPT.md` (5-minute video narration & demo script).
6. Provide a pristine `README.md` with 1-step launch instructions.

---

## Verification Plan

### Automated Verification
- Run `npm test` to execute full API and logic tests.
- Capture terminal outputs for initial green, deliberate red, and post-healing green states.

### Manual Verification
- Launch application locally using `npm start` and verify UI interaction, validation messages, and responsive layout.
