from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.api.deps import get_current_user
from app.models.lecture import Lecture
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.core.config import settings
import hashlib
import time

router = APIRouter()


async def get_user(username: str) -> User:
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_resource_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("mp4", "mov", "avi", "mkv", "webm", "flv", "wmv"):
        return "video"
    if ext in ("jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"):
        return "image"
    return "raw"


def _sign(params: dict) -> str:
    sorted_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    return hashlib.sha1((sorted_str + settings.CLOUDINARY_API_SECRET).encode()).hexdigest()


# ── Step 1: Get upload signature (browser uploads directly to Cloudinary) ──

@router.get("/sign")
async def get_upload_signature(
    filename: str,
    current_user: str = Depends(get_current_user)
):
    """Return a signed upload params so the browser can POST directly to Cloudinary."""
    user = await get_user(current_user)
    if user.role not in ("TEACHER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only teachers can upload lectures")

    if not settings.CLOUDINARY_CLOUD_NAME or settings.CLOUDINARY_CLOUD_NAME in ("", "your_cloud_name"):
        raise HTTPException(status_code=503, detail="File upload not configured.")

    timestamp = str(int(time.time()))
    folder = "campusflow/lectures"
    resource_type = "auto"  # let Cloudinary detect video/raw/image
    sign_params = {"folder": folder, "timestamp": timestamp}
    signature = _sign(sign_params)

    return {
        "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
        "api_key": settings.CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "folder": folder,
        "signature": signature,
        "resource_type": resource_type,
        "upload_url": f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/auto/upload",
    }


# ── Step 2: Confirm upload and save lecture record ──────────────────────────

class LectureConfirmRequest(BaseModel):
    course_id: str
    lecture_no: int
    topic: str
    description: Optional[str] = None
    file_url: str
    file_name: str


@router.post("", status_code=201)
async def confirm_lecture(
    body: LectureConfirmRequest,
    current_user: str = Depends(get_current_user)
):
    user = await get_user(current_user)
    if user.role not in ("TEACHER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only teachers can upload lectures")

    course = await Course.get(body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not your course")

    lecture = Lecture(
        course_id=body.course_id,
        course_code=course.course_code,
        teacher_id=user.username,
        teacher_name=f"{user.first_name} {user.last_name}",
        lecture_no=body.lecture_no,
        topic=body.topic,
        description=body.description,
        file_url=body.file_url,
        file_name=body.file_name,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    await lecture.insert()
    return _fmt(lecture)


# ── Teacher: list own course lectures ───────────────────────────────────────

@router.get("/course/{course_id}")
async def get_course_lectures(course_id: str, current_user: str = Depends(get_current_user)):
    user = await get_user(current_user)
    if user.role not in ("TEACHER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role == "TEACHER" and course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not your course")

    lectures = await Lecture.find(Lecture.course_id == course_id).sort(+Lecture.lecture_no).to_list()
    return {"lectures": [_fmt(l) for l in lectures]}


# ── Teacher: delete lecture ──────────────────────────────────────────────────

@router.delete("/{lecture_id}")
async def delete_lecture(lecture_id: str, current_user: str = Depends(get_current_user)):
    user = await get_user(current_user)
    lecture = await Lecture.get(lecture_id)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    if user.role == "TEACHER" and lecture.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    await lecture.delete()
    return {"status": "deleted"}


# ── Student: list lectures for enrolled courses ──────────────────────────────

@router.get("/my-lectures")
async def get_my_lectures(current_user: str = Depends(get_current_user)):
    user = await get_user(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Students only")

    enrollments = await Enrollment.find(
        Enrollment.student_id == str(user.id),
        Enrollment.status == "ENROLLED"
    ).to_list()

    course_ids = [e.course_id for e in enrollments]
    if not course_ids:
        return {"lectures": []}

    now = datetime.now(timezone.utc)
    lectures = await Lecture.find(
        {"course_id": {"$in": course_ids}, "expires_at": {"$gt": now}}
    ).sort(+Lecture.created_at).to_list()
    return {"lectures": [_fmt(l) for l in lectures]}


# ── Helper ───────────────────────────────────────────────────────────────────

def _fmt(l: Lecture) -> dict:
    expires = l.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    days_left = max(0, (expires - now).days)
    return {
        "id": str(l.id),
        "course_id": l.course_id,
        "course_code": l.course_code,
        "teacher_name": l.teacher_name,
        "lecture_no": l.lecture_no,
        "topic": l.topic,
        "description": l.description,
        "file_url": l.file_url,
        "file_name": l.file_name,
        "expires_at": l.expires_at,
        "days_left": days_left,
        "created_at": l.created_at,
    }
