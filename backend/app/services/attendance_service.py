"""
Attendance Service
Handles business logic for attendance management
"""

from datetime import datetime, timezone, date
from typing import List, Dict, Optional
from fastapi import HTTPException
import math
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User


async def validate_session_date(session_date: date):
    """
    Validate session date is not in future
    """
    today = date.today()
    if session_date > today:
        raise HTTPException(
            status_code=400,
            detail="Cannot create attendance session for future date"
        )


async def validate_periods(periods: List[int], session_type: str):
    """
    Validate period numbers and session type
    """
    # Check all periods are 1-9
    for period in periods:
        if period < 1 or period > 9:
            raise HTTPException(
                status_code=400,
                detail=f"Period must be between 1 and 9. Got: {period}"
            )
    
    # Check lab sessions have 3 consecutive periods
    if session_type == "LAB":
        if len(periods) != 3:
            raise HTTPException(
                status_code=400,
                detail="Lab sessions must have exactly 3 periods"
            )
        # Check consecutive
        sorted_periods = sorted(periods)
        if sorted_periods[1] != sorted_periods[0] + 1 or sorted_periods[2] != sorted_periods[1] + 1:
            raise HTTPException(
                status_code=400,
                detail="Lab periods must be consecutive"
            )
    
    # Check theory sessions have 1 period
    elif session_type in ["LECTURE", "TUTORIAL"]:
        if len(periods) != 1:
            raise HTTPException(
                status_code=400,
                detail=f"{session_type} sessions must have exactly 1 period"
            )


async def check_duplicate_session(course_id: str, session_date: date, periods: List[int]):
    """
    Check if session already exists for same course, date, and periods
    """
    existing = await AttendanceSession.find_one(
        AttendanceSession.course_id == course_id,
        AttendanceSession.date == session_date,
        AttendanceSession.periods == periods
    )
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance session already exists for {session_date} period(s) {periods}"
        )


