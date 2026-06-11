from fastapi import APIRouter, HTTPException, status, Depends, Query
<<<<<<< HEAD
from typing import Optional, List
from app.models.grading import (
    Grade, SemesterGPA, CGPA,
    GradeResponse, GradeOverride, UpdateResultMarks,
=======
from typing import Optional
from app.models.grading import (
    Grade, SemesterGPA, CGPA,
    GradeResponse, GradeOverride,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    SemesterGPAResponse, CGPAResponse
)
from app.models.user import User
from app.models.course import Course
from app.api.deps import get_current_user
<<<<<<< HEAD
from app.api.permissions import require_exam_management_edit, require_exam_management_view
from app.services import grading_service
from app.utils.academic_term import resolve_term, get_current_academic_term
=======
from app.services import grading_service
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
# GRADE CALCULATION (TEACHER/ADMIN)
# ═══════════════════════════════════════════════════════════════════

@router.post("/calculate")
async def calculate_grades(
    course_id: str = Query(..., description="Course ID"),
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Term (e.g., 2024F)"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Calculate grades for all students in a course (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can calculate grades")
    
    # Check if teacher owns course
    if user.role == "TEACHER":
        course = await Course.get(course_id)
        if not course or course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized for this course")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    # Calculate grades
    result = await grading_service.calculate_course_grades(
        course_id=course_id,
        term=resolved_term
=======
    # Calculate grades
    result = await grading_service.calculate_course_grades(
        course_id=course_id,
        term=term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    )
    
    return result

@router.get("/course/{course_id}")
async def get_course_grades(
    course_id: str,
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Term (e.g., 2024F)"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Get all grades for a course (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view course grades")
    
    # Check if teacher owns course
    if user.role == "TEACHER":
        course = await Course.get(course_id)
        if not course or course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized for this course")
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    # Get grades
    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == resolved_term
=======
    # Get grades
    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    ).to_list()
    
    # Build response
    result = []
    for grade in grades:
        # Get student details
        student = await User.get(grade.student_id)
        student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"
        
        result.append({
            "student_id": grade.student_id,
            "registration_no": grade.student_username,
            "student_name": student_name,
            "components": grade.components,
            "total_marks": grade.total_marks,
            "letter_grade": grade.letter_grade,
            "grade_points": grade.grade_points,
            "is_complete": grade.is_complete,
            "status": grade.status
        })
    
    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
<<<<<<< HEAD
        "term": resolved_term,
=======
        "term": term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        "status": grades[0].status if grades else "NOT_CALCULATED",
        "grades": result
    }

# ═══════════════════════════════════════════════════════════════════
# GRADE PUBLISHING (TEACHER/ADMIN)
# ═══════════════════════════════════════════════════════════════════

