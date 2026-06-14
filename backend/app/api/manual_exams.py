"""
Manual Exams API (v2 - Improved)
Handles teacher-created manual exams with service layer
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from typing import List, Optional
from beanie import PydanticObjectId

from app.models.user import User
from app.models.exam import ManualQuestion, ManualStudentAnswer, ManualExam
from app.models.course import Course
from app.api.deps import get_current_user
from app.services import exam_service
from app.schemas.exam import (
    CreateManualExamRequest, ManualExamResponse, SetLiveRequest,
    ManualExamSubmissionRequest, ManualExamSubmissionResponse,
    MarkSubmissionRequest, ManualQuestionSchema, ManualStudentAnswerSchema
)

router = APIRouter()


def check_seb_lockout(exam, request: Request):
    """
    Checks if the exam requires Safe Exam Browser and validates user agent.
    Supports a developer bypass for local manual testing.
    """
    require_seb = False
    if hasattr(exam, 'requireSeb'):
        require_seb = exam.requireSeb
    elif hasattr(exam, 'require_seb'):
        require_seb = exam.require_seb
        
    if require_seb:
        # Check if the bypass is enabled via custom header (useful for testing)
        if request.headers.get("x-seb-bypass") == "campusflow-dev-secret-bypass":
            return
            
        user_agent = request.headers.get("user-agent", "").lower()
        if "seb" not in user_agent:
            raise HTTPException(
                status_code=403, 
                detail="Safe Exam Browser is required to access or submit this exam."
            )


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
    limit: int = Query(50, ge=1, le=100),
    username: str = Depends(get_current_user)
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
    
    from app.models.exam import ManualExamSubmission
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    result = []
    for exam in exams:
        # Determine status based on live flag and times
        status = "draft"
        if exam.live:
            if exam.startTime and exam.endTime:
                start = exam.startTime.replace(tzinfo=timezone.utc) if exam.startTime.tzinfo is None else exam.startTime
                end = exam.endTime.replace(tzinfo=timezone.utc) if exam.endTime.tzinfo is None else exam.endTime
                if now >= start and now <= end:
                    status = "live"
                elif now < start:
                    status = "live"  # Still shows as live (upcoming) in frontend
                elif now > end:
                    status = "ended"
            else:
                status = "live"
                
        # Check if student already submitted
        submitted = False
        if username:
            submission = await ManualExamSubmission.find_one(
                ManualExamSubmission.examId == str(exam.id),
                ManualExamSubmission.studentUsername == username
            )
            if submission:
                submitted = True
        
        result.append(ManualExamResponse(
            id=str(exam.id),
            class_name=exam.className,
            course_id=exam.courseId,
            course_code=exam.courseCode,
            subject=exam.subject,
            title=exam.title,
            exam_type=exam.examType or "midterm",
            total_marks=exam.totalMarks or 30,
            teacher_username=exam.teacherUsername,
            start_time=exam.startTime,
            end_time=exam.endTime,
            live=exam.live,
            status=status,
            questions=[convert_to_schema_question(q) for q in exam.questions],
            require_seb=exam.requireSeb or False,
            submitted=submitted
        ))
    
    return result


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
    
    # Handle both old and new formats
    class_name = request.get_class_name()
    subject = request.get_subject()
    course_id = request.course_id
    course_code = None
    
    # If course_id provided, fetch course details
    if course_id:
        course = await Course.get(course_id)
        if course:
            subject = course.course_name
            course_code = course.course_code
            if not class_name:
                class_name = course.term
    
    # Convert schema questions to model questions
    questions = [convert_to_model_question(q) for q in request.questions]
    
    exam = await exam_service.create_manual_exam(
        class_name=class_name,
        subject=subject,
        title=request.title,
        teacher_username=username,
        questions=questions,
        require_seb=request.require_seb or False
    )
    
    # Update with new fields if provided
    if course_id or request.exam_type or request.total_marks:
        update_fields = {}
        if course_id:
            update_fields[ManualExam.courseId] = course_id
        if course_code:
            update_fields[ManualExam.courseCode] = course_code
        if request.exam_type:
            update_fields[ManualExam.examType] = request.exam_type
        if request.total_marks:
            update_fields[ManualExam.totalMarks] = request.total_marks
        
        if update_fields:
            await exam.set(update_fields)
    
    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        course_id=exam.courseId,
        course_code=exam.courseCode,
        subject=exam.subject,
        title=exam.title,
        exam_type=exam.examType or "midterm",
        total_marks=exam.totalMarks or 30,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        status="draft",
        questions=[convert_to_schema_question(q) for q in exam.questions],
        require_seb=exam.requireSeb or False
    )


# ═══════════════════════════════════════════════════════════
# TEACHER: Get single exam
# GET /api/manual-exams/{exam_id}
# ═══════════════════════════════════════════════════════════
@router.get("/{exam_id}", response_model=ManualExamResponse)
async def get_manual_exam(exam_id: str, request: Request, username: str = Depends(get_current_user)):
    """
    Get a single manual exam by ID
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
    
    from app.models.exam import ManualExam
    from datetime import datetime, timezone
    exam = await ManualExam.get(oid)
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # Check SEB lockout
    check_seb_lockout(exam, request)
    
    # Determine status
    now = datetime.now(timezone.utc)
    status = "draft"
    if exam.live:
        if exam.startTime and exam.endTime:
            start = exam.startTime.replace(tzinfo=timezone.utc) if exam.startTime.tzinfo is None else exam.startTime
            end = exam.endTime.replace(tzinfo=timezone.utc) if exam.endTime.tzinfo is None else exam.endTime
            if now >= start and now <= end:
                status = "live"
            elif now < start:
                status = "live"
            elif now > end:
                status = "ended"
        else:
            status = "live"
    
    # Check if student already submitted
    from app.models.exam import ManualExamSubmission
    submitted = False
    if username:
        submission = await ManualExamSubmission.find_one(
            ManualExamSubmission.examId == str(exam.id),
            ManualExamSubmission.studentUsername == username
        )
        if submission:
            submitted = True

    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        course_id=exam.courseId,
        course_code=exam.courseCode,
        subject=exam.subject,
        title=exam.title,
        exam_type=exam.examType or "midterm",
        total_marks=exam.totalMarks or 30,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        status=status,
        questions=[convert_to_schema_question(q) for q in exam.questions],
        require_seb=exam.requireSeb or False,
        submitted=submitted
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
            end_time=body.end_time,
            require_seb=body.require_seb
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    status = "live"
    if exam.startTime and exam.endTime:
        start = exam.startTime.replace(tzinfo=timezone.utc) if exam.startTime.tzinfo is None else exam.startTime
        end = exam.endTime.replace(tzinfo=timezone.utc) if exam.endTime.tzinfo is None else exam.endTime
        if now > end:
            status = "ended"
    
    return ManualExamResponse(
        id=str(exam.id),
        class_name=exam.className,
        course_id=exam.courseId,
        course_code=exam.courseCode,
        subject=exam.subject,
        title=exam.title,
        exam_type=exam.examType or "midterm",
        total_marks=exam.totalMarks or 30,
        teacher_username=exam.teacherUsername,
        start_time=exam.startTime,
        end_time=exam.endTime,
        live=exam.live,
        status=status,
        questions=[convert_to_schema_question(q) for q in exam.questions],
        require_seb=exam.requireSeb or False
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
        status="ended",
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
    req: Request,
    username: str = Depends(get_current_user)
):
    """
    Submit a manual exam with answers
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
        
    from app.models.exam import ManualExam
    exam = await ManualExam.get(oid)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # Check SEB lockout
    check_seb_lockout(exam, req)
    
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


# ═══════════════════════════════════════════════════════════
# STUDENT: Download SEB Configuration File
# GET /api/manual-exams/{exam_id}/seb-config
# ═══════════════════════════════════════════════════════════
@router.get("/{exam_id}/seb-config")
async def get_manual_exam_seb_config(exam_id: str):
    """
    Generate and download SEB config plist file for this exam
    """
    try:
        oid = PydanticObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")
    
    exam = await ManualExam.get(oid)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    start_url = f"http://localhost:3000/exam-portal/take-manual/{exam_id}"
    quit_url = "http://localhost:3000/exam-portal/exams"
    
    seb_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>startURL</key>
    <string>{start_url}</string>
    <key>sendBrowserExamKey</key>
    <true/>
    <key>browserExamKey</key>
    <string>campusflow-exam-{exam_id}</string>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>allowQuit</key>
    <true/>
    <key>quitURL</key>
    <string>{quit_url}</string>
    <key>quitURLConfirm</key>
    <true/>
    <key>ignoreExitKeys</key>
    <true/>
    <key>allowSpellCheck</key>
    <false/>
    <key>allowRightClick</key>
    <false/>
</dict>
</plist>
"""
    return Response(
        content=seb_xml,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename=exam-manual-{exam_id}.seb"
        }
    )

