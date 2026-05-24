"""
Assignment Service
Handles business logic for assignments and quizzes
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.assignment import Assignment, Submission
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.models.todo import Todo


def validate_max_marks(assignment_type: str, number: int, max_marks: int) -> None:
    """
    Validate max marks based on assignment type and number
    
    Rules:
    - Assignment/Quiz 1 or 2: 3 marks
    - Assignment/Quiz 3: 4 marks
    
    Raises:
        HTTPException: If validation fails
    """
    if assignment_type not in ["ASSIGNMENT", "QUIZ"]:
        raise HTTPException(
            status_code=400,
            detail="Type must be ASSIGNMENT or QUIZ"
        )
    
    if number not in [1, 2, 3]:
        raise HTTPException(
            status_code=400,
            detail="Number must be 1, 2, or 3"
        )
    
    expected_marks = 3 if number in [1, 2] else 4
    
    if max_marks != expected_marks:
        raise HTTPException(
            status_code=400,
            detail=f"{assignment_type} {number} must have {expected_marks} marks (got {max_marks})"
        )


async def check_duplicate_assignment(course_id: str, assignment_type: str, number: int, exclude_id: Optional[str] = None) -> None:
    """
    Check if assignment with same (course, type, number) already exists
    
    Args:
        course_id: Course ID
        assignment_type: ASSIGNMENT or QUIZ
        number: Assignment number (1, 2, or 3)
        exclude_id: Assignment ID to exclude from check (for updates)
    
    Raises:
        HTTPException: If duplicate found
    """
    query = Assignment.find(
        Assignment.course_id == course_id,
        Assignment.type == assignment_type,
        Assignment.number == number
    )
    
    existing = await query.first_or_none()
    
    if existing and (exclude_id is None or str(existing.id) != exclude_id):
        raise HTTPException(
            status_code=400,
            detail=f"{assignment_type} {number} already exists for this course"
        )


async def create_assignment_todos(assignment: Assignment) -> None:
    """
    Create todos for all enrolled students when assignment is published
    
    Args:
        assignment: Assignment object
    """
    # Get all enrolled students for this course
    enrollments = await Enrollment.find(
        Enrollment.course_id == assignment.course_id,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Create todo for each student
    for enrollment in enrollments:
        todo = Todo(
            user_id=enrollment.student_id,
            title=assignment.title,
            description=f"Submit {assignment.type.lower()} by {assignment.deadline.strftime('%B %d, %Y at %I:%M %p')}",
            due_date=assignment.deadline,
            priority="HIGH",
            status="PENDING",
            source="ASSIGNMENT",
            source_id=str(assignment.id),
            auto_generated=True,
            course_code=assignment.course_code
        )
        await todo.insert()


async def create_assignment(
    assignment_data: Dict,
    teacher_id: str,
    teacher_name: str,
    term: str
) -> Assignment:
    """
    Create new assignment/quiz
    
    Args:
        assignment_data: Assignment data from request
        teacher_id: Teacher's username
        teacher_name: Teacher's full name
        term: Academic term
    
    Returns:
        Assignment object
    
    Raises:
        HTTPException: If validation fails
    """
    # Get course
    course = await Course.get(assignment_data["course_id"])
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Calculate max_marks based on number
    number = assignment_data["number"]
    max_marks = 3 if number in [1, 2] else 4
    
    # Validate max marks (in case client sent wrong value)
    validate_max_marks(assignment_data["type"], number, max_marks)
    
    # Check for duplicates
    await check_duplicate_assignment(
        course_id=assignment_data["course_id"],
        assignment_type=assignment_data["type"],
        number=number
    )
    
    # Validate deadline is not in past
    if assignment_data["deadline"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Deadline cannot be in the past"
        )
    
    # Create assignment
    assignment = Assignment(
        course_id=assignment_data["course_id"],
        course_code=course.course_code,
        teacher_id=teacher_id,
        teacher_name=teacher_name,
        type=assignment_data["type"],
        number=number,
        title=assignment_data["title"],
        description=assignment_data["description"],
        max_marks=max_marks,
        deadline=assignment_data["deadline"],
        attachment_urls=assignment_data.get("attachment_urls", []),
        status=assignment_data.get("status", "DRAFT"),
        term=term,
        created_by=teacher_id
    )
    
    await assignment.insert()
    
    # If published, create todos for students
    if assignment.status == "PUBLISHED":
        await create_assignment_todos(assignment)
    
    return assignment


async def update_assignment(
    assignment_id: str,
    update_data: Dict,
    teacher_id: str
) -> Assignment:
    """
    Update assignment
    
    Args:
        assignment_id: Assignment ID
        update_data: Fields to update
        teacher_id: Teacher's username (for authorization)
    
    Returns:
        Updated assignment
    
    Raises:
        HTTPException: If validation fails
    """
    # Get assignment
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check authorization
    if assignment.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this assignment")
    
    # Validate deadline if being updated
    if "deadline" in update_data and update_data["deadline"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Deadline cannot be in the past"
        )
    
    # Check if status is changing from DRAFT to PUBLISHED
    was_draft = assignment.status == "DRAFT"
    is_now_published = update_data.get("status") == "PUBLISHED"
    
    # Update fields
    update_dict = {k: v for k, v in update_data.items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await assignment.set(update_dict)
    
    # If just published, create todos
    if was_draft and is_now_published:
        await create_assignment_todos(assignment)
    
    # Refresh assignment
    await assignment.sync()
    
    return assignment


async def delete_assignment(assignment_id: str, teacher_id: str) -> Dict:
    """
    Delete assignment
    Cannot delete if submissions exist
    
    Args:
        assignment_id: Assignment ID
        teacher_id: Teacher's username (for authorization)
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If validation fails
    """
    # Get assignment
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check authorization
    if assignment.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this assignment")
    
    # Check if submissions exist
    submission_count = await Submission.find(
        Submission.assignment_id == assignment_id
    ).count()
    
    if submission_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete assignment with {submission_count} submissions"
        )
    
    # Delete associated todos
    todos = await Todo.find(
        Todo.source == "ASSIGNMENT",
        Todo.source_id == assignment_id
    ).to_list()
    
    for todo in todos:
        await todo.delete()
    
    # Delete assignment
    await assignment.delete()
    
    return {
        "message": "Assignment deleted successfully",
        "deleted_todos": len(todos)
    }


async def submit_assignment(
    assignment_id: str,
    student_id: str,
    student_username: str,
    submission_data: Dict
) -> Submission:
    """
    Submit assignment
    
    Args:
        assignment_id: Assignment ID
        student_id: Student's user ID
        student_username: Student's username
        submission_data: Submission data
    
    Returns:
        Submission object
    
    Raises:
        HTTPException: If validation fails
    """
    # Get assignment
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check if assignment is published
    if assignment.status != "PUBLISHED":
        raise HTTPException(status_code=400, detail="Assignment is not published yet")
    
    # Check if student is enrolled
    enrollment = await Enrollment.find_one(
        Enrollment.student_id == student_id,
        Enrollment.course_id == assignment.course_id,
        Enrollment.status == "ENROLLED"
    )
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Check if already submitted
    existing = await Submission.find_one(
        Submission.assignment_id == assignment_id,
        Submission.student_id == student_id
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Already submitted")
    
    # Validate at least one of file_url or text_answer is provided
    if not submission_data.get("file_url") and not submission_data.get("text_answer"):
        raise HTTPException(
            status_code=400,
            detail="Either file or text answer is required"
        )
    
    # Check if late
    now = datetime.now(timezone.utc)
    is_late = now > assignment.deadline
    
    # Create submission
    submission = Submission(
        assignment_id=assignment_id,
        student_id=student_id,
        student_username=student_username,
        course_id=assignment.course_id,
        file_url=submission_data.get("file_url"),
        text_answer=submission_data.get("text_answer"),
        comments=submission_data.get("comments"),
        submitted_at=now,
        is_late=is_late,
        status="SUBMITTED",
        max_marks=assignment.max_marks
    )
    
    await submission.insert()
    
    # Update assignment submission count
    await assignment.set({
        Assignment.submission_count: assignment.submission_count + 1
    })
    
    # Mark todo as complete
    todo = await Todo.find_one(
        Todo.user_id == student_id,
        Todo.source == "ASSIGNMENT",
        Todo.source_id == assignment_id
    )
    
    if todo:
        await todo.set({
            Todo.status: "COMPLETED",
            Todo.completed_at: now
        })
    
    return submission


async def grade_submission(
    submission_id: str,
    marks_obtained: float,
    feedback: Optional[str],
    teacher_username: str
) -> Submission:
    """
    Grade submission
    
    Args:
        submission_id: Submission ID
        marks_obtained: Marks obtained
        feedback: Feedback for student
        teacher_username: Teacher's username
    
    Returns:
        Graded submission
    
    Raises:
        HTTPException: If validation fails
    """
    # Get submission
    submission = await Submission.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Validate marks
    if marks_obtained < 0:
        raise HTTPException(status_code=400, detail="Marks cannot be negative")
    
    if marks_obtained > submission.max_marks:
        raise HTTPException(
            status_code=400,
            detail=f"Marks cannot exceed {submission.max_marks}"
        )
    
    # Get assignment to update graded count
    assignment = await Assignment.get(submission.assignment_id)
    
    # Check if this is first time grading (to update count)
    was_graded = submission.status == "GRADED"
    
    # Update submission
    await submission.set({
        Submission.marks_obtained: marks_obtained,
        Submission.feedback: feedback,
        Submission.status: "GRADED",
        Submission.graded_at: datetime.now(timezone.utc),
        Submission.graded_by: teacher_username,
        Submission.updated_at: datetime.now(timezone.utc)
    })
    
    # Update assignment graded count if first time grading
    if not was_graded and assignment:
        await assignment.set({
            Assignment.graded_count: assignment.graded_count + 1
        })
    
    # Refresh submission
    await submission.sync()
    
    return submission


async def bulk_grade_submissions(
    assignment_id: str,
    grades: List[Dict],
    teacher_username: str
) -> Dict:
    """
    Grade multiple submissions at once
    
    Args:
        assignment_id: Assignment ID
        grades: List of {submission_id, marks_obtained, feedback}
        teacher_username: Teacher's username
    
    Returns:
        Summary of grading operation
    
    Raises:
        HTTPException: If validation fails
    """
    graded_count = 0
    errors = []
    
    for grade_data in grades:
        try:
            await grade_submission(
                submission_id=grade_data["submission_id"],
                marks_obtained=grade_data["marks_obtained"],
                feedback=grade_data.get("feedback"),
                teacher_username=teacher_username
            )
            graded_count += 1
        except Exception as e:
            errors.append({
                "submission_id": grade_data["submission_id"],
                "error": str(e)
            })
    
    return {
        "message": f"Graded {graded_count} submissions successfully",
        "graded_count": graded_count,
        "error_count": len(errors),
        "errors": errors
    }


async def get_student_assignments(
    student_id: str,
    course_id: Optional[str] = None
) -> List[Dict]:
    """
    Get assignments for student with submission status
    
    Args:
        student_id: Student's user ID
        course_id: Optional course filter
    
    Returns:
        List of assignments with submission info
    """
    # Build query
    query = Assignment.find(Assignment.status == "PUBLISHED")
    
    if course_id:
        query = query.find(Assignment.course_id == course_id)
    
    assignments = await query.to_list()
    
    result = []
    for assignment in assignments:
        # Check if student is enrolled in course
        enrollment = await Enrollment.find_one(
            Enrollment.student_id == student_id,
            Enrollment.course_id == assignment.course_id,
            Enrollment.status == "ENROLLED"
        )
        
        if not enrollment:
            continue
        
        # Get student's submission if exists
        submission = await Submission.find_one(
            Submission.assignment_id == str(assignment.id),
            Submission.student_id == student_id
        )
        
        # Calculate days left
        now = datetime.now(timezone.utc)
        days_left = (assignment.deadline - now).days
        is_overdue = now > assignment.deadline
        
        assignment_dict = {
            "id": str(assignment.id),
            "course_code": assignment.course_code,
            "type": assignment.type,
            "number": assignment.number,
            "title": assignment.title,
            "description": assignment.description,
            "max_marks": assignment.max_marks,
            "deadline": assignment.deadline,
            "attachment_urls": assignment.attachment_urls,
            "days_left": days_left,
            "is_overdue": is_overdue,
            "my_submission": None
        }
        
        if submission:
            assignment_dict["my_submission"] = {
                "id": str(submission.id),
                "submitted_at": submission.submitted_at,
                "status": submission.status,
                "marks_obtained": submission.marks_obtained,
                "feedback": submission.feedback,
                "is_late": submission.is_late
            }
        
        result.append(assignment_dict)
    
    return result
