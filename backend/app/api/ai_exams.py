"""
AI Exams API (v2 - Improved)
Handles AI-generated exams with service layer
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import pytz
from datetime import datetime

from app.models.user import User
from app.models.ai_exam import ExamQuestion, ResultItem
from app.api.deps import get_current_user
from app.services import exam_service, ai_grading_service
from app.schemas.exam import (
    CreateAiExamRequest, AiExamResponse, SetLiveAiRequest,
    UpdateQuestionRequest, StudentLoadExamRequest, StudentSubmitRequest,
    CheckExamRequest, CheckGenericExamRequest, ConfirmResultRequest,
    ExamResultResponse, ExamStatisticsResponse, StudentStatisticsResponse,
    ExamQuestionSchema, ResultItemSchema
)

router = APIRouter()


def serialize_ai_exam(exam) -> AiExamResponse:
    """Convert AI exam model to response schema"""
    return AiExamResponse(
        exam_id=str(exam.id),
        class_name=exam.class_name,
        subject=exam.subject,
        topic=exam.topic,
        teacher_username=exam.teacher_username,
        is_live=exam.is_live,
        start_time=exam.start_time,
        end_time=exam.end_time,
        status=exam.status,
        questions=[
            ExamQuestionSchema(
                id=q.id,
                question=q.question,
                type=q.type,
                options=q.options,
                correct_answer=q.correct_answer,
                original_question=q.original_question,
                max_marks=q.max_marks
            )
            for q in exam.questions
        ],
        ended_at=exam.ended_at
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: Create AI exam
# POST /api/ai-exams
# ═══════════════════════════════════════════════════════════
@router.post("", response_model=AiExamResponse)
async def create_ai_exam(
    request: CreateAiExamRequest,
    username: str = Depends(get_current_user)
):
    """
    Create a new AI-generated exam (teachers only)
    """
    user = await User.find_one(User.username == username)
    if not user or user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Only teachers can create exams")
    
    # Generate questions using AI
    questions = await ai_grading_service.generate_exam_questions(
        topic=request.topic,
        num_questions=request.num_questions
    )
    
    # Create exam
    exam = await exam_service.create_ai_exam(
        class_name=request.class_name,
        subject=request.subject,
        topic=request.topic,
        teacher_username=username,
        questions=questions
    )
    
    return serialize_ai_exam(exam)


# ═══════════════════════════════════════════════════════════
# TEACHER: List AI exams
# GET /api/ai-exams
# ═══════════════════════════════════════════════════════════
@router.get("", response_model=List[AiExamResponse])
async def list_ai_exams(
    teacher_username: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List AI exams with optional filtering and pagination
    """
    exams = await exam_service.get_ai_exams(
        teacher_username=teacher_username,
        class_name=class_name,
        status=status,
        skip=skip,
        limit=limit
    )
    
    return [serialize_ai_exam(exam) for exam in exams]


