# 🎓 CampusFlow — Modern University Management Portal

CampusFlow is a state-of-the-art, responsive, and performance-optimized university portal designed for students, faculty, and administration. It integrates real-time communications, automated AI-assisted grading, dynamic timetables, task tracking, and results compilation under a unified, beautiful design system.

---

## 🎨 Role-Based Visual Design System

To establish clear portal boundaries and visual consistency, CampusFlow employs a high-contrast theme system tailored per user role:
*   🎓 **Student Portal (Sky Blue Theme)**: A bright, clean user experience for learning tasks, grades, and scheduling.
*   👨‍🏫 **Faculty Portal (Emerald Green Theme)**: An efficient, tool-dense dashboard optimized for grading, report creation, and lesson management.
*   🔧 **Admin Portal (Indigo Theme)**: A robust, command-center dashboard for managing departments, courses, user accounts, and term settings.

---

## 🚀 Key Features

### 1. 💬 Real-Time Messaging & Chat
*   **Instant Updates**: Cross-portal real-time chatting powered by WebSockets. No manual page reloads required to send or receive messages.
*   **Hydration Isolation**: Custom WebSocket namespaces isolate page-level cleanups so that parent authorization context updates never tear down the active chat handlers.

### 2. ⚡ Tab-Focus Silent Auto-Sync
*   **Auto-Refreshing Views**: Active list dashboards (Assignments, Todos, Timetables) listen for page/tab focus events to sync stale lists in the background when navigating or returning to the app tab.
*   **No Load Screen Blockers**: Refreshes happen silently without intrusive loading spinners to ensure a seamless client experience.

### 3. 🧠 Smart Grading & Coursework Generation
*   **AI-Generated Assessments**: Faculty can automatically generate quizzes or homework using AI-driven question synthesis (powered by Gemini) directly from a topic title.
*   **Hybrid AI/Manual Grading**: Submissions support both automated AI-suggested marks/breakdowns and teacher manual grading with real-time database persistence.

### 4. 📈 N+1 Query Performance Optimizations
*   **Batch Query Caching**: Database operations (powered by FastAPI, Beanie ODM, and MongoDB) are optimized with single-query `$in` batching.
*   **Lightning-Fast Loading**: Attendance reports and coursework listings are reduced from sequential loop designs ($O(N)$ database roundtrips) to flat batch caches, yielding up to a **100x speedup** (loading in under 50ms).

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js (React)
*   **Styling**: Tailwind CSS
*   **Backend**: FastAPI (Python)
*   **Database**: MongoDB

---

## 💻 Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python](https://www.python.org/) (v3.10 or higher)
*   [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)

---

### Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` root directory using `.env.example` as a template and populate your local credentials.

---

### Frontend Configuration
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install the packages:
   ```bash
   npm install
   ```

---

## 🚦 Running the Application

### ⚡ Option A: Automated PowerShell Launcher (Recommended for Windows)
At the root directory of the workspace, run the custom automated server script:
```powershell
.\run.ps1
```
This single script will:
* Activate the Python virtual environment and spin up the FastAPI uvicorn backend on port `8000`.
* Launch the Next.js frontend dev server on port `3000`.
* Stream live logs from both jobs directly to your active window.
* Cleanly terminate both background processes and free the ports on pressing `Ctrl + C`.

---

### 🔨 Option B: Manual Startup

**Run the Backend Server:**
```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

**Run the Frontend Server:**
```bash
cd frontend
npm run dev
```

The portal landing page will be available at [http://localhost:3000](http://localhost:3000).
