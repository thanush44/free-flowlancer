# FreelanceFlow — Logic Explanation & Technical Architecture

## 1. Persistent Stopwatch Timer State Handling

### The Problem
In standard single-page React applications, a timer state held only in memory (`useState`) resets when the user refreshes the page, navigates across browser tabs, or when the mobile browser suspends background JavaScript execution. Furthermore, simple `setInterval(() => count + 1, 1000)` drifts significantly over time because browser engines throttle inactive intervals.

### The Solution in FreelanceFlow
FreelanceFlow uses a dual-layer timestamp synchronization model managed by `TimerContext.jsx`:

1. **Persistent Timestamp Storage**:
   When the user clicks **Start Timer**:
   - The exact ISO 8601 start timestamp is generated: `const nowIso = new Date().toISOString()`.
   - The start timestamp and active metadata (`projectId`, `projectName`, `taskId`, `description`) are immediately committed to `localStorage`:
     ```javascript
     localStorage.setItem('ff_timer_isRunning', 'true');
     localStorage.setItem('ff_timer_startTime', nowIso);
     localStorage.setItem('ff_timer_projectId', projectId);
     localStorage.setItem('ff_timer_description', description);
     ```

2. **Drift-Free Delta Calculation**:
   On every tick of `setInterval` (and immediately upon page reload or tab switch), the elapsed duration is **never** incremented by +1. Instead, it is computed dynamically against the wall clock:
   $$\text{elapsedSeconds} = \max\left(0, \left\lfloor \frac{\text{Date.now()} - \text{startTimeMs}}{1000} \right\rfloor\right)$$
   Even if the user closes the browser or suspends their laptop for 3 hours, reopening the app immediately reflects the accurate elapsed duration without losing a single second.

3. **Backend Handshake on Stop**:
   When the user stops the timer:
   - The end timestamp is captured: `end_time = new Date().toISOString()`.
   - Duration in minutes is computed: `duration_minutes = Math.max(1, Math.round(elapsedSeconds / 60))`.
   - Sent to `POST /api/time-logs` with `is_manual: 0`.
   - Local storage keys are cleared and a custom window event (`ff_time_logged`) is dispatched to trigger reactive updates across all charts, burn rates, and client balances.

---

## 2. Project Budget Burn Rate Engine

### Mathematical Formula
For any given project:
1. Fetch all logged hours:
   $$\text{Logged Hours} = \sum \frac{\text{duration\_minutes}}{60.0}$$
2. Retrieve the client's agreed billing rate: $\text{Rate}_{\text{client}}$.
3. Compute total money burned:
   $$\text{Spent Amount} = \text{Logged Hours} \times \text{Rate}_{\text{client}}$$
4. Compute the **Burn Rate Percentage**:
   $$\text{Burn Rate \%} = \begin{cases} \left( \frac{\text{Spent Amount}}{\text{Project Budget}} \right) \times 100\% & \text{if Budget} > 0 \\ 0\% & \text{if Budget} = 0 \end{cases}$$
5. **Threshold State Mapping**:
   - **Normal (< 80%)**: Displayed in vibrant emerald green.
   - **Warning (80% – 99%)**: Displayed in amber with dashboard alert badge.
   - **Exceeded ($\ge 100\%$)**: Displayed in rose red alerting the freelancer that the project is over budget.

---

## 3. Invoicing Billing Lock & Double-Invoicing Prevention

### The Challenge
A common pitfall in freelancer billing tools is accidentally billing the same hourly log on multiple invoices.

### How FreelanceFlow Guarantees Integrity
1. Every record in `time_logs` has two tracking fields:
   - `is_billed INTEGER DEFAULT 0` (0 for unbilled, 1 for billed)
   - `invoice_id INTEGER REFERENCES invoices(id)`
2. When launching the **Invoice Generator Wizard**:
   - The wizard queries only unbilled logs:
     ```sql
     SELECT * FROM time_logs 
     WHERE user_id = ? AND project_id = ? AND is_billed = 0
     ```
3. When the invoice is generated (`POST /api/invoices`):
   - The invoice record is inserted.
   - Inside an atomic operation, all included time logs are locked:
     ```sql
     UPDATE time_logs 
     SET is_billed = 1, invoice_id = ? 
     WHERE user_id = ? AND id IN (?, ?, ...)
     ```
4. Billed time logs cannot be deleted or re-queried by future invoice wizards.
5. If an invoice is deleted, its associated logs are cleanly reverted back to `is_billed = 0, invoice_id = NULL`.

---

## 4. Multi-Tenancy & Data Isolation (Phase 4)

- **JWT Authentication**: Users receive a signed JSON Web Token upon registration/login.
- **Strict User Scoping**: Every database query on clients, projects, tasks, time logs, and invoices enforces `WHERE user_id = req.user.id`. User A can never read, modify, or query User B's clients or financial data.
- **Freemium Tier Limits**:
  - **Free Tier**: Enforces a strict maximum of **2 Clients**. Attempting to create a 3rd client triggers HTTP 403 Forbidden with prompt to upgrade.
  - **Pro Tier**: Unlimited clients + automated PDF invoice generation.
  - An interactive **Plan Switcher** in the top navigation allows evaluators to toggle between Free and Pro with 1 click to test enforcement.

---

## 5. Sample Data Seeding Mechanism (Deliverable 2)

Evaluators do not need to create clients, projects, or tasks manually. Clicking **"Load Sample Data"** in the navigation bar calls `POST /api/sample-data/seed`:
- Populates 4 real-world clients with varying hourly rates ($75 - $110/hr).
- Populates 5 projects with active budgets and deadlines.
- Populates 15 tasks across Todo, In Progress, and Completed states.
- Populates 28 time logs across the past 60 days (some billed, some unbilled ready to test the Invoice Wizard).
- Populates 3 past invoices with "paid" and "pending" statuses to immediately render vibrant Recharts graphs!