@router.post("/publish")
async def publish_grades(
    course_id: str = Query(..., description="Course ID"),
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Term"),
=======
    term: str = Query(..., description="Term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Publish grades for a course (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can publish grades")
    
    # Check if teacher owns course
    if user.role == "TEACHER":
        course = await Course.get(course_id)
        if not course or course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized for this course")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    # Publish grades
    result = await grading_service.publish_course_grades(
        course_id=course_id,
        term=resolved_term,
=======
    # Publish grades
    result = await grading_service.publish_course_grades(
        course_id=course_id,
        term=term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        publisher_username=user.username
    )
    
    return result

@router.post("/unpublish")
async def unpublish_grades(
    course_id: str = Query(..., description="Course ID"),
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Term"),
=======
    term: str = Query(..., description="Term"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    reason: str = Query(..., description="Reason for unpublishing"),
    current_user: str = Depends(get_current_user)
):
    """
    Unpublish grades for a course (TEACHER/ADMIN)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can unpublish grades")
    
    # Check if teacher owns course
    if user.role == "TEACHER":
        course = await Course.get(course_id)
        if not course or course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized for this course")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    # Unpublish grades
    result = await grading_service.unpublish_course_grades(
        course_id=course_id,
        term=resolved_term,
=======
    # Unpublish grades
    result = await grading_service.unpublish_course_grades(
        course_id=course_id,
        term=term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        reason=reason
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════════

@router.get("/my-grades")
async def get_my_grade(
    course_id: str = Query(..., description="Course ID"),
    current_user: str = Depends(get_current_user)
):
    """
    Get my grade for a course (STUDENT)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their grades")
    
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get grade
    grade = await grading_service.get_student_grade(
        student_id=str(user.id),
        course_id=course_id,
        term=course.term
    )
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    # Check if published
    if grade.status != "PUBLISHED":
        raise HTTPException(status_code=403, detail="Grades not published yet")
    
    return {
        "course_code": grade.course_code,
        "course_name": course.course_name,
        "term": grade.term,
        "credit_hours": grade.credit_hours,
        "is_published": True,
        "components": {
            "quizzes": {
                "quiz1": {"obtained": grade.components.get("quiz1"), "max": 3},
                "quiz2": {"obtained": grade.components.get("quiz2"), "max": 3},
                "quiz3": {"obtained": grade.components.get("quiz3"), "max": 4},
                "total": {
                    "obtained": sum(filter(None, [grade.components.get(f"quiz{i}") for i in range(1, 4)])),
                    "max": 10
                }
            },
            "assignments": {
                "assignment1": {"obtained": grade.components.get("assignment1"), "max": 3},
                "assignment2": {"obtained": grade.components.get("assignment2"), "max": 3},
                "assignment3": {"obtained": grade.components.get("assignment3"), "max": 4},
                "total": {
                    "obtained": sum(filter(None, [grade.components.get(f"assignment{i}") for i in range(1, 4)])),
                    "max": 10
                }
            },
            "midterm": {"obtained": grade.components.get("midterm"), "max": 30},
            "final": {"obtained": grade.components.get("final"), "max": 50}
        },
        "total_marks": grade.total_marks,
        "letter_grade": grade.letter_grade,
        "grade_points": grade.grade_points
    }

@router.get("/my-grades/all")
async def get_all_my_grades(
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Term (e.g., 2024F)"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Get all my grades for a term (STUDENT)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their grades")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    # Get grades
    grades = await grading_service.get_student_grades_for_term(
        student_id=str(user.id),
        term=resolved_term
=======
    # Get grades
    grades = await grading_service.get_student_grades_for_term(
        student_id=str(user.id),
        term=term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    )
    
    # Build response
    courses = []
    for grade in grades:
        course = await Course.get(grade.course_id)
        courses.append({
            "course_code": grade.course_code,
            "course_name": course.course_name if course else "Unknown",
            "credit_hours": grade.credit_hours,
            "total_marks": grade.total_marks,
            "letter_grade": grade.letter_grade,
            "grade_points": grade.grade_points
        })
    
    # Calculate semester GPA if grades exist
    semester_gpa = None
    total_credits = 0
    if grades:
        try:
            gpa_record = await grading_service.calculate_semester_gpa(
                student_id=str(user.id),
<<<<<<< HEAD
                term=resolved_term
=======
                term=term
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
            )
            semester_gpa = gpa_record.semester_gpa
            total_credits = gpa_record.total_credits
        except:
            pass
    
    return {
<<<<<<< HEAD
        "term": resolved_term,
=======
        "term": term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        "courses": courses,
        "semester_gpa": semester_gpa,
        "total_credits": total_credits
    }

# ═══════════════════════════════════════════════════════════════════
# GPA/CGPA CALCULATION
# ═══════════════════════════════════════════════════════════════════

@router.get("/gpa")
async def get_semester_gpa(
<<<<<<< HEAD
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
=======
    term: str = Query(..., description="Term (e.g., 2024F)"),
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    current_user: str = Depends(get_current_user)
):
    """
    Get semester GPA (STUDENT)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their GPA")
    
<<<<<<< HEAD
    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    # Calculate/get semester GPA
    gpa_record = await grading_service.calculate_semester_gpa(
        student_id=str(user.id),
        term=resolved_term
    )
    
    return {
        "term": resolved_term,
=======
    # Calculate/get semester GPA
    gpa_record = await grading_service.calculate_semester_gpa(
        student_id=str(user.id),
        term=term
    )
    
    return {
        "term": term,
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        "courses": gpa_record.courses,
        "semester_gpa": gpa_record.semester_gpa,
        "total_credits": gpa_record.total_credits,
        "calculation": f"Σ(grade_points × credits) / Σ(credits) = {gpa_record.semester_gpa}"
    }

@router.get("/cgpa")
async def get_cgpa(
    current_user: str = Depends(get_current_user)
):
    """
    Get cumulative GPA (STUDENT)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view their CGPA")
    
    # Calculate/get CGPA
    cgpa_record = await grading_service.calculate_cgpa(
        student_id=str(user.id)
    )
    
    progress_percentage = round((cgpa_record.total_credits / cgpa_record.credits_required) * 100, 1)
    
    return {
        "semesters": cgpa_record.semesters,
        "cgpa": cgpa_record.cgpa,
        "total_credits": cgpa_record.total_credits,
        "credits_required": cgpa_record.credits_required,
        "progress_percentage": progress_percentage
    }

# ═══════════════════════════════════════════════════════════════════
# ADMIN FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/admin/override")
async def override_grade(
    override_data: GradeOverride,
    current_user: str = Depends(get_current_user)
):
    """
    Override a student's grade (ADMIN ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can override grades")
    
    # Override grade
    grade = await grading_service.override_grade(
        student_id=override_data.student_id,
        course_id=override_data.course_id,
        term=override_data.term,
        new_total_marks=override_data.new_total_marks,
        new_letter_grade=override_data.new_letter_grade,
        new_grade_points=override_data.new_grade_points,
        reason=override_data.reason,
        admin_username=user.username
    )
    
    # Get student and course info
    student = await User.get(override_data.student_id)
    course = await Course.get(override_data.course_id)
    
    return {
        "message": "Grade overridden successfully",
        "student_username": student.username if student else "Unknown",
        "course_code": course.course_code if course else "Unknown",
        "old_grade": f"{grade.original_grade} ({grade.original_marks})",
        "new_grade": f"{grade.letter_grade} ({grade.total_marks})",
        "overridden_by": user.username,
        "reason": override_data.reason,
        "overridden_at": grade.overridden_at
    }
<<<<<<< HEAD


# ═══════════════════════════════════════════════════════════════════
# MANAGE RESULTS (TEACHER)
# ═══════════════════════════════════════════════════════════════════

@router.get("/manage-results/course/{course_id}")
async def get_manage_results(
    course_id: str,
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
    current_user: str = Depends(get_current_user)
):
    """Get compiled results for teacher manage-results panel."""
    user = await get_current_user_object(current_user)
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers can manage results")

    if user.role == "TEACHER":
        course = await Course.get(course_id)
        if not course or course.teacher_id != user.username:
            raise HTTPException(status_code=403, detail="Not authorized for this course")

    # Resolve term
    resolved_term = resolve_term(term) if term else get_current_academic_term()

    await grading_service.calculate_course_grades(course_id, resolved_term)
    return await grading_service.get_course_grades_for_manage(course_id, resolved_term)


@router.put("/manage-results/student")
async def update_manage_result(
    body: UpdateResultMarks,
    current_user: str = Depends(get_current_user)
):
    """Teacher updates marks and feedback before submitting to exam dept."""
    user = await get_current_user_object(current_user)
    if user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Only teachers can update results")

    course = await Course.get(body.course_id)
    if not course or course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")

    grade = await grading_service.upsert_course_grade(
        student_id=body.student_id,
        course_id=body.course_id,
        term=resolve_term(body.term),
        components=body.components,
        component_feedback=body.component_feedback,
        teacher_remarks=body.teacher_remarks,
    )
    return {
        "message": "Result updated",
        "student_id": grade.student_id,
        "total_marks": grade.total_marks,
        "is_complete": grade.is_complete,
        "workflow_status": grade.workflow_status,
    }


@router.post("/manage-results/submit")
async def submit_results_to_exam_dept(
    course_id: str = Query(...),
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """Teacher submits compiled course results to exam department."""
    user = await get_current_user_object(current_user)
    if user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Only teachers can submit results")

    course = await Course.get(course_id)
    if not course or course.teacher_id != user.username:
        raise HTTPException(status_code=403, detail="Not authorized for this course")

    resolved_term = resolve_term(term)

    return await grading_service.submit_course_results_to_exam_dept(
        course_id=course_id,
        term=resolved_term,
        teacher_username=user.username,
    )


# ═══════════════════════════════════════════════════════════════════
# MANAGE RESULTS (EXAM DEPARTMENT)
# ═══════════════════════════════════════════════════════════════════

@router.get("/exam-dept/pending")
async def get_exam_dept_pending_results(
    term: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user)
):
    """Exam management admin views submitted results."""
    user = await get_current_user_object(current_user)
    require_exam_management_view(user)
    return await grading_service.get_submitted_results_for_exam_dept(term)
    resolved_term = resolve_term(term) if term else None
    return await grading_service.get_submitted_results_for_exam_dept(resolved_term)


@router.put("/exam-dept/student")
async def exam_dept_update_result(
    body: UpdateResultMarks,
    current_user: str = Depends(get_current_user)
):
    """Exam department edits submitted results."""
    user = await get_current_user_object(current_user)
    require_exam_management_edit(user)

    grade = await grading_service.exam_dept_update_grade(
        student_id=body.student_id,
        course_id=body.course_id,
        term=resolve_term(body.term),
        components=body.components,
        component_feedback=body.component_feedback,
        teacher_remarks=body.teacher_remarks,
        reviewer_username=user.username,
    )
    return {
        "message": "Result updated by exam department",
        "total_marks": grade.total_marks,
        "letter_grade": grade.letter_grade,
        "workflow_status": grade.workflow_status,
    }


@router.post("/exam-dept/publish")
async def exam_dept_publish_results(
    course_id: str = Query(...),
    term: str = Query(..., description="Academic term"),
    current_user: str = Depends(get_current_user)
):
    """Exam department publishes results to students and generates CGPA when complete."""
    user = await get_current_user_object(current_user)
    require_exam_management_edit(user)
    resolved_term = resolve_term(term)
    return await grading_service.publish_course_results_to_students(
        course_id=course_id,
        term=resolved_term,
        publisher_username=user.username,
    )


# ═══════════════════════════════════════════════════════════════════
# STUDENT RESULTS & TRANSCRIPT
# ═══════════════════════════════════════════════════════════════════

@router.get("/my-results")
async def get_my_results(
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
    current_user: str = Depends(get_current_user)
):
    """Student views published marks; CGPA/transcript when all courses complete."""
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can view results")
    resolved_term = resolve_term(term) if term else get_current_academic_term()
    return await grading_service.get_student_results_summary(str(user.id), resolved_term)


@router.get("/my-results/transcript")
async def get_my_transcript(
    term: Optional[str] = Query(None, description="Term (e.g., 2024F, Fall, Spring)"),
    current_user: str = Depends(get_current_user)
):
    """Download transcript data when all course marks are published."""
    user = await get_current_user_object(current_user)
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can download transcript")
    resolved_term = resolve_term(term) if term else get_current_academic_term()
    return await grading_service.get_student_transcript(str(user.id), resolved_term)
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
