# Stage 4: Architecture Document

## 1. System Overview
The **Smart Corporate Equipment & Asset Reservation System** is designed to manage high-value asset checkout processes with strict governance and automated rule enforcement. It is a lightweight, responsive web application combining a clean REST API backend with a modern HTML5/Vanilla CSS frontend.

## 2. Components
- **Frontend UI (Presentation Layer)**: Built with Vanilla HTML5, CSS3 (Glassmorphism aesthetics), and JavaScript. Responsible for rendering real-time asset availability, handling user input, performing client-side validation, and asynchronously fetching data from the API.
- **API Server (Application Layer)**: A Node.js backend using Express.js. Handles core business logic, input sanitization, security validation, and RESTful routing.
- **Data Store (Data Layer)**: An encapsulated in-memory data access module (`database.js`). Simulates a transactional database providing decoupled methods for `create`, `find`, and `cancel` operations, allowing easy swapping for a persistent SQL/NoSQL DB in production.

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

## 5. Architectural Trade-offs & Known Limitations
To maintain simplicity, rapid deployment, and zero external dependencies for this assessment, specific architectural trade-offs were made:
- **CSV-Backed Persistence vs SQL/NoSQL**: The application uses a stateful class (`database.js`) backed by flat CSV files (`assets.csv` and `reservations.csv`) via the `csv-parse` and `csv-stringify` libraries. This deliberate choice allows reviewers to instantly inspect the data directly in Excel or Sheets, fitting the "ledger" theme perfectly without requiring database provisioning (e.g., Postgres). To prevent data corruption under concurrent load (like the rate-limit stress tests), the architecture uses an asynchronous write queue and atomic file rename operations (`fs.renameSync`) to ensure robust writes.
- **Authentication**: Roles (`?role=admin`) and the new Login Screen are purely frontend constructs to facilitate demo flows. **Anyone can type any name into the login screen and check the Admin box without cryptographic verification.** This is an intentional simplification for a stateless demo environment, though the backend continues to strictly validate and sanitize all payloads (e.g., rejecting XSS and blank names).
