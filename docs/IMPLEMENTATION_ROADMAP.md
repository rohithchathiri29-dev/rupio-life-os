# Life OS — Incremental Build & Implementation Roadmap

This document outlines the step-by-step implementation strategy for the **Rupio Life OS** platform. It provides a formal **Module Dependency Matrix** and splits the build process into 6 highly focused, incremental sprints to minimize regression and ensure structural safety.

---

## 1. Module Dependency Matrix

The table below defines the topological order of development. Modules must be built in accordance with their upstream dependencies to prevent cascading breakages or structural redesigns.

| Module / Layer | Primary Responsibility | Upstream Dependencies | Downstream Dependencies | Sync Class |
| :--- | :--- | :--- | :--- | :--- |
| **Auth & Security** | Core user creation, session rotation, device tracking, and Field-Level Encryption | *None* | All Modules | Server-Internal (No Sync) |
| **Category System** | Expense, income, and routine tagging baseline | **Auth & Security** | Finance, Budgets, Habits | Bidirectional |
| **Finance Core** | Ledger transactions and asset registry | **Auth & Security**, **Category System** | Budgets, Net Worth Snapshots, Gamification | Bidirectional |
| **Budgets & Goals** | Limits allocation and milestone trackers | **Finance Core** | Gamification | Bidirectional |
| **Net Worth Snapshots** | Aggregated daily financial balance sheets | **Finance Core** | Gamification | Pull-only |
| **Habits & Routines** | Recurrent task definitions and calendar completion grids | **Auth & Security**, **Category System** | Gamification, Reminders | Bidirectional |
| **Health Hub** | Polymorphic health recordings (sleep, vitals, hydration) | **Auth & Security** | Gamification, Reminders | Bidirectional |
| **Recovery Clocks** | Sobriety monitors, high-risk geofences, and craving entry logs | **Auth & Security** | Gamification, Reminders, Journaling | Bidirectional |
| **Journaling & Mood** | Daily encrypted writings and reflections with program linkages | **Auth & Security**, **Recovery Clocks** | Gamification | Bidirectional |
| **Reminders & Alerts** | Push and local scheduled triggers management | **Auth & Security** | Habits, Health Hub, Finance Core | Bidirectional |
| **Gamification Engine** | Experience point (XP) accumulation and badge rewards | All core modules | Dashboard, Profile | Pull-only |
| **Global Search** | Multi-module content queries and decryption filters | All core modules | Dashboard | Client-Side Filter |
| **Rupio AI Advisor** | LLM-driven personalized feedback | All core modules | Dashboard | Server-Internal (No Sync) |

---

## 2. Six-Sprint Implementation Roadmap

### Sprint 1: Project Bootstrap, Authentication & Cryptography
*Establish the foundational container runtime, database connectivity, and field-level encryption middleware.*

* **Goals**: Boot the Docker Compose architecture, configure JWT/Refresh token rotating lifecycles, and implement the server-side field-level encryption (FLE) envelope.
* **Deliverables**:
  * Functional `docker-compose.yml` hosting Express + Node + MongoDB (with standard Replica Set for future sharding design).
  * JWT access token issuance endpoint & `refreshTokens` rotators keyed to `devices`.
  * Encrypt/Decrypt helper hooks configured inside server middlewares (`body` in journals, `trigger` in craving entries, `location` in risk hotspots).
  * Automated category seeder spawning default labels (`Food`, `Rent`, `Salary`) tagged with a user's unique ID instantly at signup.
* **Dependencies**: Express Runtime, Mongoose/MongoDB, Crypto/BCrypt.
* **Acceptance Criteria**:
  * Registration yields a complete user document and automatically seeds 10 distinct custom `categories`.
  * Encrypted database checks verify that fields designated as FLE are stored strictly as ciphertext in MongoDB collections but deserialize seamlessly as plaintext when queried using a valid user session.
  * Attempting to access protected endpoints with expired tokens triggers a `401 Unauthorized` block.
* **Estimated Effort**: 12 Story Points (Approx. 5 days)

---

### Sprint 2: Core Financial Ledger & Analytics
*Build the double-entry accounting engine, monthly budget allocations, and net worth snapshot compilers.*

* **Goals**: Create the finance ledger allowing full tracking of incoming/outgoing transactions, recurring subscription obligations, and pre-calculated net worth balances.
* **Deliverables**:
  * Transaction CRUD endpoints with optional category mapping (`transactions`).
  * Recurring expense processor (`recurringPayments`) spawning auto-ledger rows on target due dates.
  * Budget enforcement rules compiling category caps (`budgets`).
  * Cron task compiling nightly net worth aggregates to populate `netWorthSnapshots`.
* **Dependencies**: Sprint 1 Auth, MongoDB Aggegation Framework, Node-Cron.
* **Acceptance Criteria**:
  * Multi-currency inputs store values cleanly in decimal units without rounding errors.
  * Transactions linked to category boundaries increment `budgets.currentSpent` dynamically.
  * Querying net worth history returns pre-aggregated daily sums in `O(1)` time instead of triggering a full database aggregation.
* **Estimated Effort**: 15 Story Points (Approx. 6 days)

---

