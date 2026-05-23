# CampusFlow

University Management System — Next.js 16 frontend + FastAPI backend + MongoDB.

---

## Requirements

- Python 3.11+
- Node.js 20+
- MongoDB running locally on `mongodb://localhost:27017`

---

## Run the Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

Backend runs at → **http://localhost:8000**

> Make sure `backend/.env` exists with your MongoDB URI, JWT secret, and any API keys before starting.

---

## Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at → **http://localhost:3000**

---

## Roles

| Role | Default route after login |
|---|---|
| Student | `/student` |
| Teacher | `/teacher` |
| Admin | `/admin` |
