from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List
from app.models.fee import (
    Fee, FeeConfig,
    FeeConfigCreate, FeeConfigResponse,
    FeeCalculationResponse, VoucherGenerateRequest, VoucherResponse,
    PaymentSubmitRequest, PaymentStatusResponse,
    PaymentVerifyRequest, PaymentRejectRequest,
    PendingPaymentResponse, PaymentHistoryResponse,
    FeeReportResponse
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services import fee_service

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
# FEE CONFIGURATION (ADMIN ONLY)
# ═══════════════════════════════════════════════════════════════════

@router.post("/config", status_code=status.HTTP_201_CREATED)
async def create_fee_config(
    config_data: FeeConfigCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Create fee configuration for semester (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can configure fees")
    
    # Check if config already exists
    existing = await FeeConfig.find_one(FeeConfig.semester == config_data.semester)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Fee configuration already exists for {config_data.semester}"
        )
    
    # Create config
    config = FeeConfig(
        semester=config_data.semester,
        fee_per_credit_hour=config_data.fee_per_credit_hour,
        payment_deadline=config_data.payment_deadline,
        late_fee_enabled=config_data.late_fee_enabled,
        late_fee_amount=config_data.late_fee_amount,
        created_by=current_user
    )
    
    await config.insert()
    
    return {
        "id": str(config.id),
        "semester": config.semester,
        "fee_per_credit_hour": config.fee_per_credit_hour,
        "payment_deadline": config.payment_deadline,
        "created_by": config.created_by,
        "message": "Fee configuration created successfully"
    }

@router.get("/config/{semester}")
async def get_fee_config(
    semester: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get fee configuration for semester
    """
    config = await fee_service.get_or_create_fee_config(semester)
    
    return {
        "id": str(config.id),
        "semester": config.semester,
        "fee_per_credit_hour": config.fee_per_credit_hour,
        "additional_fees": config.additional_fees,
        "payment_deadline": config.payment_deadline,
        "late_fee_enabled": config.late_fee_enabled,
        "late_fee_amount": config.late_fee_amount,
        "bank_details": config.bank_details
    }

# ═══════════════════════════════════════════════════════════════════
# FEE CALCULATION & VOUCHER
# ═══════════════════════════════════════════════════════════════════

@router.post("/calculate")
async def calculate_fees(
    student_id: str = Query(..., description="Student ID"),
    semester: str = Query(..., description="Semester"),
    current_user: str = Depends(get_current_user)
):
    """
    Calculate fees for student based on enrolled courses
    Students can only calculate their own fees, admins can calculate for any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != student_id:
            raise HTTPException(status_code=403, detail="Can only view your own fees")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate fees
    result = await fee_service.calculate_fees(student_id, semester)
    
    return result

@router.post("/voucher/generate")
async def generate_voucher(
    voucher_data: VoucherGenerateRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Generate fee voucher PDF
    Students can only generate their own vouchers, admins can generate for any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != voucher_data.student_id:
            raise HTTPException(status_code=403, detail="Can only generate your own voucher")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Generate voucher
    result = await fee_service.generate_voucher(
        voucher_data.student_id,
        voucher_data.semester
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# PAYMENT SUBMISSION
# ═══════════════════════════════════════════════════════════════════

@router.post("/payment/submit")
async def submit_payment(
    payment_data: PaymentSubmitRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Submit payment receipt for verification (STUDENT ONLY)
    """
    user = await get_current_user_object(current_user)
    
    # Only students can submit payments
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can submit payments")
    
    # Verify student is submitting their own payment
    if str(user.id) != payment_data.student_id:
        raise HTTPException(status_code=403, detail="Can only submit your own payment")
    
    # Submit payment
    result = await fee_service.submit_payment(
        student_id=payment_data.student_id,
        semester=payment_data.semester,
        receipt_url=payment_data.receipt_url,
        payment_date=payment_data.payment_date,
        bank_name=payment_data.bank_name,
        transaction_id=payment_data.transaction_id
    )
    
    return result

@router.get("/payment/status/{student_id}/{semester}")
async def get_payment_status(
    student_id: str,
    semester: str,
    current_user: str = Depends(get_current_user)
):
    """
    Check payment status
    Students can only check their own status, admins can check any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != student_id:
            raise HTTPException(status_code=403, detail="Can only view your own payment status")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get payment status
    result = await fee_service.get_payment_status(student_id, semester)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# ADMIN: PAYMENT VERIFICATION
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/pending")
async def get_pending_payments(
    current_user: str = Depends(get_current_user)
):
    """
    Get all pending payment verifications (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can view pending payments")
    
    # Get pending payments
    pending = await fee_service.get_pending_payments()
    
    return {
        "pending_payments": pending,
        "total_pending": len(pending)
    }

@router.post("/admin/verify")
async def verify_payment(
    verify_data: PaymentVerifyRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Verify payment (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can verify payments")
    
    # Verify payment
    result = await fee_service.verify_payment(
        payment_id=verify_data.payment_id,
        verified_by=current_user,
        notes=verify_data.notes
    )
    
    return result

@router.post("/admin/reject")
async def reject_payment(
    reject_data: PaymentRejectRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Reject payment (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can reject payments")
    
    # Reject payment
    result = await fee_service.reject_payment(
        payment_id=reject_data.payment_id,
        rejected_by=current_user,
        reason=reject_data.reason
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# PAYMENT HISTORY
# ═══════════════════════════════════════════════════════════════════

@router.get("/history/{student_id}")
async def get_payment_history(
    student_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get payment history for student
    Students can only view their own history, admins can view any student
    """
    user = await get_current_user_object(current_user)
    
    # Check permissions
    if user.role == "STUDENT":
        if str(user.id) != student_id:
            raise HTTPException(status_code=403, detail="Can only view your own payment history")
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get payment history
    result = await fee_service.get_payment_history(student_id)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/report")
async def generate_fee_report(
    semester: str = Query(..., description="Semester"),
    status: str = Query("all", description="Status filter: all, paid, pending, overdue"),
    current_user: str = Depends(get_current_user)
):
    """
    Generate financial report (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can generate reports")
    
    # Generate report
    result = await fee_service.generate_fee_report(semester, status)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# UTILITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/check-paid/{student_id}/{semester}")
async def check_fee_paid(
    student_id: str,
    semester: str,
    current_user: str = Depends(get_current_user)
):
    """
    Check if student has paid fees (used by admit card module)
    """
    is_paid = await fee_service.check_fee_paid(student_id, semester)
    
    return {
        "student_id": student_id,
        "semester": semester,
        "is_paid": is_paid
    }
