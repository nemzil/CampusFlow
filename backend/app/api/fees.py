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
<<<<<<< HEAD
from app.utils.academic_term import resolve_term, get_current_academic_term
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

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
    
<<<<<<< HEAD
    # Convert semester to term if needed
    if semester.isdigit():
        resolved_semester = get_current_academic_term()
    else:
        resolved_semester = resolve_term(semester)
    
    # Calculate fees
    result = await fee_service.calculate_fees(student_id, resolved_semester)
=======
    # Calculate fees
    result = await fee_service.calculate_fees(student_id, semester)
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
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
    
<<<<<<< HEAD
    # Convert semester to current academic term if needed
    semester = payment_data.semester
    # If semester is just a number (like "1"), convert to current term
    if semester.isdigit():
        semester = get_current_academic_term()
    else:
        # Otherwise resolve the term (Fall -> 2026F, etc.)
        semester = resolve_term(semester)
    
    # Submit payment
    result = await fee_service.submit_payment(
        student_id=payment_data.student_id,
        semester=semester,
=======
    # Submit payment
    result = await fee_service.submit_payment(
        student_id=payment_data.student_id,
        semester=payment_data.semester,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
    
<<<<<<< HEAD
    # Convert semester to term if needed
    if semester.isdigit():
        semester = get_current_academic_term()
    else:
        semester = resolve_term(semester)
    
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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

<<<<<<< HEAD

@router.post("/admin/recalculate/{student_id}")
async def admin_recalculate_fees(
    student_id: str,
    semester: str = Query(..., description="Semester or term"),
    current_user: str = Depends(get_current_user)
):
    """
    Force recalculate fees for a student (ADMIN ONLY)
    This will update the fee record even if payment is pending verification.
    Use with caution!
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can recalculate fees")
    
    # Convert semester to term if needed
    if semester.isdigit():
        semester = get_current_academic_term()
    else:
        semester = resolve_term(semester)
    
    # Recalculate fees
    result = await fee_service.calculate_fees(student_id, semester)
    
    return {
        "message": "Fees recalculated successfully",
        "student_id": student_id,
        "semester": semester,
        "new_total": result["total_fee"],
        "details": result
    }


=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD


# ═══════════════════════════════════════════════════════════════════
# DEPARTMENT FEE STRUCTURE (ADMIN)
# ═══════════════════════════════════════════════════════════════════

from app.models.fee import DepartmentFeeStructure, DepartmentFeeStructureSchema

@router.get("/structure")
async def list_fee_structures(current_user: str = Depends(get_current_user)):
    """Get all department fee structures"""
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")
    structures = await DepartmentFeeStructure.find_all().to_list()
    return [{"id": str(s.id), "department": s.department, "core_per_credit": s.core_per_credit,
             "elective_per_credit": s.elective_per_credit, "compulsory_per_credit": s.compulsory_per_credit,
             "lab_charges": s.lab_charges, "security_deposit": s.security_deposit,
             "updated_at": s.updated_at} for s in structures]


@router.post("/structure")
async def save_fee_structure(
    data: DepartmentFeeStructureSchema,
    current_user: str = Depends(get_current_user)
):
    """Create or update fee structure for a department"""
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")

    existing = await DepartmentFeeStructure.find_one(
        DepartmentFeeStructure.department == data.department
    )
    if existing:
        await existing.set({
            DepartmentFeeStructure.core_per_credit: data.core_per_credit,
            DepartmentFeeStructure.elective_per_credit: data.elective_per_credit,
            DepartmentFeeStructure.compulsory_per_credit: data.compulsory_per_credit,
            DepartmentFeeStructure.lab_charges: data.lab_charges,
            DepartmentFeeStructure.security_deposit: data.security_deposit,
            DepartmentFeeStructure.updated_at: datetime.now(timezone.utc),
        })
        await existing.save()
        return {"message": f"Fee structure updated for {data.department}"}
    else:
        fs = DepartmentFeeStructure(
            department=data.department,
            core_per_credit=data.core_per_credit,
            elective_per_credit=data.elective_per_credit,
            compulsory_per_credit=data.compulsory_per_credit,
            lab_charges=data.lab_charges,
            security_deposit=data.security_deposit,
            created_by=current_user,
        )
        await fs.insert()
        return {"message": f"Fee structure created for {data.department}"}


@router.delete("/structure/{department}")
async def delete_fee_structure(department: str, current_user: str = Depends(get_current_user)):
    """Delete fee structure for a department"""
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")
    existing = await DepartmentFeeStructure.find_one(
        DepartmentFeeStructure.department == department
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    await existing.delete()
    return {"message": f"Deleted fee structure for {department}"}


# ═══════════════════════════════════════════════════════════════════
# STUDENT: Generate fee voucher from department fee structure
# ═══════════════════════════════════════════════════════════════════

@router.get("/my-voucher")
async def get_my_fee_voucher(current_user: str = Depends(get_current_user)):
    """
    Calculate and return fee voucher for the logged-in student
    based on their enrolled courses and department fee structure.
    """
    from app.models.enrollment import Enrollment
    from app.models.course import Course

    student = await get_current_user_object(current_user)
    if student.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Students only")

    # Get department fee structure
    dept = student.department or ""
    structure = await DepartmentFeeStructure.find_one(
        DepartmentFeeStructure.department == dept
    )

    # Get ALL enrolled courses (don't filter by term since registration is open for any term)
    enrollments = await Enrollment.find(
        Enrollment.student_id == str(student.id),
        Enrollment.status == "ENROLLED"
    ).to_list()

    line_items = []
    core_total = elective_total = compulsory_total = 0
    current_term = get_current_academic_term()

    for enr in enrollments:
        course = await Course.get(enr.course_id)
        if not course:
            continue
        ctype = (course.course_type or "core").lower()
        ch = course.credit_hours or 0

        if ctype == "core":
            rate = structure.core_per_credit if structure else 0
            subtotal = rate * ch
            core_total += subtotal
        elif ctype == "elective":
            rate = structure.elective_per_credit if structure else 0
            subtotal = rate * ch
            elective_total += subtotal
        elif ctype == "compulsory":
            rate = structure.compulsory_per_credit if structure else 0
            subtotal = rate * ch
            compulsory_total += subtotal
        else:
            rate = structure.core_per_credit if structure else 0
            subtotal = rate * ch
            core_total += subtotal

        line_items.append({
            "course_code": course.course_code,
            "course_name": course.course_name,
            "course_type": ctype,
            "credit_hours": ch,
            "rate_per_credit": rate,
            "subtotal": subtotal,
        })

    lab_charges = structure.lab_charges if structure else 0
    security_deposit = structure.security_deposit if structure else 0
    grand_total = core_total + elective_total + compulsory_total + lab_charges + security_deposit

    # Get fee record status for current term
    fee_record = await Fee.find_one(
        Fee.student_id == str(student.id),
        Fee.semester == current_term
    )
    
    # Update or create the fee record with current enrollment data
    # BUT only if payment hasn't been submitted yet (status is "pending")
    if fee_record:
        # Only update if status is "pending" (not submitted yet)
        if fee_record.status == "pending":
            await fee_record.set({
                Fee.courses: [{
                    "course_code": item["course_code"],
                    "course_name": item["course_name"],
                    "credit_hours": item["credit_hours"],
                    "fee_per_credit": item["rate_per_credit"],
                    "total": item["subtotal"]
                } for item in line_items],
                Fee.total_credit_hours: sum(item["credit_hours"] for item in line_items),
                Fee.tuition_fee: core_total + elective_total + compulsory_total,
                Fee.additional_fees: lab_charges + security_deposit,
                Fee.total_fee: grand_total,
                Fee.updated_at: datetime.now(timezone.utc)
            })
            await fee_record.save()
    else:
        # Create new fee record
        from app.services.fee_service import get_or_create_fee_config
        config = await get_or_create_fee_config(current_term)
        deadline = config.payment_deadline if config else datetime.now(timezone.utc)
        
        fee_record = Fee(
            student_id=str(student.id),
            student_username=student.username,
            semester=current_term,
            courses=[{
                "course_code": item["course_code"],
                "course_name": item["course_name"],
                "credit_hours": item["credit_hours"],
                "fee_per_credit": item["rate_per_credit"],
                "total": item["subtotal"]
            } for item in line_items],
            total_credit_hours=sum(item["credit_hours"] for item in line_items),
            tuition_fee=core_total + elective_total + compulsory_total,
            additional_fees=lab_charges + security_deposit,
            total_fee=grand_total,
            deadline=deadline,
            status="pending"
        )
        await fee_record.insert()
        
    status = fee_record.status

    # If already paid, grand_total is 0
    if status == "paid":
        grand_total = 0

    return {
        "student_id": str(student.id),
        "student_name": f"{student.first_name} {student.last_name}",
        "registration_no": student.registration_no,
        "department": student.department,
        "program": student.program,
        "semester": student.current_semester,
        "line_items": line_items,
        "status": status,
        "enrolled_courses_count": len(line_items),
        "summary": {
            "core_total": core_total if status != "paid" else 0,
            "elective_total": elective_total if status != "paid" else 0,
            "compulsory_total": compulsory_total if status != "paid" else 0,
            "lab_charges": lab_charges if status != "paid" else 0,
            "security_deposit": security_deposit if status != "paid" else 0,
            "grand_total": grand_total,
        },
        "fee_structure_found": structure is not None,
        "fee_structure": {
            "core_per_credit": structure.core_per_credit if structure else 0,
            "elective_per_credit": structure.elective_per_credit if structure else 0,
            "compulsory_per_credit": structure.compulsory_per_credit if structure else 0,
        } if structure else None,
    }


# ═══════════════════════════════════════════════════════════════════
# FEE DASHBOARD & STATS (ADMIN)
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/dashboard-stats")
async def get_fee_dashboard_stats(current_user: str = Depends(get_current_user)):
    """
    Get financial statistics for the fee dashboard (ADMIN ONLY)
    """
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")
        
    all_fees = await Fee.find_all().to_list()
    
    total_collected = 0
    total_pending = 0  # Only count pending_verification (submitted slips)
    
    # Graphs calculation
    current_year = datetime.now(timezone.utc).year
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = {m: 0 for m in months}
    yearly_data = {}
    
    for fee in all_fees:
        if fee.status == "paid":
            total_collected += fee.total_fee
            p_date = fee.payment_date or fee.verified_at or fee.updated_at
            if p_date:
                # Group yearly revenue
                year_str = str(p_date.year)
                yearly_data[year_str] = yearly_data.get(year_str, 0) + fee.total_fee
                # Group monthly revenue of current year
                if p_date.year == current_year:
                    month_name = months[p_date.month - 1]
                    monthly_data[month_name] += fee.total_fee
        elif fee.status == "pending_verification":
            # Only count submitted slips pending verification, not unpaid fees
            total_pending += fee.total_fee
            
    total_fees = total_collected + total_pending
    
    # Format monthly data for charts: list of dicts
    monthly_revenue = [{"month": m, "revenue": monthly_data[m]} for m in months]
    
    # Format yearly data for charts: list of dicts sorted by year
    yearly_revenue = [{"year": y, "revenue": yearly_data[y]} for y in sorted(yearly_data.keys())]
    
    # Fallback to current year if no yearly data
    if not yearly_revenue:
        yearly_revenue = [{"year": str(current_year), "revenue": 0}]
        
    return {
        "total_fees": total_fees,
        "total_collected": total_collected,
        "total_pending": total_pending,
        "monthly_revenue": monthly_revenue,
        "yearly_revenue": yearly_revenue
    }


@router.get("/admin/statement")
async def get_fee_statement(
    type: str = Query(..., description="monthly or yearly"),
    year: int = Query(..., description="Year"),
    month: Optional[int] = Query(None, description="Month (1-12)"),
    current_user: str = Depends(get_current_user)
):
    """
    Download monthly or yearly statement in CSV format (ADMIN ONLY)
    """
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admins only")
        
    all_fees = await Fee.find(Fee.status == "paid").to_list()
    
    filtered = []
    for fee in all_fees:
        p_date = fee.payment_date or fee.verified_at or fee.updated_at
        if not p_date:
            continue
        if p_date.year == year:
            if type == "monthly":
                if month and p_date.month == month:
                    filtered.append((fee, p_date))
            else:
                filtered.append((fee, p_date))
                
    # Sort chronologically
    filtered.sort(key=lambda x: x[1])
    
    import csv
    import io
    from fastapi.responses import Response
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Reg No / Username", "Student Name", "Department",
        "Semester", "Bank/Method", "Transaction ID", "Amount (Rs.)"
    ])
    
    for fee, p_date in filtered:
        student = await User.get(fee.student_id)
        student_name = f"{student.first_name} {student.last_name}" if student else "N/A"
        dept = student.department if student else "N/A"
        writer.writerow([
            p_date.strftime("%Y-%m-%d %H:%M:%S"),
            fee.student_username,
            student_name,
            dept,
            fee.semester,
            fee.bank_name or "N/A",
            fee.transaction_id or "N/A",
            fee.total_fee
        ])
        
    csv_content = output.getvalue()
    filename = f"fee_statement_{type}_{year}"
    if type == "monthly" and month:
        filename += f"_{month}"
    filename += ".csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
