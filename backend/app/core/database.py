from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.todo import Todo
from app.models.message import Message, Conversation
from app.models.exam import ManualExam, ManualExamSubmission
from app.models.ai_exam import AiExam, AiExamSubmission, ExamResult

async def init_db():
    # Create Motor client
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    
    # Get database (fallback to "campusflow_db" if not specified in URI)
    try:
        database = client.get_default_database()
        if database is None or database.name == "admin":
            database = client.get_database("campusflow_db")
    except Exception:
        database = client.get_database("campusflow_db")
    
    # Initialize Beanie with the client and database name
    # We will pass the document models here once they are created
    await init_beanie(
        database=database,
        document_models=[
            User,
            Todo,
            Message,
            Conversation,
            ManualExam,
            ManualExamSubmission,
            AiExam,
            AiExamSubmission,
            ExamResult,
        ]
    )
    print("Database initialized successfully.")