### Sprint 3: Habits & Routines Engine
*Implement custom routines, calendar completion histories, and atomic streak computation algorithms.*

* **Goals**: Enable habits definition with variable recurring cycles and track streaks with mathematical certainty (preventing timezone shifting errors).
* **Deliverables**:
  * Habit definition builder (`habits`).
  * Atomic toggle Completion endpoint recording events inside `habitEntries`.
  * Chronological streak validator calculating continuous daily completions while honoring the user's local timezone offset.
* **Dependencies**: Sprint 1 Auth, Luxon/Moment Timezone tracking.
* **Acceptance Criteria**:
  * Completing a habit twice within the same calendar day (user timezone) updates the single today row instead of creating duplicate entries.
  * Missing a scheduled habit frequency automatically resets current streak indicators to zero upon next calendar boundary.
  * Deleting a historical completion entry recalculates and updates active streaks retroactively.
* **Estimated Effort**: 10 Story Points (Approx. 4 days)

---

### Sprint 4: Health Hub, Alco Radar, and Encrypted Journal
*Launch substance sobriety tracking, polymorphic physical metrics, and military-grade private journaling.*

* **Goals**: Create Alco Radar clocks, log trigger locations, compile polymorphic wellness measurements, and launch secure, search-optimized reflective journals.
* **Deliverables**:
  * Polymorphic `healthMetrics` router storing hydration limits, sleep sleep-cycles, and workout logs.
  * Sobriety tracking controllers (`recoveryPrograms`, `recoveryEntries`) and geofencing coordinates (`riskLocations`).
  * Encrypted journal controllers (`journalEntries`) storing client-side decryptable thoughts.
  * Content search endpoint matching `title` and `tags` only (ensuring the encrypted body remains completely isolated from database indices).
* **Dependencies**: Sprint 1 Cryptography Middlewares, Turf.js/GeoJSON index.
* **Acceptance Criteria**:
  * Geofence coordinates evaluate successfully via point-in-polygon queries.
  * Journal entries verify successful body field-level encryption on the database, while remaining queryable via title keywords or string arrays in tags.
  * Substance counters compute down to exact days, hours, and minutes of sober progress.
* **Estimated Effort**: 18 Story Points (Approx. 7 days)

---

### Sprint 5: Offline Sync Engine & Automated Notifications
*Solve the bidirectional synchronization puzzle with client-side conflict resolution and scheduled local alerts.*

* **Goals**: Deploy standard offline data schemas incorporating client IDs, manage synchronization pull-cursors, and establish reminder engine records.
* **Deliverables**:
  * Sync pull engine evaluating server state differences matching `lastSyncAt` cursors.
  * Multi-device conflict resolution processor (Server-Wins or Client-Wins schemas based on modification timestamps).
  * Reminder engine backend registering local cron patterns (`reminders`).
* **Dependencies**: All preceding core data modules, Redis (optional caching) or MongoDB version cursors.
* **Acceptance Criteria**:
  * Pulling changes with a given sync cursor updates modified, created, or deleted records cleanly.
  * Multiple offline devices editing the same document synchronize without data duplication or row dropouts, leaving `syncStatus: "synced"`.
  * Scheduling a habit reminder persists in the database, restoring notification schedules after background application restarts.
* **Estimated Effort**: 20 Story Points (Approx. 8 days)

---

### Sprint 6: Gamification, Search & AI Advisor
*Deploy the final polish: level rewards, global search aggregations, and personalized AI advisory pipelines.*

* **Goals**: Reward user consistency with leveling models, run full-text search filters, and generate personalized, contextual life optimization advice using Gemini.
* **Deliverables**:
  * Leveling logic evaluating cumulative habit streaks, savings milestones, and wellness logs.
  * Dynamic `scoreHistory` and `achievements` unlock managers.
  * Global Search router pooling multi-module tables (Transactions, Habits, Health, Journals) into a single dashboard search.
  * Context-aware, server-side Rupio AI Advisor endpoint compiling financial ratios, health logs, and sobriety trends into structured advice.
* **Dependencies**: Complete suite of Life OS data collections, Gemini API (via @google/genai SDK).
* **Acceptance Criteria**:
  * Reaching streak milestones triggers badge creation and levels-up the user's Overall Life Score.
  * Global search returns matching nodes across finance, habits, and journals in under 150ms.
  * Rupio AI advisor fetches real, anonymized financial aggregates and health logs to output actionable, non-trivial advice.
* **Estimated Effort**: 15 Story Points (Approx. 6 days)

---

## 3. Risk Mitigation & Execution Guidelines

To guarantee high structural quality, developers must enforce the following architectural rules during each sprint:

1. **No Skip-Sprint Rule**: Ensure that Sprint 1 Auth, Cryptography, and Category seeding are 100% verified (fully compiled, linted, and database-tested) before initiating any route structures in subsequent sprints.
2. **Local Environment Isolation**: Execute MongoDB with Replica Sets locally via Docker Compose to ensure support for multi-document ACID transactions, identical to the production environment.
3. **Strict Lint & Compile Checks**: Compile and run checks after every module implementation to guarantee that type safety is preserved across both backend Node files and frontend React/TypeScript pages.