# ═══════════════════════════════════════════════════════════
# TEACHER: Get single AI exam
# GET /api/ai-exams/{exam_id}
# ═══════════════════════════════════════════════════════════
@router.get("/{exam_id}", response_model=AiExamResponse)
async def get_ai_exam(
    exam_id: str,
    username: str = Depends(get_current_user)
):
    """
    Get a single AI exam by ID
    """
    from app.models.ai_exam import AiExam
    exam = await AiExam.get(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Verify ownership
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return serialize_ai_exam(exam)


# ═══════════════════════════════════════════════════════════
# TEACHER: Update a question
# PUT /api/ai-exams/{exam_id}/questions/{question_id}
# ═══════════════════════════════════════════════════════════
@router.put("/{exam_id}/questions/{question_id}")
async def update_question(
    exam_id: str,
    question_id: int,
    body: UpdateQuestionRequest,
    username: str = Depends(get_current_user)
):
    """
    Update a specific question in an AI exam
    """
    from app.models.ai_exam import AiExam
    exam = await AiExam.get(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Find and update question
    updated = False
    for q in exam.questions:
        if q.id == question_id:
            if not q.original_question:
                q.original_question = q.question
            q.question = body.question
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await exam.save()
    return {"status": "updated"}


# ═══════════════════════════════════════════════════════════
# TEACHER: Undo question to original
# POST /api/ai-exams/{exam_id}/questions/{question_id}/undo
# ═══════════════════════════════════════════════════════════
@router.post("/{exam_id}/questions/{question_id}/undo")
async def undo_question(
    exam_id: str,
    question_id: int,
    username: str = Depends(get_current_user)
):
    """
    Undo a question edit and restore original
    """
    from app.models.ai_exam import AiExam
    exam = await AiExam.get(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Find and undo question
    for q in exam.questions:
        if q.id == question_id:
            if not q.original_question:
                raise HTTPException(status_code=404, detail="No original question to restore")
            q.question = q.original_question
            await exam.save()
            return {"status": "undone"}
    
    raise HTTPException(status_code=404, detail="Question not found")


# ═══════════════════════════════════════════════════════════
# TEACHER: Set exam live
# PUT /api/ai-exams/{exam_id}/live
# ═══════════════════════════════════════════════════════════
@router.put("/{exam_id}/live", response_model=AiExamResponse)
async def set_exam_live(
    exam_id: str,
    body: SetLiveAiRequest,
    username: str = Depends(get_current_user)
):
    """
    Set an AI exam as live
    """
    from app.models.ai_exam import AiExam
    exam = await AiExam.get(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        exam = await exam_service.set_ai_exam_live(
            exam_id=exam_id,
            start_time=body.start_time,
            end_time=body.end_time
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    return serialize_ai_exam(exam)


# ═══════════════════════════════════════════════════════════
# TEACHER: End exam
# PUT /api/ai-exams/{exam_id}/end
# ═══════════════════════════════════════════════════════════
@router.put("/{exam_id}/end", response_model=AiExamResponse)
async def end_exam(
    exam_id: str,
    username: str = Depends(get_current_user)
):
    """
    End an AI exam
    """
    from app.models.ai_exam import AiExam
    exam = await AiExam.get(exam_id)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        exam = await exam_service.end_ai_exam(exam_id=exam_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    return serialize_ai_exam(exam)


# ═══════════════════════════════════════════════════════════
# STUDENT: Load exam
# POST /api/ai-exams/student/load
# ═══════════════════════════════════════════════════════════
@router.post("/student/load")
async def load_exam(body: StudentLoadExamRequest):
    """
    Load an exam for a student (validates timing)
    """
    from app.models.ai_exam import AiExam
    exam = await AiExam.get(body.exam_id)
    
    if not exam or exam.class_name != body.class_name or not exam.is_live:
        raise HTTPException(status_code=404, detail="Exam not found for this class or not live")
    
    # Validate timing (PKT timezone)
    pkt = pytz.timezone("Asia/Karachi")
    now_pkt = datetime.now(pkt)
    
    def parse_local(s):
        if not s:
            return None
        return pkt.localize(datetime.fromisoformat(s))
    
    start_dt = parse_local(exam.start_time)
    end_dt = parse_local(exam.end_time)
    
    if start_dt and now_pkt < start_dt:
        raise HTTPException(status_code=403, detail="Exam not started yet")
    if end_dt and now_pkt > end_dt:
        raise HTTPException(status_code=403, detail="Exam time over")
    
    return {
        "exam_id": body.exam_id,
        "class_name": exam.class_name,
        "subject": exam.subject,
        "topic": exam.topic,
        "questions": [q.model_dump() for q in exam.questions]
    }


# ═══════════════════════════════════════════════════════════
# STUDENT: Submit answers
# POST /api/ai-exams/student/submit
# ═══════════════════════════════════════════════════════════
@router.post("/student/submit")
async def submit_answers(
    body: StudentSubmitRequest,
    username: str = Depends(get_current_user)
):
    """
    Submit exam answers
    """
    try:
        await exam_service.submit_ai_exam(
            exam_id=body.exam_id,
            student_username=username,
            class_name=body.class_name,
            answers=body.answers
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"status": "submitted"}


# ═══════════════════════════════════════════════════════════
# TEACHER: List submissions for an exam
# GET /api/ai-exams/{exam_id}/submissions
# ═══════════════════════════════════════════════════════════
@router.get("/{exam_id}/submissions")
async def list_submissions(
    exam_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List all submissions for a specific exam
    """
    submissions = await exam_service.get_ai_submissions(
        exam_id=exam_id,
        skip=skip,
        limit=limit
    )
    
    return [
        {
            "student_username": s.student_username,
            "class_name": s.class_name,
            "subject": s.subject,
            "topic": s.topic,
            "submitted_at": s.submitted_at,
            "checked": s.checked
        }
        for s in submissions
    ]


# ═══════════════════════════════════════════════════════════
# TEACHER: AI grade exam (preview only)
# POST /api/ai-exams/{exam_id}/grade
# ═══════════════════════════════════════════════════════════
@router.post("/{exam_id}/grade")
async def grade_exam(
    exam_id: str,
    body: CheckExamRequest,
    username: str = Depends(get_current_user)
):
    """
    Grade an exam submission using AI (preview only, doesn't save)
    """
    from app.models.ai_exam import AiExam, AiExamSubmission
    
    exam = await AiExam.get(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    submission = await AiExamSubmission.find_one(
        AiExamSubmission.exam_id == exam_id,
        AiExamSubmission.student_username == body.student_username
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="No submission for this student")
    
    # Build questions list for grading
    exam_q_map = {q.id: q for q in exam.questions}
    questions = []
    
    for item in submission.answers:
        q_id = item.get("id") or item.get("questionNumber")
        orig_q = exam_q_map.get(q_id)
        
        questions.append({
            "id": q_id,
            "text": item.get("question") or (orig_q.question if orig_q else "Unknown"),
            "correct_answer": item.get("correct_answer") or (orig_q.correct_answer if orig_q else "Unknown"),
            "max_marks": item.get("marks") or (orig_q.max_marks if orig_q else 5)
        })
    
    # Grade using AI
    result = await ai_grading_service.grade_exam_answers(
        topic=exam.topic,
        questions=questions,
        answers=submission.answers
    )
    
    return result


# ═══════════════════════════════════════════════════════════
# TEACHER: AI grade generic/manual exam
# POST /api/ai-exams/grade-generic
# ═══════════════════════════════════════════════════════════
@router.post("/grade-generic")
async def grade_generic_exam(body: CheckGenericExamRequest):
    """
    Grade a generic/manual exam using AI
    """
    result = await ai_grading_service.grade_generic_exam(
        topic=body.topic,
        questions=body.questions,
        answers=body.answers
    )
    
    return result


# ═══════════════════════════════════════════════════════════
# TEACHER: Confirm and save result
# POST /api/ai-exams/{exam_id}/results
# ═══════════════════════════════════════════════════════════
@router.post("/{exam_id}/results")
async def confirm_result(
    exam_id: str,
    body: ConfirmResultRequest,
    username: str = Depends(get_current_user)
):
    """
    Confirm and save exam results
    """
    from app.models.ai_exam import AiExam
    
    exam = await AiExam.get(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.teacher_username != username:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Convert schema items to model items
    items = [
        ResultItem(
            id=item.id,
            marks_obtained=item.marks_obtained,
            max_marks=item.max_marks,
            feedback=item.feedback
        )
        for item in body.items
    ]
    
    total_obtained = sum(i.marks_obtained for i in items)
    total_max = sum(i.max_marks for i in items)
    
    result = await exam_service.save_exam_result(
        exam_id=exam_id,
        teacher_username=username,
        student_username=body.student_username,
        obtained_marks=total_obtained,
        total_marks=total_max,
        items=items,
        source="AI"
    )
    
    return {
        "status": "saved",
        "result_id": str(result.id),
        "total_obtained": total_obtained,
        "total_max": total_max
    }


# ═══════════════════════════════════════════════════════════
# TEACHER: Get all results
# GET /api/ai-exams/results
# ═══════════════════════════════════════════════════════════
@router.get("/results", response_model=List[ExamResultResponse])
async def get_teacher_results(
    username: str = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Get all exam results for a teacher
    """
    results = await exam_service.get_results(
        teacher_username=username,
        skip=skip,
        limit=limit
    )
    
    from app.models.ai_exam import AiExam
    
    response = []
    for r in results:
        exam = await AiExam.get(r.exam_id) if r.exam_id else None
        
        response.append(ExamResultResponse(
            result_id=str(r.id),
            exam_id=r.exam_id,
            student_username=r.student_username,
            teacher_username=r.teacher_username,
            class_name=exam.class_name if exam else r.class_name,
            subject=exam.subject if exam else r.subject,
            title=exam.topic if exam else r.title,
            obtained_marks=r.obtained_marks,
            total_marks=r.total_marks,
            checked_at=r.checked_at,
            source=r.source
        ))
    
    return response


# ═══════════════════════════════════════════════════════════
# STUDENT: Get own results
# GET /api/ai-exams/student/results
# ═══════════════════════════════════════════════════════════
@router.get("/student/results", response_model=List[ExamResultResponse])
async def get_student_results(
    username: str = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Get all exam results for a student
    """
    results = await exam_service.get_results(
        student_username=username,
        skip=skip,
        limit=limit
    )
    
    from app.models.ai_exam import AiExam
    
    response = []
    for r in results:
        exam = await AiExam.get(r.exam_id) if r.exam_id else None
        
        response.append(ExamResultResponse(
            result_id=str(r.id),
            exam_id=r.exam_id,
            student_username=r.student_username,
            teacher_username=r.teacher_username,
            class_name=exam.class_name if exam else r.class_name,
            subject=exam.subject if exam else r.subject,
            title=exam.topic if exam else r.title,
            obtained_marks=r.obtained_marks,
            total_marks=r.total_marks,
            checked_at=r.checked_at,
            source=r.source
        ))
    
    return response


# ═══════════════════════════════════════════════════════════
# TEACHER: Get statistics
# GET /api/ai-exams/statistics
# ═══════════════════════════════════════════════════════════
@router.get("/statistics", response_model=ExamStatisticsResponse)
async def get_statistics(username: str = Depends(get_current_user)):
    """
    Get exam statistics for a teacher
    """
    stats = await exam_service.get_exam_statistics(teacher_username=username)
    return ExamStatisticsResponse(**stats)


# ═══════════════════════════════════════════════════════════
# STUDENT: Get statistics
# GET /api/ai-exams/student/statistics
# ═══════════════════════════════════════════════════════════
@router.get("/student/statistics", response_model=StudentStatisticsResponse)
async def get_student_statistics(username: str = Depends(get_current_user)):
    """
    Get exam statistics for a student
    """
    stats = await exam_service.get_student_statistics(student_username=username)
    return StudentStatisticsResponse(**stats)
