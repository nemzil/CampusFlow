"""
Manual Exams API (v2 - Improved)
Handles teacher-created manual exams with service layer
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from beanie import PydanticObjectId

from app.models.user import User
from app.models.exam import ManualQuestion, ManualStudentAnswer
from app.api.deps import get_current_user
from app.services import exam_service
from app.schemas.exam import (
    CreateManualExamRequest, ManualExamResponse, SetLiveRequest,
    ManualExamSubmissionRequest, ManualExamSubmissionResponse,
    MarkSubmissionRequest, ManualQuestionSchema, ManualStudentAnswerSchema
)

router = APIRouter()


def convert_to_model_question(schema: ManualQuestionSchema) -> ManualQuestion:
    """Convert schema to model"""
    return ManualQuestion(
        questionNumber=schema.question_number,
        text=schema.text,
        maxMarks=schema.max_marks,
        correctAnswer=schema.correct_answer
    )


def convert_to_schema_question(model: ManualQuestion) -> ManualQuestionSchema:
    """Convert model to schema"""
    return ManualQuestionSchema(
        question_number=model.questionNumber,
        text=model.text,
        max_marks=model.maxMarks,
        correct_answer=model.correctAnswer
    )


def convert_to_model_answer(schema: ManualStudentAnswerSchema) -> ManualStudentAnswer:
    """Convert schema to model"""
    return ManualStudentAnswer(
        questionNumber=schema.question_number,
        answerText=schema.answer_text,
        question=schema.question,
        correctAnswer=schema.correct_answer,
        maxMarks=schema.max_marks,
        awardedMarks=schema.awarded_marks,
        teacherFeedback=schema.teacher_feedback
    )


def convert_to_schema_answer(model: ManualStudentAnswer) -> ManualStudentAnswerSchema:
    """Convert model to schema"""
    return ManualStudentAnswerSchema(
        question_number=model.questionNumber,
        answer_text=model.answerText,
        question=model.question,
        correct_answer=model.correctAnswer,
        max_marks=model.maxMarks,
        awarded_marks=model.awardedMarks,
        teacher_feedback=model.teacherFeedback
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: List manual exams
# GET /api/manual-exams
# ═══════════════════════════════════════════════════════════
@router.get("", response_model=List[ManualExamResponse])
async def list_manual_exams(
    teacher_username: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List manual exams with optional filtering and pagination
    """
    exams = await exam_service.get_manual_exams(
        teacher_username=teacher_username,
        class_name=class_name,
        skip=skip,
        limit=limit
    )
    
    return [
        ManualExamResponse(
            id=str(exam.id),
            class_name=exam.className,
            subject=exam.subject,
            title=exam.title,
            teacher_username=exam.teacherUsername,
            start_time=exam.startTime,
            end_time=exam.endTime,
            live=exam.live,
            questions=[convert_to_schema_question(q) for q in exam.questions]
        )
        for exam in exams
    ]


