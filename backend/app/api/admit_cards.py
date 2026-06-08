from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from app.models.admit_card import (
    AdmitCard,
    EligibilityCheckResponse,
    AdmitCardGenerateRequest, AdmitCardResponse,
    AdmitCardHistoryResponse,
    AdminOverrideRequest, AdminOverrideResponse,
    IneligibleStudentsResponse
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services import admit_card_service

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
# ELIGIBILITY CHECK
# ═══════════════════════════════════════════════════════════════════

@router.get("/eligibility/{student_id}")
async def check_eligibility(
    student_id: str,
    semester: str = Query(..., description="Semester (e.g., 2024F)"),
    exam_type: str = Query(..., description="Exam type: midterm or final"),
    current_user: str = Depends(get_current_user)
):
    """
    Check admit card eligibility for a student
    Students can only check their own eligibility, admins can check any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != student_id:
            raise HTTPException(status_code=403, detail="Can only check your own eligibility")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check eligibility
    result = await admit_card_service.check_eligibility(student_id, semester, exam_type)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# ADMIT CARD GENERATION
# ═══════════════════════════════════════════════════════════════════

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_admit_card(
    card_data: AdmitCardGenerateRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Generate admit card PDF
    Students can only generate their own admit cards, admins can generate for any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != card_data.student_id:
            raise HTTPException(status_code=403, detail="Can only generate your own admit card")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Generate admit card
    result = await admit_card_service.generate_admit_card(
        card_data.student_id,
        card_data.semester,
        card_data.exam_type
    )
    
    return result

@router.get("/history/{student_id}")
async def get_admit_card_history(
    student_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get admit card history for a student
    Students can only view their own history, admins can view any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != student_id:
            raise HTTPException(status_code=403, detail="Can only view your own history")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get history
    result = await admit_card_service.get_admit_card_history(student_id)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# ADMIN: OVERRIDE ELIGIBILITY
# ═══════════════════════════════════════════════════════════════════

@router.post("/admin/override")
async def override_eligibility(
    override_data: AdminOverrideRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Admin overrides eligibility for a student (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can override eligibility")
    
    # Override eligibility
    result = await admit_card_service.admin_override_eligibility(
        student_id=override_data.student_id,
        semester=override_data.semester,
        exam_type=override_data.exam_type,
        reason=override_data.reason,
        override_courses=override_data.override_courses,
        admin_username=current_user
    )
    
    return result

@router.delete("/admin/override/revoke")
async def revoke_override(
    student_id: str = Query(..., description="Student ID"),
    semester: str = Query(..., description="Semester"),
    exam_type: str = Query(..., description="Exam type"),
    current_user: str = Depends(get_current_user)
):
    """
    Revoke admin override (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can revoke overrides")
    
    # Revoke override
    result = await admit_card_service.revoke_override(student_id, semester, exam_type)
    
    return result

@router.get("/admin/ineligible")
async def get_ineligible_students(
    semester: str = Query(..., description="Semester"),
    exam_type: str = Query(..., description="Exam type: midterm or final"),
    current_user: str = Depends(get_current_user)
):
    """
    Get all ineligible students (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can view ineligible students")
    
    # Get ineligible students
    result = await admit_card_service.get_ineligible_students(semester, exam_type)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# UTILITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/verify/{admit_card_id}")
async def verify_admit_card(
    admit_card_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Verify admit card authenticity (for exam invigilators)
    """
    admit_card = await AdmitCard.find_one(
        AdmitCard.admit_card_id == admit_card_id
    )
    
    if not admit_card:
        raise HTTPException(status_code=404, detail="Admit card not found")
    
    if not admit_card.is_valid:
        return {
            "valid": False,
            "message": "This admit card has been invalidated. Student must regenerate."
        }
    
    # Get student details
    student = await User.get(admit_card.student_id)
    
    return {
        "valid": True,
        "admit_card_id": admit_card.admit_card_id,
        "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
        "registration_no": admit_card.student_username,
        "semester": admit_card.semester,
        "exam_type": admit_card.exam_type,
        "eligible_courses": admit_card.eligible_courses,
        "generated_at": admit_card.generated_at
    }
