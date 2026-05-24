from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, date
from typing import Optional, List
from app.models.attendance import (
    AttendanceSession, AttendanceRecord,
    AttendanceSessionCreate, AttendanceMarkBulkRequest, AttendanceMarkAllRequest,
    AttendanceLockRequest, AttendanceUnlockRequest
)
from app.models.user import User
from app.models.course import Course
from app.api.deps import get_current_user
from app.services import attendance_service

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
# SESSION MANAGEMENT (TEACHER)
# ═══════════════════════════════════════════════════════════════════

@router.post("/session", status_code=status.HTTP_201_CREATED)
async def create_attendance_session(
    session_data: AttendanceSessionCreate,
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Create attendance session (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can create sessions")
    
    # Get course
    course = await Course.get(session_data.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # If teacher, verify they own the course
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")
    
    # Create session
    result = await attendance_service.create_session(
        course_id=session_data.course_id,
        session_date=session_data.session_date,
        periods=session_data.periods,
        session_type=session_data.session_type,
        teacher_id=str(user.id),
        teacher_username=user.username,
        term=term
    )
    
    return result

@router.get("/course/{course_id}/sessions")
async def get_course_sessions(
    course_id: str,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: str = Depends(get_current_user)
):
    """
    Get all attendance sessions for a course
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check permissions
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")
    elif user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view sessions")
    
    # Build query
    query = {"course_id": course_id}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    # Get sessions
    sessions = await AttendanceSession.find(query).sort([("date", -1)]).to_list()
    
    # Build response with counts
    result = []
    for session in sessions:
        # Count present/absent
        records = await AttendanceRecord.find(
            AttendanceRecord.session_id == str(session.id)
        ).to_list()
        
        present_count = sum(1 for r in records if r.status == "PRESENT")
        absent_count = len(records) - present_count
        
        result.append({
            "id": str(session.id),
            "date": session.date,
            "periods": session.periods,
            "session_type": session.session_type,
            "present_count": present_count,
            "absent_count": absent_count,
            "total_students": len(records),
            "is_locked": session.is_locked
        })
    
    return {
        "course_code": course.course_code,
        "total_sessions": len(result),
        "sessions": result
    }

@router.get("/session/{session_id}")
async def get_session_details(
    session_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get attendance session details with student list
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get session
    session = await AttendanceSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get course
    course = await Course.get(session.course_id)
    
    # Check permissions
    if user.role == "TEACHER" and session.teacher_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    elif user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view session details")
    
    # Get attendance records
    records = await AttendanceRecord.find(
        AttendanceRecord.session_id == session_id
    ).to_list()
    
    # Build student list with details
    students = []
    for record in records:
        student = await User.find_one(User.username == record.student_username)
        if student:
            students.append({
                "student_id": record.student_id,
                "registration_no": record.student_username,
                "student_name": f"{student.first_name} {student.last_name}",
                "status": record.status
            })
    
    return {
        "id": str(session.id),
        "course_code": session.course_code,
        "course_name": course.course_name if course else None,
        "date": session.date,
        "periods": session.periods,
        "session_type": session.session_type,
        "is_locked": session.is_locked,
        "students": students
    }

# ═══════════════════════════════════════════════════════════════════
# MARKING ATTENDANCE (TEACHER)
# ═══════════════════════════════════════════════════════════════════

@router.post("/session/{session_id}/mark")
async def mark_attendance(
    session_id: str,
    attendance_data: AttendanceMarkBulkRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Mark attendance for a session
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can mark attendance")
    
    # Get session
    session = await AttendanceSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if user.role == "TEACHER" and session.teacher_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    
    # Mark attendance
    result = await attendance_service.mark_attendance(
        session_id=session_id,
        attendance_data=[{"student_id": a.student_id, "status": a.status} for a in attendance_data.attendance],
        teacher_username=user.username
    )
    
    return result

@router.post("/session/{session_id}/mark-all")
async def mark_all_attendance(
    session_id: str,
    mark_data: AttendanceMarkAllRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Mark all students with same status (bulk operation)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can mark attendance")
    
    # Get session
    session = await AttendanceSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if user.role == "TEACHER" and session.teacher_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    
    # Mark all
    result = await attendance_service.mark_all_attendance(
        session_id=session_id,
        status=mark_data.status,
        teacher_username=user.username
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════════

@router.get("/my-attendance")
async def get_my_attendance(
    course_id: str = Query(..., description="Course ID"),
    current_user: str = Depends(get_current_user)
):
    """
    Get student's own attendance for a course
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their attendance")
    
    # Get attendance details
    result = await attendance_service.get_student_attendance_details(
        student_id=str(student.id),
        course_id=course_id
    )
    
    return result

@router.get("/my-attendance/summary")
async def get_my_attendance_summary(
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """
    Get student's attendance summary for all courses
    """
    # Get student
    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their attendance")
    
    # Get student's enrollments
    from app.models.enrollment import Enrollment
    enrollments = await Enrollment.find(
        Enrollment.student_id == str(student.id),
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Calculate attendance for each course
    courses = []
    total_percentage = 0.0
    
    for enrollment in enrollments:
        course = await Course.get(enrollment.course_id)
        if course:
            attendance_stats = await attendance_service.calculate_attendance_percentage(
                student_id=str(student.id),
                course_id=enrollment.course_id
            )
            
            courses.append({
                "course_code": course.course_code,
                "course_name": course.course_name,
                "attendance_percentage": attendance_stats["attendance_percentage"],
                "meets_requirement": attendance_stats["meets_requirement"],
                "present": attendance_stats["present_count"],
                "absent": attendance_stats["absent_count"],
                "total": attendance_stats["total_sessions"],
                "sessions_needed": attendance_stats["sessions_needed"]
            })
            
            if attendance_stats["total_sessions"] > 0:
                total_percentage += attendance_stats["attendance_percentage"]
    
    overall_percentage = (total_percentage / len(courses)) if courses else 0.0
    
    return {
        "term": term,
        "courses": courses,
        "overall_percentage": round(overall_percentage, 2)
    }

# ═══════════════════════════════════════════════════════════════════
# REPORTS & ANALYTICS (TEACHER/ADMIN)
# ═══════════════════════════════════════════════════════════════════

@router.get("/course/{course_id}/report")
async def get_course_attendance_report(
    course_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get attendance report for entire course
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check permissions
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")
    elif user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view reports")
    
    # Get report
    report = await attendance_service.get_course_attendance_report(course_id)
    
    return report

# ═══════════════════════════════════════════════════════════════════
# ADMIN FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/admin/lock")
async def lock_attendance(
    lock_data: AttendanceLockRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Lock attendance for a course (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can lock attendance")
    
    # Lock attendance
    result = await attendance_service.lock_course_attendance(
        course_id=lock_data.course_id,
        term=lock_data.term,
        admin_username=user.username
    )
    
    return result

@router.post("/admin/unlock")
async def unlock_attendance(
    unlock_data: AttendanceUnlockRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Unlock attendance for a course (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can unlock attendance")
    
    # Unlock attendance
    result = await attendance_service.unlock_course_attendance(
        course_id=unlock_data.course_id,
        reason=unlock_data.reason,
        admin_username=user.username
    )
    
    return result
