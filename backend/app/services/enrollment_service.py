"""Enrollment Service - handles course registration logic"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.enrollment import Enrollment, RegistrationWindow
from app.models.course import Course
from app.models.user import User


async def check_registration_window_open(term: str) -> RegistrationWindow:
    """Check if registration window is open, raises HTTPException if closed"""
    # For 'ALL' term, find any open window
    if term == "ALL":
        window = await RegistrationWindow.find_one(RegistrationWindow.status == "OPEN")
    else:
        window = await RegistrationWindow.find_one(
            RegistrationWindow.term == term,
            RegistrationWindow.status == "OPEN"
        )
    
    if not window:
        raise HTTPException(
            status_code=403,
            detail=f"Registration is closed for term {term}"
        )
    
    # Check if current time is within window
    now = datetime.now(timezone.utc)
    # Ensure all datetimes are timezone-aware for comparison
    start_date = window.start_date if window.start_date.tzinfo else window.start_date.replace(tzinfo=timezone.utc)
    end_date = window.end_date if window.end_date.tzinfo else window.end_date.replace(tzinfo=timezone.utc)
    
    if now < start_date or now > end_date:
        raise HTTPException(
            status_code=403,
            detail="Current time is outside registration window"
        )
    
    return window


async def check_prerequisites(student_id: str, course: Course) -> Dict:
    """Check if student meets course prerequisites"""
    if not course.prerequisites or len(course.prerequisites) == 0:
        return {
            "is_eligible": True,
            "missing_prerequisites": []
        }
    
    # Get student's completed enrollments
    completed_enrollments = await Enrollment.find(
        Enrollment.student_id == student_id,
        Enrollment.status == "COMPLETED"
    ).to_list()
    
    completed_course_codes = [e.course_code for e in completed_enrollments]
    
    # Check each prerequisite
    missing = []
    for prereq in course.prerequisites:
        if prereq not in completed_course_codes:
            missing.append(prereq)
    
    return {
        "is_eligible": len(missing) == 0,
        "missing_prerequisites": missing
    }


async def check_seat_availability(course: Course) -> bool:
    """Check if course has available seats"""
    return course.enrolled_count < course.max_students


async def check_already_enrolled(student_id: str, course_id: str, term: str) -> bool:
    """Check if student is already enrolled in course for this term"""
    existing = await Enrollment.find_one(
        Enrollment.student_id == student_id,
        Enrollment.course_id == course_id,
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    )
    return existing is not None


async def register_student(
    student_id: str,
    student_username: str,
    course_id: str,
    term: str,
    is_forced: bool = False,
    force_reason: Optional[str] = None,
    forced_by: Optional[str] = None
) -> Enrollment:
    """
    Register student for a course
    
    Args:
        student_id: Student's user ID
        student_username: Student's username
        course_id: Course ID to enroll in
        term: Academic term
        is_forced: Whether this is admin forced enrollment
        force_reason: Reason for forced enrollment
        forced_by: Admin who forced enrollment
    
    Returns:
        Enrollment object
    
    Raises:
        HTTPException: If validation fails
    """
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # If not forced, check all validations
    if not is_forced:
        # Check registration window
        await check_registration_window_open(term)
        
        # Check if already enrolled
        if await check_already_enrolled(student_id, course_id, term):
            raise HTTPException(
                status_code=400,
                detail=f"Already enrolled in {course.course_code}"
            )
        
        # Check prerequisites
        prereq_check = await check_prerequisites(student_id, course)
        if not prereq_check["is_eligible"]:
            missing = ", ".join(prereq_check["missing_prerequisites"])
            raise HTTPException(
                status_code=400,
                detail=f"Prerequisites not met. Missing: {missing}"
            )
        
        # Check seat availability
        if not check_seat_availability(course):
            raise HTTPException(
                status_code=400,
                detail=f"Course {course.course_code} is full"
            )
    
    # Create enrollment
    enrollment = Enrollment(
        student_id=student_id,
        student_username=student_username,
        course_id=course_id,
        course_code=course.course_code,
        term=term,
        status="ENROLLED",
        enrolled_at=datetime.now(timezone.utc),
        is_forced=is_forced,
        force_reason=force_reason,
        forced_by=forced_by
    )
    
    await enrollment.insert()
    
    # Increment course enrolled_count atomically
    await course.set({Course.enrolled_count: course.enrolled_count + 1})
    
    return enrollment


async def drop_course(enrollment_id: str, student_id: str, term: str) -> Dict:
    """
    Drop a course enrollment
    
    Args:
        enrollment_id: Enrollment ID to drop
        student_id: Student's user ID (for verification)
        term: Academic term
    
    Returns:
        Dict with success message
    
    Raises:
        HTTPException: If validation fails
    """
    # Check registration window is open
    await check_registration_window_open(term)
    
    # Get enrollment
    enrollment = await Enrollment.get(enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Verify enrollment belongs to student
    if enrollment.student_id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already dropped
    if enrollment.status == "DROPPED":
        raise HTTPException(status_code=400, detail="Already dropped")
    
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
        "message": "Course dropped successfully",
        "course_code": enrollment.course_code,
        "seat_freed": True
    }


async def get_available_courses(student_id: str, student: User, term: str) -> List[Dict]:
    """
    Get list of courses available for student registration
    Includes eligibility status for each course
    
    Args:
        student_id: Student's user ID
        student: Student user object
        term: Academic term
    
    Returns:
        List of courses with eligibility information
    """
    # Get courses for student's semester
    courses = await Course.find(
        Course.semester == student.current_semester,
        Course.term == term,
        Course.is_active == True
    ).to_list()
    
    # Get student's current enrollments for this term
    enrollments = await Enrollment.find(
        Enrollment.student_id == student_id,
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    enrolled_course_ids = [e.course_id for e in enrollments]
    
    # Build response with eligibility info
    result = []
    for course in courses:
        # Check prerequisites
        prereq_check = await check_prerequisites(student_id, course)
        
        # Check if already enrolled
        is_enrolled = str(course.id) in enrolled_course_ids
        
        # Calculate seats available
        seats_available = course.max_students - course.enrolled_count
        
        result.append({
            "id": str(course.id),
            "course_code": course.course_code,
            "course_name": course.course_name,
            "credit_hours": course.credit_hours,
            "teacher_name": course.teacher_name or "TBA",
            "seats_available": seats_available,
            "max_students": course.max_students,
            "is_eligible": prereq_check["is_eligible"] and not is_enrolled,
            "prerequisites_met": prereq_check["is_eligible"],
            "missing_prerequisites": prereq_check["missing_prerequisites"],
            "is_enrolled": is_enrolled,
            "category": course.category,
            "course_type": course.course_type
        })
    
    return result


async def get_course_enrollments(course_id: str) -> List[Dict]:
    """
    Get list of students enrolled in a course
    
    Args:
        course_id: Course ID
    
    Returns:
        List of enrolled students with details
    """
    enrollments = await Enrollment.find(
        Enrollment.course_id == course_id,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    result = []
    for enrollment in enrollments:
        # Get student details
        student = await User.find_one(User.username == enrollment.student_username)
        if student:
            result.append({
                "enrollment_id": str(enrollment.id),
                "student_id": enrollment.student_id,
                "registration_no": enrollment.student_username,
                "student_name": f"{student.first_name} {student.last_name}",
                "email": student.email,
                "enrolled_at": enrollment.enrolled_at,
                "is_forced": enrollment.is_forced
            })
    
    return result