async def create_session(
    course_id: str,
    session_date: date,
    periods: List[int],
    session_type: str,
    teacher_id: str,
    teacher_username: str,
    term: str
) -> Dict:
    """
    Create attendance session with default ABSENT records for all enrolled students
    """
    # Validate date
    await validate_session_date(session_date)
    
    # Validate periods
    await validate_periods(periods, session_type)
    
    # Check duplicate
    await check_duplicate_session(course_id, session_date, periods)
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Create session
    session = AttendanceSession(
        course_id=course_id,
        course_code=course.course_code,
        teacher_id=teacher_id,
        date=session_date,
        periods=periods,
        session_type=session_type,
        term=term,
        is_locked=False,
        created_by=teacher_username
    )
    
    await session.insert()
    
    # Get enrolled students
    enrollments = await Enrollment.find(
        Enrollment.course_id == course_id,
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Create attendance records (all ABSENT by default)
    students = []
    for enrollment in enrollments:
        # Get student details
        student = await User.find_one(User.username == enrollment.student_username)
        if student:
            record = AttendanceRecord(
                session_id=str(session.id),
                student_id=enrollment.student_id,
                student_username=enrollment.student_username,
                course_id=course_id,
                date=session_date,
                periods=periods,
                status="ABSENT",
                marked_by=teacher_username
            )
            await record.insert()
            
            students.append({
                "student_id": enrollment.student_id,
                "registration_no": enrollment.student_username,
                "student_name": f"{student.first_name} {student.last_name}",
                "status": "ABSENT"
            })
    
    return {
        "id": str(session.id),
        "course_id": course_id,
        "course_code": course.course_code,
        "date": session_date,
        "periods": periods,
        "session_type": session_type,
        "teacher_id": teacher_id,
        "is_locked": False,
        "created_at": session.created_at,
        "students": students
    }


async def mark_attendance(
    session_id: str,
    attendance_data: List[Dict],
    teacher_username: str
) -> Dict:
    """
    Mark attendance for a session
    """
    # Get session
    session = await AttendanceSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if locked
    if session.is_locked:
        raise HTTPException(
            status_code=403,
            detail="Cannot edit attendance. Session is locked by admin."
        )
    
    # Update attendance records
    present_count = 0
    absent_count = 0
    
    for item in attendance_data:
        student_id = item["student_id"]
        status = item["status"].upper()
        
        # Validate status
        if status not in ["PRESENT", "ABSENT"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status: {status}. Must be PRESENT or ABSENT"
            )
        
        # Find and update record
        record = await AttendanceRecord.find_one(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == student_id
        )
        
        if record:
            await record.set({
                AttendanceRecord.status: status,
                AttendanceRecord.marked_by: teacher_username,
                AttendanceRecord.updated_at: datetime.now(timezone.utc)
            })
            
            if status == "PRESENT":
                present_count += 1
            else:
                absent_count += 1
    
    # Update session timestamp
    await session.set({AttendanceSession.updated_at: datetime.now(timezone.utc)})
    
    return {
        "message": "Attendance marked successfully",
        "session_id": session_id,
        "present_count": present_count,
        "absent_count": absent_count,
        "updated_at": datetime.now(timezone.utc)
    }


async def mark_all_attendance(
    session_id: str,
    status: str,
    teacher_username: str
) -> Dict:
    """
    Mark all students with same status (bulk operation)
    """
    # Get session
    session = await AttendanceSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if locked
    if session.is_locked:
        raise HTTPException(
            status_code=403,
            detail="Cannot edit attendance. Session is locked by admin."
        )
    
    # Validate status
    status = status.upper()
    if status not in ["PRESENT", "ABSENT"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status: {status}. Must be PRESENT or ABSENT"
        )
    
    # Get all records for session
    records = await AttendanceRecord.find(
        AttendanceRecord.session_id == session_id
    ).to_list()
    
    # Update all records
    count = 0
    for record in records:
        await record.set({
            AttendanceRecord.status: status,
            AttendanceRecord.marked_by: teacher_username,
            AttendanceRecord.updated_at: datetime.now(timezone.utc)
        })
        count += 1
    
    return {
        "message": f"All students marked as {status.lower()}",
        "count": count
    }


async def calculate_attendance_percentage(student_id: str, course_id: str) -> Dict:
    """
    Calculate attendance percentage for a student in a course
    """
    # Get all attendance records for student in course
    records = await AttendanceRecord.find(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.course_id == course_id
    ).to_list()
    
    if not records:
        return {
            "total_sessions": 0,
            "present_count": 0,
            "absent_count": 0,
            "attendance_percentage": 0.0,
            "meets_requirement": False,
            "sessions_needed": 0
        }
    
    total_sessions = len(records)
    present_count = sum(1 for r in records if r.status == "PRESENT")
    absent_count = total_sessions - present_count
    
    attendance_percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0.0
    meets_requirement = attendance_percentage >= 75.0
    
    # Calculate sessions needed to reach 75%
    sessions_needed = 0
    if not meets_requirement:
        # Formula: (present + X) / (total + X) >= 0.75
        # Solve for X: X >= (0.75 * total - present) / 0.25
        sessions_needed = math.ceil((0.75 * total_sessions - present_count) / 0.25)
        sessions_needed = max(0, sessions_needed)
    
    return {
        "total_sessions": total_sessions,
        "present_count": present_count,
        "absent_count": absent_count,
        "attendance_percentage": round(attendance_percentage, 2),
        "meets_requirement": meets_requirement,
        "sessions_needed": sessions_needed
    }


async def get_student_attendance_details(student_id: str, course_id: str) -> Dict:
    """
    Get detailed attendance records for a student in a course
    """
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Calculate attendance
    attendance_stats = await calculate_attendance_percentage(student_id, course_id)
    
    # Get all records with session details
    records = await AttendanceRecord.find(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.course_id == course_id
    ).sort([("date", -1)]).to_list()
    
    sessions = []
    for record in records:
        sessions.append({
            "date": record.date,
            "periods": record.periods,
            "status": record.status
        })
    
    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
        **attendance_stats,
        "sessions": sessions
    }


