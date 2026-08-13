const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'pdfs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Shared CSS ──────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --paper: #F5EFE0;
    --paper-mid: #EDE5CE;
    --paper-dark: #E2D8C0;
    --ink: #1C1814;
    --ink-mid: #4A4035;
    --ink-soft: #7A6E5F;
    --kraft: #B07D3A;
    --kraft-light: rgba(176,125,58,0.18);
    --red: #8B2A1E;
    --green: #2A5C3A;
    --blue: #1E3A5F;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--paper);
    color: var(--ink);
    padding: 48px 60px;
    font-size: 10.5pt;
  }

  /* ── Cover band ── */
  .doc-cover {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 36px;
    padding-bottom: 16px;
    border-bottom: 2.5px solid var(--ink);
  }
  .doc-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 3.2rem;
    font-weight: 600;
    color: var(--paper-dark);
    line-height: 1;
    flex-shrink: 0;
  }
  .doc-cover-text .eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 7pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--kraft);
    margin-bottom: 4px;
  }
  .doc-cover-text h1 {
    font-family: 'Oswald', sans-serif;
    font-size: 1.9rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--ink);
    line-height: 1.1;
  }
  .doc-cover-text .sub {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 9pt;
    color: var(--ink-soft);
    margin-top: 4px;
  }

  /* ── Section headings ── */
  h2 {
    font-family: 'Oswald', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink);
    margin: 28px 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--paper-dark);
    display: flex;
    align-items: center;
    gap: 9px;
  }
  h2 .sec-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 7pt;
    color: var(--kraft);
    background: var(--kraft-light);
    padding: 2px 6px;
    border-radius: 2px;
  }
  h3 {
    font-family: 'Oswald', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-mid);
    margin: 20px 0 7px;
  }
  p {
    font-family: 'Lora', serif;
    font-size: 9.5pt;
    line-height: 1.72;
    color: var(--ink-mid);
    margin-bottom: 10px;
  }

  /* ── Lists ── */
  ul, ol { padding-left: 0; list-style: none; }
  ol { counter-reset: step; }
  ul li, ol li {
    font-family: 'Lora', serif;
    font-size: 9.5pt;
    line-height: 1.6;
    color: var(--ink-mid);
    padding: 6px 0 6px 26px;
    border-bottom: 1px dashed var(--paper-dark);
    position: relative;
  }
  ul li::before {
    content: "▸";
    position: absolute; left: 4px;
    color: var(--kraft); font-size: 8pt; top: 8px;
  }
  ol li { counter-increment: step; }
  ol li::before {
    content: counter(step, decimal-leading-zero);
    position: absolute; left: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 7pt; color: var(--kraft); font-weight: 600; top: 8px;
  }
  li strong { font-family: 'Inter', sans-serif; font-weight: 600; color: var(--ink); }
  li:last-child { border-bottom: none; }
  ul ul { padding-left: 18px; margin-top: 3px; }
  ul ul li { font-size: 8.5pt; border-bottom: none; padding: 2px 0 2px 20px; }
  ul ul li::before { content: "—"; font-size: 7pt; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 14px 0; }
  thead tr { background: var(--ink); color: var(--paper); }
  thead th {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 7pt; letter-spacing: 0.12em;
    text-transform: uppercase; padding: 8px 12px; text-align: left;
  }
  tbody tr { border-bottom: 1px solid var(--paper-dark); }
  tbody td { font-family: 'Lora', serif; padding: 8px 12px; color: var(--ink-mid); vertical-align: top; }
  tbody td:first-child { font-family: 'Inter', sans-serif; font-weight: 600; color: var(--ink); }

  /* ── Code ── */
  pre {
    background: var(--ink); color: #C9C0B0;
    font-family: 'IBM Plex Mono', monospace; font-size: 7.5pt;
    line-height: 1.6; padding: 16px 18px; margin: 12px 0;
    page-break-inside: avoid;
  }
  code {
    background: var(--paper-mid); font-family: 'IBM Plex Mono', monospace;
    font-size: 8pt; padding: 1px 5px; border-radius: 2px; color: var(--blue);
  }
  pre code { background: none; padding: 0; color: inherit; font-size: inherit; }
  .kw { color: #E8A87C; } .str { color: #A8D8A8; } .cmt { color: #7A7060; font-style: italic; } .num { color: #C8A0D8; }

  /* ── Callout ── */
  .callout {
    border-left: 4px solid var(--kraft); background: var(--kraft-light);
    padding: 11px 14px; margin: 14px 0; border-radius: 0 3px 3px 0;
    page-break-inside: avoid;
  }
  .callout.red { border-left-color: var(--red); background: rgba(139,42,30,0.08); }
  .callout.green { border-left-color: var(--green); background: rgba(42,92,58,0.08); }
  .callout.blue { border-left-color: var(--blue); background: rgba(30,58,95,0.08); }
  .callout .lbl {
    font-family: 'IBM Plex Mono', monospace; font-size: 7pt;
    letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;
  }
  .callout.red .lbl { color: var(--red); }
  .callout.green .lbl { color: var(--green); }
  .callout.blue .lbl { color: var(--blue); }
  .callout p { font-size: 9pt; margin: 0; line-height: 1.55; }

  /* ── Stamp ── */
  .stamp {
    display: inline-block; font-family: 'Oswald', sans-serif;
    font-size: 8pt; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; border: 2.5px solid currentColor;
    padding: 3px 10px; border-radius: 3px; transform: rotate(-2deg);
    margin: 6px 0;
  }
  .stamp.red { color: var(--red); } .stamp.green { color: var(--green); } .stamp.blue { color: var(--blue); }

  /* ── AI Loop flow ── */
  .loop-flow { display: flex; gap: 0; margin: 16px 0; page-break-inside: avoid; }
  .loop-step {
    flex: 1; background: var(--paper-mid); border: 1px solid var(--paper-dark); padding: 14px 12px;
  }
  .loop-step + .loop-step { border-left: none; }
  .loop-step .sn { font-family: 'IBM Plex Mono', monospace; font-size: 7pt; color: var(--kraft); letter-spacing: 0.1em; margin-bottom: 4px; }
  .loop-step h4 { font-family: 'Oswald', sans-serif; font-size: 0.78rem; text-transform: uppercase; margin-bottom: 5px; }
  .loop-step p { font-size: 8pt !important; margin: 0 !important; line-height: 1.45 !important; }
  .loop-arrow { align-self: center; padding: 0 8px; color: var(--kraft); font-family: 'IBM Plex Mono', monospace; font-size: 14pt; }

  /* ── Script parts ── */
  .script-part { background: var(--paper-mid); border: 1px solid var(--paper-dark); border-radius: 3px; margin: 14px 0; page-break-inside: avoid; }
  .sp-head { display: flex; align-items: center; justify-content: space-between; background: var(--ink); color: var(--paper); padding: 8px 14px; }
  .sp-head .pt { font-family: 'Oswald', sans-serif; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .sp-head .tm { font-family: 'IBM Plex Mono', monospace; font-size: 7pt; color: var(--kraft); }
  .sp-body { padding: 12px 14px; }
  .sp-visual {
    font-family: 'IBM Plex Mono', monospace; font-size: 7.5pt; color: var(--blue);
    background: rgba(30,58,95,0.08); border: 1px solid rgba(30,58,95,0.15);
    padding: 5px 10px; border-radius: 2px; margin-bottom: 8px;
  }
  .sp-visual::before { content: "▸ VISUAL: "; font-weight: 600; letter-spacing: 0.06em; }
  .sp-text {
    font-family: 'Lora', serif; font-style: italic; font-size: 9pt;
    line-height: 1.65; color: var(--ink-mid); border-left: 3px solid var(--kraft);
    padding-left: 12px; margin: 8px 0 0;
  }
  .sb { list-style: none; margin-top: 8px; }
  .sb li { font-family: 'Lora', serif; font-size: 8.5pt; line-height: 1.55; padding: 7px 0; border-bottom: 1px dashed var(--paper-dark); }
  .sb li::before { display: none !important; }
  .sb li:last-child { border-bottom: none; }
  .tt {
    font-family: 'IBM Plex Mono', monospace; font-size: 7pt;
    background: var(--ink); color: var(--paper); padding: 2px 6px;
    border-radius: 2px; margin-right: 6px; display: inline-block;
  }
  .sb li strong { font-family: 'Inter', sans-serif; font-weight: 600; color: var(--ink); }
`;

// ─── Document definitions ─────────────────────────────────────────────────────
const DOCS = [
  {
    filename: 'ARCHITECTURE.pdf',
    num: '01',
    eyebrow: 'Stage 4 · Architecture Document',
    title: 'System Architecture',
    subtitle: 'How the layers are arranged and why each decision was made',
    body: `
      <h2><span class="sec-num">1.0</span> System Overview</h2>
      <p>The <strong>Smart Corporate Equipment &amp; Asset Reservation System</strong> manages high-value asset checkout processes with strict governance and automated rule enforcement. It is a lightweight, responsive web application combining a clean REST API backend with a modern HTML5 / Vanilla CSS frontend styled as a physical inventory ledger.</p>

      <h2><span class="sec-num">2.0</span> System Components</h2>
      <ul>
        <li><strong>Frontend UI — Presentation Layer</strong><br>Vanilla HTML5, CSS3, and JavaScript. Renders real-time asset availability, handles user input, performs client-side validation, and asynchronously fetches data from the API.</li>
        <li><strong>API Server — Application Layer</strong><br>Node.js + Express. Handles core business logic, input sanitisation, XSS / injection checks, rate-limiting, and RESTful routing.</li>
        <li><strong>Data Store — Data Layer</strong><br>Encapsulated <code>database.js</code> backed by flat CSV files (<code>assets.csv</code> / <code>reservations.csv</code>) via <code>csv-parse</code> and <code>csv-stringify</code>. Chosen so reviewers can inspect live data in Excel without database provisioning.</li>
      </ul>

      <h2><span class="sec-num">3.0</span> Data Flow</h2>
      <ol>
        <li><strong>User Action</strong> — user selects an asset and submits a reservation date range via the UI.</li>
        <li><strong>Client Validation</strong> — frontend checks dates are valid (start ≥ today, end &gt; start).</li>
        <li><strong>API Request</strong> — POST with <code>assetId</code>, <code>userId</code>, <code>startDate</code>, <code>endDate</code>.</li>
        <li><strong>Server Validation</strong> — past dates, XSS safety, asset maintenance status, duration cap, user quota, overlap check.</li>
        <li><strong>Data Mutation</strong> — record created with status <code>APPROVED</code> or <code>PENDING_APPROVAL</code>.</li>
        <li><strong>Response</strong> — 201 Created with the new reservation object.</li>
        <li><strong>UI Update</strong> — success toast displayed; asset list reloaded.</li>
      </ol>

      <h2><span class="sec-num">4.0</span> Technology Choices</h2>
      <table>
        <thead><tr><th>Technology</th><th>Choice</th><th>Rationale</th></tr></thead>
        <tbody>
          <tr><td>Backend</td><td>Node.js + Express</td><td>Fast scaffolding; non-blocking I/O ideal for API servers.</td></tr>
          <tr><td>Frontend</td><td>Vanilla JS / HTML / CSS</td><td>Zero build step; runs directly in any browser without compilation.</td></tr>
          <tr><td>Testing</td><td>Jest + Supertest</td><td>Robust assertion library; Supertest allows endpoint testing without a live server port.</td></tr>
          <tr><td>Architecture</td><td>Monolithic MVC-like</td><td>Separated routing, logic, and data layers — right balance of structure for this scope.</td></tr>
        </tbody>
      </table>

      <h2><span class="sec-num">5.0</span> Trade-offs &amp; Known Limitations</h2>
      <h3>CSV-Backed Persistence</h3>
      <p>Uses flat CSV files instead of a relational database. Allows reviewers to watch data update in Excel in real-time. Data integrity is protected by an <strong>asynchronous write queue</strong> and <strong>atomic rename operations</strong> (<code>fs.renameSync</code>) — writing to a <code>.tmp</code> first and flipping it over the real file, so a crash cannot produce a corrupted CSV.</p>
      <div class="callout blue">
        <div class="lbl">Test Isolation</div>
        <p>When <code>NODE_ENV=test</code>, the database targets <code>test-assets.csv</code> / <code>test-reservations.csv</code> so running Jest never touches live demo data.</p>
      </div>

      <h3>Authentication</h3>
      <p>Roles and the Login Screen are purely frontend constructs for the demo. <strong>Anyone can type any name and check Admin without cryptographic verification.</strong> The backend strictly validates and sanitises all payloads regardless of role.</p>
    `
  },

  {
    filename: 'DESIGN.pdf',
    num: '02',
    eyebrow: 'Stage 4 · Design Document',
    title: 'API Design & Data Models',
    subtitle: 'Data shapes, validation lifecycle, and error contract',
    body: `
      <h2><span class="sec-num">1.0</span> Data Models</h2>

      <h3>Asset</h3>
      <ul>
        <li><code>id</code> <strong>(String)</strong> — unique identifier, e.g. <code>"A1"</code></li>
        <li><code>name</code> <strong>(String)</strong> — display name</li>
        <li><code>category</code> <strong>(String)</strong> — <code>Computing</code> | <code>Photography</code> | <code>Displays</code> | <code>Misc</code></li>
        <li><code>status</code> <strong>(Enum)</strong> — <code>AVAILABLE</code> | <code>MAINTENANCE</code></li>
        <li><code>maxDuration</code> <strong>(Integer)</strong> — max checkout duration in days</li>
      </ul>

      <h3>Reservation</h3>
      <ul>
        <li><code>id</code> <strong>(String)</strong> — auto-incremented, e.g. <code>"R1"</code></li>
        <li><code>assetId</code> <strong>(String)</strong> — foreign key to Asset</li>
        <li><code>userId</code> <strong>(String)</strong> — name &amp; registration of reserver</li>
        <li><code>startDate</code> / <code>endDate</code> <strong>(Date)</strong> — stored as ISO strings in CSV; cast back to Date objects on load</li>
        <li><code>status</code> <strong>(Enum)</strong> — <code>APPROVED</code> | <code>PENDING_APPROVAL</code> | <code>CANCELLED</code> | <code>RETURNED</code></li>
        <li><code>createdAt</code> <strong>(Date)</strong> — creation timestamp</li>
      </ul>

      <h2><span class="sec-num">2.0</span> API Endpoints</h2>
      <table>
        <thead><tr><th>Method</th><th>Route</th><th>Purpose</th><th>Success</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td>/api/assets</td><td>Full asset catalog</td><td>200</td></tr>
          <tr><td>POST</td><td>/api/assets</td><td>Add new asset</td><td>201</td></tr>
          <tr><td>DELETE</td><td>/api/assets/:id</td><td>Remove asset</td><td>200</td></tr>
          <tr><td>PATCH</td><td>/api/assets/:id/maintenance</td><td>Toggle maintenance status</td><td>200</td></tr>
          <tr><td>GET</td><td>/api/assets/:id/history</td><td>Full reservation history for asset</td><td>200</td></tr>
          <tr><td>POST</td><td>/api/reservations</td><td>Create reservation (multi-stage validation)</td><td>201</td></tr>
          <tr><td>POST</td><td>/api/reservations/:id/cancel</td><td>Cancel an active reservation</td><td>200</td></tr>
        </tbody>
      </table>

      <h2><span class="sec-num">3.0</span> Validation Lifecycle (POST /api/reservations)</h2>
      <div class="callout blue">
        <div class="lbl">Validation Order</div>
        <p>XSS Safety → Date Validity → Maintenance Check → Duration Cap → Quota Check → Overlap Check → Save</p>
      </div>
      <ul>
        <li><strong>XSS / Injection Safety</strong> — rejects <code>'</code> <code>"</code> <code>&lt;</code> <code>&gt;</code> <code>;</code> in userId</li>
        <li><strong>Date Validity</strong> — rejects past dates and invalid ranges (end ≤ start)</li>
        <li><strong>Maintenance Check</strong> — rejects requests for assets in maintenance</li>
        <li><strong>Duration Cap</strong> — rejects when (endDate − startDate) &gt; <code>asset.maxDuration</code></li>
        <li><strong>Quota Check</strong> — if user has ≥ 2 active reservations, new booking becomes <code>PENDING_APPROVAL</code></li>
        <li><strong>Overlap Check</strong> — rejects if asset is already booked for the requested dates (409)</li>
        <li><strong>Rate Limiting</strong> — max 50 requests per minute per IP (429 after)</li>
      </ul>

      <h2><span class="sec-num">4.0</span> Error Handling Matrix</h2>
      <p>All errors return: <code>{"error": "Description"}</code></p>
      <table>
        <thead><tr><th>Scenario</th><th>HTTP Status</th><th>Message</th></tr></thead>
        <tbody>
          <tr><td>Missing required fields</td><td>400</td><td>"Missing required fields."</td></tr>
          <tr><td>Script injection in userId</td><td>400</td><td>"Invalid characters in user ID/Name."</td></tr>
          <tr><td>End date before Start date</td><td>400</td><td>"End date must be strictly after start date."</td></tr>
          <tr><td>Booking in the past</td><td>400</td><td>"Cannot book in the past."</td></tr>
          <tr><td>Asset in maintenance</td><td>400</td><td>"Asset is currently in maintenance."</td></tr>
          <tr><td>Duration exceeds maxDuration</td><td>400</td><td>"Exceeds maximum duration of X days."</td></tr>
          <tr><td>Date overlap / double-booking</td><td>409</td><td>"Asset is already reserved for the requested dates."</td></tr>
          <tr><td>Rate limit exceeded</td><td>429</td><td>"Too many reservation requests."</td></tr>
          <tr><td>Asset not found</td><td>404</td><td>"Asset not found."</td></tr>
        </tbody>
      </table>
    `
  },

  {
    filename: 'AI_CHANGE_LOOP_EVIDENCE.pdf',
    num: '03',
    eyebrow: 'Stage 3 · AI Change Loop Evidence',
    title: 'AI-Assisted Change Loop',
    subtitle: 'Feature request → regression detection → self-correction, documented end-to-end',
    body: `
      <h2><span class="sec-num">1.0</span> Feature Request</h2>
      <div class="callout blue">
        <div class="lbl">The Prompt Given to the AI</div>
        <p>"When a user exceeds their quota of 2 active reservations, instead of returning a 400 Bad Request error, create the reservation but set its status to <strong>PENDING_APPROVAL</strong> for admin review."</p>
      </div>

      <h2><span class="sec-num">2.0</span> Code Changes Made by AI</h2>
      <p>The AI modified the quota validation logic in <code>src/server.js</code>. Rather than hard-rejecting quota overflows, it extracts the would-be status into a variable before reaching the database write:</p>
      <pre><span class="cmt">// BEFORE — hard 400 rejection on 3rd booking</span>
<span class="kw">const</span> userReservations = db.getReservationsByUser(userId);
<span class="kw">if</span> (userReservations.length >= <span class="num">2</span>) {
  <span class="kw">return</span> res.status(<span class="num">400</span>).json({ error: <span class="str">'User quota exceeded.'</span> });
}

<span class="cmt">// AFTER — quota overflow creates PENDING_APPROVAL instead</span>
<span class="kw">const</span> userReservations = db.getReservationsByUser(userId);
<span class="kw">let</span> finalStatus = <span class="str">'APPROVED'</span>;
<span class="kw">if</span> (userReservations.length >= <span class="num">2</span>) {
  finalStatus = <span class="str">'PENDING_APPROVAL'</span>;
}
<span class="kw">const</span> reservation = db.createReservation({ assetId, userId, startDate, endDate });
reservation.status = finalStatus;
res.status(<span class="num">201</span>).json(reservation);</pre>

      <h2><span class="sec-num">3.0</span> Detecting the Regression — Red Run</h2>
      <p>Upon running <code>npm test</code>, the automated suite caught a regression. The test enforcing a hard 400 limit now received a 201.</p>
      <div class="stamp red">Red Run Captured</div>
      <pre><span class="cmt">FAIL tests/api.test.js</span>
  ● POST /api/reservations - Edge Case: Exceed user quota (max 2)

    expect(received).toBe(expected)
    Expected: <span class="num">400</span>
    Received: <span class="num">201</span>

      81 |     <span class="cmt">// Third should fail</span>
    > 83 |     expect(res.statusCode).toBe(<span class="num">400</span>);
         |                            ^</pre>

      <h2><span class="sec-num">4.0</span> AI Self-Correction — Green Run</h2>
      <p>The AI recognised the feature change fundamentally altered the expected behaviour and rewrote the assertion:</p>
      <pre><span class="cmt">// BEFORE — expected hard rejection</span>
expect(res.statusCode).toBe(<span class="num">400</span>);
expect(res.body.error).toContain(<span class="str">'User quota exceeded'</span>);

<span class="cmt">// AFTER — expects PENDING_APPROVAL, not failure</span>
expect(res.statusCode).toBe(<span class="num">201</span>);
expect(res.body.status).toBe(<span class="str">'PENDING_APPROVAL'</span>);</pre>
      <div class="stamp green">Green Run — All 15 Tests Pass</div>
      <div class="callout green" style="margin-top:14px;">
        <div class="lbl">Final Outcome</div>
        <p>Running <code>npm test</code> after the correction produced a fully green suite. Full logs in <code>test-reports/03_healed_pass.log</code>.</p>
      </div>

      <h2><span class="sec-num">5.0</span> Loop Summary</h2>
      <div class="loop-flow">
        <div class="loop-step">
          <div class="sn">01 — REQUEST</div>
          <h4>Feature Added</h4>
          <p>Quota overflow no longer fails — it creates a PENDING_APPROVAL reservation instead.</p>
        </div>
        <div class="loop-arrow">→</div>
        <div class="loop-step">
          <div class="sn">02 — BREAKAGE</div>
          <h4>Test Fails</h4>
          <p>Old test expected a 400 rejection. Now receives 201. Jest catches the regression immediately.</p>
        </div>
        <div class="loop-arrow">→</div>
        <div class="loop-step">
          <div class="sn">03 — HEALING</div>
          <h4>Self-Corrected</h4>
          <p>AI rewrites the assertion to expect 201 + PENDING_APPROVAL. All 15 tests green.</p>
        </div>
      </div>
    `
  },

  {
    filename: 'VIDEO_SCRIPT.pdf',
    num: '04',
    eyebrow: 'Stage 4 · Video Presentation',
    title: 'Video Script',
    subtitle: 'Word-for-word script and visual cues for the 5-minute presentation video',
    body: `
      <div class="callout">
        <div class="lbl">Total Duration</div>
        <p>~5 minutes. Record in one continuous take. Switch between slides and browser without cutting for a natural demo feel.</p>
      </div>

      <div class="script-part">
        <div class="sp-head">
          <span class="pt">Part 1 — Problem &amp; Approach</span>
          <span class="tm">0:00 – 1:00</span>
        </div>
        <div class="sp-body">
          <div class="sp-visual">Show Slide 1 (Cover), then Slide 2 (Problem Space)</div>
          <p class="sp-text">"Hi, I'm presenting the Smart Asset Reservation System built for the Tactive Assessment. The problem I tackled is corporate equipment management — specifically preventing overlapping reservations, enforcing max duration limits, and managing user quotas. My approach was to build a Node.js REST API with a ledger-styled frontend, prioritising strict server-side validation and automated testing."</p>
        </div>
      </div>

      <div class="script-part">
        <div class="sp-head">
          <span class="pt">Part 2 — Solution &amp; AI Change Loop</span>
          <span class="tm">1:00 – 2:00</span>
        </div>
        <div class="sp-body">
          <div class="sp-visual">Show Slide 4 (Test Automation), Slide 5 (AI Change Loop), then switch to code editor showing docs/AI_CHANGE_LOOP_EVIDENCE.md</div>
          <p class="sp-text">"Security and reliability are handled by a robust Jest + Supertest test suite. To demonstrate the AI change loop, I had the AI implement a feature where exceeding your reservation quota places your booking in a PENDING_APPROVAL state rather than outright rejecting it. This predictably broke our existing strict-rejection test. The AI caught the regression in the Red Run, and then self-corrected the test suite to expect the new behaviour, resulting in our final Green Run with all 15 tests passing."</p>
        </div>
      </div>

      <div class="script-part">
        <div class="sp-head">
          <span class="pt">Part 3 — Live Demonstration</span>
          <span class="tm">2:00 – 5:00</span>
        </div>
        <div class="sp-body">
          <div class="sp-visual">Switch to browser at http://localhost:3000</div>
          <ul class="sb">
            <li>
              <span class="tt">2:00–2:30</span> <strong>Asset Catalog</strong><br>
              "Here is the UI, styled like a physical tool crib ledger. Available assets and items in maintenance are clearly labelled. I can toggle an item in and out of maintenance using the toggle button — it updates live in both the UI and the CSV database file."
            </li>
            <li>
              <span class="tt">2:30–3:30</span> <strong>Validation Rules</strong><br>
              "Attempting to book the MacBook Pro for 20 days fails because the max duration is 14 days. Entering a past date fails immediately. Trying to double-book the same asset on overlapping dates returns a 409 Conflict."
            </li>
            <li>
              <span class="tt">3:30–4:15</span> <strong>Quota Limit &amp; PENDING_APPROVAL</strong><br>
              "Two valid reservations on different assets — both APPROVED. A third attempt is created with PENDING_APPROVAL status rather than failing, as the AI-implemented feature specifies. You can also open the CSV file in Excel and watch rows appear in real time."
            </li>
            <li>
              <span class="tt">4:15–5:00</span> <strong>History Log &amp; Cancellation</strong><br>
              "Clicking HISTORY on any asset shows its full reservation ledger — who booked it, when, and at what status. Cancelling a reservation updates the ledger immediately and frees the asset. Thank you for your time — I'm happy to walk through any part of the code in more detail."
            </li>
          </ul>
        </div>
      </div>
    `
  }
];

// ─── HTML wrapper ─────────────────────────────────────────────────────────────
function buildHtml(doc) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="doc-cover">
    <div class="doc-num">${doc.num}</div>
    <div class="doc-cover-text">
      <div class="eyebrow">${doc.eyebrow}</div>
      <h1>${doc.title}</h1>
      <div class="sub">${doc.subtitle}</div>
    </div>
  </div>
  ${doc.body}
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const doc of DOCS) {
    const outPath = path.join(OUT_DIR, doc.filename);
    console.log(`Generating ${doc.filename}...`);
    const page = await browser.newPage();
    await page.setContent(buildHtml(doc), { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outPath,
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true
    });
    await page.close();
    console.log(`  ✔ Saved: ${outPath}`);
  }

  await browser.close();
  console.log('\nAll 4 PDFs generated successfully in docs/pdfs/');
})();
