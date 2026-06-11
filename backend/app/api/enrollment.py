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
<<<<<<< HEAD
from app.api.permissions import require_course_management_edit, COURSE_MANAGEMENT_ADMIN
from app.services import enrollment_service
from app.utils.academic_term import resolve_term, get_current_academic_term
=======
from app.services import enrollment_service
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

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
<<<<<<< HEAD
    require_course_management_edit(user)
=======
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can open registration")
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    # Validate dates
    if window_data.end_date <= window_data.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
<<<<<<< HEAD
    # Resolve term to full academic term
    resolved_term = resolve_term(window_data.term)
    
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    # Check duration is at least 1 day
    duration = (window_data.end_date - window_data.start_date).days
    if duration < 1:
        raise HTTPException(
            status_code=400,
            detail=f"Registration window must be at least 1 day. Got {duration} days."
        )
    
    # Check if registration window already exists for this term
<<<<<<< HEAD
    existing = await RegistrationWindow.find_one(RegistrationWindow.term == resolved_term)
=======
    existing = await RegistrationWindow.find_one(RegistrationWindow.term == window_data.term)
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    if existing:
        if existing.status == "OPEN":
            raise HTTPException(
                status_code=400,
<<<<<<< HEAD
                detail=f"An open registration window already exists for term {resolved_term}. Close it first."
=======
                detail=f"An open registration window already exists for term {window_data.term}. Close it first."
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
        await existing.save()
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        window = existing
    else:
        # Create new registration window
        window = RegistrationWindow(
            semester=window_data.semester,
<<<<<<< HEAD
            term=resolved_term,
=======
            term=window_data.term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    require_course_management_edit(user)
    
    # Resolve term
    resolved_term = resolve_term(term)
    
    # Find registration window
    window = await RegistrationWindow.find_one(
        RegistrationWindow.term == resolved_term,
=======
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can close registration")
    
    # Find registration window
    window = await RegistrationWindow.find_one(
        RegistrationWindow.term == term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        RegistrationWindow.status == "OPEN"
    )
    
    if not window:
<<<<<<< HEAD
        raise HTTPException(status_code=404, detail=f"No open registration window found for term {resolved_term}")
=======
        raise HTTPException(status_code=404, detail=f"No open registration window found for term {term}")
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    # Close window
    await window.set({
        RegistrationWindow.status: "CLOSED",
        RegistrationWindow.closed_at: datetime.now(timezone.utc),
        RegistrationWindow.closed_by: current_user
    })
<<<<<<< HEAD
    await window.save()
    
    return {
        "message": f"Registration closed for {resolved_term}",
        "term": resolved_term,
=======
    
    return {
        "message": f"Registration closed for {term}",
        "term": term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        "closed_at": datetime.now(timezone.utc)
    }

@router.get("/registration/status")
async def get_registration_status(
<<<<<<< HEAD
    term: str = Query(..., description="Academic term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Academic term (e.g., 2024F)"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Get registration window status for a term
    Available to all authenticated users
    """
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term)
    
    # If term is 'ALL', find any open registration window
    if resolved_term == "ALL":
        window = await RegistrationWindow.find_one(RegistrationWindow.status == "OPEN")
        if not window:
            # If no open window, return the most recent one
            window = await RegistrationWindow.find_all().sort([("created_at", -1)]).first_or_none()
    else:
        window = await RegistrationWindow.find_one(RegistrationWindow.term == resolved_term)
    
    if not window:
        return {
            "term": resolved_term,
=======
    window = await RegistrationWindow.find_one(RegistrationWindow.term == term)
    
    if not window:
        return {
            "term": term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
            "status": "CLOSED",
            "message": "No registration window exists for this term"
        }
    
    # Calculate days remaining
    now = datetime.now(timezone.utc)
    # Ensure both datetimes are timezone-aware for comparison
    end_date = window.end_date if window.end_date.tzinfo else window.end_date.replace(tzinfo=timezone.utc)
    days_remaining = (end_date - now).days if window.status == "OPEN" else 0
    
    return {
<<<<<<< HEAD
        "term": window.term,  # Return the actual term from the window, not the requested term
=======
        "term": term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Academic term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Academic term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Get courses available for student registration
    Shows eligibility status for each course
    """
<<<<<<< HEAD
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view available courses")

    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()
    
    # If term is 'ALL', find any open registration window
    effective_term = resolved_term
    if resolved_term == "ALL":
        # Find any open registration window
        open_window = await RegistrationWindow.find_one(RegistrationWindow.status == "OPEN")
        if open_window:
            effective_term = open_window.term
        elif student.batch:
            effective_term = student.batch
        else:
            # Pick first available active course term
            any_course = await Course.find(Course.is_active == True).first_or_none()
            effective_term = any_course.term if any_course else resolved_term

    # Check registration window for the effective term
    window = await RegistrationWindow.find_one(RegistrationWindow.term == effective_term)
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

=======
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view available courses")
    
    # Get registration status
    window = await RegistrationWindow.find_one(RegistrationWindow.term == term)
    registration_status = window.status if window else "CLOSED"
    
    # Get available courses with eligibility
    courses = await enrollment_service.get_available_courses(
        student_id=str(student.id),
        student=student,
        term=term
    )
    
    # Calculate total enrolled credits
    enrollments = await Enrollment.find(
        Enrollment.student_id == str(student.id),
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    total_credits = 0
    for enrollment in enrollments:
        course = await Course.get(enrollment.course_id)
        if course:
            total_credits += course.credit_hours
<<<<<<< HEAD

=======
    
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    return {
        "courses": courses,
        "registration_status": registration_status,
        "total_credits_enrolled": total_credits
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_for_course(
    enrollment_data: EnrollmentCreate,
<<<<<<< HEAD
    term: str = Query(..., description="Academic term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Academic term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Register student for a course
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can register for courses")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term)
    
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    # Register student
    enrollment = await enrollment_service.register_student(
        student_id=str(student.id),
        student_username=student.username,
        course_id=enrollment_data.course_id,
<<<<<<< HEAD
        term=resolved_term
=======
        term=term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    term: str = Query(..., description="Academic term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Academic term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Drop a course enrollment
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can drop courses")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term)
    
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    # Drop course
    result = await enrollment_service.drop_course(
        enrollment_id=enrollment_id,
        student_id=str(student.id),
<<<<<<< HEAD
        term=resolved_term
=======
        term=term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    )
    
    return result

@router.get("/my-enrollments")
async def get_my_enrollments(
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Academic term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Academic term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Get student's current enrollments
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view enrollments")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()
    
    # Get enrollments — if term is 'ALL', fetch all enrollments for this student
    if resolved_term == "ALL":
        enrollments = await Enrollment.find(
            Enrollment.student_id == str(student.id),
            Enrollment.status == "ENROLLED"
        ).to_list()
    else:
        enrollments = await Enrollment.find(
            Enrollment.student_id == str(student.id),
            Enrollment.term == resolved_term,
            Enrollment.status == "ENROLLED"
        ).to_list()
    
    # Check if registration window is open (for can_drop flag)
    window = await RegistrationWindow.find_one(
        RegistrationWindow.term == resolved_term,
=======
    # Get enrollments
    enrollments = await Enrollment.find(
        Enrollment.student_id == str(student.id),
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Check if registration window is open (for can_drop flag)
    window = await RegistrationWindow.find_one(
        RegistrationWindow.term == term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
        "term": resolved_term
=======
        "term": term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    elif user.role == "ADMIN":
        if user.admin_level != COURSE_MANAGEMENT_ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to view enrollments")
    else:
=======
    elif user.role != "ADMIN":
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    term: str = Query(..., description="Academic term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Academic term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Force enroll a student (bypasses all checks)
    ADMIN ONLY
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
<<<<<<< HEAD
    require_course_management_edit(user)
    
    # Resolve term
    resolved_term = resolve_term(term)
=======
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can force enroll")
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    # Get student
    student = await User.get(force_data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Force enroll
    enrollment = await enrollment_service.register_student(
        student_id=force_data.student_id,
        student_username=student.username,
        course_id=force_data.course_id,
<<<<<<< HEAD
        term=resolved_term,
=======
        term=term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    require_course_management_edit(user)
=======
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can remove enrollments")
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
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
<<<<<<< HEAD
    await enrollment.save()
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    # Decrement course enrolled_count
    course = await Course.get(enrollment.course_id)
    if course:
        await course.set({Course.enrolled_count: max(0, course.enrolled_count - 1)})
<<<<<<< HEAD
        await course.save()
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    return {
        "message": "Student removed from course",
        "reason": remove_data.reason,
        "seat_freed": True
    }
