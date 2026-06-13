"""
Admit Card Service
Handles business logic for admit card generation and eligibility
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.admit_card import AdmitCard
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.services import fee_service
from beanie.operators import In


async def calculate_attendance_percentage(student_id: str, course_code: str) -> float:
    """
    Calculate attendance percentage for a student in a course
    
    Args:
        student_id: Student's user ID
        course_code: Course code
    
    Returns:
        Attendance percentage (0-100)
    """
    # Get all attendance sessions for this course
    sessions = await AttendanceSession.find(
        AttendanceSession.course_code == course_code
    ).to_list()
    
    if not sessions:
        return 100.0  # No sessions = 100% by default
    
    total_sessions = len(sessions)
    
    # Get attendance records for this student
    session_ids = [str(session.id) for session in sessions]
    records = await AttendanceRecord.find(
        AttendanceRecord.student_id == student_id,
        In(AttendanceRecord.session_id, session_ids)
    ).to_list()
    
    # Count present sessions
    present_count = sum(1 for record in records if record.status == "P")
    
    # Calculate percentage
    percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 100.0
    
    return round(percentage, 2)


async def check_eligibility(student_id: str, semester: str, exam_type: str) -> Dict:
    """
    Check admit card eligibility for a student
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
        exam_type: Exam type (midterm or final)
    
    Returns:
        Dict with eligibility details
    
    Raises:
        HTTPException: If validation fails
    """
    # Validate exam type
    if exam_type not in ["midterm", "final"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid exam type. Must be 'midterm' or 'final'"
        )
    
    # Get student
    student = await User.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.role != "STUDENT":
        raise HTTPException(status_code=400, detail="User is not a student")
    
    # Check if admin override exists
    existing_override = await AdmitCard.find_one(
        AdmitCard.student_id == student_id,
        AdmitCard.semester == semester,
        AdmitCard.exam_type == exam_type,
        AdmitCard.admin_override.enabled == True
    )
    
    # Check fee status
    fee_paid = await fee_service.check_fee_paid(student_id, semester)
    fee_status = "paid" if fee_paid else "pending"
    
    # Get student's enrollments
    enrollments = await Enrollment.find(
        Enrollment.student_id == student_id,
        Enrollment.term == semester,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    if not enrollments:
        raise HTTPException(
            status_code=400,
            detail=f"No enrollments found for semester {semester}"
        )
    
    eligible_courses = []
    ineligible_courses = []
    
    # If admin override exists and applies to all courses
    if existing_override and not existing_override.admin_override.get("override_courses"):
        # All courses are eligible due to override
        for enrollment in enrollments:
            course = await Course.get(enrollment.course_id)
            if course:
                attendance_pct = await calculate_attendance_percentage(student_id, course.course_code)
                eligible_courses.append({
                    "course_code": course.course_code,
                    "course_name": course.course_name,
                    "attendance_percentage": attendance_pct,
                    "exam_date": None,  # TODO: Link to exam schedule
                    "exam_time": None,
                    "room": None
                })
        
        return {
            "student_id": student_id,
            "student_username": student.username,
            "semester": semester,
            "exam_type": exam_type,
            "fee_status": fee_status,
            "overall_eligible": True,
            "eligible_courses": eligible_courses,
            "ineligible_courses": [],
            "admin_override": existing_override.admin_override
        }
    
    # Check each course for eligibility
    for enrollment in enrollments:
        course = await Course.get(enrollment.course_id)
        if not course:
            continue
        
        # Calculate attendance percentage
        attendance_pct = await calculate_attendance_percentage(student_id, course.course_code)
        
        # Check if this specific course has override
        has_course_override = False
        if existing_override:
            override_courses = existing_override.admin_override.get("override_courses", [])
            has_course_override = course.course_code in override_courses
        
        # Determine eligibility
        if has_course_override:
            # Course has admin override
            eligible_courses.append({
                "course_code": course.course_code,
                "course_name": course.course_name,
                "attendance_percentage": attendance_pct,
                "exam_date": None,
                "exam_time": None,
                "room": None
            })
        elif not fee_paid:
            # Fee not paid - all courses ineligible
            ineligible_courses.append({
                "course_code": course.course_code,
                "course_name": course.course_name,
                "attendance_percentage": attendance_pct,
                "reason": "Fee dues pending"
            })
        elif attendance_pct < 75.0:
            # Attendance below threshold
            ineligible_courses.append({
                "course_code": course.course_code,
                "course_name": course.course_name,
                "attendance_percentage": attendance_pct,
                "reason": "Attendance below 75%"
            })
        else:
            # Eligible
            eligible_courses.append({
                "course_code": course.course_code,
                "course_name": course.course_name,
                "attendance_percentage": attendance_pct,
                "exam_date": None,
                "exam_time": None,
                "room": None
            })
    
    overall_eligible = len(eligible_courses) > 0
    
    return {
        "student_id": student_id,
        "student_username": student.username,
        "semester": semester,
        "exam_type": exam_type,
        "fee_status": fee_status,
        "overall_eligible": overall_eligible,
        "eligible_courses": eligible_courses,
        "ineligible_courses": ineligible_courses,
        "admin_override": existing_override.admin_override if existing_override else None
    }


async def generate_admit_card(student_id: str, semester: str, exam_type: str) -> Dict:
    """
    Generate admit card for student
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
        exam_type: Exam type (midterm or final)
    
    Returns:
        Dict with admit card details
    
    Raises:
        HTTPException: If validation fails
    """
    # Check eligibility first
    eligibility = await check_eligibility(student_id, semester, exam_type)
    
    if not eligibility["overall_eligible"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not eligible for any courses. Cannot generate admit card."
        )
    
    # Get student
    student = await User.get(student_id)
    
    # Generate admit card ID
    student_number = student.username.split("-")[-1] if student else "000"
    admit_card_id = f"ADM-{semester}-{exam_type.upper()}-{student_number}"
    
    # Check if admit card already exists
    existing_card = await AdmitCard.find_one(
        AdmitCard.student_id == student_id,
        AdmitCard.semester == semester,
        AdmitCard.exam_type == exam_type,
        AdmitCard.is_valid == True
    )
    
    # Invalidate existing card if found
    if existing_card:
        await existing_card.set({AdmitCard.is_valid: False})
    
    # Create new admit card
    admit_card = AdmitCard(
        admit_card_id=admit_card_id,
        student_id=student_id,
        student_username=student.username,
        semester=semester,
        exam_type=exam_type,
        fee_status=eligibility["fee_status"],
        eligible_courses=eligibility["eligible_courses"],
        ineligible_courses=eligibility["ineligible_courses"],
        admin_override=eligibility["admin_override"] or {
            "enabled": False,
            "reason": None,
            "overridden_by": None,
            "overridden_at": None,
            "override_courses": []
        },
        is_valid=True
    )
    
    await admit_card.insert()
    
    # Note: PDF and QR code generation would happen here
    # For now, we'll return without actual PDF/QR
    # In production, use pdfkit/puppeteer for PDF and qrcode library for QR
    
    return {
        "admit_card_id": admit_card_id,
        "student_id": student_id,
        "student_username": student.username,
        "semester": semester,
        "exam_type": exam_type,
        "eligible_courses": eligibility["eligible_courses"],
        "pdf_url": admit_card.pdf_url,
        "qr_code_url": admit_card.qr_code_url,
        "generated_at": admit_card.generated_at
    }


async def get_admit_card_history(student_id: str) -> Dict:
    """
    Get admit card history for student
    
    Args:
        student_id: Student's user ID
    
    Returns:
        Dict with admit card history
    """
    student = await User.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all admit cards for student
    admit_cards = await AdmitCard.find(
        AdmitCard.student_id == student_id
    ).sort(-AdmitCard.generated_at).to_list()
    
    history = []
    for card in admit_cards:
        history.append({
            "admit_card_id": card.admit_card_id,
            "semester": card.semester,
            "exam_type": card.exam_type,
            "generated_at": card.generated_at,
            "pdf_url": card.pdf_url,
            "is_valid": card.is_valid
        })
    
    return {
        "student_id": student_id,
        "student_username": student.username,
        "admit_cards": history
    }


async def admin_override_eligibility(
    student_id: str,
    semester: str,
    exam_type: str,
    reason: str,
    override_courses: List[str],
    admin_username: str
) -> Dict:
    """
    Admin overrides eligibility for a student
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
        exam_type: Exam type
        reason: Override reason
        override_courses: List of course codes to override (empty = all)
        admin_username: Admin username
    
    Returns:
        Dict with override details
    """
    # Validate student exists
    student = await User.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.role != "STUDENT":
        raise HTTPException(status_code=400, detail="User is not a student")
    
    # Check if admit card exists
    existing_card = await AdmitCard.find_one(
        AdmitCard.student_id == student_id,
        AdmitCard.semester == semester,
        AdmitCard.exam_type == exam_type
    )
    
    override_data = {
        "enabled": True,
        "reason": reason,
        "overridden_by": admin_username,
        "overridden_at": datetime.now(timezone.utc),
        "override_courses": override_courses
    }
    
    if existing_card:
        # Update existing card with override
        await existing_card.set({
            AdmitCard.admin_override: override_data,
            AdmitCard.is_valid: False  # Invalidate so student regenerates
        })
    else:
        # Create new admit card with override
        student_number = student.username.split("-")[-1]
        admit_card_id = f"ADM-{semester}-{exam_type.upper()}-{student_number}"
        
        admit_card = AdmitCard(
            admit_card_id=admit_card_id,
            student_id=student_id,
            student_username=student.username,
            semester=semester,
            exam_type=exam_type,
            fee_status="pending",  # Will be recalculated on generation
            eligible_courses=[],
            ineligible_courses=[],
            admin_override=override_data,
            is_valid=False  # Student needs to generate
        )
        await admit_card.insert()
    
    return {
        "student_id": student_id,
        "semester": semester,
        "exam_type": exam_type,
        "overridden": True,
        "overridden_by": admin_username,
        "overridden_at": override_data["overridden_at"],
        "reason": reason,
        "message": "Eligibility overridden successfully. Student can now generate admit card."
    }


async def get_ineligible_students(semester: str, exam_type: str) -> Dict:
    """
    Get all ineligible students for a semester and exam type
    
    Args:
        semester: Academic semester
        exam_type: Exam type
    
    Returns:
        Dict with ineligible students list
    """
    # Get all students enrolled in this semester
    enrollments = await Enrollment.find(
        Enrollment.term == semester,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    # Get unique student IDs
    student_ids = list(set(e.student_id for e in enrollments))
    
    ineligible_students = []
    
    for student_id in student_ids:
        try:
            # Check eligibility
            eligibility = await check_eligibility(student_id, semester, exam_type)
            
            # If student has ineligible courses
            if eligibility["ineligible_courses"]:
                student = await User.get(student_id)
                if student:
                    # Collect unique reasons
                    reasons = list(set(
                        course["reason"] 
                        for course in eligibility["ineligible_courses"]
                    ))
                    
                    ineligible_students.append({
                        "student_id": student_id,
                        "student_name": f"{student.first_name} {student.last_name}",
                        "registration_no": student.username,
                        "ineligible_courses_count": len(eligibility["ineligible_courses"]),
                        "reasons": reasons,
                        "fee_status": eligibility["fee_status"],
                        "courses": eligibility["ineligible_courses"]
                    })
        except Exception:
            # Skip students with errors
            continue
    
    return {
        "semester": semester,
        "exam_type": exam_type,
        "ineligible_students": ineligible_students,
        "total_ineligible": len(ineligible_students)
    }


async def revoke_override(student_id: str, semester: str, exam_type: str) -> Dict:
    """
    Revoke admin override for a student
    
    Args:
        student_id: Student's user ID
        semester: Academic semester
        exam_type: Exam type
    
    Returns:
        Dict with revoke confirmation
    """
    admit_card = await AdmitCard.find_one(
        AdmitCard.student_id == student_id,
        AdmitCard.semester == semester,
        AdmitCard.exam_type == exam_type
    )
    
    if not admit_card:
        raise HTTPException(status_code=404, detail="Admit card not found")
    
    if not admit_card.admin_override.get("enabled"):
        raise HTTPException(status_code=400, detail="No override to revoke")
    
    # Reset override
    await admit_card.set({
        AdmitCard.admin_override: {
            "enabled": False,
            "reason": None,
            "overridden_by": None,
            "overridden_at": None,
            "override_courses": []
        },
        AdmitCard.is_valid: False  # Invalidate card
    })
    
    return {
        "message": "Override revoked successfully",
        "student_id": student_id,
        "semester": semester,
        "exam_type": exam_type
    }
