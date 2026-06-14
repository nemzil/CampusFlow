"""
Fee Service
Handles business logic for fee management
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.fee import Fee, FeeConfig
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User


async def get_or_create_fee_config(semester: str) -> FeeConfig:
    """
    Get fee configuration for semester, create default if not exists
    """
    config = await FeeConfig.find_one(FeeConfig.semester == semester)
    
    if not config:
        # Create default config
        # Determine deadline based on semester
        year = int(semester[:4])
        if semester.endswith("F"):
            # Fall semester: deadline September 30
            deadline = datetime(year, 9, 30, 23, 59, 59, tzinfo=timezone.utc)
        else:
            # Spring semester: deadline February 28/29
            deadline = datetime(year, 2, 28, 23, 59, 59, tzinfo=timezone.utc)
        
        config = FeeConfig(
            semester=semester,
            fee_per_credit_hour=2350,
            payment_deadline=deadline,
            created_by="system"
        )
        await config.insert()
    
    return config


async def calculate_fees(student_id: str, semester: str) -> Dict:
    """
    Calculate fees for student based on enrolled courses
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
    
    Returns:
        Dict with fee calculation details
    
    Raises:
        HTTPException: If validation fails
    """
    # Get student
    student = await User.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.role != "STUDENT":
        raise HTTPException(status_code=400, detail="User is not a student")
    
    # Get fee configuration
    config = await get_or_create_fee_config(semester)
    
    # Get student's enrollments for this semester
    enrollments = await Enrollment.find(
        Enrollment.student_id == student_id,
        Enrollment.term == semester,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Calculate fees
    courses_breakdown = []
    total_credit_hours = 0
    
    for enrollment in enrollments:
        course = await Course.get(enrollment.course_id)
        if course:
            course_fee = course.credit_hours * config.fee_per_credit_hour
            courses_breakdown.append({
                "course_code": course.course_code,
                "course_name": course.course_name,
                "credit_hours": course.credit_hours,
                "fee_per_credit": config.fee_per_credit_hour,
                "total": course_fee
            })
            total_credit_hours += course.credit_hours
    
    tuition_fee = total_credit_hours * config.fee_per_credit_hour
    additional_fees_total = sum(config.additional_fees.values())
    total_fee = tuition_fee + additional_fees_total
    
    # Check if fee record already exists
    existing_fee = await Fee.find_one(
        Fee.student_id == student_id,
        Fee.semester == semester
    )
    
    if existing_fee:
        # Update existing fee record (even if payment is submitted)
        # Admin can force recalculate
        await existing_fee.set({
            Fee.courses: courses_breakdown,
            Fee.total_credit_hours: total_credit_hours,
            Fee.tuition_fee: tuition_fee,
            Fee.additional_fees: additional_fees_total,
            Fee.total_fee: total_fee,
            Fee.deadline: config.payment_deadline,
            Fee.updated_at: datetime.now(timezone.utc)
        })
        await existing_fee.save()
        fee_record = existing_fee
    else:
        # Create new fee record
        fee_record = Fee(
            student_id=student_id,
            student_username=student.username,
            semester=semester,
            courses=courses_breakdown,
            total_credit_hours=total_credit_hours,
            tuition_fee=tuition_fee,
            additional_fees=additional_fees_total,
            total_fee=total_fee,
            deadline=config.payment_deadline,
            status="pending"
        )
        await fee_record.insert()
    
    return {
        "student_id": student_id,
        "student_username": student.username,
        "semester": semester,
        "courses": courses_breakdown,
        "total_credit_hours": total_credit_hours,
        "tuition_fee": tuition_fee,
        "additional_fees": additional_fees_total,
        "total_fee": total_fee,
        "deadline": config.payment_deadline,
        "status": fee_record.status
    }


async def generate_voucher(student_id: str, semester: str) -> Dict:
    """
    Generate fee voucher for student
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
    
    Returns:
        Dict with voucher details
    
    Raises:
        HTTPException: If validation fails
    """
    # Get or calculate fee
    fee_record = await Fee.find_one(
        Fee.student_id == student_id,
        Fee.semester == semester
    )
    
    if not fee_record:
        # Calculate fees first
        await calculate_fees(student_id, semester)
        fee_record = await Fee.find_one(
            Fee.student_id == student_id,
            Fee.semester == semester
        )
    
    # Generate voucher ID if not exists
    if not fee_record.voucher_id:
        # Get student number from username
        student = await User.get(student_id)
        student_number = student.username.split("-")[-1] if student else "000"
        voucher_id = f"VCH-{semester}-{student_number}"
        
        await fee_record.set({
            Fee.voucher_id: voucher_id,
            Fee.voucher_generated_at: datetime.now(timezone.utc),
            Fee.updated_at: datetime.now(timezone.utc)
        })
        await fee_record.save()
    
    # Note: PDF generation would happen here
    # For now, we'll return voucher details without actual PDF
    # In production, use a library like pdfkit or puppeteer
    
    return {
        "voucher_id": fee_record.voucher_id,
        "pdf_url": fee_record.voucher_url,  # Will be None for now
        "generated_at": fee_record.voucher_generated_at,
        "expires_at": fee_record.deadline
    }


async def submit_payment(
    student_id: str,
    semester: str,
    receipt_url: str,
    payment_date: datetime,
    bank_name: str,
    transaction_id: str
) -> Dict:
    """
    Submit payment receipt for verification
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
        receipt_url: URL of uploaded receipt
        payment_date: Date of payment
        bank_name: Bank name
        transaction_id: Transaction ID
    
    Returns:
        Dict with payment submission details
    
    Raises:
        HTTPException: If validation fails
    """
    # Get fee record
    fee_record = await Fee.find_one(
        Fee.student_id == student_id,
        Fee.semester == semester
    )
    
    if not fee_record:
        raise HTTPException(
            status_code=404,
            detail=f"No fee record found for semester {semester}"
        )
    
    # Check if already paid
    if fee_record.status == "paid":
        raise HTTPException(
            status_code=400,
            detail="Payment already verified"
        )
    
    # Check if already submitted and pending
    if fee_record.status == "pending_verification":
        raise HTTPException(
            status_code=400,
            detail="Payment already submitted, awaiting verification"
        )
    
    # Update fee record with payment details
    await fee_record.set({
        Fee.receipt_url: receipt_url,
        Fee.payment_date: payment_date,
        Fee.bank_name: bank_name,
        Fee.transaction_id: transaction_id,
        Fee.status: "pending_verification",
        Fee.updated_at: datetime.now(timezone.utc)
    })
    await fee_record.save()
    
    payment_id = str(fee_record.id)
    
    return {
        "payment_id": payment_id,
        "status": "pending_verification",
        "submitted_at": datetime.now(timezone.utc),
        "receipt_url": receipt_url,
        "message": "Payment submitted for verification"
    }


async def get_payment_status(student_id: str, semester: str) -> Dict:
    """
    Get payment status for student
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
    
    Returns:
        Dict with payment status
    
    Raises:
        HTTPException: If not found
    """
    fee_record = await Fee.find_one(
        Fee.student_id == student_id,
        Fee.semester == semester
    )
    
    if not fee_record:
        raise HTTPException(
            status_code=404,
            detail=f"No fee record found for semester {semester}"
        )
    
    return {
        "student_id": student_id,
        "student_username": fee_record.student_username,
        "semester": semester,
        "total_fee": fee_record.total_fee,
        "status": fee_record.status,
        "payment_date": fee_record.payment_date,
        "verified_by": fee_record.verified_by,
        "verified_at": fee_record.verified_at,
        "receipt_url": fee_record.receipt_url,
        "rejection_reason": fee_record.rejection_reason
    }


async def get_pending_payments() -> List[Dict]:
    """
    Get all pending payment verifications
    
    Returns:
        List of pending payments
    """
    pending_fees = await Fee.find(
        Fee.status == "pending_verification"
    ).to_list()
    
    result = []
    for fee in pending_fees:
        # Get student details
        student = await User.get(fee.student_id)
        if student:
            result.append({
                "payment_id": str(fee.id),
                "student_id": fee.student_id,
                "student_name": f"{student.first_name} {student.last_name}",
                "registration_no": fee.student_username,
                "semester": fee.semester,
                "amount": fee.total_fee,
                "submitted_at": fee.updated_at,
                "receipt_url": fee.receipt_url,
                "transaction_id": fee.transaction_id,
                "bank_name": fee.bank_name
            })
    
    return result


async def verify_payment(payment_id: str, verified_by: str, notes: Optional[str] = None) -> Dict:
    """
    Verify payment (admin action)
    
    Args:
        payment_id: Fee record ID
        verified_by: Admin username
        notes: Optional admin notes
    
    Returns:
        Dict with verification details
    
    Raises:
        HTTPException: If validation fails
    """
    fee_record = await Fee.get(payment_id)
    
    if not fee_record:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    if fee_record.status == "paid":
        raise HTTPException(status_code=400, detail="Payment already verified")
    
    if fee_record.status != "pending_verification":
        raise HTTPException(
            status_code=400,
            detail="Payment not submitted for verification"
        )
    
    # Update fee record
    await fee_record.set({
        Fee.status: "paid",
        Fee.verified_by: verified_by,
        Fee.verified_at: datetime.now(timezone.utc),
        Fee.updated_at: datetime.now(timezone.utc)
    })
    await fee_record.save()
    
    return {
        "payment_id": payment_id,
        "status": "paid",
        "verified_by": verified_by,
        "verified_at": datetime.now(timezone.utc),
        "message": "Payment verified successfully"
    }


async def reject_payment(payment_id: str, rejected_by: str, reason: str) -> Dict:
    """
    Reject payment (admin action)
    
    Args:
        payment_id: Fee record ID
        rejected_by: Admin username
        reason: Rejection reason
    
    Returns:
        Dict with rejection details
    
    Raises:
        HTTPException: If validation fails
    """
    fee_record = await Fee.get(payment_id)
    
    if not fee_record:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    if fee_record.status == "paid":
        raise HTTPException(status_code=400, detail="Cannot reject verified payment")
    
    if fee_record.status != "pending_verification":
        raise HTTPException(
            status_code=400,
            detail="Payment not submitted for verification"
        )
    
    # Update fee record
    await fee_record.set({
        Fee.status: "rejected",
        Fee.rejected_by: rejected_by,
        Fee.rejected_at: datetime.now(timezone.utc),
        Fee.rejection_reason: reason,
        Fee.updated_at: datetime.now(timezone.utc)
    })
    await fee_record.save()
    
    return {
        "payment_id": payment_id,
        "status": "rejected",
        "rejected_by": rejected_by,
        "rejected_at": datetime.now(timezone.utc),
        "reason": reason,
        "message": "Payment rejected, student notified"
    }


async def get_payment_history(student_id: str) -> Dict:
    """
    Get payment history for student
    
    Args:
        student_id: Student's user ID
    
    Returns:
        Dict with payment history
    """
    student = await User.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all fee records for student
    fees = await Fee.find(
        Fee.student_id == student_id
    ).sort(-Fee.created_at).to_list()
    
    payment_history = []
    total_paid = 0
    
    for fee in fees:
        payment_history.append({
            "semester": fee.semester,
            "total_fee": fee.total_fee,
            "status": fee.status,
            "payment_date": fee.payment_date,
            "verified_at": fee.verified_at,
            "receipt_url": fee.receipt_url
        })
        
        if fee.status == "paid":
            total_paid += fee.total_fee
    
    return {
        "student_id": student_id,
        "student_username": student.username,
        "payment_history": payment_history,
        "total_paid": total_paid
    }


async def generate_fee_report(semester: str, status_filter: Optional[str] = None) -> Dict:
    """
    Generate financial report for semester
    
    Args:
        semester: Academic semester
        status_filter: Optional status filter (all, paid, pending, overdue)
    
    Returns:
        Dict with report data
    """
    # Build query
    query = Fee.semester == semester
    
    if status_filter and status_filter != "all":
        query = query & (Fee.status == status_filter)
    
    # Get all fees for semester
    fees = await Fee.find(query).to_list()
    
    # Calculate summary
    total_students = len(fees)
    total_fees_generated = sum(fee.total_fee for fee in fees)
    total_collected = sum(fee.total_fee for fee in fees if fee.status == "paid")
    total_pending = sum(fee.total_fee for fee in fees if fee.status in ["pending", "pending_verification"])
    
    # Check for overdue
    now = datetime.now(timezone.utc)
    total_overdue = sum(
        fee.total_fee for fee in fees 
        if fee.status in ["pending", "pending_verification"] and fee.deadline < now
    )
    
    collection_percentage = (total_collected / total_fees_generated * 100) if total_fees_generated > 0 else 0
    
    # Build breakdown
    breakdown = []
    for fee in fees:
        student = await User.get(fee.student_id)
        if student:
            breakdown.append({
                "student_id": fee.student_id,
                "student_name": f"{student.first_name} {student.last_name}",
                "registration_no": fee.student_username,
                "total_fee": fee.total_fee,
                "status": fee.status,
                "payment_date": fee.payment_date
            })
    
    return {
        "semester": semester,
        "summary": {
            "total_students": total_students,
            "total_fees_generated": total_fees_generated,
            "total_collected": total_collected,
            "total_pending": total_pending,
            "total_overdue": total_overdue,
            "collection_percentage": round(collection_percentage, 2)
        },
        "breakdown": breakdown
    }


async def check_fee_paid(student_id: str, semester: str) -> bool:
    """
    Check if student has paid fees for semester
    Used by admit card module
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
    
    Returns:
        True if paid, False otherwise
    """
    fee_record = await Fee.find_one(
        Fee.student_id == student_id,
        Fee.semester == semester
    )
    
    if not fee_record:
        return False
    
    return fee_record.status == "paid"
