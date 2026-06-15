"""
Fill realistic grades and attendance for 2024F-BSE students
- Semesters 1, 2, 3: Complete grades and attendance
- Semester 4: Currently in progress (no grades yet)
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone
import random
from faker import Faker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.models.grading import convert_to_letter_grade, convert_to_letter_grade_lab

load_dotenv()
fake = Faker()
Faker.seed(42)  # Consistent data
random.seed(42)

def generate_realistic_marks(is_lab=False, gpa_target=None):
    """
    Generate realistic marks based on target GPA
    gpa_target: 2.5-2.9 (C), 3.0-3.4 (B), 3.5-3.8 (B+), 3.8-4.0 (A)
    """
    if gpa_target is None:
        gpa_target = random.uniform(2.8, 3.8)
    
    if is_lab:
        # Lab: 50-point scale
        if gpa_target >= 3.8:  # A range
            base = random.uniform(43, 48)
        elif gpa_target >= 3.5:  # B+ range
            base = random.uniform(38, 42)
        elif gpa_target >= 3.0:  # B range
            base = random.uniform(35, 38)
        else:  # C range
            base = random.uniform(30, 35)
        
        # Distribute marks across components
        quiz1 = round(random.uniform(2.0, 3.0), 1)
        quiz2 = round(random.uniform(2.0, 3.0), 1)
        quiz3 = round(random.uniform(2.5, 4.0), 1)
        assignment1 = round(random.uniform(2.0, 3.0), 1)
        assignment2 = round(random.uniform(2.0, 3.0), 1)
        assignment3 = round(random.uniform(2.5, 4.0), 1)
        midterm = round(random.uniform(9, 14), 1)
        
        # Calculate remaining for final to reach base
        current = quiz1 + quiz2 + quiz3 + assignment1 + assignment2 + assignment3 + midterm
        final = round(base - current, 1)
        final = max(12, min(25, final))  # Clamp to valid range
    else:
        # Theory: 100-point scale
        if gpa_target >= 3.8:  # A range
            base = random.uniform(80, 92)
        elif gpa_target >= 3.5:  # B+ range
            base = random.uniform(75, 82)
        elif gpa_target >= 3.0:  # B range
            base = random.uniform(65, 75)
        else:  # C range
            base = random.uniform(55, 65)
        
        quiz1 = round(random.uniform(1.5, 3.0), 1)
        quiz2 = round(random.uniform(1.5, 3.0), 1)
        quiz3 = round(random.uniform(2.0, 4.0), 1)
        assignment1 = round(random.uniform(1.5, 3.0), 1)
        assignment2 = round(random.uniform(1.5, 3.0), 1)
        assignment3 = round(random.uniform(2.0, 4.0), 1)
        midterm = round(random.uniform(16, 27), 1)
        
        current = quiz1 + quiz2 + quiz3 + assignment1 + assignment2 + assignment3 + midterm
        final = round(base - current, 1)
        final = max(25, min(50, final))
    
    return {
        "quiz1": quiz1,
        "quiz2": quiz2,
        "quiz3": quiz3,
        "assignment1": assignment1,
        "assignment2": assignment2,
        "assignment3": assignment3,
        "midterm": midterm,
        "final": final
    }

def generate_attendance(semester):
    """Generate realistic attendance percentage"""
    # Most students have good attendance in early semesters
    if semester == 1:
        return round(random.uniform(85, 98), 1)
    elif semester == 2:
        return round(random.uniform(80, 95), 1)
    else:  # semester 3
        return round(random.uniform(75, 92), 1)

async def fill_data():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    users_col = db.users
    courses_col = db.courses
    enrollments_col = db.enrollments
    grades_col = db.grades
    attendance_col = db.attendance_records
    
    print("="*80)
    print("FILLING REALISTIC DATA FOR 2024F-BSE STUDENTS")
    print("Note: Using 2026S as the term (all enrollments are in 2026S)")
    print("="*80)
    
    # Get 2024F-BSE students
    students = await users_col.find({
        "role": "STUDENT",
        "username": {"$regex": "^2024F-BSE"}
    }).to_list(None)
    
    print(f"\nFound {len(students)} students from 2024F-BSE batch")
    
    for student in students:
        student_id = str(student["_id"])
        username = student["username"]
        
        # Assign random GPA target for this student (consistency across semesters)
        student_gpa_target = random.uniform(2.8, 3.8)
        
        print(f"\n{'='*80}")
        print(f"Student: {username} | Target GPA: {student_gpa_target:.2f}")
        print(f"{'='*80}")
        
        # Get all enrollments for this student
        all_enrollments = await enrollments_col.find({
            "student_id": student_id
        }).to_list(None)
        
        print(f"Total enrollments: {len(all_enrollments)}")
        
        # Process each enrollment
        for enrollment in all_enrollments:
            course_id = enrollment["course_id"]
            course_code = enrollment["course_code"]
            term = enrollment.get("term", "2026S")  # Use enrollment's term
            
            # Get course details
            from bson import ObjectId
            course = await courses_col.find_one({"_id": ObjectId(course_id)})
            if not course:
                continue
            
            semester = course["semester"]
            if semester > 3:  # Only fill for completed semesters (1-3)
                continue
            
            credit_hours = course["credit_hours"]
            category = course["category"]
            is_lab = category == "LAB"
            
            # Check if grade exists
            existing_grade = await grades_col.find_one({
                "student_id": student_id,
                "course_id": course_id,
                "term": term
            })
            
            if existing_grade:
                print(f"  {term} | Sem {semester} | {course_code:10} - Grade exists, skipping")
                continue
            
            # Generate marks
            components = generate_realistic_marks(is_lab, student_gpa_target)
            total_marks = sum(components.values())
            
            # Convert to letter grade
            if is_lab:
                letter_grade, grade_points = convert_to_letter_grade_lab(total_marks)
            else:
                letter_grade, grade_points = convert_to_letter_grade(total_marks)
            
            # Create grade record
            grade_doc = {
                "student_id": student_id,
                "student_username": username,
                "course_id": course_id,
                "course_code": course_code,
                "term": term,
                "credit_hours": credit_hours,
                "components": components,
                "midterm_max": 15 if is_lab else 30,
                "final_max": 25 if is_lab else 50,
                "total_marks": total_marks,
                "letter_grade": letter_grade,
                "grade_points": grade_points,
                "status": "PUBLISHED",
                "workflow_status": "PUBLISHED",
                "is_complete": True,
                "component_feedback": {},
                "published_at": datetime.utcnow(),
                "published_by": "system",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            
            await grades_col.insert_one(grade_doc)
            print(f"  {term} | Sem {semester} | {course_code:10} | {total_marks:5.1f}/{50 if is_lab else 100} | {letter_grade} ({grade_points:.2f})")
        
        # Generate attendance for semesters 1-3
        print(f"\n  Generating Attendance Records:")
        
        for semester in [1, 2, 3]:
            # Get courses for this semester
            semester_courses = await courses_col.find({
                "department": "BSE",
                "semester": semester
            }).to_list(None)
            
            for course in semester_courses:
                course_id = str(course["_id"])
                course_code = course["course_code"]
                
                # Check if enrollment exists for this student
                enrollment = await enrollments_col.find_one({
                    "student_id": student_id,
                    "course_id": course_id
                })
                
                if not enrollment:
                    continue
                
                term = enrollment.get("term", "2026S")
                
                # Check if attendance exists
                existing_attendance = await attendance_col.find_one({
                    "student_id": student_id,
                    "course_id": course_id,
                    "term": term
                })
                
                if existing_attendance:
                    continue
                
                # Generate attendance
                attendance_percentage = generate_attendance(semester)
                total_classes = random.randint(40, 50)
                classes_attended = int((attendance_percentage / 100) * total_classes)
                
                attendance_doc = {
                    "student_id": student_id,
                    "course_id": course_id,
                    "course_code": course_code,
                    "term": term,
                    "total_classes": total_classes,
                    "classes_attended": classes_attended,
                    "attendance_percentage": attendance_percentage,
                    "status": "ACTIVE",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await attendance_col.insert_one(attendance_doc)
                print(f"    {term} | Sem {semester} | {course_code:10} | {attendance_percentage}% ({classes_attended}/{total_classes})")
    
    print("\n" + "="*80)
    print("DATA GENERATION COMPLETE")
    print("="*80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fill_data())
