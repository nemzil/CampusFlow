"""
Exam Service Layer
Handles business logic for both manual and AI-generated exams
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from beanie import PydanticObjectId

from app.models.exam import ManualExam, ManualExamSubmission, ManualQuestion, ManualStudentAnswer
from app.models.ai_exam import AiExam, AiExamSubmission, ExamResult, ExamQuestion, ResultItem


# Manual Exam Service Functions
async def create_manual_exam(
    class_name: str,
    subject: str,
    title: str,
    teacher_username: str,
    questions: List[ManualQuestion],
    require_seb: bool = False
) -> ManualExam:
    """Create a new manual exam"""
    exam = ManualExam(
        className=class_name,
        subject=subject,
        title=title,
        teacherUsername=teacher_username,
        questions=questions,
        requireSeb=require_seb
    )
    await exam.insert()
    return exam


async def get_manual_exams(
    teacher_username: Optional[str] = None,
    class_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[ManualExam]:
    """Get manual exams with optional filtering and pagination"""
    query = ManualExam.find()
    
    if teacher_username:
        query = query.find(ManualExam.teacherUsername == teacher_username)
    if class_name:
        query = query.find(ManualExam.className == class_name)
    
    exams = await query.skip(skip).limit(limit).sort("-_id").to_list()
    return exams


async def set_manual_exam_live(
    exam_id: PydanticObjectId,
    start_time: datetime,
    end_time: datetime,
    require_seb: Optional[bool] = None
) -> ManualExam:
    """Set a manual exam as live with start and end times"""
    exam = await ManualExam.get(exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    update_data = {
        ManualExam.startTime: start_time,
        ManualExam.endTime: end_time,
        ManualExam.live: True
    }
    if require_seb is not None:
        update_data[ManualExam.requireSeb] = require_seb
        
    await exam.set(update_data)
    
    # Refresh to get updated data
    await exam.sync()
    return exam


async def end_manual_exam(exam_id: PydanticObjectId) -> ManualExam:
    """End a manual exam"""
    exam = await ManualExam.get(exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    await exam.set({
        ManualExam.endTime: datetime.now(timezone.utc),
        ManualExam.live: False
    })
    
    await exam.sync()
    return exam


async def submit_manual_exam(
    exam_id: PydanticObjectId,
    student_username: str,
    class_name: str,
    answers: List[ManualStudentAnswer]
) -> ManualExamSubmission:
    """Submit a manual exam with student answers"""
    exam = await ManualExam.get(exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    # Check if already submitted
    existing = await ManualExamSubmission.find_one(
        ManualExamSubmission.examId == str(exam_id),
        ManualExamSubmission.studentUsername == student_username
    )
    if existing:
        raise ValueError("Exam already submitted")
    
    # Populate question context into answers
    for ans in answers:
        q = next((q for q in exam.questions if q.questionNumber == ans.questionNumber), None)
        if q:
            ans.question = q.text
            ans.correctAnswer = q.correctAnswer
            ans.maxMarks = q.maxMarks
    
    # Calculate max total marks
    max_total = sum(q.maxMarks for q in exam.questions)
    
    submission = ManualExamSubmission(
        examId=str(exam_id),
        studentUsername=student_username,
        className=class_name,
        answers=answers,
        maxTotalMarks=max_total,
        submittedAt=datetime.now(timezone.utc)
    )
    await submission.insert()
    return submission


async def get_manual_submissions(
    exam_id: Optional[str] = None,
    student_username: Optional[str] = None,
    class_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[ManualExamSubmission]:
    """Get manual exam submissions with filtering and pagination"""
    query = ManualExamSubmission.find()
    
    if exam_id:
        query = query.find(ManualExamSubmission.examId == exam_id)
    if student_username:
        query = query.find(ManualExamSubmission.studentUsername == student_username)
    if class_name:
        query = query.find(ManualExamSubmission.className == class_name)
    
    submissions = await query.skip(skip).limit(limit).sort("-submittedAt").to_list()
    return submissions


async def mark_manual_submission(
    submission_id: PydanticObjectId,
    question_marks: List[Dict[str, Any]],
    total_marks: int
) -> ManualExamSubmission:
    """Mark a manual exam submission and save result"""
    submission = await ManualExamSubmission.get(submission_id)
    if not submission:
        raise ValueError("Submission not found")
    
    # Update submission with marks and feedback
    for q_mark in question_marks:
        for ans in submission.answers:
            if ans.questionNumber == q_mark["questionNumber"]:
                ans.awardedMarks = q_mark["awardedMarks"]
                ans.teacherFeedback = q_mark.get("feedback")
                break
    
    await submission.set({
        ManualExamSubmission.answers: submission.answers,
        ManualExamSubmission.totalMarks: total_marks,
        ManualExamSubmission.checkedByTeacher: True
    })
    
    # Save/Update result in ExamResult collection
    try:
        exam_oid = PydanticObjectId(submission.examId)
        exam = await ManualExam.get(exam_oid)
        
        if exam:
            existing_result = await ExamResult.find_one(
                ExamResult.exam_id == submission.examId,
                ExamResult.student_username == submission.studentUsername
            )
            if existing_result:
                await existing_result.set({
                    ExamResult.obtained_marks: total_marks,
                    ExamResult.total_marks: submission.maxTotalMarks or 0,
                    ExamResult.checked_at: datetime.now(timezone.utc)
                })
            else:
                result = ExamResult(
                    exam_id=submission.examId,
                    teacher_username=exam.teacherUsername,
                    student_username=submission.studentUsername,
                    obtained_marks=total_marks,
                    total_marks=submission.maxTotalMarks or 0,
                    class_name=submission.className,
                    subject=exam.subject,
                    title=exam.title,
                    source="MANUAL",
                    checked_at=datetime.now(timezone.utc)
                )
                await result.insert()
    except Exception as e:
        print(f"exam result save failed: {e}")
    
    await submission.sync()
    return submission


# AI Exam Service Functions
async def create_ai_exam(
    class_name: str,
    subject: str,
    topic: str,
    teacher_username: str,
    questions: List[ExamQuestion],
    require_seb: bool = False
) -> AiExam:
    """Create a new AI-generated exam"""
    exam = AiExam(
        class_name=class_name,
        subject=subject,
        topic=topic,
        teacher_username=teacher_username,
        questions=questions,
        require_seb=require_seb,
        status="draft"
    )
    await exam.insert()
    return exam


async def get_ai_exams(
    teacher_username: Optional[str] = None,
    class_name: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[AiExam]:
    """Get AI exams with optional filtering and pagination"""
    query = AiExam.find()
    
    if teacher_username:
        query = query.find(AiExam.teacher_username == teacher_username)
    if class_name:
        query = query.find(AiExam.class_name == class_name)
    if status:
        query = query.find(AiExam.status == status)
    
    exams = await query.skip(skip).limit(limit).sort("-_id").to_list()
    return exams


async def set_ai_exam_live(
    exam_id: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    require_seb: Optional[bool] = None
) -> AiExam:
    """Set an AI exam as live"""
    exam = await AiExam.get(exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    update_data = {
        AiExam.is_live: True,
        AiExam.status: "live"
    }
    
    if start_time:
        update_data[AiExam.start_time] = start_time
    if end_time:
        update_data[AiExam.end_time] = end_time
    if require_seb is not None:
        update_data[AiExam.require_seb] = require_seb
    
    await exam.set(update_data)
    await exam.sync()
    return exam


async def end_ai_exam(exam_id: str) -> AiExam:
    """End an AI exam"""
    exam = await AiExam.get(exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    await exam.set({
        AiExam.is_live: False,
        AiExam.status: "ended",
        AiExam.ended_at: datetime.now(timezone.utc).isoformat()
    })
    
    await exam.sync()
    return exam


async def submit_ai_exam(
    exam_id: str,
    student_username: str,
    class_name: str,
    answers: List[Any]
) -> AiExamSubmission:
    """Submit an AI exam with student answers"""
    exam = await AiExam.get(exam_id)
    if not exam or not exam.is_live:
        raise ValueError("Exam not found or not live")
    
    # Check if already submitted
    existing = await AiExamSubmission.find_one(
        AiExamSubmission.exam_id == exam_id,
        AiExamSubmission.student_username == student_username
    )
    if existing:
        raise ValueError("Exam already submitted")
    
    submission = AiExamSubmission(
        exam_id=exam_id,
        teacher_username=exam.teacher_username,
        student_username=student_username,
        class_name=class_name,
        subject=exam.subject,
        topic=exam.topic,
        answers=answers,
        submitted_at=datetime.now(timezone.utc).isoformat()
    )
    await submission.insert()
    return submission


async def get_ai_submissions(
    exam_id: Optional[str] = None,
    student_username: Optional[str] = None,
    class_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[AiExamSubmission]:
    """Get AI exam submissions with filtering and pagination"""
    query = AiExamSubmission.find()
    
    if exam_id:
        query = query.find(AiExamSubmission.exam_id == exam_id)
    if student_username:
        query = query.find(AiExamSubmission.student_username == student_username)
    if class_name:
        query = query.find(AiExamSubmission.class_name == class_name)
    
    submissions = await query.skip(skip).limit(limit).sort("-submitted_at").to_list()
    return submissions


async def save_exam_result(
    exam_id: Optional[str],
    teacher_username: str,
    student_username: str,
    obtained_marks: int,
    total_marks: int,
    items: List[ResultItem],
    source: str = "AI",
    class_name: Optional[str] = None,
    subject: Optional[str] = None,
    title: Optional[str] = None
) -> ExamResult:
    """Save exam result to database"""
    # Check if result already exists
    existing_result = await ExamResult.find_one(
        ExamResult.exam_id == exam_id,
        ExamResult.student_username == student_username
    )
    if existing_result:
        await existing_result.set({
            ExamResult.obtained_marks: obtained_marks,
            ExamResult.total_marks: total_marks,
            ExamResult.items: items,
            ExamResult.checked_at: datetime.now(timezone.utc)
        })
        result = existing_result
    else:
        result = ExamResult(
            exam_id=exam_id,
            teacher_username=teacher_username,
            student_username=student_username,
            obtained_marks=obtained_marks,
            total_marks=total_marks,
            items=items,
            source=source,
            class_name=class_name,
            subject=subject,
            title=title,
            checked_at=datetime.now(timezone.utc)
        )
        await result.insert()
    
    # Update submission answers and status
    if exam_id:
        submission = await AiExamSubmission.find_one(
            AiExamSubmission.exam_id == exam_id,
            AiExamSubmission.student_username == student_username
        )
        if submission:
            updated_answers = []
            for ans in submission.answers:
                ans_id = ans.get("id") if isinstance(ans, dict) else getattr(ans, "id", None)
                if ans_id is None:
                    ans_id = ans.get("questionNumber") if isinstance(ans, dict) else getattr(ans, "questionNumber", None)
                
                matching_item = next((item for item in items if item.id == ans_id), None)
                if matching_item:
                    if isinstance(ans, dict):
                        ans["awarded_marks"] = matching_item.marks_obtained
                        ans["teacher_feedback"] = matching_item.feedback
                    else:
                        ans.awarded_marks = matching_item.marks_obtained
                        ans.teacher_feedback = matching_item.feedback
                updated_answers.append(ans)
            
            await submission.set({
                AiExamSubmission.answers: updated_answers,
                AiExamSubmission.checked: True
            })
    
    return result


async def get_results(
    teacher_username: Optional[str] = None,
    student_username: Optional[str] = None,
    exam_id: Optional[str] = None,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[ExamResult]:
    """Get exam results with filtering and pagination"""
    query = ExamResult.find()
    
    if teacher_username:
        query = query.find(ExamResult.teacher_username == teacher_username)
    if student_username:
        query = query.find(ExamResult.student_username == student_username)
    if exam_id:
        query = query.find(ExamResult.exam_id == exam_id)
    if source:
        query = query.find(ExamResult.source == source)
    
    results = await query.skip(skip).limit(limit).sort("-checked_at").to_list()
    return results


async def get_exam_statistics(teacher_username: str) -> Dict[str, Any]:
    """Get exam statistics for a teacher"""
    # Count exams by type
    manual_count = await ManualExam.find(
        ManualExam.teacherUsername == teacher_username
    ).count()
    
    ai_count = await AiExam.find(
        AiExam.teacher_username == teacher_username
    ).count()
    
    # Count submissions
    manual_submissions = await ManualExamSubmission.find(
        ManualExamSubmission.examId.exists()
    ).to_list()
    
    manual_submission_count = sum(
        1 for sub in manual_submissions
        if sub.examId and await ManualExam.find_one(
            ManualExam.id == PydanticObjectId(sub.examId),
            ManualExam.teacherUsername == teacher_username
        )
    )
    
    ai_submission_count = await AiExamSubmission.find(
        AiExamSubmission.teacher_username == teacher_username
    ).count()
    
    # Count checked submissions
    manual_checked = sum(1 for sub in manual_submissions if sub.checkedByTeacher)
    
    ai_checked = await AiExamSubmission.find(
        AiExamSubmission.teacher_username == teacher_username,
        AiExamSubmission.checked == True
    ).count()
    
    return {
        "total_exams": manual_count + ai_count,
        "manual_exams": manual_count,
        "ai_exams": ai_count,
        "total_submissions": manual_submission_count + ai_submission_count,
        "manual_submissions": manual_submission_count,
        "ai_submissions": ai_submission_count,
        "checked_submissions": manual_checked + ai_checked,
        "pending_submissions": (manual_submission_count + ai_submission_count) - (manual_checked + ai_checked)
    }


async def get_student_statistics(student_username: str) -> Dict[str, Any]:
    """Get exam statistics for a student"""
    # Count submissions
    manual_submissions = await ManualExamSubmission.find(
        ManualExamSubmission.studentUsername == student_username
    ).count()
    
    ai_submissions = await AiExamSubmission.find(
        AiExamSubmission.student_username == student_username
    ).count()
    
    # Get results
    results = await ExamResult.find(
        ExamResult.student_username == student_username
    ).to_list()
    
    total_obtained = sum(r.obtained_marks for r in results)
    total_max = sum(r.total_marks for r in results)
    average_percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
    
    return {
        "total_submissions": manual_submissions + ai_submissions,
        "manual_submissions": manual_submissions,
        "ai_submissions": ai_submissions,
        "total_results": len(results),
        "total_marks_obtained": total_obtained,
        "total_marks_max": total_max,
        "average_percentage": round(average_percentage, 2)
    }