# ═══════════════════════════════════════════════════════════
# TEACHER: Create manual exam
# POST /api/manual-exams
# ═══════════════════════════════════════════════════════════
@router.post("", response_model=ManualExamResponse)
async def create_manual_exam(
    request: CreateManualExamRequest,
    username: str = Depends(get_current_user)
):
    """
    Create a new manual exam (teachers only)
    """
    user = await User.find_one(User.username == username)
    if not user or user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Only teachers can create exams")
    
    # Convert schema questions to model questions
    questions = [convert_to_model_question(q) for q in request.questions]
    
    exam = await exam_service.create_manual_exam(
        class_name=request.class_name,
        subject=request.subject,
        title=request.title,
        teacher_username=username,
        questions=questions
    )
    
    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        subject=exam.subject,
        title=exam.title,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        questions=[convert_to_schema_question(q) for q in exam.questions]
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: Get single exam
# GET /api/manual-exams/{exam_id}
# ═══════════════════════════════════════════════════════════
@router.get("/{exam_id}", response_model=ManualExamResponse)
async def get_manual_exam(exam_id: str):
    """
    Get a single manual exam by ID
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
    
    from app.models.exam import ManualExam
    exam = await ManualExam.get(oid)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        subject=exam.subject,
        title=exam.title,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        questions=[convert_to_schema_question(q) for q in exam.questions]
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: Set exam live
# PUT /api/manual-exams/{exam_id}/live
# ═══════════════════════════════════════════════════════════
@router.put("/{exam_id}/live", response_model=ManualExamResponse)
async def set_exam_live(exam_id: str, body: SetLiveRequest):
    """
    Set a manual exam as live with start and end times
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
    
    try:
        exam = await exam_service.set_manual_exam_live(
            exam_id=oid,
            start_time=body.start_time,
            end_time=body.end_time
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        subject=exam.subject,
        title=exam.title,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        questions=[convert_to_schema_question(q) for q in exam.questions]
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: End exam
# PUT /api/manual-exams/{exam_id}/end
# ═══════════════════════════════════════════════════════════
@router.put("/{exam_id}/end", response_model=ManualExamResponse)
async def end_manual_exam(exam_id: str):
    """
    End a manual exam
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
    
    try:
        exam = await exam_service.end_manual_exam(exam_id=oid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        subject=exam.subject,
        title=exam.title,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        questions=[convert_to_schema_question(q) for q in exam.questions]
    )


# ═══════════════════════════════════════════════════════════
# STUDENT: Submit exam
# POST /api/manual-exams/{exam_id}/submit
# ═══════════════════════════════════════════════════════════
@router.post("/{exam_id}/submit", response_model=ManualExamSubmissionResponse)
async def submit_manual_exam(
    exam_id: str,
    request: ManualExamSubmissionRequest,
    username: str = Depends(get_current_user)
):
    """
    Submit a manual exam with answers
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
    
    # Convert schema answers to model answers
    answers = [convert_to_model_answer(a) for a in request.answers]
    
    try:
        submission = await exam_service.submit_manual_exam(
            exam_id=oid,
            student_username=username,
            class_name=request.class_name,
            answers=answers
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return ManualExamSubmissionResponse(
        id=str(submission.id),
        exam_id=submission.examId,
        student_username=submission.studentUsername,
        class_name=submission.className,
        answers=[convert_to_schema_answer(a) for a in submission.answers],
        checked_by_teacher=submission.checkedByTeacher,
        checked_by_ai=submission.checkedByAi,
        total_marks=submission.totalMarks,
        max_total_marks=submission.maxTotalMarks,
        submitted_at=submission.submittedAt
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: List submissions for an exam
# GET /api/manual-exams/{exam_id}/submissions
# ═══════════════════════════════════════════════════════════
@router.get("/{exam_id}/submissions", response_model=List[ManualExamSubmissionResponse])
async def list_exam_submissions(
    exam_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List all submissions for a specific exam
    """
    submissions = await exam_service.get_manual_submissions(
        exam_id=exam_id,
        skip=skip,
        limit=limit
    )
    
    return [
        ManualExamSubmissionResponse(
            id=str(sub.id),
            exam_id=sub.examId,
            student_username=sub.studentUsername,
            class_name=sub.className,
            answers=[convert_to_schema_answer(a) for a in sub.answers],
            checked_by_teacher=sub.checkedByTeacher,
            checked_by_ai=sub.checkedByAi,
            total_marks=sub.totalMarks,
            max_total_marks=sub.maxTotalMarks,
            submitted_at=sub.submittedAt
        )
        for sub in submissions
    ]


# ═══════════════════════════════════════════════════════════
# TEACHER: Get single submission
# GET /api/manual-exams/submissions/{submission_id}
# ═══════════════════════════════════════════════════════════
@router.get("/submissions/{submission_id}", response_model=ManualExamSubmissionResponse)
async def get_submission(submission_id: str):
    """
    Get a single submission by ID
    """
    try:
        oid = PydanticObjectId(submission_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid submission ID format")
    
    from app.models.exam import ManualExamSubmission
    submission = await ManualExamSubmission.get(oid)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return ManualExamSubmissionResponse(
        id=str(submission.id),
        exam_id=submission.examId,
        student_username=submission.studentUsername,
        class_name=submission.className,
        answers=[convert_to_schema_answer(a) for a in submission.answers],
        checked_by_teacher=submission.checkedByTeacher,
        checked_by_ai=submission.checkedByAi,
        total_marks=submission.totalMarks,
        max_total_marks=submission.maxTotalMarks,
        submitted_at=submission.submittedAt
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: Mark submission
# PUT /api/manual-exams/submissions/{submission_id}/mark
# ═══════════════════════════════════════════════════════════
@router.put("/submissions/{submission_id}/mark", response_model=ManualExamSubmissionResponse)
async def mark_submission(submission_id: str, body: MarkSubmissionRequest):
    """
    Mark a manual exam submission and save result
    """
    try:
        oid = PydanticObjectId(submission_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid submission ID format")
    
    # Convert schema to dict for service
    question_marks = [
        {
            "questionNumber": qm.question_number,
            "awardedMarks": qm.awarded_marks,
            "feedback": qm.feedback
        }
        for qm in body.question_marks
    ]
    
    try:
        submission = await exam_service.mark_manual_submission(
            submission_id=oid,
            question_marks=question_marks,
            total_marks=body.total_marks
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    return ManualExamSubmissionResponse(
        id=str(submission.id),
        exam_id=submission.examId,
        student_username=submission.studentUsername,
        class_name=submission.className,
        answers=[convert_to_schema_answer(a) for a in submission.answers],
        checked_by_teacher=submission.checkedByTeacher,
        checked_by_ai=submission.checkedByAi,
        total_marks=submission.totalMarks,
        max_total_marks=submission.maxTotalMarks,
        submitted_at=submission.submittedAt
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: Delete manual exam (not live)
# DELETE /api/manual-exams/{exam_id}
# ═══════════════════════════════════════════════════════════
@router.delete("/{exam_id}")
async def delete_manual_exam(
    exam_id: str,
    username: str = Depends(get_current_user)
):
    user = await User.find_one(User.username == username)
    if not user or user.role not in ("TEACHER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        oid = PydanticObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID")
    from app.models.exam import ManualExam
    exam = await ManualExam.get(oid)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacherUsername != username and user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized")
    if exam.live:
        raise HTTPException(status_code=400, detail="Cannot delete a live exam. End it first.")
    await exam.delete()
    return {"status": "deleted"}
