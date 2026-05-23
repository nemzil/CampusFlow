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
    "http://localhost:5173",  # React default port
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(todos_router, prefix="/api/todos", tags=["Todos"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(websocket_router, prefix="/api/ws", tags=["WebSocket"])
app.include_router(manual_exams_router, prefix="/api/manual-exams", tags=["Manual Exams"])
app.include_router(ai_exams_router, prefix="/api/ai-exams", tags=["AI Exams"])

