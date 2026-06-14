from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Beanie and MongoDB connection
    await init_db()
    yield
    # Cleanup on shutdown can go here

app = FastAPI(
    title="CampusFlow API",
    description="FastAPI Backend for CampusFlow University Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to CampusFlow API (FastAPI)"}

# Import routers
from app.api.auth import router as auth_router
from app.api.todos import router as todos_router
from app.api.chat import router as chat_router
from app.api.websocket import router as websocket_router
from app.api.manual_exams import router as manual_exams_router
from app.api.ai_exams import router as ai_exams_router
from app.api.courses import router as courses_router
from app.api.announcements import router as announcements_router
from app.api.enrollment import router as enrollment_router
from app.api.attendance import router as attendance_router
from app.api.assignments import router as assignments_router
from app.api.forum import router as forum_router
from app.api.timetable import router as timetable_router
from app.api.grading import router as grading_router
from app.api.fees import router as fees_router
from app.api.admit_cards import router as admit_cards_router
from app.api.upload import router as upload_router
from app.api.lectures import router as lectures_router
from app.api.class_timetable import router as class_timetable_router
from app.api.exam_schedule import router as exam_schedule_router

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(todos_router, prefix="/api/todos", tags=["Todos"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(websocket_router, prefix="/api/ws", tags=["WebSocket"])
app.include_router(manual_exams_router, prefix="/api/manual-exams", tags=["Manual Exams"])
app.include_router(ai_exams_router, prefix="/api/ai-exams", tags=["AI Exams"])
app.include_router(courses_router, prefix="/api/courses", tags=["Courses"])
app.include_router(announcements_router, prefix="/api/announcements", tags=["Announcements"])
app.include_router(enrollment_router, prefix="/api/enrollment", tags=["Enrollment"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(assignments_router, prefix="/api/assignments", tags=["Assignments & Quizzes"])
app.include_router(forum_router, prefix="/api/forum", tags=["Discussion Forum"])
app.include_router(timetable_router, prefix="/api/timetable", tags=["Timetable"])
app.include_router(grading_router, prefix="/api/grades", tags=["Grading & GPA"])
app.include_router(fees_router, prefix="/api/fees", tags=["Fee Management"])
app.include_router(admit_cards_router, prefix="/api/admit-cards", tags=["Admit Cards"])
app.include_router(upload_router, prefix="/api/upload", tags=["File Upload"])
app.include_router(lectures_router, prefix="/api/lectures", tags=["Lectures"])
app.include_router(class_timetable_router, prefix="/api/class-timetable", tags=["Class Timetable"])
app.include_router(exam_schedule_router, prefix="/api/exam-schedule", tags=["Exam Schedule"])

