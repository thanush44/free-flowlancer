# FreelanceFlow — All-in-One SaaS for Freelancers

A modern, full-stack B2B SaaS platform for freelancers to manage clients, track project deliverables, monitor real-time hourly burn rates, and generate professional PDF invoices.

---

## 🌟 Key Features

### Phase 1: Client & Project CRM
- **Relational Business Data**: Strict `Client ➔ Project ➔ Tasks` hierarchy with data integrity.
- **Clients CRM**: Company details, contact information, and default hourly billing rates.
- **Projects & Tasks**: Project status (Active / Completed), budgets, deadlines, and task statuses (Todo, In Progress, Completed).
- **Executive Dashboard**: Data-dense overview showing Active Projects, Pending Invoices, Unbilled Hours, and Upcoming Deadlines.

### Phase 2: Time Tracking Engine
- **Persistent Real-Time Stopwatch**:
  - Global timer bar stays active as you navigate between tabs.
  - State persisted in `localStorage` with wall-clock delta calculation (zero drift on refresh or sleep).
- **Manual Hour Logging**: Retroactive logging modal ("I worked 3 hours yesterday") with date picker, hours, minutes, and work description.
- **Dynamic Burn Rate Tracking**: Automatically computes money spent (`Logged Hours × Hourly Rate`) vs project budget with visual color-coded thresholds (Normal, Warning >80%, Exceeded >100%).

### Phase 3: Financials & Invoicing
- **Invoice Generator Wizard**:
  1. Select Client
  2. Filter by Date Range
  3. Fetch all unbilled time logs
  4. Automatic line-item subtotal, customizable tax rate, and total calculation
  5. One-click generation with atomic lock (`is_billed = 1`) to eliminate double billing!
- **Downloadable PDF Invoices**: Professional PDF invoices rendered on-the-fly via backend `PDFKit` with verified freelancer credentials, line items, and payment terms.
- **Clean HTML/CSS Invoice Template**: Interactive modal with print stylesheet support (`window.print()`).
- **Financial Dashboard**: Interactive **Recharts** bar chart plotting "Monthly Revenue" and "Outstanding Payments" over the past 6 months.

### Phase 4: Multi-Tenancy & Freemium Tiered Access
- **Multi-Tenancy & Data Isolation**: Every query is strictly isolated to `req.user.id`. User A can never inspect or alter User B's clients or invoices.
- **Freemium Limits**:
  - **Free Tier**: Maximum **2 Clients**. Attempting to add a 3rd client triggers HTTP 403 Forbidden with prompt to upgrade.
  - **Pro Tier**: Unlimited clients + automated PDF invoicing.
  - **Interactive Plan Switcher**: Built right into the top navigation bar for evaluators to easily test both Free and Pro behaviors.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Launch

1. **Install Dependencies**:
   ```bash
   # Install server packages
   cd server && npm install

   # Install client packages
   cd ../client && npm install
   ```

2. **Start Backend Server**:
   ```bash
   cd server
   node server.js
   # Running on http://localhost:5000
   ```

3. **Start Frontend Client**:
   ```bash
   cd client
   npm run dev
   # Running on http://localhost:3000
   ```

4. **Open in Browser**:
   Visit [http://localhost:3000](http://localhost:3000)

---

## ⚡ Instant Evaluator Demo

To test the application immediately without manually creating clients or logging hours:
- Click the **"Load Sample Data"** button in the top navigation bar.
- This automatically creates:
  - 4 Real-world Clients (Cyberdyne Systems, Apex Creative Studio, Nova FinTech, GreenPulse Climate)
  - 5 Active & Completed Projects with budgets
  - 15 Project Tasks across Todo, In Progress, Completed
  - 28 Time Logs (some billed, some unbilled ready to test the Invoice Wizard)
  - 3 Historical Invoices (to immediately populate the Recharts Monthly Revenue chart)

---

## 🧪 Automated Test Suite

A complete test script is included to verify all backend routes, math calculations, and freemium rules:

```bash
node server/scripts/test_flow.js
```

---

## 📁 Repository Structure

```
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── components/         # UI Views & Modals
│   │   │   ├── Navbar.jsx
│   │   │   ├── StopwatchBar.jsx
│   │   │   ├── DashboardView.jsx
│   │   │   ├── ClientsView.jsx
│   │   │   ├── ProjectsView.jsx
│   │   │   ├── TimeTrackerView.jsx
│   │   │   ├── InvoicesView.jsx
│   │   │   └── InvoiceTemplateModal.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── TimerContext.jsx
│   │   ├── api.js              # Centralized API fetcher
│   │   ├── App.jsx             # Main Application Entry
│   │   └── index.css           # Tailwind + Custom Design System
│   └── package.json
├── server/                     # Node.js + Express + SQLite Backend
│   ├── routes/
│   │   ├── auth.js             # Authentication & Plan Switching
│   │   ├── clients.js          # Clients CRM (Freemium 2-client limit)
│   │   ├── projects.js         # Projects & Burn Rate calculation
│   │   ├── tasks.js            # Task management
│   │   ├── timelogs.js         # Stopwatch & Manual hour logs
│   │   ├── invoices.js         # Invoice Wizard & PDFKit Streaming
│   │   ├── dashboard.js        # KPI calculations & Recharts dataset
│   │   └── sampleData.js       # 1-click Sample Data Seeder
│   ├── middleware/
│   │   └── auth.js             # JWT verification & multi-tenancy scoping
│   ├── scripts/
│   │   ├── seed.js             # Standalone CLI database seed
│   │   └── test_flow.js        # End-to-end verification test suite
│   ├── db.js                   # SQLite relational database schema
│   ├── freelanceflow.db        # SQLite database file
│   ├── server.js               # Express application entry point
│   └── package.json
├── LOGIC_EXPLANATION.md        # Technical explanation of timer & burn rate math
└── README.md
```