async def get_course_attendance_report(course_id: str) -> Dict:
    """
    Get attendance report for entire course
    """
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get all sessions
    sessions = await AttendanceSession.find(
        AttendanceSession.course_id == course_id
    ).to_list()
    
    total_sessions = len(sessions)
    
    # Get all enrolled students
    enrollments = await Enrollment.find(
        Enrollment.course_id == course_id,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Calculate attendance for each student
    students_data = []
    total_percentage = 0.0
    below_75_count = 0
    above_75_count = 0
    
    for enrollment in enrollments:
        student = await User.find_one(User.username == enrollment.student_username)
        if student:
            attendance_stats = await calculate_attendance_percentage(
                enrollment.student_id,
                course_id
            )
            
            students_data.append({
                "registration_no": enrollment.student_username,
                "student_name": f"{student.first_name} {student.last_name}",
                "present": attendance_stats["present_count"],
                "absent": attendance_stats["absent_count"],
                "percentage": attendance_stats["attendance_percentage"],
                "meets_requirement": attendance_stats["meets_requirement"]
            })
            
            total_percentage += attendance_stats["attendance_percentage"]
            
            if attendance_stats["meets_requirement"]:
                above_75_count += 1
            else:
                below_75_count += 1
    
    average_attendance = (total_percentage / len(students_data)) if students_data else 0.0
    
    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
        "total_sessions": total_sessions,
        "average_attendance": round(average_attendance, 2),
        "students": students_data,
        "below_75_count": below_75_count,
        "above_75_count": above_75_count
    }


async def lock_course_attendance(course_id: str, term: str, admin_username: str) -> Dict:
    """
    Lock all attendance sessions for a course
    """
    # Get all sessions for course
    sessions = await AttendanceSession.find(
        AttendanceSession.course_id == course_id,
        AttendanceSession.term == term,
        AttendanceSession.is_locked == False
    ).to_list()
    
    if not sessions:
        raise HTTPException(
            status_code=404,
            detail="No unlocked sessions found for this course"
        )
    
    # Lock all sessions
    locked_count = 0
    for session in sessions:
        await session.set({
            AttendanceSession.is_locked: True,
            AttendanceSession.locked_at: datetime.now(timezone.utc),
            AttendanceSession.locked_by: admin_username
        })
        locked_count += 1
    
    # Get course for response
    course = await Course.get(course_id)
    
    return {
        "message": f"Attendance locked for {course.course_code if course else 'course'}",
        "course_code": course.course_code if course else None,
        "locked_sessions": locked_count,
        "locked_at": datetime.now(timezone.utc)
    }


async def unlock_course_attendance(course_id: str, reason: str, admin_username: str) -> Dict:
    """
    Unlock all attendance sessions for a course
    """
    # Get all locked sessions for course
    sessions = await AttendanceSession.find(
        AttendanceSession.course_id == course_id,
        AttendanceSession.is_locked == True
    ).to_list()
    
    if not sessions:
        raise HTTPException(
            status_code=404,
            detail="No locked sessions found for this course"
        )
    
    # Unlock all sessions
    unlocked_count = 0
    for session in sessions:
        await session.set({
            AttendanceSession.is_locked: False,
            AttendanceSession.locked_at: None,
            AttendanceSession.locked_by: None
        })
        unlocked_count += 1
    
    # Get course for response
    course = await Course.get(course_id)
    
    return {
        "message": f"Attendance unlocked for {course.course_code if course else 'course'}",
        "course_code": course.course_code if course else None,
        "unlocked_sessions": unlocked_count,
        "reason": reason
    }
