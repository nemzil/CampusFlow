"""
Exam request and response schemas
Unified schemas for both manual and AI-generated exams
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ═══════════════════════════════════════════════════════════
# Manual Exam Schemas
# ═══════════════════════════════════════════════════════════

class ManualQuestionSchema(BaseModel):
    """Schema for a manual exam question"""
    question_number: int
    text: str
    max_marks: int
    correct_answer: Optional[str] = None


class CreateManualExamRequest(BaseModel):
    """Request to create a new manual exam"""
    class_name: str
    subject: str
    title: str
    questions: List[ManualQuestionSchema]


class ManualExamResponse(BaseModel):
    """Response for manual exam data"""
    id: str
    class_name: str
    subject: str
    title: str
    teacher_username: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    live: bool
    questions: List[ManualQuestionSchema]


class SetLiveRequest(BaseModel):
    """Request to set an exam as live"""
    start_time: datetime
    end_time: datetime


class ManualStudentAnswerSchema(BaseModel):
    """Schema for a student's answer to a manual exam question"""
    question_number: int
    answer_text: str
    question: Optional[str] = None
    correct_answer: Optional[str] = None
    max_marks: Optional[int] = None
    awarded_marks: Optional[int] = None
    teacher_feedback: Optional[str] = None


class ManualExamSubmissionRequest(BaseModel):
    """Request to submit a manual exam"""
    class_name: str
    answers: List[ManualStudentAnswerSchema]


class ManualExamSubmissionResponse(BaseModel):
    """Response for manual exam submission data"""
    id: str
    exam_id: str
    student_username: str
    class_name: str
    answers: List[ManualStudentAnswerSchema]
    checked_by_teacher: bool
    checked_by_ai: bool
    total_marks: Optional[int] = None
    max_total_marks: Optional[int] = None
    submitted_at: datetime


class QuestionMark(BaseModel):
    """Schema for marking a single question"""
    question_number: int
    awarded_marks: int
    feedback: Optional[str] = None


class MarkSubmissionRequest(BaseModel):
    """Request to mark a manual exam submission"""
    question_marks: List[QuestionMark]
    total_marks: int


# ═══════════════════════════════════════════════════════════
# AI Exam Schemas
# ═══════════════════════════════════════════════════════════

class ExamQuestionSchema(BaseModel):
    """Schema for an AI-generated exam question"""
    id: int
    question: str
    type: str = "short"
    options: List[str] = Field(default_factory=list)
    correct_answer: Optional[str] = None
    original_question: Optional[str] = None
    max_marks: int = 5


class CreateAiExamRequest(BaseModel):
    """Request to create a new AI-generated exam"""
    class_name: str
    subject: str
    topic: str
    num_questions: int = 5


class AiExamResponse(BaseModel):
    """Response for AI exam data"""
    exam_id: str
    class_name: str
    subject: str
    topic: str
    teacher_username: str
    is_live: bool
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str
    questions: List[ExamQuestionSchema]
    ended_at: Optional[str] = None


class SetLiveAiRequest(BaseModel):
    """Request to set an AI exam as live"""
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class UpdateQuestionRequest(BaseModel):
    """Request to update a question in an AI exam"""
    question: str


class StudentLoadExamRequest(BaseModel):
    """Request for a student to load an exam"""
    exam_id: str
    class_name: str


class StudentSubmitRequest(BaseModel):
    """Request for a student to submit exam answers"""
    exam_id: str
    class_name: str
    answers: List[dict]


class CheckExamRequest(BaseModel):
    """Request to check/grade an exam submission"""
    student_username: str


class CheckGenericExamRequest(BaseModel):
    """Request to check a generic/manual exam using AI"""
    questions: List[dict]
    answers: List[dict]
    topic: str = "General Exam"


class ResultItemSchema(BaseModel):
    """Schema for a single result item"""
    id: Optional[int] = None
    marks_obtained: int = 0
    max_marks: int = 0
    feedback: Optional[str] = None


class ConfirmResultRequest(BaseModel):
    """Request to confirm and save exam results"""
    student_username: str
    items: List[ResultItemSchema]


class ExamResultResponse(BaseModel):
    """Response for exam result data"""
    result_id: str
    exam_id: Optional[str] = None
    student_username: str
    teacher_username: str
    class_name: Optional[str] = None
    subject: Optional[str] = None
    title: Optional[str] = None
    obtained_marks: int
    total_marks: int
    checked_at: datetime
    source: str


class ExamStatisticsResponse(BaseModel):
    """Response for exam statistics"""
    total_exams: int
    manual_exams: int
    ai_exams: int
    total_submissions: int
    manual_submissions: int
    ai_submissions: int
    checked_submissions: int
    pending_submissions: int


class StudentStatisticsResponse(BaseModel):
    """Response for student exam statistics"""
    total_submissions: int
    manual_submissions: int
    ai_submissions: int
    total_results: int
    total_marks_obtained: int
    total_marks_max: int
    average_percentage: float
