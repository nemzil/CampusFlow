from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from app.models.timetable import (
    CourseSchedule,
    CourseScheduleCreate, CourseScheduleUpdate,
    TimetableResponse
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services import timetable_service

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
# STUDENT/TEACHER TIMETABLE VIEW
# ═══════════════════════════════════════════════════════════════════

@router.get("/student/{student_id}")
async def get_student_timetable(
    student_id: str,
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Get timetable for a student
    Students can view own, admin can view all
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check authorization
    if user.role == "STUDENT" and str(user.id) != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own timetable")
    
    if user.role not in ["STUDENT", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Generate timetable
    timetable = await timetable_service.generate_student_timetable(
        student_id=student_id,
        semester=semester
    )
    
    return {
        "student_id": student_id,
        "user_type": "student",
        "semester": semester,
        "timetable": timetable
    }

@router.get("/teacher/{teacher_id}")
async def get_teacher_timetable(
    teacher_id: str,
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Get teaching schedule for a teacher
    Teachers can view own, admin can view all
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check authorization
    if user.role == "TEACHER" and str(user.id) != teacher_id:
        raise HTTPException(status_code=403, detail="You can only view your own schedule")
    
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get teacher username
    teacher = await User.get(teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Generate timetable
    timetable = await timetable_service.generate_teacher_timetable(
        teacher_username=teacher.username,
        semester=semester
    )
    
    return {
        "teacher_id": teacher_id,
        "user_type": "teacher",
        "semester": semester,
        "timetable": timetable
    }

@router.get("/my-timetable")
async def get_my_timetable(
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Get timetable for current user
    Works for both students and teachers
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    if user.role == "STUDENT":
        timetable = await timetable_service.generate_student_timetable(
            student_id=str(user.id),
            semester=semester
        )
        user_type = "student"
    elif user.role == "TEACHER":
        timetable = await timetable_service.generate_teacher_timetable(
            teacher_username=user.username,
            semester=semester
        )
        user_type = "teacher"
    else:
        raise HTTPException(status_code=403, detail="Only students and teachers can view timetables")
    
    return {
        "user_id": str(user.id),
        "user_type": user_type,
        "semester": semester,
        "timetable": timetable
    }

# ═══════════════════════════════════════════════════════════════════
# ADMIN: SCHEDULE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/courses")
async def get_all_courses_schedule_status(
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Get all courses with schedule status (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can view all schedules")
    
    # Get courses
    courses = await timetable_service.get_all_course_schedules(semester=semester)
    
    return {
        "semester": semester,
        "courses": courses,
        "total": len(courses)
    }

@router.post("/admin/schedule", status_code=status.HTTP_201_CREATED)
async def create_course_schedule(
    schedule_data: CourseScheduleCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Set schedule for a course (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can set schedules")
    
    # Create schedule
    schedules = await timetable_service.create_course_schedule(
        course_code=schedule_data.course_code,
        semester=schedule_data.semester,
        schedule_slots=[slot.model_dump() for slot in schedule_data.schedule],
        admin_username=user.username
    )
    
    # Count affected students
    from app.models.enrollment import Enrollment
    affected_students = await Enrollment.find(
        Enrollment.course_id == schedule_data.course_code,
        Enrollment.term == schedule_data.semester,
        Enrollment.status == "ENROLLED"
    ).count()
    
    return {
        "course_code": schedule_data.course_code,
        "semester": schedule_data.semester,
        "schedules_created": len(schedules),
        "affected_students": affected_students,
        "message": "Schedule set successfully"
    }

@router.get("/admin/schedule/{course_code}")
async def get_course_schedule(
    course_code: str,
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Get schedule for a specific course (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can view course schedules")
    
    # Get schedules
    schedules = await CourseSchedule.find(
        CourseSchedule.course_code == course_code,
        CourseSchedule.semester == semester
    ).to_list()
    
    return {
        "course_code": course_code,
        "semester": semester,
        "schedules": [
            {
                "schedule_id": schedule.schedule_id,
                "day": schedule.day,
                "period": schedule.period,
                "time": f"{schedule.time_start} - {schedule.time_end}",
                "room": schedule.room,
                "is_lab": schedule.is_lab,
                "periods_span": schedule.periods_span
            }
            for schedule in schedules
        ]
    }

@router.put("/admin/schedule/{schedule_id}")
async def update_course_schedule(
    schedule_id: str,
    update_data: CourseScheduleUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Update course schedule (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can update schedules")
    
    # Update schedule
    schedule = await timetable_service.update_course_schedule(
        schedule_id=schedule_id,
        update_data=update_data.model_dump(exclude_unset=True),
        admin_username=user.username
    )
    
    return {
        "schedule_id": schedule.schedule_id,
        "course_code": schedule.course_code,
        "day": schedule.day,
        "period": schedule.period,
        "room": schedule.room,
        "updated_at": schedule.updated_at,
        "message": "Schedule updated successfully"
    }

@router.delete("/admin/schedule/{schedule_id}")
async def delete_course_schedule(
    schedule_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Delete course schedule (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete schedules")
    
    # Delete schedule
    result = await timetable_service.delete_course_schedule(schedule_id=schedule_id)
    
    return result

@router.post("/admin/check-conflicts")
async def check_schedule_conflicts(
    course_code: str = Query(..., description="Course code"),
    day: str = Query(..., description="Day of week"),
    period: int = Query(..., ge=1, le=9, description="Period number"),
    room: str = Query(..., description="Room number"),
    semester: str = Query(..., description="Semester"),
    current_user: str = Depends(get_current_user)
):
    """
    Check for schedule conflicts before creating/updating (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can check conflicts")
    
    # Determine if lab course
    is_lab = timetable_service.is_lab_course(course_code)
    periods_span = 3 if is_lab else 1
    
    # Check conflicts
    conflicts = await timetable_service.check_schedule_conflicts(
        course_code=course_code,
        day=day.lower(),
        period=period,
        room=room,
        semester=semester,
        periods_span=periods_span
    )
    
    return {
        "course_code": course_code,
        "day": day,
        "period": period,
        "room": room,
        "has_conflicts": len(conflicts) > 0,
        "conflicts": conflicts
    }

# ═══════════════════════════════════════════════════════════════════
# EXPORT (Future Implementation)
# ═══════════════════════════════════════════════════════════════════

@router.get("/export/pdf/{student_id}")
async def export_timetable_pdf(
    student_id: str,
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Export timetable as PDF (FUTURE IMPLEMENTATION)
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check authorization
    if user.role == "STUDENT" and str(user.id) != student_id:
        raise HTTPException(status_code=403, detail="You can only export your own timetable")
    
    # TODO: Implement PDF generation
    raise HTTPException(
        status_code=501,
        detail="PDF export not yet implemented. Use frontend print functionality."
    )

@router.get("/export/ical/{student_id}")
async def export_timetable_ical(
    student_id: str,
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    current_user: str = Depends(get_current_user)
):
    """
    Export timetable as iCal (FUTURE IMPLEMENTATION)
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check authorization
    if user.role == "STUDENT" and str(user.id) != student_id:
        raise HTTPException(status_code=403, detail="You can only export your own timetable")
    
    # TODO: Implement iCal generation
    raise HTTPException(
        status_code=501,
        detail="iCal export not yet implemented"
    )
