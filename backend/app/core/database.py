from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.todo import Todo
from app.models.message import Message, Conversation
from app.models.exam import ManualExam, ManualExamSubmission
from app.models.ai_exam import AiExam, AiExamSubmission, ExamResult
from app.models.course import Course
from app.models.announcement import Announcement
from app.models.enrollment import Enrollment, RegistrationWindow
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.assignment import Assignment, Submission
from app.models.forum import ForumChannel, ForumThread, ForumReply, ForumReadStatus
from app.models.timetable import CourseSchedule
<<<<<<< HEAD
from app.models.class_timetable import ClassTimetable
from app.models.grading import Grade, SemesterGPA, CGPA
from app.models.fee import Fee, FeeConfig, DepartmentFeeStructure
from app.models.admit_card import AdmitCard
from app.models.lecture import Lecture
from app.models.exam_schedule import ExamSchedule

async def init_db():
    # Create Motor client with optimized connection settings
    client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=30000,
        maxPoolSize=50,
        minPoolSize=5,
    )
=======
from app.models.grading import Grade, SemesterGPA, CGPA
from app.models.fee import Fee, FeeConfig
from app.models.admit_card import AdmitCard

async def init_db():
    # Create Motor client
    client = AsyncIOMotorClient(settings.MONGODB_URI)
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
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
            Course,
            Announcement,
            Enrollment,
            RegistrationWindow,
            AttendanceSession,
            AttendanceRecord,
            Assignment,
            Submission,
            ForumChannel,
            ForumThread,
            ForumReply,
            ForumReadStatus,
            CourseSchedule,
            Grade,
            SemesterGPA,
            CGPA,
            Fee,
            FeeConfig,
<<<<<<< HEAD
            DepartmentFeeStructure,
            AdmitCard,
            Lecture,
            ClassTimetable,
            ExamSchedule,
        ]
    )
    print("db initialized")
    # Warm up connection pool
    try:
        await database.command("ping")
        print("db connection warmed up")
    except Exception as e:
        print(f"db warmup warning: {e}")
=======
            AdmitCard,
        ]
    )
    print("db initialized")
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
