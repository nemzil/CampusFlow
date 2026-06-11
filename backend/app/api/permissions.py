from fastapi import HTTPException, status
from app.models.user import User

FEE_MANAGEMENT_ADMIN = "FEE_MANAGEMENT_ADMIN"
COURSE_MANAGEMENT_ADMIN = "COURSE_MANAGEMENT_ADMIN"
EXAM_MANAGEMENT_ADMIN = "EXAM_MANAGEMENT_ADMIN"

SCOPED_ADMIN_LEVELS = (FEE_MANAGEMENT_ADMIN, COURSE_MANAGEMENT_ADMIN, EXAM_MANAGEMENT_ADMIN)


def require_admin(user: User) -> None:
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action",
        )


def is_full_admin(user: User) -> bool:
    return user.admin_level not in SCOPED_ADMIN_LEVELS


def require_course_management_edit(user: User) -> None:
    """Only course management admins can create/update course data."""
    require_admin(user)
    if user.admin_level != COURSE_MANAGEMENT_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only course management admins can modify courses",
        )


def require_course_management_view(user: User) -> None:
    """Full admins (read-only) and course management admins."""
    require_admin(user)
    if user.admin_level in (FEE_MANAGEMENT_ADMIN, EXAM_MANAGEMENT_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view course management",
        )


def require_exam_management_edit(user: User) -> None:
    """Only exam management admins can create/update exam schedules and timetables."""
    require_admin(user)
    if user.admin_level != EXAM_MANAGEMENT_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only exam management admins can modify exam data",
        )


def require_exam_management_view(user: User) -> None:
    """Full admins (read-only) and exam management admins."""
    require_admin(user)
    if user.admin_level in (FEE_MANAGEMENT_ADMIN, COURSE_MANAGEMENT_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view exam management",
        )
