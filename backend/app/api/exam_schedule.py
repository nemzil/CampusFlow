"""
Exam Schedule / Admit Card API
──────────────────────────────
Admin   : full CRUD on exam schedules
Student : admit card — fee check + per-course attendance + exam schedule
Teacher : their invigilation duties
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from typing import Optional
from app.models.exam_schedule import ExamSchedule, ExamScheduleCreate, ExamScheduleUpdate
from app.models.user import User
from app.models.fee import Fee
from app.models.course import Course
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.enrollment import Enrollment
from app.api.deps import get_current_user

router = APIRouter()

DAYS_VALID = {"monday","tuesday","wednesday","thursday","friday","saturday","sunday"}


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

async def _get_user(username: str) -> User:
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _serialize(es: ExamSchedule) -> dict:
    return {
        "schedule_id":          es.schedule_id,
        "department":           es.department,
        "semester":             es.semester,
        "course_code":          es.course_code,
        "course_name":          es.course_name,
        "invigilator_username": es.invigilator_username,
        "invigilator_name":     es.invigilator_name,
        "exam_date":            es.exam_date,
        "exam_day":             es.exam_day,
        "exam_time_start":      es.exam_time_start,
        "exam_time_end":        es.exam_time_end,
        "room_no":              es.room_no,
        "created_by":           es.created_by,
        "created_at":           es.created_at.isoformat(),
        "updated_at":           es.updated_at.isoformat(),
    }


async def _calc_attendance(student_id: str, course_id: str) -> float:
    """Return attendance percentage (0-100) for student in course."""
    records = await AttendanceRecord.find(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.course_id == course_id
    ).to_list()
    if not records:
        return 0.0
    present = sum(1 for r in records if r.status == "PRESENT")
    return round(present / len(records) * 100, 2)


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — LIST TEACHERS (dropdown helper)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/teachers/list")
async def admin_list_teachers(current_user: str = Depends(get_current_user)):
    user = await _get_user(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")
    teachers = await User.find(User.role == "TEACHER", User.is_active == True).to_list()
    return [
        {
            "username":    t.username,
            "name":        f"{t.first_name} {t.last_name}",
            "department":  t.department or "N/A",
            "designation": t.designation or "N/A",
        }
        for t in teachers
    ]


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — CREATE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/admin", status_code=status.HTTP_201_CREATED)
async def admin_create_schedule(
    data: ExamScheduleCreate,
    current_user: str = Depends(get_current_user)
):
    user = await _get_user(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")

    # Validate invigilator
    inv = await User.find_one(User.username == data.invigilator_username)
    if not inv or inv.role != "TEACHER":
        raise HTTPException(status_code=404, detail="Invigilator (teacher) not found")

    if data.exam_day.lower() not in DAYS_VALID:
        raise HTTPException(status_code=400, detail=f"Invalid exam_day: {data.exam_day}")

    es = ExamSchedule(
        department=           data.department,
        semester=             data.semester,
        course_code=          data.course_code,
        course_name=          data.course_name,
        invigilator_username= data.invigilator_username,
        invigilator_name=     f"{inv.first_name} {inv.last_name}",
        exam_date=            data.exam_date,
        exam_day=             data.exam_day.lower(),
        exam_time_start=      data.exam_time_start,
        exam_time_end=        data.exam_time_end,
        room_no=              data.room_no,
        created_by=           current_user,
    )
    await es.insert()
    return {"message": "Exam schedule created", "schedule": _serialize(es)}


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — LIST
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin")
async def admin_list_schedules(
    department: Optional[str] = None,
    semester:   Optional[int] = None,
    current_user: str = Depends(get_current_user)
):
    user = await _get_user(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")

    filters = []
    if department:
        filters.append(ExamSchedule.department == department)
    if semester:
        filters.append(ExamSchedule.semester == semester)

    entries = await (ExamSchedule.find(*filters).sort("exam_date").to_list()
                     if filters else ExamSchedule.find().sort("exam_date").to_list())

    return {"total": len(entries), "schedules": [_serialize(e) for e in entries]}


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — UPDATE
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/admin/{schedule_id}")
async def admin_update_schedule(
    schedule_id: str,
    data: ExamScheduleUpdate,
    current_user: str = Depends(get_current_user)
):
    user = await _get_user(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")

    es = await ExamSchedule.find_one(ExamSchedule.schedule_id == schedule_id)
    if not es:
        raise HTTPException(status_code=404, detail="Schedule not found")

    upd = data.model_dump(exclude_unset=True)

    if "invigilator_username" in upd:
        inv = await User.find_one(User.username == upd["invigilator_username"])
        if not inv or inv.role != "TEACHER":
            raise HTTPException(status_code=404, detail="Invigilator (teacher) not found")
        upd["invigilator_name"] = f"{inv.first_name} {inv.last_name}"

    if "exam_day" in upd and upd["exam_day"].lower() not in DAYS_VALID:
        raise HTTPException(status_code=400, detail=f"Invalid exam_day: {upd['exam_day']}")
    if "exam_day" in upd:
        upd["exam_day"] = upd["exam_day"].lower()

    upd["updated_at"] = datetime.now(timezone.utc)
    for k, v in upd.items():
        setattr(es, k, v)
    await es.save()
    return {"message": "Schedule updated", "schedule": _serialize(es)}


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — DELETE
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/admin/{schedule_id}")
async def admin_delete_schedule(
    schedule_id: str,
    current_user: str = Depends(get_current_user)
):
    user = await _get_user(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")

    es = await ExamSchedule.find_one(ExamSchedule.schedule_id == schedule_id)
    if not es:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await es.delete()
    return {"message": "Schedule deleted", "schedule_id": schedule_id}


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT — MY ADMIT CARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/my-admit-card")
async def student_admit_card(current_user: str = Depends(get_current_user)):
    """
    Returns:
    - fee_paid: bool
    - courses: list of {course_code, course_name, attendance_pct, allowed, exam_schedule | null}
    """
    user = await _get_user(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Students only")

    student_id = str(user.id)

    # ── Fee check ──────────────────────────────────────────────────────────
    # Use batch as the semester term key (e.g. "2024F")
    fee_record = None
    if user.batch:
        fee_record = await Fee.find_one(
            Fee.student_id == student_id,
            Fee.status == "paid"
        )
    fee_paid = fee_record is not None

    if not user.current_semester or not user.department:
        return {
            "fee_paid": fee_paid,
            "department": user.department,
            "semester": user.current_semester,
            "courses": [],
            "message": "Profile incomplete — department/semester not set",
        }

    # ── Get enrollments for the student ────────────────────────────────────
    enrollments = await Enrollment.find(
        Enrollment.student_username == current_user,
        Enrollment.status == "ENROLLED"
    ).to_list()

    enrollment_course_ids = [e.course_id for e in enrollments]

    # ── Get courses for dept+semester ───────────────────────────────────────
    courses = await Course.find(
        Course.semester == user.current_semester,
        Course.is_active == True
    ).to_list()

    # ── Get exam schedules for dept+semester ────────────────────────────────
    schedules = await ExamSchedule.find(
        ExamSchedule.department == user.department,
        ExamSchedule.semester == user.current_semester
    ).to_list()
    schedule_map = {s.course_code: s for s in schedules}

    # ── Build per-course result ─────────────────────────────────────────────
    result_courses = []
    for course in courses:
        course_id = str(course.id)
        att_pct = await _calc_attendance(student_id, course_id)
        allowed = att_pct >= 75.0

        sched = schedule_map.get(course.course_code)
        exam_info = None
        if sched:
            exam_info = {
                "exam_date":       sched.exam_date,
                "exam_day":        sched.exam_day,
                "exam_time_start": sched.exam_time_start,
                "exam_time_end":   sched.exam_time_end,
                "room_no":         sched.room_no,
                "invigilator":     sched.invigilator_name,
            }

        result_courses.append({
            "course_code":      course.course_code,
            "course_name":      course.course_name,
            "category":         course.category,
            "credit_hours":     course.credit_hours,
            "attendance_pct":   att_pct,
            "allowed":          allowed,
            "exam_scheduled":   sched is not None,
            "exam":             exam_info,
        })

    return {
        "fee_paid":   fee_paid,
        "department": user.department,
        "semester":   user.current_semester,
        "student":    f"{user.first_name} {user.last_name}",
        "reg_no":     user.registration_no or current_user,
        "courses":    result_courses,
    }


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER — MY INVIGILATION DUTIES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/teacher/my-invigilation")
async def teacher_invigilation(current_user: str = Depends(get_current_user)):
    user = await _get_user(current_user)
    if user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Teachers only")

    duties = await ExamSchedule.find(
        ExamSchedule.invigilator_username == current_user
    ).sort("exam_date").to_list()

    return {
        "teacher":  f"{user.first_name} {user.last_name}",
        "username": current_user,
        "duties":   [_serialize(d) for d in duties],
    }
