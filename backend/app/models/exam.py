from beanie import Document
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from pymongo import IndexModel, ASCENDING

# ---------------------------------------------------------
# Embedded Models
# ---------------------------------------------------------
class ManualQuestion(BaseModel):
    questionNumber: int
    text: str
    maxMarks: int
    correctAnswer: Optional[str] = None

class ManualStudentAnswer(BaseModel):
    questionNumber: int
    answerText: str
    question: Optional[str] = None
    correctAnswer: Optional[str] = None
    maxMarks: Optional[int] = None
    awardedMarks: Optional[int] = None
    teacherFeedback: Optional[str] = None

# ---------------------------------------------------------
# Document Models (Internal - Database)
# ---------------------------------------------------------
class ManualExam(Document):
    className: str
    subject: str
    title: str
    teacherUsername: str
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    live: bool = False
    questions: List[ManualQuestion] = Field(default_factory=list)

    class Settings:
        name = "manual_exams"
        indexes = [
            IndexModel([("teacherUsername", ASCENDING)]),
            IndexModel([("className", ASCENDING)]),
        ]

class ManualExamSubmission(Document):
    examId: str
    studentUsername: str
    className: str
    answers: List[ManualStudentAnswer] = Field(default_factory=list)
    checkedByTeacher: bool = False
    checkedByAi: bool = False
    totalMarks: Optional[int] = None
    maxTotalMarks: Optional[int] = None
    submittedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "manual_exam_submissions"
        indexes = [
            IndexModel([("examId", ASCENDING)]),
            IndexModel([("studentUsername", ASCENDING)]),
            IndexModel([("className", ASCENDING)]),
        ]

# ---------------------------------------------------------
# Response Schemas (External - API)
# ---------------------------------------------------------
class ManualExamResponse(BaseModel):
    id: str
    className: str
    subject: str
    title: str
    teacherUsername: str
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    live: bool
    questions: List[ManualQuestion]

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_document(cls, doc: ManualExam) -> "ManualExamResponse":
        return cls(
            id=str(doc.id),
            className=doc.className,
            subject=doc.subject,
            title=doc.title,
            teacherUsername=doc.teacherUsername,
            startTime=doc.startTime,
            endTime=doc.endTime,
            live=doc.live,
            questions=doc.questions
        )

class ManualExamSubmissionResponse(BaseModel):
    id: str
    examId: str
    studentUsername: str
    className: str
    answers: List[ManualStudentAnswer]
    checkedByTeacher: bool
    checkedByAi: bool
    totalMarks: Optional[int] = None
    maxTotalMarks: Optional[int] = None
    submittedAt: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_document(cls, doc: ManualExamSubmission) -> "ManualExamSubmissionResponse":
        return cls(
            id=str(doc.id),
            examId=doc.examId,
            studentUsername=doc.studentUsername,
            className=doc.className,
            answers=doc.answers,
            checkedByTeacher=doc.checkedByTeacher,
            checkedByAi=doc.checkedByAi,
            totalMarks=doc.totalMarks,
            maxTotalMarks=doc.maxTotalMarks,
            submittedAt=doc.submittedAt
        )

# ---------------------------------------------------------
# Request Schemas (External - API)
# ---------------------------------------------------------
class CreateManualExamRequest(BaseModel):
    className: str
    subject: str
    title: str
    questions: List[ManualQuestion]

class SetLiveRequest(BaseModel):
    startTime: datetime
    endTime: datetime

class ManualExamSubmissionRequest(BaseModel):
    # Depending on how frontend sends it, we usually need the answers
    # and maybe some metadata if the user isn't pulled from the token
    studentUsername: Optional[str] = None
    className: str
    answers: List[ManualStudentAnswer]

class QuestionMark(BaseModel):
    questionNumber: int
    awardedMarks: int
    feedback: Optional[str] = None

class MarkSubmissionRequest(BaseModel):
    questionMarks: List[QuestionMark]
    totalMarks: int
