# 📦 Smart Asset Checkout Log

This is the completed codebase for the **Tactive Internship Hiring Assessment**. It is a full-stack web application designed with an AI-generated test suite and documentation, showcasing an end-to-end "build -> test -> fix" AI loop.

Unlike generic SaaS dashboards, the application features a unique **"Tool Crib" physical inventory aesthetic**—using perforated claim tickets, rotated ink stamps, and ledger-style typography to simulate a real-world warehouse environment.

## 🚀 1. Quick Start (How to Run)
You need [Node.js](https://nodejs.org/) installed to run this project.

1. Clone or extract this repository.
2. Open a terminal in the repository root directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```
5. Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

## 🧪 2. Running the Test Suite
The test suite (built with Jest and Supertest) validates the API, edge cases, invalid inputs, and security constraints.

```bash
npm test
```
*Note: Test execution output logs (Initial Green Run, Deliberate Red Run, Healed Green Run) have been captured in the `test-reports/` directory.*

---

## 🏗️ 3. How It Works

### The Frontend (Client-side)
**Tech Stack**: Vanilla HTML5, CSS3, and JavaScript.
- **The UI**: The interface is split into two panels. The left side is the **Inventory Log** (available assets formatted as tear-off claim tickets). The right side is your **Checked Out** ledger (due-date cards with ink-stamp statuses). 
- **Dynamic Rendering**: `app.js` makes asynchronous `fetch()` calls to the API and dynamically generates the HTML cards.
- **Secure Handling**: Instead of using vulnerable inline `onclick` attributes, the frontend uses secure JavaScript **Event Listeners** tied to `data-id` attributes for "Tear to Reserve" and "Void Ticket" actions.

### The Backend (Server-side)
**Tech Stack**: Node.js, Express.js API, and an In-Memory Data Store.
- **The Data Store (`database.js`)**: Simulates a real database holding assets and reservations in memory. It contains complex algorithms like `hasDateOverlap()` to check if a requested date range mathematically collides with existing approved reservations.
- **The API Gatekeeper (`server.js`)**: When the frontend asks to create a reservation via a `POST /api/reservations` request, the backend runs a gauntlet of strict checks:
   - **XSS Check**: Rejects malicious `<script>` tags in IDs.
   - **Time Check**: Rejects dates in the past, or if End Date < Start Date.
   - **Duration Limit**: Rejects bookings exceeding the asset's maximum allowed days.
   - **Double-Book Check**: Rejects overlapping dates with a `409 Conflict`.
   - **Quota Check**: If the user already has 2 active reservations, the **AI-implemented feature** kicks in and silently changes the reservation status to `PENDING_APPROVAL` instead of throwing an error.

---

## 📁 4. Deliverables Directory Map
Here is where you can find all 6 required deliverables for the assessment:

1. **Source Code**: `src/server.js`, `src/public/`, `tests/`
2. **Test Suite & Captured Logs**: `tests/api.test.js` & `test-reports/` folder.
3. **AI Change-Loop Evidence Log**: `docs/AI_CHANGE_LOOP_EVIDENCE.md`
4. **Architecture, Design, User Guide**: `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/USER_GUIDE.md`
5. **Presentation Deck**: `docs/PRESENTATION.html` *(Open this file directly in a web browser)*
6. **Video Script**: `docs/VIDEO_SCRIPT.md`

## 🤖 5. AI Tooling Used
- **Claude / Gemini Pro / Cursor**: Used iteratively to scaffold the Express.js architecture, style the warehouse inventory frontend UI, generate the Jest/Supertest suite, and execute the self-healing change loop for the quota overflow feature.
