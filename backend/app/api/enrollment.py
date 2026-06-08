from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from app.models.enrollment import (
    Enrollment, RegistrationWindow,
    RegistrationWindowCreate, RegistrationWindowResponse,
    EnrollmentCreate, EnrollmentResponse,
    ForceEnrollmentCreate, RemoveEnrollmentRequest
)
from app.models.user import User
from app.models.course import Course
from app.api.deps import get_current_user
from app.services import enrollment_service

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
# REGISTRATION WINDOW MANAGEMENT (ADMIN ONLY)
# ═══════════════════════════════════════════════════════════════════

@router.post("/registration/open", status_code=status.HTTP_201_CREATED)
async def open_registration(
    window_data: RegistrationWindowCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Open registration window (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can open registration")
    
    # Validate dates
    if window_data.end_date <= window_data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Check duration is at least 1 day
    duration = (window_data.end_date - window_data.start_date).days
    if duration < 1:
        raise HTTPException(
            status_code=400,
            detail=f"Registration window must be at least 1 day. Got {duration} days."
        )
    
    # Check if registration window already exists for this term
    existing = await RegistrationWindow.find_one(RegistrationWindow.term == window_data.term)
    if existing:
        if existing.status == "OPEN":
            raise HTTPException(
                status_code=400,
                detail=f"An open registration window already exists for term {window_data.term}. Close it first."
            )
        # Update existing closed window instead of creating new one
        await existing.set({
            RegistrationWindow.semester: window_data.semester,
            RegistrationWindow.start_date: window_data.start_date,
            RegistrationWindow.end_date: window_data.end_date,
            RegistrationWindow.status: "OPEN",
            RegistrationWindow.created_by: current_user,
            RegistrationWindow.created_at: datetime.now(timezone.utc),
            RegistrationWindow.closed_at: None,
            RegistrationWindow.closed_by: None
        })
        window = existing
    else:
        # Create new registration window
        window = RegistrationWindow(
            semester=window_data.semester,
            term=window_data.term,
            start_date=window_data.start_date,
            end_date=window_data.end_date,
            status="OPEN",
            created_by=current_user,
            created_at=datetime.now(timezone.utc)
        )
        await window.insert()
    
    return {
        "id": str(window.id),
        "semester": window.semester,
        "term": window.term,
        "start_date": window.start_date,
        "end_date": window.end_date,
        "status": window.status,
        "created_by": window.created_by,
        "created_at": window.created_at
    }

@router.post("/registration/close")
async def close_registration(
    term: str,
    current_user: str = Depends(get_current_user)
):
    """
    Close registration window (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can close registration")
    
    # Find registration window
    window = await RegistrationWindow.find_one(
        RegistrationWindow.term == term,
        RegistrationWindow.status == "OPEN"
    )
    
    if not window:
        raise HTTPException(status_code=404, detail=f"No open registration window found for term {term}")
    
    # Close window
    await window.set({
        RegistrationWindow.status: "CLOSED",
        RegistrationWindow.closed_at: datetime.now(timezone.utc),
        RegistrationWindow.closed_by: current_user
    })
    
    return {
        "message": f"Registration closed for {term}",
        "term": term,
        "closed_at": datetime.now(timezone.utc)
    }

@router.get("/registration/status")
async def get_registration_status(
    term: str = Query(..., description="Academic term (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Get registration window status for a term
    Available to all authenticated users
    """
    window = await RegistrationWindow.find_one(RegistrationWindow.term == term)
    
    if not window:
        return {
            "term": term,
            "status": "CLOSED",
            "message": "No registration window exists for this term"
        }
    
    # Calculate days remaining
    now = datetime.now(timezone.utc)
    # Ensure both datetimes are timezone-aware for comparison
    end_date = window.end_date if window.end_date.tzinfo else window.end_date.replace(tzinfo=timezone.utc)
    days_remaining = (end_date - now).days if window.status == "OPEN" else 0
    
    return {
        "term": term,
        "status": window.status,
        "start_date": window.start_date,
        "end_date": window.end_date,
        "days_remaining": max(0, days_remaining)
    }

# ═══════════════════════════════════════════════════════════════════
# STUDENT ENROLLMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/available-courses")
async def get_available_courses(
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Get courses available for student registration
    Shows eligibility status for each course
    """
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view available courses")

    # Resolve 'ALL' term to the student's batch term or any active courses
    effective_term = term
    if term == "ALL":
        # Use student's batch if set, otherwise find any term with active courses
        if student.batch:
            effective_term = student.batch
        else:
            # Pick first available course term
            any_course = await Course.find(Course.is_active == True).first_or_none()
            effective_term = any_course.term if any_course else term

    window = await RegistrationWindow.find_one(RegistrationWindow.term == term)
    registration_status = window.status if window else "CLOSED"

    courses = await enrollment_service.get_available_courses(
        student_id=str(student.id),
        student=student,
        term=effective_term
    )

    enrollments = await Enrollment.find(
        Enrollment.student_id == str(student.id),
        Enrollment.term == effective_term,
        Enrollment.status == "ENROLLED"
    ).to_list()

    total_credits = 0
    for enrollment in enrollments:
        course = await Course.get(enrollment.course_id)
        if course:
            total_credits += course.credit_hours

    return {
        "courses": courses,
        "registration_status": registration_status,
        "total_credits_enrolled": total_credits
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_for_course(
    enrollment_data: EnrollmentCreate,
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Register student for a course
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can register for courses")
    
    # Register student
    enrollment = await enrollment_service.register_student(
        student_id=str(student.id),
        student_username=student.username,
        course_id=enrollment_data.course_id,
        term=term
    )
    
    # Get course details for response
    course = await Course.get(enrollment_data.course_id)
    
    return {
        "id": str(enrollment.id),
        "student_id": enrollment.student_id,
        "student_username": enrollment.student_username,
        "course_id": enrollment.course_id,
        "course_code": enrollment.course_code,
        "course_name": course.course_name if course else None,
        "credit_hours": course.credit_hours if course else None,
        "term": enrollment.term,
        "enrolled_at": enrollment.enrolled_at,
        "status": enrollment.status
    }

@router.delete("/{enrollment_id}")
async def drop_course(
    enrollment_id: str,
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Drop a course enrollment
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can drop courses")
    
    # Drop course
    result = await enrollment_service.drop_course(
        enrollment_id=enrollment_id,
        student_id=str(student.id),
        term=term
    )
    
    return result

@router.get("/my-enrollments")
async def get_my_enrollments(
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Get student's current enrollments
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view enrollments")
    
    # Get enrollments — if term is 'ALL', fetch all enrollments for this student
    if term == "ALL":
        enrollments = await Enrollment.find(
            Enrollment.student_id == str(student.id),
            Enrollment.status == "ENROLLED"
        ).to_list()
    else:
        enrollments = await Enrollment.find(
            Enrollment.student_id == str(student.id),
            Enrollment.term == term,
            Enrollment.status == "ENROLLED"
        ).to_list()
    
    # Check if registration window is open (for can_drop flag)
    window = await RegistrationWindow.find_one(
        RegistrationWindow.term == term,
        RegistrationWindow.status == "OPEN"
    )
    can_drop = window is not None
    
    # Build response with course details
    result = []
    total_credits = 0
    
    for enrollment in enrollments:
        course = await Course.get(enrollment.course_id)
        if course:
            total_credits += course.credit_hours
            result.append({
                "id": str(enrollment.id),
                "course_code": course.course_code,
                "course_name": course.course_name,
                "credit_hours": course.credit_hours,
                "teacher_name": course.teacher_name or "TBA",
                "enrolled_at": enrollment.enrolled_at,
                "can_drop": can_drop
            })
    
    return {
        "enrollments": result,
        "total_credits": total_credits,
        "term": term
    }

# ═══════════════════════════════════════════════════════════════════
# TEACHER/ADMIN VIEWS
# ═══════════════════════════════════════════════════════════════════

@router.get("/course/{course_id}/students")
async def get_course_enrollments(
    course_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get list of students enrolled in a course
    Available to teachers (own courses) and admins (all courses)
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check permissions
    if user.role == "TEACHER":
        # Teacher can only view their own courses
        if course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized to view this course")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only teachers and admins can view enrollments")
    
    # Get enrollments
    students = await enrollment_service.get_course_enrollments(course_id)
    
    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
        "term": course.term,
        "enrolled_count": len(students),
        "max_students": course.max_students,
        "students": students
    }

# ═══════════════════════════════════════════════════════════════════
# ADMIN FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/admin/force-enroll", status_code=status.HTTP_201_CREATED)
async def force_enroll_student(
    force_data: ForceEnrollmentCreate,
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Force enroll a student (bypasses all checks)
    ADMIN ONLY
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can force enroll")
    
    # Get student
    student = await User.get(force_data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Force enroll
    enrollment = await enrollment_service.register_student(
        student_id=force_data.student_id,
        student_username=student.username,
        course_id=force_data.course_id,
        term=term,
        is_forced=True,
        force_reason=force_data.reason,
        forced_by=current_user
    )
    
    return {
        "message": "Student enrolled successfully",
        "enrollment_id": str(enrollment.id),
        "bypassed_checks": ["prerequisites", "seat_limit", "registration_window"]
    }

@router.delete("/admin/remove")
async def remove_student_enrollment(
    remove_data: RemoveEnrollmentRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Remove student from course (admin override)
    ADMIN ONLY
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can remove enrollments")
    
    # Get enrollment
    enrollment = await Enrollment.get(remove_data.enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Update enrollment status
    await enrollment.set({
        Enrollment.status: "DROPPED",
        Enrollment.dropped_at: datetime.now(timezone.utc),
        Enrollment.updated_at: datetime.now(timezone.utc)
    })
    
    # Decrement course enrolled_count
    course = await Course.get(enrollment.course_id)
    if course:
        await course.set({Course.enrolled_count: max(0, course.enrolled_count - 1)})
    
    return {
        "message": "Student removed from course",
        "reason": remove_data.reason,
        "seat_freed": True
    }
