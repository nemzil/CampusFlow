"""
Seed grades for completed semesters
- 2024F students: Grades for Semesters 1-3 (all passed)
- 2025S students: Grades for Semesters 1-2 (all passed)
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.models.grading import convert_to_letter_grade, convert_to_letter_grade_lab

load_dotenv()

def generate_passing_marks(is_lab=False):
    """Generate realistic passing marks"""
    if is_lab:
        # Lab: 25-50 scale, generate 30-48 (all passing)
        quiz1 = round(random.uniform(2.5, 3), 1)
        quiz2 = round(random.uniform(2.5, 3), 1)
        quiz3 = round(random.uniform(3.5, 4), 1)
        assignment1 = round(random.uniform(2.5, 3), 1)
        assignment2 = round(random.uniform(2.5, 3), 1)
        assignment3 = round(random.uniform(3.5, 4), 1)
        midterm = round(random.uniform(10, 14), 1)
        final = round(random.uniform(15, 23), 1)
    else:
        # Theory: 100 scale, generate 55-90 (all passing)
        quiz1 = round(random.uniform(2, 3), 1)
        quiz2 = round(random.uniform(2, 3), 1)
        quiz3 = round(random.uniform(2.5, 4), 1)
        assignment1 = round(random.uniform(2, 3), 1)
        assignment2 = round(random.uniform(2, 3), 1)
        assignment3 = round(random.uniform(2.5, 4), 1)
        midterm = round(random.uniform(18, 27), 1)
        final = round(random.uniform(30, 45), 1)
    
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

async def seed_grades():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    users_collection = db.users
    courses_collection = db.courses
    enrollments_collection = db.enrollments
    grades_collection = db.grades
    
    term = "2026S"
    
    print("=" * 70)
    print("Seeding grades for completed semesters...")
    print("=" * 70)
    
    # Get all students
    students = await users_collection.find({"role": "STUDENT"}).to_list(None)
    
    inserted_count = 0
    skipped_count = 0
    
    for student in students:
        student_id = str(student["_id"])
        student_username = student["username"]
        current_semester = student["current_semester"]
        
        print(f"\n{'='*70}")
        print(f"Student: {student_username} | Current Semester: {current_semester}")
        print(f"{'='*70}")
        
        # Get all COMPLETED enrollments for this student
        completed_enrollments = await enrollments_collection.find({
            "student_id": student_id,
            "status": "COMPLETED",
            "term": term
        }).to_list(None)
        
        for enrollment in completed_enrollments:
            course_id = enrollment["course_id"]
            course_code = enrollment["course_code"]
            
            # Get course details
            from bson import ObjectId
            course = await courses_collection.find_one({"_id": ObjectId(course_id)})
            if not course:
                print(f"    Course {course_code} not found")
                continue
            
            credit_hours = course["credit_hours"]
            category = course["category"]
            is_lab = category == "LAB"
            
            # Check if grade already exists
            existing = await grades_collection.find_one({
                "student_id": student_id,
                "course_id": course_id,
                "term": term
            })
            
            if existing:
                skipped_count += 1
                continue
            
            # Generate passing marks
            components = generate_passing_marks(is_lab)
            
            # Calculate total marks
            total_marks = sum([v for v in components.values() if v is not None])
            
            # Convert to letter grade
            if is_lab:
                letter_grade, grade_points = convert_to_letter_grade_lab(total_marks)
            else:
                letter_grade, grade_points = convert_to_letter_grade(total_marks)
            
            grade_doc = {
                "student_id": student_id,
                "student_username": student_username,
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
            
            await grades_collection.insert_one(grade_doc)
            print(f"   {course_code:10} | {total_marks:5.1f}/{50 if is_lab else 100} | {letter_grade} ({grade_points})")
            inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_grades())
