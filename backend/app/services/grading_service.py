"""
Grading Service
Handles business logic for final grades, GPA, and CGPA calculation
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.grading import Grade, SemesterGPA, CGPA, convert_to_letter_grade
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.assignment import Assignment, Submission
from app.models.ai_exam import ExamResult
from app.models.user import User
from beanie import PydanticObjectId
from beanie.operators import In



async def fetch_component_marks(student_id: str, course_id: str, term: str) -> Dict[str, Optional[float]]:
    """
    Fetch all component marks for a student in a course
    
    Args:
        student_id: Student ID
        course_id: Course ID
        term: Term
    
    Returns:
        Dict of component marks
    """
    components = {
        "quiz1": None,
        "quiz2": None,
        "quiz3": None,
        "assignment1": None,
        "assignment2": None,
        "assignment3": None,
        "midterm": None,
        "final": None,
    }
    
    # Fetch quiz marks
    for i in range(1, 4):
        quiz = await Assignment.find_one(
            Assignment.course_id == course_id,
            Assignment.type == "QUIZ",
            Assignment.number == i,
            Assignment.status == "PUBLISHED"
        )
        
        if quiz:
            submission = await Submission.find_one(
                Submission.assignment_id == str(quiz.id),
                Submission.student_id == student_id,
                Submission.status == "GRADED"
            )
            
            if submission and submission.marks_obtained is not None:
                components[f"quiz{i}"] = submission.marks_obtained
    
    # Fetch assignment marks
    for i in range(1, 4):
        assignment = await Assignment.find_one(
            Assignment.course_id == course_id,
            Assignment.type == "ASSIGNMENT",
            Assignment.number == i,
            Assignment.status == "PUBLISHED"
        )
        
        if assignment:
            submission = await Submission.find_one(
                Submission.assignment_id == str(assignment.id),
                Submission.student_id == student_id,
                Submission.status == "GRADED"
            )
            
            if submission and submission.marks_obtained is not None:
                components[f"assignment{i}"] = submission.marks_obtained
    
    # Fetch midterm and final exam marks ONLY from teacher-checked submissions
    course = await Course.get(course_id)
    if course:
        student = await User.get(student_id)
        if student:
            from beanie import PydanticObjectId
            from app.models.exam import ManualExam, ManualExamSubmission
            from app.models.ai_exam import AiExam, AiExamSubmission

            # --- Manual exam submissions checked by teacher ---
            manual_subs = await ManualExamSubmission.find(
                ManualExamSubmission.studentUsername == student.username,
                ManualExamSubmission.checkedByTeacher == True,
            ).to_list()

            for sub in manual_subs:
                try:
                    exam = await ManualExam.get(PydanticObjectId(sub.examId))
                except Exception:
                    continue
                if not exam:
                    continue
                # Only include if this exam belongs to the current course
                exam_course_id = getattr(exam, "courseId", None)
                exam_course_code = getattr(exam, "courseCode", None)
                if exam_course_id and exam_course_id != course_id:
                    continue
                if not exam_course_id and exam_course_code and exam_course_code != course.course_code:
                    continue
                exam_type = (getattr(exam, "examType", "") or "").lower()
                exam_title = (getattr(exam, "title", "") or "").lower()
                obtained = float(sub.totalMarks or 0)

                if "final" in exam_type or "final" in exam_title:
                    components["final"] = obtained
                elif "mid" in exam_type or "mid" in exam_title:
                    components["midterm"] = obtained

            # --- AI exam submissions checked by teacher ---
            ai_subs = await AiExamSubmission.find(
                AiExamSubmission.student_username == student.username,
                AiExamSubmission.checked == True,
            ).to_list()

            for sub in ai_subs:
                try:
                    exam = await AiExam.get(PydanticObjectId(sub.exam_id))
                except Exception:
                    continue
                if not exam:
                    continue
                exam_course_id = getattr(exam, "course_id", None)
                exam_course_code = getattr(exam, "course_code", None)
                if exam_course_id and exam_course_id != course_id:
                    continue
                if not exam_course_id and exam_course_code and exam_course_code != course.course_code:
                    continue
                exam_type = (getattr(exam, "exam_type", "") or "").lower()
                exam_title = (getattr(exam, "topic", "") or "").lower()
                # Get obtained marks from the ExamResult record
                result = await ExamResult.find_one(
                    ExamResult.exam_id == sub.exam_id,
                    ExamResult.student_username == student.username,
                )
                if not result:
                    continue
                obtained = float(result.obtained_marks)

                if "final" in exam_type or "final" in exam_title:
                    components["final"] = obtained
                elif "mid" in exam_type or "mid" in exam_title:
                    components["midterm"] = obtained

    return components


def calculate_total_marks(components: Dict[str, Optional[float]]) -> Optional[float]:
    """
    Calculate total marks from components (running sum of non-None values)
    
    Args:
        components: Dict of component marks
    
    Returns:
        Total marks or None if no components are graded
    """
    total = 0.0
    has_any = False
    
    required_components = ["quiz1", "quiz2", "quiz3", "assignment1", "assignment2", "assignment3", "midterm", "final"]
    for component in required_components:
        val = components.get(component)
        if val is not None:
            total += val
            has_any = True
            
    return round(total, 2) if has_any else None



def is_grade_complete(components: Dict[str, Optional[float]]) -> bool:
    """
    Check if all grade components are present
    
    Args:
        components: Dict of component marks
    
    Returns:
        True if complete
    """
    required_components = ["quiz1", "quiz2", "quiz3", "assignment1", "assignment2", "assignment3", "midterm", "final"]
    
    for component in required_components:
        if components.get(component) is None:
            return False
    
    return True


async def calculate_course_grades(course_id: str, term: str) -> Dict:
    """
    Calculate grades for all students in a course
    
    Args:
        course_id: Course ID
        term: Term
    
    Returns:
        Summary dict
    """
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get enrolled students
    enrollments = await Enrollment.find(
        Enrollment.course_id == course_id,
        In(Enrollment.term, [term, "ALL", "all"]),
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    if not enrollments:
        return {
            "message": "Grades calculated for 0 students",
            "course_code": course.course_code,
            "calculated_count": 0,
            "incomplete_count": 0,
            "status": "CALCULATED"
        }

    # ----------------- OPTIMIZED CACHING -----------------
    student_ids = [e.student_id for e in enrollments]
    student_usernames = [e.student_username for e in enrollments]

    # 1. Fetch all published assignments / quizzes for the course
    all_published_assignments = await Assignment.find(
        Assignment.course_id == course_id,
        Assignment.status == "PUBLISHED"
    ).to_list()

    assignment_map = {}  # keys: (type, number), values: assignment_id (str)
    assignment_ids = []
    for assign in all_published_assignments:
        key = (assign.type, assign.number)
        assignment_map[key] = str(assign.id)
        assignment_ids.append(str(assign.id))

    # 2. Fetch all graded submissions for these assignments and students
    submission_map = {}  # keys: (assignment_id, student_id), values: marks_obtained
    if assignment_ids:
        submissions = await Submission.find(
            In(Submission.assignment_id, assignment_ids),
            In(Submission.student_id, student_ids),
            Submission.status == "GRADED"
        ).to_list()
        for sub in submissions:
            if sub.marks_obtained is not None:
                submission_map[(sub.assignment_id, sub.student_id)] = sub.marks_obtained

    # 3. Fetch all manual exams and their submissions checked by teacher
    from beanie import PydanticObjectId
    from app.models.exam import ManualExam, ManualExamSubmission
    from app.models.ai_exam import AiExam, AiExamSubmission

    manual_exams = await ManualExam.find({
        "$or": [
            {"courseId": course_id},
            {"courseCode": course.course_code}
        ]
    }).to_list()
    manual_exam_map = {str(exam.id): exam for exam in manual_exams}

    manual_subs = await ManualExamSubmission.find(
        In(ManualExamSubmission.studentUsername, student_usernames),
        ManualExamSubmission.checkedByTeacher == True
    ).to_list()

    manual_sub_map = {}
    for sub in manual_subs:
        manual_sub_map.setdefault(sub.studentUsername, []).append(sub)

    # 4. Fetch all AI exams and their submissions/results checked by teacher
    ai_exams = await AiExam.find({
        "$or": [
            {"course_id": course_id},
            {"course_code": course.course_code}
        ]
    }).to_list()
    ai_exam_map = {str(exam.id): exam for exam in ai_exams}
    ai_exam_ids = list(ai_exam_map.keys())

    ai_subs = []
    exam_results_map = {}
    if ai_exam_ids:
        ai_subs = await AiExamSubmission.find(
            In(AiExamSubmission.student_username, student_usernames),
            AiExamSubmission.checked == True
        ).to_list()

        exam_results = await ExamResult.find(
            In(ExamResult.exam_id, ai_exam_ids),
            In(ExamResult.student_username, student_usernames)
        ).to_list()
        for res in exam_results:
            exam_results_map[(res.exam_id, res.student_username)] = res.obtained_marks

    ai_sub_map = {}
    for sub in ai_subs:
        ai_sub_map.setdefault(sub.student_username, []).append(sub)

    # 5. Fetch all existing grade records for this course and term
    existing_grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term,
        In(Grade.student_id, student_ids)
    ).to_list()
    existing_grade_map = {grade.student_id: grade for grade in existing_grades}
    # -----------------------------------------------------

    calculated_count = 0
    incomplete_count = 0
    
    for enrollment in enrollments:
        # Construct student components in-memory
        components = {
            "quiz1": None,
            "quiz2": None,
            "quiz3": None,
            "assignment1": None,
            "assignment2": None,
            "assignment3": None,
            "midterm": None,
            "final": None,
        }

        # Quizzes
        for i in range(1, 4):
            assign_id = assignment_map.get(("QUIZ", i))
            if assign_id:
                obtained = submission_map.get((assign_id, enrollment.student_id))
                if obtained is not None:
                    components[f"quiz{i}"] = obtained

        # Assignments
        for i in range(1, 4):
            assign_id = assignment_map.get(("ASSIGNMENT", i))
            if assign_id:
                obtained = submission_map.get((assign_id, enrollment.student_id))
                if obtained is not None:
                    components[f"assignment{i}"] = obtained

        # Manual Exams
        for sub in manual_sub_map.get(enrollment.student_username, []):
            exam = manual_exam_map.get(str(sub.examId))
            if not exam:
                continue
            exam_type = (getattr(exam, "examType", "") or "").lower()
            exam_title = (getattr(exam, "title", "") or "").lower()
            obtained = float(sub.totalMarks or 0)

            if "final" in exam_type or "final" in exam_title:
                components["final"] = obtained
            elif "mid" in exam_type or "mid" in exam_title:
                components["midterm"] = obtained

        # AI Exams
        for sub in ai_sub_map.get(enrollment.student_username, []):
            exam = ai_exam_map.get(str(sub.exam_id))
            if not exam:
                continue
            exam_type = (getattr(exam, "exam_type", "") or "").lower()
            exam_title = (getattr(exam, "topic", "") or "").lower()
            obtained_marks = exam_results_map.get((sub.exam_id, enrollment.student_username))
            if obtained_marks is None:
                continue
            obtained = float(obtained_marks)

            if "final" in exam_type or "final" in exam_title:
                components["final"] = obtained
            elif "mid" in exam_type or "mid" in exam_title:
                components["midterm"] = obtained
        
        # Calculate total
        total_marks = calculate_total_marks(components)
        is_complete = is_grade_complete(components)
        
        # Convert to letter grade
        letter_grade = None
        grade_points = None
        if is_complete and total_marks is not None:
            letter_grade, grade_points = convert_to_letter_grade(total_marks)
        
        # Check if grade already exists
        existing_grade = existing_grade_map.get(enrollment.student_id)
        
        if existing_grade:
            # Overwrite components with the latest fetched marks if they differ
            merged = existing_grade.components.copy() if existing_grade.components else {}
            changed = False
            for k, v in components.items():
                if v is not None and merged.get(k) != v:
                    merged[k] = v
                    changed = True

            # Recalculate totals based on merged components
            total_marks = calculate_total_marks(merged)
            is_complete = is_grade_complete(merged)

            letter_grade, grade_points = None, None
            if is_complete and total_marks is not None:
                letter_grade, grade_points = convert_to_letter_grade(total_marks)


            # Only write to database if actual values have changed
            if (
                changed or
                existing_grade.total_marks != total_marks or
                existing_grade.is_complete != is_complete or
                existing_grade.letter_grade != letter_grade or
                existing_grade.grade_points != grade_points
            ):
                update_fields = {
                    Grade.components: merged,
                    Grade.total_marks: total_marks,
                    Grade.letter_grade: letter_grade,
                    Grade.grade_points: grade_points,
                    Grade.is_complete: is_complete,
                    Grade.updated_at: datetime.now(timezone.utc)
                }
                if existing_grade.workflow_status == "DRAFT":
                    update_fields[Grade.status] = "CALCULATED"
                await existing_grade.set(update_fields)
        else:
            # Create new grade
            grade = Grade(
                student_id=enrollment.student_id,
                student_username=enrollment.student_username,
                course_id=course_id,
                course_code=course.course_code,
                term=term,
                credit_hours=course.credit_hours,
                components=components,
                total_marks=total_marks,
                letter_grade=letter_grade,
                grade_points=grade_points,
                is_complete=is_complete,
                status="CALCULATED"
            )
            await grade.insert()
        
        if is_complete:
            calculated_count += 1
        else:
            incomplete_count += 1
    
    return {
        "message": f"Grades calculated for {calculated_count + incomplete_count} students",
        "course_code": course.course_code,
        "calculated_count": calculated_count,
        "incomplete_count": incomplete_count,
        "status": "CALCULATED"
    }


async def publish_course_grades(course_id: str, term: str, publisher_username: str) -> Dict:
    """
    Publish grades for a course
    
    Args:
        course_id: Course ID
        term: Term
        publisher_username: Username of publisher
    
    Returns:
        Summary dict
    """
    # Get course
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get all grades for course
    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term,
        Grade.status == "CALCULATED"
    ).to_list()
    
    if not grades:
        raise HTTPException(status_code=404, detail="No calculated grades found for this course")
    
    # Check if all grades are complete
    incomplete_grades = [g for g in grades if not g.is_complete]
    if incomplete_grades:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot publish: {len(incomplete_grades)} students have incomplete grades"
        )
    
    # Publish all grades
    published_count = 0
    for grade in grades:
        await grade.set({
            Grade.status: "PUBLISHED",
            Grade.published_at: datetime.now(timezone.utc),
            Grade.published_by: publisher_username,
            Grade.updated_at: datetime.now(timezone.utc)
        })
        published_count += 1
    
    return {
        "message": f"Grades published for {course.course_code}",
        "course_code": course.course_code,
        "published_count": published_count,
        "published_at": datetime.now(timezone.utc)
    }


async def unpublish_course_grades(course_id: str, term: str, reason: str) -> Dict:
    """
    Unpublish grades for a course
    
    Args:
        course_id: Course ID
        term: Term
        reason: Reason for unpublishing
    
    Returns:
        Summary dict
    """
    # Get grades
    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term,
        Grade.status == "PUBLISHED"
    ).to_list()
    
    if not grades:
        raise HTTPException(status_code=404, detail="No published grades found")
    
    # Unpublish all grades
    for grade in grades:
        await grade.set({
            Grade.status: "CALCULATED",
            Grade.published_at: None,
            Grade.published_by: None,
            Grade.updated_at: datetime.now(timezone.utc)
        })
    
    return {
        "message": "Grades unpublished",
        "reason": reason,
        "unpublished_count": len(grades)
    }


async def get_student_grade(student_id: str, course_id: str, term: str) -> Optional[Grade]:
    """
    Get grade for a student in a course
    
    Args:
        student_id: Student ID
        course_id: Course ID
        term: Term
    
    Returns:
        Grade or None
    """
    grade = await Grade.find_one(
        Grade.student_id == student_id,
        Grade.course_id == course_id,
        Grade.term == term
    )
    
    return grade


async def get_student_grades_for_term(student_id: str, term: str) -> List[Grade]:
    """
    Get all grades for a student in a term
    
    Args:
        student_id: Student ID
        term: Term
    
    Returns:
        List of grades
    """
    grades = await Grade.find(
        Grade.student_id == student_id,
        Grade.term == term,
        Grade.status == "PUBLISHED"
    ).to_list()
    
    return grades


async def calculate_semester_gpa(student_id: str, term: str) -> SemesterGPA:
    """
    Calculate semester GPA for a student
    
    Args:
        student_id: Student ID
        term: Term
    
    Returns:
        SemesterGPA object
    """
    # Get all published grades for term
    grades = await Grade.find(
        Grade.student_id == student_id,
        Grade.term == term,
        Grade.status == "PUBLISHED",
        Grade.is_complete == True
    ).to_list()
    
    if not grades:
        raise HTTPException(status_code=404, detail="No published grades found for this term")
    
    # Calculate GPA
    total_points = 0.0
    total_credits = 0
    courses = []
    
    for grade in grades:
        if grade.grade_points is not None:
            total_points += grade.grade_points * grade.credit_hours
            total_credits += grade.credit_hours
            
            courses.append({
                "course_id": grade.course_id,
                "course_code": grade.course_code,
                "credit_hours": grade.credit_hours,
                "grade_points": grade.grade_points
            })
    
    semester_gpa = round(total_points / total_credits, 2) if total_credits > 0 else 0.0
    
    # Check if semester GPA already exists
    existing_gpa = await SemesterGPA.find_one(
        SemesterGPA.student_id == student_id,
        SemesterGPA.term == term
    )
    
    if existing_gpa:
        # Update existing
        await existing_gpa.set({
            SemesterGPA.courses: courses,
            SemesterGPA.semester_gpa: semester_gpa,
            SemesterGPA.total_credits: total_credits,
            SemesterGPA.updated_at: datetime.now(timezone.utc)
        })
        return existing_gpa
    else:
        # Create new
        from app.models.user import User
        user = await User.get(student_id)
        
        gpa_record = SemesterGPA(
            student_id=student_id,
            student_username=user.username if user else "Unknown",
            term=term,
            courses=courses,
            semester_gpa=semester_gpa,
            total_credits=total_credits
        )
        await gpa_record.insert()
        return gpa_record


async def calculate_cgpa(student_id: str) -> CGPA:
    """
    Calculate cumulative GPA for a student
    
    Args:
        student_id: Student ID
    
    Returns:
        CGPA object
    """
    # Get all semester GPAs
    semester_gpas = await SemesterGPA.find(
        SemesterGPA.student_id == student_id
    ).to_list()
    
    if not semester_gpas:
        from app.models.user import User
        user = await User.get(student_id)
        return CGPA(
            student_id=student_id,
            student_username=user.username if user else "Unknown",
            semesters=[],
            cgpa=0.0,
            total_credits=0,
            credits_required=130
        )
    
    # Calculate CGPA
    total_points = 0.0
    total_credits = 0
    semesters = []
    
    for sem_gpa in semester_gpas:
        if sem_gpa.semester_gpa is not None:
            total_points += sem_gpa.semester_gpa * sem_gpa.total_credits
            total_credits += sem_gpa.total_credits
            
            semesters.append({
                "term": sem_gpa.term,
                "gpa": sem_gpa.semester_gpa,
                "credits": sem_gpa.total_credits
            })
    
    cgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0.0
    
    # Check if CGPA already exists
    existing_cgpa = await CGPA.find_one(CGPA.student_id == student_id)
    
    if existing_cgpa:
        # Update existing
        await existing_cgpa.set({
            CGPA.semesters: semesters,
            CGPA.cgpa: cgpa,
            CGPA.total_credits: total_credits,
            CGPA.updated_at: datetime.now(timezone.utc)
        })
        return existing_cgpa
    else:
        # Create new
        from app.models.user import User
        user = await User.get(student_id)
        
        cgpa_record = CGPA(
            student_id=student_id,
            student_username=user.username if user else "Unknown",
            semesters=semesters,
            cgpa=cgpa,
            total_credits=total_credits,
            credits_required=130  # BSE requirement
        )
        await cgpa_record.insert()
        return cgpa_record


async def override_grade(
    student_id: str,
    course_id: str,
    term: str,
    new_total_marks: float,
    new_letter_grade: str,
    new_grade_points: float,
    reason: str,
    admin_username: str
) -> Grade:
    """
    Override a student's grade (admin only)
    
    Args:
        student_id: Student ID
        course_id: Course ID
        term: Term
        new_total_marks: New total marks
        new_letter_grade: New letter grade
        new_grade_points: New grade points
        reason: Reason for override
        admin_username: Admin username
    
    Returns:
        Updated grade
    """
    # Get grade
    grade = await Grade.find_one(
        Grade.student_id == student_id,
        Grade.course_id == course_id,
        Grade.term == term
    )
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    # Save original values if not already overridden
    if not grade.is_overridden:
        original_marks = grade.total_marks
        original_grade = grade.letter_grade
    else:
        original_marks = grade.original_marks
        original_grade = grade.original_grade
    
    # Update grade
    await grade.set({
        Grade.total_marks: new_total_marks,
        Grade.letter_grade: new_letter_grade,
        Grade.grade_points: new_grade_points,
        Grade.is_overridden: True,
        Grade.override_reason: reason,
        Grade.overridden_by: admin_username,
        Grade.overridden_at: datetime.now(timezone.utc),
        Grade.original_marks: original_marks,
        Grade.original_grade: original_grade,
        Grade.updated_at: datetime.now(timezone.utc)
    })
    
    return grade


def _recalculate_grade_fields(grade: Grade) -> None:
    """Recalculate totals from grade components in-place."""
    total_marks = calculate_total_marks(grade.components)
    grade.is_complete = is_grade_complete(grade.components)
    grade.total_marks = total_marks
    if grade.is_complete and total_marks is not None:
        letter, points = convert_to_letter_grade(total_marks)
        grade.letter_grade = letter
        grade.grade_points = points
    else:
        grade.letter_grade = None
        grade.grade_points = None



async def upsert_course_grade(
    student_id: str,
    course_id: str,
    term: str,
    components: Optional[Dict[str, Optional[float]]] = None,
    component_feedback: Optional[Dict[str, Optional[str]]] = None,
    teacher_remarks: Optional[str] = None,
) -> Grade:
    """Create or update a grade record with optional component overrides."""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    student = await User.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = await Grade.find_one(
        Grade.student_id == student_id,
        Grade.course_id == course_id,
        Grade.term == term,
    )

    if existing:
        if existing.workflow_status == "PUBLISHED":
            raise HTTPException(status_code=400, detail="Published results cannot be edited by teacher")
        merged_components = existing.components.copy()
        if components:
            merged_components.update({k: v for k, v in components.items() if v is not None})
        merged_feedback = existing.component_feedback.copy()
        if component_feedback:
            merged_feedback.update(component_feedback)
        existing.components = merged_components
        existing.component_feedback = merged_feedback
        if teacher_remarks is not None:
            existing.teacher_remarks = teacher_remarks
        _recalculate_grade_fields(existing)
        existing.updated_at = datetime.now(timezone.utc)
        await existing.set({
            Grade.components: existing.components,
            Grade.component_feedback: existing.component_feedback,
            Grade.teacher_remarks: existing.teacher_remarks,
            Grade.total_marks: existing.total_marks,
            Grade.letter_grade: existing.letter_grade,
            Grade.grade_points: existing.grade_points,
            Grade.is_complete: existing.is_complete,
            Grade.updated_at: existing.updated_at,
        })
        return existing

    base_components = await fetch_component_marks(student_id, course_id, term)
    if components:
        base_components.update({k: v for k, v in components.items() if v is not None})

    grade = Grade(
        student_id=student_id,
        student_username=student.username,
        course_id=course_id,
        course_code=course.course_code,
        term=term,
        credit_hours=course.credit_hours,
        components=base_components,
        component_feedback=component_feedback or {},
        teacher_remarks=teacher_remarks,
        status="CALCULATED",
        workflow_status="DRAFT",
    )
    _recalculate_grade_fields(grade)
    await grade.insert()
    return grade


async def get_course_grades_for_manage(course_id: str, term: str) -> Dict:
    """Return course grades formatted for teacher manage-results panel."""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term,
    ).to_list()

    student_ids = [grade.student_id for grade in grades]
    valid_oids = []
    for sid in student_ids:
        try:
            valid_oids.append(PydanticObjectId(sid))
        except Exception:
            pass
    users = await User.find(In(User.id, valid_oids)).to_list() if valid_oids else []
    user_map = {str(u.id): u for u in users}

    students = []
    for grade in grades:
        student = user_map.get(grade.student_id)
        students.append({
            "student_id": grade.student_id,
            "registration_no": grade.student_username,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "components": grade.components,
            "component_feedback": grade.component_feedback,
            "teacher_remarks": grade.teacher_remarks,
            "total_marks": grade.total_marks,
            "letter_grade": grade.letter_grade,
            "is_complete": grade.is_complete,
            "workflow_status": grade.workflow_status,
        })

    return {
        "course_id": course_id,
        "course_code": course.course_code,
        "course_name": course.course_name,
        "term": term,
        "students": students,
    }



async def submit_course_results_to_exam_dept(
    course_id: str,
    term: str,
    teacher_username: str,
) -> Dict:
    """Teacher submits compiled course results to exam department."""
    await calculate_course_grades(course_id, term)

    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term,
    ).to_list()

    if not grades:
        raise HTTPException(status_code=404, detail="No grades found for this course")

    submitted = 0
    for grade in grades:
        if grade.workflow_status == "PUBLISHED":
            continue
        await grade.set({
            Grade.workflow_status: "SUBMITTED",
            Grade.submitted_to_exam_at: datetime.now(timezone.utc),
            Grade.submitted_by: teacher_username,
            Grade.updated_at: datetime.now(timezone.utc),
        })
        submitted += 1

    course = await Course.get(course_id)
    return {
        "message": f"Submitted {submitted} student results to exam department",
        "course_code": course.course_code if course else course_id,
        "submitted_count": submitted,
    }


async def get_submitted_results_for_exam_dept(term: Optional[str] = None) -> List[Dict]:
    """List all results submitted to exam department."""
    query = Grade.find(In(Grade.workflow_status, ["SUBMITTED", "EXAM_REVIEWED"]))
    if term:
        query = query.find(Grade.term == term)
    grades = await query.to_list()

    course_ids = list(set(grade.course_id for grade in grades))
    student_ids = list(set(grade.student_id for grade in grades))

    valid_course_oids = []
    for cid in course_ids:
        try:
            valid_course_oids.append(PydanticObjectId(cid))
        except Exception:
            pass

    valid_student_oids = []
    for sid in student_ids:
        try:
            valid_student_oids.append(PydanticObjectId(sid))
        except Exception:
            pass

    courses = await Course.find(In(Course.id, valid_course_oids)).to_list() if valid_course_oids else []
    course_map = {str(c.id): c for c in courses}

    users = await User.find(In(User.id, valid_student_oids)).to_list() if valid_student_oids else []
    user_map = {str(u.id): u for u in users}

    grouped: Dict[str, Dict] = {}
    for grade in grades:
        key = f"{grade.course_id}:{grade.term}"
        if key not in grouped:
            course = course_map.get(grade.course_id)
            grouped[key] = {
                "course_id": grade.course_id,
                "course_code": grade.course_code,
                "course_name": course.course_name if course else "Unknown",
                "term": grade.term,
                "workflow_status": grade.workflow_status,
                "students": [],
            }
        student = user_map.get(grade.student_id)
        grouped[key]["students"].append({
            "grade_id": str(grade.id),
            "student_id": grade.student_id,
            "registration_no": grade.student_username,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "components": grade.components,
            "component_feedback": grade.component_feedback,
            "teacher_remarks": grade.teacher_remarks,
            "total_marks": grade.total_marks,
            "letter_grade": grade.letter_grade,
            "is_complete": grade.is_complete,
            "workflow_status": grade.workflow_status,
        })

    return list(grouped.values())



async def exam_dept_update_grade(
    student_id: str,
    course_id: str,
    term: str,
    components: Optional[Dict[str, Optional[float]]] = None,
    component_feedback: Optional[Dict[str, Optional[str]]] = None,
    teacher_remarks: Optional[str] = None,
    reviewer_username: str = "",
) -> Grade:
    """Exam department edits submitted results."""
    grade = await Grade.find_one(
        Grade.student_id == student_id,
        Grade.course_id == course_id,
        Grade.term == term,
    )
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    if grade.workflow_status not in ["SUBMITTED", "EXAM_REVIEWED"]:
        raise HTTPException(status_code=400, detail="Result is not with exam department")

    if components:
        merged = grade.components.copy()
        merged.update({k: v for k, v in components.items() if v is not None})
        grade.components = merged
    if component_feedback:
        merged_fb = grade.component_feedback.copy()
        merged_fb.update(component_feedback)
        grade.component_feedback = merged_fb
    if teacher_remarks is not None:
        grade.teacher_remarks = teacher_remarks

    _recalculate_grade_fields(grade)
    grade.workflow_status = "EXAM_REVIEWED"
    grade.exam_reviewed_at = datetime.now(timezone.utc)
    grade.exam_reviewed_by = reviewer_username
    grade.updated_at = datetime.now(timezone.utc)
    await grade.set({
        Grade.components: grade.components,
        Grade.component_feedback: grade.component_feedback,
        Grade.teacher_remarks: grade.teacher_remarks,
        Grade.total_marks: grade.total_marks,
        Grade.letter_grade: grade.letter_grade,
        Grade.grade_points: grade.grade_points,
        Grade.is_complete: grade.is_complete,
        Grade.workflow_status: grade.workflow_status,
        Grade.exam_reviewed_at: grade.exam_reviewed_at,
        Grade.exam_reviewed_by: grade.exam_reviewed_by,
        Grade.updated_at: grade.updated_at,
    })
    return grade


async def _student_enrolled_courses_count(student_id: str, term: str) -> int:
    # Also match enrollments with term="ALL" or "all" — used for courses that span all terms
    return await Enrollment.find(
        Enrollment.student_id == student_id,
        In(Enrollment.term, [term, "ALL", "all"]),
        Enrollment.status == "ENROLLED",
    ).count()


async def _get_enrolled_course_ids(student_id: str, term: str) -> list:
    """Return course_ids for courses the student is enrolled in for a given term (or ALL)."""
    enrollments = await Enrollment.find(
        Enrollment.student_id == student_id,
        In(Enrollment.term, [term, "ALL", "all"]),
        Enrollment.status == "ENROLLED",
    ).to_list()
    return [e.course_id for e in enrollments]


async def _student_published_complete_count(student_id: str, term: str) -> int:
    course_ids = await _get_enrolled_course_ids(student_id, term)
    if not course_ids:
        return 0
    return await Grade.find(
        Grade.student_id == student_id,
        In(Grade.course_id, course_ids),
        Grade.workflow_status == "PUBLISHED",
        Grade.is_complete == True,
    ).count()


async def publish_course_results_to_students(
    course_id: str,
    term: str,
    publisher_username: str,
) -> Dict:
    """Exam department publishes all reviewed results for a course."""
    grades = await Grade.find(
        Grade.course_id == course_id,
        Grade.term == term,
        In(Grade.workflow_status, ["SUBMITTED", "EXAM_REVIEWED"]),
    ).to_list()

    if not grades:
        raise HTTPException(status_code=404, detail="No reviewed results to publish")

    student_ids = set()
    for grade in grades:
        await grade.set({
            Grade.workflow_status: "PUBLISHED",
            Grade.status: "PUBLISHED",
            Grade.published_at: datetime.now(timezone.utc),
            Grade.published_by: publisher_username,
            Grade.updated_at: datetime.now(timezone.utc),
        })
        student_ids.add(grade.student_id)

    cgpa_generated = []
    for sid in student_ids:
        enrolled_count = await _student_enrolled_courses_count(sid, term)
        published_count = await _student_published_complete_count(sid, term)
        if enrolled_count > 0 and published_count >= enrolled_count:
            await calculate_semester_gpa(sid, term)
            cgpa_record = await calculate_cgpa(sid)
            student = await User.get(sid)
            cgpa_generated.append({
                "student_username": student.username if student else sid,
                "cgpa": cgpa_record.cgpa,
            })

    course = await Course.get(course_id)
    return {
        "message": f"Published results for {len(grades)} students",
        "course_code": course.course_code if course else course_id,
        "published_count": len(grades),
        "cgpa_generated": cgpa_generated,
    }


async def get_student_results_summary(student_id: str, term: str) -> Dict:
    """Student-facing results: partial marks always; CGPA/transcript when all courses complete.
    
    Grades are fetched by enrolled course IDs (not by term) to handle cases where
    grades were stored under a different term than the course's current term.
    """
    user = await User.get(student_id)

    # Get the course IDs the student is enrolled in for this term (including ALL-term enrollments)
    enrolled_course_ids = await _get_enrolled_course_ids(student_id, term)

    # Fetch published grades for those specific courses (term-agnostic)
    if enrolled_course_ids:
        grades = await Grade.find(
            Grade.student_id == student_id,
            In(Grade.course_id, enrolled_course_ids),
            Grade.workflow_status == "PUBLISHED",
        ).to_list()
    else:
        grades = []

    courses = []
    for grade in grades:
        course = await Course.get(grade.course_id)
        courses.append({
            "course_code": grade.course_code,
            "course_name": course.course_name if course else "Unknown",
            "credit_hours": grade.credit_hours,
            "components": grade.components,
            "component_feedback": grade.component_feedback,
            "teacher_remarks": grade.teacher_remarks,
            "total_marks": grade.total_marks,
            "letter_grade": grade.letter_grade,
            "grade_points": grade.grade_points,
            "is_complete": grade.is_complete,
        })

    enrolled_count = len(enrolled_course_ids)
    # Count published+complete grades among enrolled courses
    complete_published = sum(1 for g in grades if g.is_complete)
    all_courses_complete = enrolled_count > 0 and complete_published >= enrolled_count

    semester_gpa = None
    cgpa = None
    if all_courses_complete:
        # Use the term from actual grades if available, otherwise use requested term
        grade_term = grades[0].term if grades else term
        try:
            gpa_record = await calculate_semester_gpa(student_id, grade_term)
            semester_gpa = gpa_record.semester_gpa
        except HTTPException:
            pass
        try:
            cgpa_record = await calculate_cgpa(student_id)
            cgpa = cgpa_record.cgpa
        except HTTPException:
            pass

    return {
        "term": term,
        "student_username": user.username if user else student_id,
        "student_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
        "department": user.department if user else None,
        "program": user.program if user else None,
        "courses": courses,
        "enrolled_courses": enrolled_count,
        "published_courses": len(grades),
        "all_courses_complete": all_courses_complete,
        "semester_gpa": semester_gpa,
        "cgpa": cgpa,
        "transcript_available": all_courses_complete,
    }


async def get_student_transcript(student_id: str, term: str) -> Dict:
    """Full transcript data when all courses for the term are published."""
    summary = await get_student_results_summary(student_id, term)
    if not summary["transcript_available"]:
        raise HTTPException(
            status_code=400,
            detail="Transcript available only when all course marks are published",
        )
    return summary
