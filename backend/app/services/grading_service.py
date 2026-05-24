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
    
    # TODO: Fetch midterm and final exam marks from exam module
    # This requires integration with the exam system
    # For now, these will remain None until exam marks are available
    
    return components


def calculate_total_marks(components: Dict[str, Optional[float]]) -> Optional[float]:
    """
    Calculate total marks from components
    
    Args:
        components: Dict of component marks
    
    Returns:
        Total marks or None if incomplete
    """
    # Check if all components are present
    required_components = ["quiz1", "quiz2", "quiz3", "assignment1", "assignment2", "assignment3", "midterm", "final"]
    
    for component in required_components:
        if components.get(component) is None:
            return None  # Incomplete
    
    # Calculate total
    total = 0.0
    total += components["quiz1"] or 0
    total += components["quiz2"] or 0
    total += components["quiz3"] or 0
    total += components["assignment1"] or 0
    total += components["assignment2"] or 0
    total += components["assignment3"] or 0
    total += components["midterm"] or 0
    total += components["final"] or 0
    
    return round(total, 2)


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
        Enrollment.term == term,
        Enrollment.status == "ENROLLED"
    ).to_list()
    
    calculated_count = 0
    incomplete_count = 0
    
    for enrollment in enrollments:
        # Fetch component marks
        components = await fetch_component_marks(
            student_id=enrollment.student_id,
            course_id=course_id,
            term=term
        )
        
        # Calculate total
        total_marks = calculate_total_marks(components)
        is_complete = is_grade_complete(components)
        
        # Convert to letter grade
        letter_grade = None
        grade_points = None
        if total_marks is not None:
            letter_grade, grade_points = convert_to_letter_grade(total_marks)
        
        # Check if grade already exists
        existing_grade = await Grade.find_one(
            Grade.student_id == enrollment.student_id,
            Grade.course_id == course_id,
            Grade.term == term
        )
        
        if existing_grade:
            # Update existing grade
            await existing_grade.set({
                Grade.components: components,
                Grade.total_marks: total_marks,
                Grade.letter_grade: letter_grade,
                Grade.grade_points: grade_points,
                Grade.is_complete: is_complete,
                Grade.updated_at: datetime.now(timezone.utc)
            })
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
        raise HTTPException(status_code=404, detail="No semester GPAs found")
    
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
