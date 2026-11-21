# Stage 4: Architecture Document

## 1. System Overview
The **Smart Corporate Equipment & Asset Reservation System** is designed to manage high-value asset checkout processes with strict governance and automated rule enforcement. It is a lightweight, responsive web application combining a clean REST API backend with a modern HTML5/Vanilla CSS frontend.

## 2. Components
- **Frontend UI (Presentation Layer)**: Built with Vanilla HTML5, CSS3 (Glassmorphism aesthetics), and JavaScript. Responsible for rendering real-time asset availability, handling user input, performing client-side validation, and asynchronously fetching data from the API.
- **API Server (Application Layer)**: A Node.js backend using Express.js. Handles core business logic, input sanitization, security validation, and RESTful routing.
- **Data Store (Data Layer)**: An enterprise-grade, dual-mode persistence architecture (`src/database.js` & `src/db/postgres.js`).
  - **PostgreSQL Persistent Storage**: Production engine powered by `pg` (Connection Pooling), transactional DDL schemas, timestamp range index optimizations, and ACID consistency.
  - **CSV / In-Memory Fallback**: Zero-dependency development and testing fallback when `DATABASE_URL` is omitted, using asynchronous atomic file writes (`fs.renameSync`) to ensure zero-friction local evaluations.
  - **Runtime Auto-Negotiation**: Dynamically selects PostgreSQL when `DATABASE_URL` or `USE_POSTGRES=true` is set, with graceful fallback if the database server is offline. Exposed via `GET /api/system/status`.

## 3. Data Flow
1. **User Action**: The user selects an asset and submits a reservation date range via the UI.
2. **Client Validation**: The frontend checks if the dates are valid (start >= today, end > start).
3. **API Request**: A POST request with `assetId`, `userId`, `startDate`, and `endDate` is sent to the backend.
4. **Server Validation**: The server validates constraints:
   - Is it in the past?
   - Is it XSS/SQL injection safe?
   - Does it overlap with existing reservations for that asset?
   - Does the duration exceed the asset's max limit?
   - Does it exceed the user's active quota?
5. **Data Mutation**: If valid, the Data Store creates a reservation record and assigns an ID and `APPROVED` (or `PENDING_APPROVAL`) status.
6. **Response**: Server responds with 201 Created and the new object.
7. **UI Update**: The frontend displays a success toast and reloads the active reservations view.

## 4. Technology Choices and Rationale
| Technology | Choice | Why? |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | Fast scaffolding, non-blocking I/O ideal for API servers, universally understood. |
| **Frontend** | Vanilla JS/HTML/CSS | Eliminates build steps for a simple assessment app, ensures the code runs directly from the browser without compiling. |
| **Testing** | Jest + Supertest | Jest provides a robust assertion and mocking library out of the box. Supertest allows for seamless HTTP endpoint testing without standing up a live server port. |
| **Architecture** | Monolithic MVC-like | Given the scope, a single repository with separated routing, logic, and data layers provides the right balance of structure without over-engineering (e.g. Microservices). |

## 5. Architectural Trade-offs & Persistence Evolution
To balance enterprise production standards with frictionless review and instant CI testing, the architecture implements an adaptable dual-mode persistence strategy:

- **Evolution to Persistent PostgreSQL with Resilient Fallback**:
  - **Production PostgreSQL Layer**: Solves multi-client scaling, concurrency race conditions, and durability requirements through managed connection pooling (`pg.Pool`), sequence-driven atomic ID generation (`asset_id_seq`, `reservation_id_seq`), and strict ACID transactions.
  - **Concurrency & Anti-Double-Booking Guarantees**: Employs two complementary layers of isolation:
    1. **Application-Level Row Locks (`SELECT ... FOR UPDATE`)**: Serializes concurrent reservation attempts targeting the same asset inside an active database transaction.
    2. **Engine-Level GiST Exclusion Constraints (`tstzrange`)**: Imposes an immutable mathematical constraint at the PostgreSQL storage engine level (`EXCLUDE USING gist`), guaranteeing that no two overlapping non-cancelled bookings can ever exist for the same asset.
  - **Zero-Dependency Fallback Engine**: While PostgreSQL serves production workloads, the system retains an encapsulated, zero-dependency CSV ledger engine (`src/data/assets.csv` and `src/data/reservations.csv`) using asynchronous write queues and atomic renames (`fs.renameSync`). If PostgreSQL is not provisioned or is temporarily offline, an eager connection probe gracefully auto-negotiates traffic to the CSV store so reviewers and unit tests can run instantly without database prerequisites.
- **Authentication**: Roles (`?role=admin`) and the Login Screen are client-side demo constructs designed to facilitate evaluation flows. **Anyone can enter any name and check the Admin box without cryptographic verification.** This is an intentional simplification for a stateless demo environment, though the backend continues to strictly validate and sanitize all payloads (e.g., rejecting XSS and blank names).
