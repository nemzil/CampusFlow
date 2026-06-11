"""
Class Timetable API
Admin: full CRUD
Student: view timetable for their department + semester
Teacher: view their own teaching schedule
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from typing import Optional, List
from app.models.class_timetable import ClassTimetable, ClassTimetableCreate, ClassTimetableUpdate
from app.models.user import User
from app.api.deps import get_current_user
from app.api.permissions import require_exam_management_edit, require_exam_management_view

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

async def _get_user(username: str) -> User:
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _serialize(tt: ClassTimetable) -> dict:
    return {
        "tt_id": tt.tt_id,
        "department": tt.department,
        "semester": tt.semester,
        "class_no": tt.class_no,
        "teacher_username": tt.teacher_username,
        "teacher_name": tt.teacher_name,
        "days": tt.days,
        "time_start": tt.time_start,
        "time_end": tt.time_end,
        "subject": tt.subject,
        "created_by": tt.created_by,
        "created_at": tt.created_at.isoformat(),
        "updated_at": tt.updated_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────
# ADMIN: CREATE
# ─────────────────────────────────────────────────────────────────────

@router.post("/admin", status_code=status.HTTP_201_CREATED)
async def admin_create_timetable(
    data: ClassTimetableCreate,
    current_user: str = Depends(get_current_user)
):
    """Admin only – create a new timetable entry."""
    user = await _get_user(current_user)
    require_exam_management_edit(user)

    # Validate teacher exists
    teacher = await User.find_one(User.username == data.teacher_username)
    if not teacher or teacher.role != "TEACHER":
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_name = f"{teacher.first_name} {teacher.last_name}"

    # Normalise days
    valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    days = [d.lower() for d in data.days]
    for d in days:
        if d not in valid_days:
            raise HTTPException(status_code=400, detail=f"Invalid day: {d}")

    tt = ClassTimetable(
        department=data.department,
        semester=data.semester,
        class_no=data.class_no,
        teacher_username=data.teacher_username,
        teacher_name=teacher_name,
        days=days,
        time_start=data.time_start,
        time_end=data.time_end,
        subject=data.subject,
        created_by=current_user,
    )
    await tt.insert()
    return {"message": "Timetable created", "timetable": _serialize(tt)}


# ─────────────────────────────────────────────────────────────────────
# ADMIN: LIST ALL
# ─────────────────────────────────────────────────────────────────────

@router.get("/admin")
async def admin_list_timetables(
    department: Optional[str] = None,
    semester: Optional[int] = None,
    current_user: str = Depends(get_current_user)
):
    """Admin only – list all timetable entries with optional filters."""
    user = await _get_user(current_user)
    require_exam_management_view(user)

    query_filters = []
    if department:
        query_filters.append(ClassTimetable.department == department)
    if semester:
        query_filters.append(ClassTimetable.semester == semester)

    if query_filters:
        entries = await ClassTimetable.find(*query_filters).sort("semester").to_list()
    else:
        entries = await ClassTimetable.find().sort("semester").to_list()

    return {"total": len(entries), "timetables": [_serialize(t) for t in entries]}


# ─────────────────────────────────────────────────────────────────────
# ADMIN: UPDATE
# ─────────────────────────────────────────────────────────────────────

@router.put("/admin/{tt_id}")
async def admin_update_timetable(
    tt_id: str,
    data: ClassTimetableUpdate,
    current_user: str = Depends(get_current_user)
):
    """Admin only – update a timetable entry."""
    user = await _get_user(current_user)
    require_exam_management_edit(user)

    tt = await ClassTimetable.find_one(ClassTimetable.tt_id == tt_id)
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    update_data = data.model_dump(exclude_unset=True)

    # If teacher changes, re-fetch name
    if "teacher_username" in update_data:
        teacher = await User.find_one(User.username == update_data["teacher_username"])
        if not teacher or teacher.role != "TEACHER":
            raise HTTPException(status_code=404, detail="Teacher not found")
        update_data["teacher_name"] = f"{teacher.first_name} {teacher.last_name}"

    if "days" in update_data:
        update_data["days"] = [d.lower() for d in update_data["days"]]

    update_data["updated_at"] = datetime.now(timezone.utc)

    for key, val in update_data.items():
        setattr(tt, key, val)
    await tt.save()

    return {"message": "Timetable updated", "timetable": _serialize(tt)}


# ─────────────────────────────────────────────────────────────────────
# ADMIN: DELETE
# ─────────────────────────────────────────────────────────────────────

@router.delete("/admin/{tt_id}")
async def admin_delete_timetable(
    tt_id: str,
    current_user: str = Depends(get_current_user)
):
    """Admin only – delete a timetable entry."""
    user = await _get_user(current_user)
    require_exam_management_edit(user)

    tt = await ClassTimetable.find_one(ClassTimetable.tt_id == tt_id)
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    await tt.delete()
    return {"message": "Timetable entry deleted", "tt_id": tt_id}


# ─────────────────────────────────────────────────────────────────────
# STUDENT: VIEW MY TIMETABLE (filtered by dept + semester)
# ─────────────────────────────────────────────────────────────────────

@router.get("/student/my")
async def student_my_timetable(
    current_user: str = Depends(get_current_user)
):
    """Student – get timetable entries that match their department & current semester."""
    user = await _get_user(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Students only")

    if not user.department or not user.current_semester:
        return {"timetables": [], "message": "Profile incomplete – department/semester not set"}

    # Check if student has any active enrollments
    from app.models.enrollment import Enrollment
    enrollments = await Enrollment.find(
        Enrollment.student_id == str(user.id),
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    if not enrollments or len(enrollments) == 0:
        return {
            "department": user.department,
            "semester": user.current_semester,
            "timetables": [],
            "message": "You must be enrolled in courses to view the timetable"
        }

    entries = await ClassTimetable.find(
        ClassTimetable.department == user.department,
        ClassTimetable.semester == user.current_semester,
    ).sort("time_start").to_list()

    return {
        "department": user.department,
        "semester": user.current_semester,
        "timetables": [_serialize(t) for t in entries],
    }


# ─────────────────────────────────────────────────────────────────────
# TEACHER: VIEW MY SCHEDULE
# ─────────────────────────────────────────────────────────────────────

@router.get("/teacher/my")
async def teacher_my_timetable(
    current_user: str = Depends(get_current_user)
):
    """Teacher – get all timetable entries assigned to them."""
    user = await _get_user(current_user)
    if user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Teachers only")

    entries = await ClassTimetable.find(
        ClassTimetable.teacher_username == current_user
    ).sort("time_start").to_list()

    return {
        "teacher": f"{user.first_name} {user.last_name}",
        "username": current_user,
        "timetables": [_serialize(t) for t in entries],
    }


# ─────────────────────────────────────────────────────────────────────
# HELPER: list teachers (used by admin form dropdown)
# ─────────────────────────────────────────────────────────────────────

@router.get("/admin/teachers/list")
async def list_teachers(current_user: str = Depends(get_current_user)):
    """Admin only – return all teachers for the dropdown."""
    user = await _get_user(current_user)
    require_exam_management_view(user)

    teachers = await User.find(User.role == "TEACHER", User.is_active == True).to_list()
    return [
        {
            "username": t.username,
            "name": f"{t.first_name} {t.last_name}",
            "department": t.department or "N/A",
            "designation": t.designation or "N/A",
        }
        for t in teachers
    ]
