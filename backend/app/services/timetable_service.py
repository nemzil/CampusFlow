"""
Timetable Service
Handles business logic for class timetables
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.timetable import CourseSchedule, PERIOD_TIMINGS, VALID_LAB_PERIODS
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
import uuid


def generate_schedule_id() -> str:
    """Generate unique schedule ID"""
    return f"SCH-{uuid.uuid4().hex[:8].upper()}"


def generate_course_color(course_code: str) -> str:
    """
    Generate consistent color for course based on course code
    
    Args:
        course_code: Course code
    
    Returns:
        Hex color code
    """
    colors = [
        '#3B82F6',  # Blue
        '#10B981',  # Green
        '#F59E0B',  # Amber
        '#EF4444',  # Red
        '#8B5CF6',  # Purple
        '#EC4899',  # Pink
        '#14B8A6',  # Teal
        '#F97316',  # Orange
    ]
    
    # Hash course code to get consistent color
    hash_value = sum(ord(char) for char in course_code)
    return colors[hash_value % len(colors)]


def is_lab_course(course_code: str) -> bool:
    """
    Check if course is a lab course
    Lab courses end with 'L'
    
    Args:
        course_code: Course code
    
    Returns:
        True if lab course
    """
    return course_code.endswith('L')


def validate_lab_periods(period: int, is_lab: bool) -> None:
    """
    Validate lab period is in valid range
    
    Args:
        period: Starting period
        is_lab: Whether course is lab
    
    Raises:
        HTTPException: If invalid
    """
    if is_lab:
        # Check if period is start of valid lab range
        valid_starts = [start for start, _ in VALID_LAB_PERIODS]
        if period not in valid_starts:
            raise HTTPException(
                status_code=400,
                detail=f"Lab courses must start at period {', '.join(map(str, valid_starts))} (3 consecutive periods)"
            )


async def check_schedule_conflicts(
    course_code: str,
    day: str,
    period: int,
    room: str,
    semester: str,
    periods_span: int = 1,
    exclude_schedule_id: Optional[str] = None
) -> List[Dict]:
    """
    Check for scheduling conflicts
    
    Args:
        course_code: Course code
        day: Day of week
        period: Starting period
        room: Room number
        semester: Semester
        periods_span: Number of periods (1 for theory, 3 for lab)
        exclude_schedule_id: Schedule ID to exclude from check (for updates)
    
    Returns:
        List of conflicts
    """
    conflicts = []
    
    # Get course to check teacher
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check each period in span
    for p in range(period, period + periods_span):
        # Check room conflict
        query = CourseSchedule.find(
            CourseSchedule.day == day,
            CourseSchedule.semester == semester,
            CourseSchedule.course_code != course_code
        )
        
        if exclude_schedule_id:
            query = query.find(CourseSchedule.schedule_id != exclude_schedule_id)
        
        existing_schedules = await query.to_list()
        
        for schedule in existing_schedules:
            # Check if periods overlap
            schedule_periods = range(schedule.period, schedule.period + schedule.periods_span)
            if p in schedule_periods and schedule.room == room:
                conflicts.append({
                    "type": "room",
                    "message": f"Room {room} already booked for {schedule.course_code} on {day} period {schedule.period}",
                    "conflicting_course": schedule.course_code
                })
            
            # Check teacher conflict
            conflict_course = await Course.find_one(Course.course_code == schedule.course_code)
            if conflict_course and conflict_course.teacher_id == course.teacher_id and p in schedule_periods:
                conflicts.append({
                    "type": "teacher",
                    "message": f"Teacher already teaching {schedule.course_code} on {day} period {schedule.period}",
                    "conflicting_course": schedule.course_code
                })
    
    return conflicts


async def create_course_schedule(
    course_code: str,
    semester: str,
    schedule_slots: List[Dict],
    admin_username: str
) -> List[CourseSchedule]:
    """
    Create schedule for a course
    
    Args:
        course_code: Course code
        semester: Semester
        schedule_slots: List of schedule slots
        admin_username: Admin username
    
    Returns:
        List of created schedules
    
    Raises:
        HTTPException: If validation fails
    """
    # Get course
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if course is lab
    is_lab = is_lab_course(course_code)
    periods_span = 3 if is_lab else 1
    
    # Validate and create schedules
    created_schedules = []
    
    for slot in schedule_slots:
        day = slot["day"].lower()
        period = slot["period"]
        room = slot["room"]
        
        # Validate day
        if day not in ["monday", "tuesday", "wednesday", "thursday", "friday"]:
            raise HTTPException(status_code=400, detail=f"Invalid day: {day}")
        
        # Validate period
        if period < 1 or period > 9:
            raise HTTPException(status_code=400, detail=f"Invalid period: {period}")
        
        # Validate lab periods
        if is_lab:
            validate_lab_periods(period, is_lab)
        
        # Check conflicts
        conflicts = await check_schedule_conflicts(
            course_code=course_code,
            day=day,
            period=period,
            room=room,
            semester=semester,
            periods_span=periods_span
        )
        
        if conflicts:
            conflict_messages = [c["message"] for c in conflicts]
            raise HTTPException(
                status_code=400,
                detail=f"Schedule conflicts found: {'; '.join(conflict_messages)}"
            )
        
        # Get time range
        time_start, time_end = PERIOD_TIMINGS[period]
        if is_lab:
            # Lab spans 3 periods
            _, time_end = PERIOD_TIMINGS[period + 2]
        
        # Create schedule
        schedule = CourseSchedule(
            schedule_id=generate_schedule_id(),
            course_code=course_code,
            semester=semester,
            day=day,
            period=period,
            time_start=time_start,
            time_end=time_end,
            room=room,
            is_lab=is_lab,
            periods_span=periods_span,
            created_by=admin_username
        )
        
        await schedule.insert()
        created_schedules.append(schedule)
    
    return created_schedules


async def update_course_schedule(
    schedule_id: str,
    update_data: Dict,
    admin_username: str
) -> CourseSchedule:
    """
    Update course schedule
    
    Args:
        schedule_id: Schedule ID
        update_data: Fields to update
        admin_username: Admin username
    
    Returns:
        Updated schedule
    
    Raises:
        HTTPException: If validation fails
    """
    # Get schedule
    schedule = await CourseSchedule.find_one(CourseSchedule.schedule_id == schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Prepare update
    day = update_data.get("day", schedule.day).lower()
    period = update_data.get("period", schedule.period)
    room = update_data.get("room", schedule.room)
    
    # Validate
    if day not in ["monday", "tuesday", "wednesday", "thursday", "friday"]:
        raise HTTPException(status_code=400, detail=f"Invalid day: {day}")
    
    if period < 1 or period > 9:
        raise HTTPException(status_code=400, detail=f"Invalid period: {period}")
    
    # Validate lab periods
    if schedule.is_lab:
        validate_lab_periods(period, schedule.is_lab)
    
    # Check conflicts
    conflicts = await check_schedule_conflicts(
        course_code=schedule.course_code,
        day=day,
        period=period,
        room=room,
        semester=schedule.semester,
        periods_span=schedule.periods_span,
        exclude_schedule_id=schedule_id
    )
    
    if conflicts:
        conflict_messages = [c["message"] for c in conflicts]
        raise HTTPException(
            status_code=400,
            detail=f"Schedule conflicts found: {'; '.join(conflict_messages)}"
        )
    
    # Update time if period changed
    time_start, time_end = PERIOD_TIMINGS[period]
    if schedule.is_lab:
        _, time_end = PERIOD_TIMINGS[period + 2]
    
    # Update schedule
    await schedule.set({
        CourseSchedule.day: day,
        CourseSchedule.period: period,
        CourseSchedule.room: room,
        CourseSchedule.time_start: time_start,
        CourseSchedule.time_end: time_end,
        CourseSchedule.updated_at: datetime.now(timezone.utc)
    })
    
    return schedule


async def delete_course_schedule(schedule_id: str) -> Dict:
    """
    Delete course schedule
    
    Args:
        schedule_id: Schedule ID
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If schedule not found
    """
    # Get schedule
    schedule = await CourseSchedule.find_one(CourseSchedule.schedule_id == schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Delete schedule
    await schedule.delete()
    
    return {
        "message": "Schedule deleted successfully",
        "schedule_id": schedule_id
    }


async def generate_student_timetable(student_id: str, semester: str) -> Dict:
    """
    Generate timetable for student based on enrolled courses
    
    Args:
        student_id: Student ID
        semester: Semester
    
    Returns:
        Timetable dict
    """
    # Get enrolled courses
    enrollments = await Enrollment.find(
        Enrollment.student_id == student_id,
        Enrollment.term == semester,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Initialize empty timetable
    timetable = {
        "monday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "tuesday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "wednesday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "thursday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "friday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
    }
    
    # For each enrolled course, fetch schedule
    for enrollment in enrollments:
        # Get course details
        course = await Course.find_one(Course.course_code == enrollment.course_code)
        if not course:
            continue
        
        # Get schedules
        schedules = await CourseSchedule.find(
            CourseSchedule.course_code == enrollment.course_code,
            CourseSchedule.semester == semester
        ).to_list()
        
        # Add to timetable
        for schedule in schedules:
            day = schedule.day
            color = generate_course_color(enrollment.course_code)
            
            # Create slot data
            slot_data = {
                "period": schedule.period,
                "time": f"{schedule.time_start} - {schedule.time_end}",
                "course_code": enrollment.course_code,
                "course_name": course.course_name,
                "room": schedule.room,
                "teacher": course.teacher_name or "TBA",
                "color": color,
                "is_lab": schedule.is_lab,
                "free": False
            }
            
            if schedule.is_lab:
                # Lab takes 3 periods
                for p in range(schedule.period, schedule.period + 3):
                    timetable[day][p - 1] = slot_data.copy()
                    timetable[day][p - 1]["period"] = p
            else:
                # Theory takes 1 period
                timetable[day][schedule.period - 1] = slot_data
    
    return timetable


async def generate_teacher_timetable(teacher_username: str, semester: str) -> Dict:
    """
    Generate teaching schedule for teacher
    
    Args:
        teacher_username: Teacher username
        semester: Semester
    
    Returns:
        Timetable dict
    """
    # Get courses teacher is teaching
    courses = await Course.find(
        Course.teacher_id == teacher_username,
        Course.term == semester,
        Course.is_active == True
    ).to_list()
    
    # Initialize empty timetable
    timetable = {
        "monday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "tuesday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "wednesday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "thursday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
        "friday": [{"period": i+1, "time": f"{PERIOD_TIMINGS[i+1][0]} - {PERIOD_TIMINGS[i+1][1]}", "free": True} for i in range(9)],
    }
    
    # For each course, fetch schedule
    for course in courses:
        # Get schedules
        schedules = await CourseSchedule.find(
            CourseSchedule.course_code == course.course_code,
            CourseSchedule.semester == semester
        ).to_list()
        
        # Get enrolled count
        enrolled_count = await Enrollment.find(
            Enrollment.course_id == str(course.id),
            Enrollment.term == semester,
            Enrollment.status == "ENROLLED"
        ).count()
        
        # Add to timetable
        for schedule in schedules:
            day = schedule.day
            color = generate_course_color(course.course_code)
            
            # Create slot data
            slot_data = {
                "period": schedule.period,
                "time": f"{schedule.time_start} - {schedule.time_end}",
                "course_code": course.course_code,
                "course_name": course.course_name,
                "room": schedule.room,
                "enrolled_count": enrolled_count,
                "color": color,
                "is_lab": schedule.is_lab,
                "free": False
            }
            
            if schedule.is_lab:
                # Lab takes 3 periods
                for p in range(schedule.period, schedule.period + 3):
                    timetable[day][p - 1] = slot_data.copy()
                    timetable[day][p - 1]["period"] = p
            else:
                # Theory takes 1 period
                timetable[day][schedule.period - 1] = slot_data
    
    return timetable


async def get_all_course_schedules(semester: str) -> List[Dict]:
    """
    Get all course schedules for semester (admin view)
    
    Args:
        semester: Semester
    
    Returns:
        List of courses with schedule status
    """
    # Get all courses for semester
    courses = await Course.find(
        Course.term == semester,
        Course.is_active == True
    ).to_list()
    
    result = []
    for course in courses:
        # Check if schedule exists
        schedule_count = await CourseSchedule.find(
            CourseSchedule.course_code == course.course_code,
            CourseSchedule.semester == semester
        ).count()
        
        result.append({
            "course_code": course.course_code,
            "course_name": course.course_name,
            "teacher_name": course.teacher_name or "TBA",
            "is_lab": is_lab_course(course.course_code),
            "schedule_set": schedule_count > 0,
            "schedule_count": schedule_count
        })
    
    return result
