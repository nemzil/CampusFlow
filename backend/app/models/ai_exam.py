from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
from pymongo import IndexModel, ASCENDING

# ---------------------------------------------------------
# Embedded Models
# ---------------------------------------------------------
class ExamQuestion(BaseModel):
    id: int
    question: str
    type: str = "short"
    options: List[str] = Field(default_factory=list)
    correct_answer: Optional[str] = None
    original_question: Optional[str] = None  # for undo support
    max_marks: Optional[int] = 5

class StudentAnswerItem(BaseModel):
    id: Optional[int] = None
    question: Optional[str] = None
    student_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    marks: Optional[int] = None

class ResultItem(BaseModel):
    id: Optional[int] = None
    marks_obtained: int = 0
    max_marks: int = 0
    feedback: Optional[str] = None

# ---------------------------------------------------------
# AI Exam Document
# ---------------------------------------------------------
class AiExam(Document):
    class_name: str
    subject: str
    topic: str
    teacher_username: str
    questions: List[ExamQuestion] = Field(default_factory=list)
    is_live: bool = False
    start_time: Optional[str] = None  # ISO string (PKT)
    end_time: Optional[str] = None
    status: str = "DRAFT"
    ended_at: Optional[str] = None

    class Settings:
        name = "exams"
        indexes = [
            IndexModel([("teacher_username", ASCENDING)]),
            IndexModel([("class_name", ASCENDING)]),
        ]

# ---------------------------------------------------------
# AI Exam Submission
# ---------------------------------------------------------
class AiExamSubmission(Document):
    exam_id: str  # stored as string ObjectId ref
    teacher_username: Optional[str] = None
    student_username: str
    class_name: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    answers: List[Any] = Field(default_factory=list)
    submitted_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    checked: bool = False

    class Settings:
        name = "ai_exam_submissions"
        indexes = [
            IndexModel([("exam_id", ASCENDING)]),
            IndexModel([("student_username", ASCENDING)]),
            IndexModel([("class_name", ASCENDING)]),
        ]

# ---------------------------------------------------------
# Exam Results
# ---------------------------------------------------------
class ExamResult(Document):
    exam_id: Optional[str] = None
    teacher_username: str
    student_username: str
    obtained_marks: int = 0
    total_marks: int = 0
    items: List[ResultItem] = Field(default_factory=list)
    checked_at: datetime = Field(default_factory=datetime.utcnow)
    # For manual exam results
    class_name: Optional[str] = None
    subject: Optional[str] = None
    title: Optional[str] = None
    source: str = "AI"  # "AI" or "MANUAL"

    class Settings:
        name = "results"
        indexes = [
            IndexModel([("student_username", ASCENDING)]),
            IndexModel([("teacher_username", ASCENDING)]),
            IndexModel([("exam_id", ASCENDING)]),
        ]

# ---------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------
class CreateAiExamRequest(BaseModel):
    class_name: str
    subject: str
    topic: str
    num_questions: int = 5
    teacher_username: str

class SetLiveAiRequest(BaseModel):
    teacher_username: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class UpdateQuestionRequest(BaseModel):
    teacher_username: str
    question: str

class StudentLoadExamRequest(BaseModel):
    exam_id: str
    class_name: str
    student_username: str

class StudentSubmitRequest(BaseModel):
    exam_id: str
    student_username: str
    class_name: str
    answers: List[Any]

class CheckExamRequest(BaseModel):
    teacher_username: str
    student_username: str

class CheckGenericExamRequest(BaseModel):
    questions: List[Any]
    answers: List[Any]
    topic: str = "General Exam"

class ConfirmResultRequest(BaseModel):
    teacher_username: str
    student_username: str
    items: List[ResultItem]

class SaveManualResultRequest(BaseModel):
    student_username: str
    teacher_username: str
    exam_id: Optional[str] = None
    obtained_marks: int = 0
    total_marks: int = 0
    class_name: Optional[str] = None
    subject: Optional[str] = None
    title: Optional[str] = None
