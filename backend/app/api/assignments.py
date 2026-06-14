from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from app.models.assignment import (
    Assignment, Submission,
    AssignmentCreate, AssignmentUpdate, AssignmentResponse,
    SubmissionCreate, SubmissionResponse,
    GradeSubmission, BulkGradeRequest,
    AiGenerateAssignmentRequest, UpdateAssignmentQuestionRequest,
    AssignmentQuestion
)
from app.models.user import User
from app.models.course import Course
from app.api.deps import get_current_user
from app.services import assignment_service
from app.services.ai_grading_service import generate_exam_questions
from app.utils.academic_term import resolve_term, get_current_academic_term

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

async def get_current_user_object(username: str) -> User:
    """Get full user object from username"""
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ═══════════════════════════════════════════════════════════════════
# ASSIGNMENT/QUIZ MANAGEMENT (TEACHER/ADMIN)
# ═══════════════════════════════════════════════════════════════════

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment_data: AssignmentCreate,
    term: str = Query(..., description="Academic term (e.g., 2024F, Fall, Spring)"),
    current_user: str = Depends(get_current_user)
):
    """
    Create new assignment or quiz (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can create assignments")
    
    # Get course to verify teacher owns it (if teacher)
    course = await Course.get(assignment_data.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")
    
    # Resolve term
    resolved_term = resolve_term(term)
    
    # Create assignment
    teacher_name = f"{user.first_name} {user.last_name}"
    assignment = await assignment_service.create_assignment(
        assignment_data=assignment_data.model_dump(),
        teacher_id=user.username,
        teacher_name=teacher_name,
        term=resolved_term
    )
    
    return {
        "id": str(assignment.id),
        "course_id": assignment.course_id,
        "course_code": assignment.course_code,
        "teacher_id": assignment.teacher_id,
        "teacher_name": assignment.teacher_name,
        "type": assignment.type,
        "number": assignment.number,
        "title": assignment.title,
        "description": assignment.description,
        "max_marks": assignment.max_marks,
        "deadline": assignment.deadline,
        "attachment_urls": assignment.attachment_urls,
        "status": assignment.status,
        "term": assignment.term,
        "submission_count": assignment.submission_count,
        "graded_count": assignment.graded_count,
        "created_at": assignment.created_at
    }

@router.get("/course/{course_id}")
async def list_course_assignments(
    course_id: str,
    assignment_type: Optional[str] = Query(None, description="Filter by ASSIGNMENT or QUIZ"),
    current_user: str = Depends(get_current_user)
):
    """
    List assignments for a course (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view course assignments")
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check authorization
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")
    
    # Build query
    query = Assignment.find(Assignment.course_id == course_id)
    if assignment_type:
        query = query.find(Assignment.type == assignment_type.upper())
    
    assignments = await query.to_list()
    
    # Calculate pending count for each
    result = []
    for assignment in assignments:
        pending_count = assignment.submission_count - assignment.graded_count
        
        result.append({
            "id": str(assignment.id),
            "type": assignment.type,
            "number": assignment.number,
            "title": assignment.title,
            "max_marks": assignment.max_marks,
            "deadline": assignment.deadline,
            "status": assignment.status,
            "creation_mode": assignment.creation_mode,
            "questions": [q.model_dump() for q in assignment.questions],
            "submission_count": assignment.submission_count,
            "graded_count": assignment.graded_count,
            "pending_count": pending_count
        })
    
    return {
        "course_code": course.course_code,
        "assignments": result
    }

# ═══════════════════════════════════════════════════════════════════
# STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════════

@router.get("/my-assignments/list")
async def get_my_assignments(
    course_id: Optional[str] = Query(None, description="Filter by course"),
    term: Optional[str] = Query(None, description="Filter by academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Get student's assignments with submission status
    """
    from app.models.enrollment import Enrollment
    
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their assignments")
    
    # Resolve term only if explicitly provided
    resolved_term = None
    if term:
        resolved_term = resolve_term(term)
    
    # Get assignments (no term filter by default - show all enrolled course assignments)
    assignments = await assignment_service.get_student_assignments(
        student_id=str(user.id),
        course_id=course_id,
        term=resolved_term
    )
    
    return {
        "assignments": assignments,
        "total_count": len(assignments)
    }

@router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get assignment details
    """
    # Get assignment
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check authorization
    if user.role == "STUDENT":
        # Students can only view published assignments for enrolled courses
        if assignment.status != "PUBLISHED":
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Check enrollment
        from app.models.enrollment import Enrollment
        enrollment = await Enrollment.find_one(
            Enrollment.student_id == str(user.id),
            Enrollment.course_id == assignment.course_id,
            Enrollment.status == "ENROLLED"
        )
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    elif user.role == "TEACHER":
        # Teachers can only view their own course assignments
        course = await Course.get(assignment.course_id)
        if course and course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "id": str(assignment.id),
        "course_id": assignment.course_id,
        "course_code": assignment.course_code,
        "teacher_name": assignment.teacher_name,
        "type": assignment.type,
        "number": assignment.number,
        "title": assignment.title,
        "description": assignment.description,
        "max_marks": assignment.max_marks,
        "deadline": assignment.deadline,
        "attachment_urls": assignment.attachment_urls,
        "status": assignment.status,
        "submission_count": assignment.submission_count,
        "graded_count": assignment.graded_count
    }

@router.put("/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    update_data: AssignmentUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Update assignment (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can update assignments")
    
    # Update assignment
    assignment = await assignment_service.update_assignment(
        assignment_id=assignment_id,
        update_data=update_data.model_dump(exclude_unset=True),
        teacher_id=user.username if user.role == "TEACHER" else None
    )
    
    return {
        "id": str(assignment.id),
        "title": assignment.title,
        "description": assignment.description,
        "deadline": assignment.deadline,
        "status": assignment.status,
        "updated_at": assignment.updated_at
    }

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Delete assignment (TEACHER/ADMIN)
    Cannot delete if submissions exist
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can delete assignments")
    
    # Delete assignment
    result = await assignment_service.delete_assignment(
        assignment_id=assignment_id,
        teacher_id=user.username if user.role == "TEACHER" else None
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# SUBMISSIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/{assignment_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    assignment_id: str,
    submission_data: SubmissionCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Submit assignment (STUDENT)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can submit assignments")
    
    # Submit assignment
    submission = await assignment_service.submit_assignment(
        assignment_id=assignment_id,
        student_id=str(user.id),
        student_username=user.username,
        submission_data=submission_data.model_dump()
    )
    
    return {
        "id": str(submission.id),
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "student_username": submission.student_username,
        "file_url": submission.file_url,
        "text_answer": submission.text_answer,
        "comments": submission.comments,
        "submitted_at": submission.submitted_at,
        "is_late": submission.is_late,
        "status": submission.status
    }

@router.delete("/{assignment_id}/unsubmit")
async def unsubmit_assignment(
    assignment_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Unsubmit/delete assignment submission (STUDENT)
    Only allowed if not yet graded
    """
    from app.models.assignment import Submission
    
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can unsubmit assignments")
    
    # Find submission
    submission = await Submission.find_one(
        Submission.assignment_id == assignment_id,
        Submission.student_id == str(user.id)
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check if already graded
    if submission.status == "GRADED":
        raise HTTPException(status_code=400, detail="Cannot unsubmit graded assignment")
    
    # Delete submission
    await submission.delete()
    
    # Update assignment submission count
    assignment = await Assignment.get(assignment_id)
    if assignment and assignment.submission_count > 0:
        assignment.submission_count -= 1
        await assignment.save()
    
    return {"message": "Submission removed successfully"}

@router.get("/{assignment_id}/submissions")
async def get_assignment_submissions(
    assignment_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get all submissions for an assignment (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view submissions")
    
    # Get assignment
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check authorization for teachers
    if user.role == "TEACHER":
        course = await Course.get(assignment.course_id)
        if course and course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get submissions
    submissions = await Submission.find(
        Submission.assignment_id == assignment_id
    ).to_list()
    
    # Get total enrolled students
    from app.models.enrollment import Enrollment
    total_students = await Enrollment.find(
        Enrollment.course_id == assignment.course_id,
        Enrollment.status == "ENROLLED"
    ).count()
    
    # Build response
    result = []
    for submission in submissions:
        # Get student details
        student = await User.find_one(User.username == submission.student_username)
        student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"
        
        result.append({
            "id": str(submission.id),
            "student_username": submission.student_username,
            "student_name": student_name,
            "submitted_at": submission.submitted_at,
            "is_late": submission.is_late,
            "status": submission.status,
            "marks_obtained": submission.marks_obtained,
            "max_marks": submission.max_marks,
            "feedback": submission.feedback,
            "graded_at": submission.graded_at,
            "file_url": submission.file_url,
            "text_answer": submission.text_answer,
            "comments": submission.comments,
        })
    
    return {
        "assignment_title": assignment.title,
        "max_marks": assignment.max_marks,
        "total_students": total_students,
        "submitted_count": len(submissions),
        "graded_count": assignment.graded_count,
        "pending_count": len(submissions) - assignment.graded_count,
        "submissions": result
    }

@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get single submission details
    Students can view their own, teachers can view all for their courses
    """
    # Get submission
    submission = await Submission.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check authorization
    if user.role == "STUDENT":
        # Students can only view their own submissions
        if submission.student_id != str(user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
    elif user.role == "TEACHER":
        # Teachers can only view submissions for their courses
        assignment = await Assignment.get(submission.assignment_id)
        if assignment:
            course = await Course.get(assignment.course_id)
            if course and course.teacher_id != user.username:
                raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get assignment details
    assignment = await Assignment.get(submission.assignment_id)
    
    # Get student details
    student = await User.find_one(User.username == submission.student_username)
    student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"
    
    return {
        "id": str(submission.id),
        "assignment_title": assignment.title if assignment else "Unknown",
        "assignment_type": assignment.type if assignment else None,
        "student_username": submission.student_username,
        "student_name": student_name,
        "submitted_at": submission.submitted_at,
        "file_url": submission.file_url,
        "text_answer": submission.text_answer,
        "comments": submission.comments,
        "is_late": submission.is_late,
        "status": submission.status,
        "marks_obtained": submission.marks_obtained,
        "max_marks": submission.max_marks,
        "feedback": submission.feedback,
        "graded_at": submission.graded_at,
        "graded_by": submission.graded_by
    }

# ═══════════════════════════════════════════════════════════════════
# GRADING
# ═══════════════════════════════════════════════════════════════════

@router.put("/submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: str,
    grade_data: GradeSubmission,
    current_user: str = Depends(get_current_user)
):
    """
    Grade a submission (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can grade submissions")
    
    # Get submission to check authorization
    submission = await Submission.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check teacher authorization
    if user.role == "TEACHER":
        assignment = await Assignment.get(submission.assignment_id)
        if assignment:
            course = await Course.get(assignment.course_id)
            if course and course.teacher_id != user.username:
                raise HTTPException(status_code=403, detail="Not authorized")
    
    # Grade submission
    graded_submission = await assignment_service.grade_submission(
        submission_id=submission_id,
        marks_obtained=grade_data.marks_obtained,
        feedback=grade_data.feedback,
        teacher_username=user.username
    )
    
    return {
        "id": str(graded_submission.id),
        "marks_obtained": graded_submission.marks_obtained,
        "max_marks": graded_submission.max_marks,
        "feedback": graded_submission.feedback,
        "status": graded_submission.status,
        "graded_at": graded_submission.graded_at,
        "graded_by": graded_submission.graded_by
    }

# ═══════════════════════════════════════════════════════════════════
# AI ASSIGNMENT GENERATION
# ═══════════════════════════════════════════════════════════════════

@router.post("/ai-generate", status_code=status.HTTP_201_CREATED)
async def ai_generate_assignment(
    request: AiGenerateAssignmentRequest,
    term: str = Query(..., description="Academic term (e.g., 2024F, Fall, Spring)"),
    current_user: str = Depends(get_current_user)
):
    """
    Generate assignment questions using AI, then save as a draft (TEACHER/ADMIN)
    """
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can create assignments")

    course = await Course.get(request.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")

    # Resolve term
    resolved_term = resolve_term(term)

    # Generate questions via AI
    ai_questions = await generate_exam_questions(
        topic=request.title,
        num_questions=request.num_questions,
        question_type="short"
    )

    # Convert to AssignmentQuestion list
    questions = [
        AssignmentQuestion(
            id=q.id,
            question=q.question,
            original_question=q.question,
            max_marks=q.max_marks or 5
        )
        for q in ai_questions
    ]

    # Build assignment data
    teacher_name = f"{user.first_name} {user.last_name}"
    assignment_data = {
        "course_id": request.course_id,
        "type": request.type,
        "number": request.number,
        "title": request.title,
        "description": f"AI-generated {request.type.lower()} with {request.num_questions} questions.",
        "deadline": request.deadline,
        "attachment_urls": [],
        "status": request.status,
        "creation_mode": "AI",
        "questions": [q.model_dump() for q in questions],
    }

    assignment = await assignment_service.create_assignment(
        assignment_data=assignment_data,
        teacher_id=user.username,
        teacher_name=teacher_name,
        term=resolved_term
    )

    return {
        "id": str(assignment.id),
        "course_id": assignment.course_id,
        "course_code": assignment.course_code,
        "type": assignment.type,
        "number": assignment.number,
        "title": assignment.title,
        "description": assignment.description,
        "max_marks": assignment.max_marks,
        "deadline": assignment.deadline,
        "status": assignment.status,
        "creation_mode": assignment.creation_mode,
        "questions": [q.model_dump() for q in assignment.questions],
        "term": assignment.term,
        "created_at": assignment.created_at
    }


@router.put("/{assignment_id}/questions/{question_id}")
async def update_assignment_question(
    assignment_id: str,
    question_id: int,
    body: UpdateAssignmentQuestionRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Edit a single AI-generated question in an assignment (TEACHER/ADMIN)
    """
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if user.role == "TEACHER" and assignment.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized")

    updated = False
    for q in assignment.questions:
        if q.id == question_id:
            if not q.original_question:
                q.original_question = q.question
            q.question = body.question
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")

    from datetime import datetime, timezone
    assignment.updated_at = datetime.now(timezone.utc)
    await assignment.save()
    return {"status": "updated", "question_id": question_id}


@router.post("/{assignment_id}/questions/{question_id}/undo")
async def undo_assignment_question(
    assignment_id: str,
    question_id: int,
    current_user: str = Depends(get_current_user)
):
    """
    Undo a question edit and restore original AI-generated text
    """
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if user.role == "TEACHER" and assignment.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized")

    for q in assignment.questions:
        if q.id == question_id:
            if not q.original_question:
                raise HTTPException(status_code=400, detail="No original to restore")
            q.question = q.original_question
            await assignment.save()
            return {"status": "undone", "question_id": question_id}

    raise HTTPException(status_code=404, detail="Question not found")


@router.post("/submissions/{submission_id}/ai-grade")
async def ai_grade_submission(
    submission_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Use AI to suggest marks and feedback for a submission (TEACHER/ADMIN)
    """
    from app.services.ai_grading_service import grade_generic_exam

    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    submission = await Submission.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = await Assignment.get(submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if user.role == "TEACHER":
        course = await Course.get(assignment.course_id)
        if course and course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Build questions and answers for AI grading
    if assignment.questions:
        questions = [{"id": q.id, "question": q.question, "max_marks": q.max_marks} for q in assignment.questions]
        # If student submitted text, map it across all questions
        # If only PDF submitted, note that AI cannot read it
        if submission.text_answer:
            # Try to split text answer by question if possible, else use full text for each
            answers = [{"id": q.id, "student_answer": submission.text_answer} for q in assignment.questions]
        else:
            answers = [{"id": q.id, "student_answer": "(Student submitted a PDF file — AI cannot read PDF content. Grade manually or ask student to also provide text answer.)"} for q in assignment.questions]
    else:
        questions = [{"id": 1, "question": assignment.description or assignment.title, "max_marks": assignment.max_marks}]
        student_ans = submission.text_answer or "(Student submitted a PDF file — AI cannot read PDF content. Grade manually.)"
        answers = [{"id": 1, "student_answer": student_ans}]

    result = await grade_generic_exam(
        topic=assignment.title,
        questions=questions,
        answers=answers
    )

    details = result.get("results", [])
    total_marks = sum(r.get("marks_obtained", 0) for r in details)

    # Build readable per-question feedback
    feedback_lines = []
    for r in details:
        q_num = r.get("id", "?")
        marks = r.get("marks_obtained", 0)
        max_m = r.get("max_marks", 0)
        fb = r.get("feedback", "")
        feedback_lines.append(f"Q{q_num} ({marks}/{max_m}): {fb}")
    combined_feedback = "\n".join(feedback_lines)

    return {
        "suggested_marks": round(min(total_marks, assignment.max_marks), 1),
        "suggested_feedback": combined_feedback,
        "details": details
    }

@router.post("/{assignment_id}/bulk-grade")
async def bulk_grade(
    assignment_id: str,
    bulk_data: BulkGradeRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Grade multiple submissions at once (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can grade submissions")
    
    # Get assignment to check authorization
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check teacher authorization
    if user.role == "TEACHER":
        course = await Course.get(assignment.course_id)
        if course and course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Bulk grade
    result = await assignment_service.bulk_grade_submissions(
        assignment_id=assignment_id,
        grades=[grade.model_dump() for grade in bulk_data.grades],
        teacher_username=user.username
    )
    
    return result
