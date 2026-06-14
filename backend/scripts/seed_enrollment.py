"""
Seed enrollments for all students
- Current semester: ENROLLED status
- Previous semesters: COMPLETED status
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from course_data import BSE_COURSES, BSCS_COURSES

load_dotenv()

async def seed_enrollment():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    users_collection = db.users
    courses_collection = db.courses
    enrollments_collection = db.enrollments
    
    term = "2026S"
    
    print("=" * 70)
    print(f"Seeding enrollments for term {term}...")
    print("=" * 70)
    
    # Get all students
    students = await users_collection.find({"role": "STUDENT"}).to_list(None)
    
    inserted_count = 0
    skipped_count = 0
    
    for student in students:
        student_id = str(student["_id"])
        student_username = student["username"]
        program = student["program"]
        current_semester = student["current_semester"]
        batch = student["batch"]
        
        print(f"\n{'='*70}")
        print(f"Student: {student_username} | Program: {program} | Current Semester: {current_semester}")
        print(f"{'='*70}")
        
        # Determine which course list to use
        course_list = BSE_COURSES if program == "BSE" else BSCS_COURSES
        
        # Enroll in current semester courses (ENROLLED status)
        current_semester_courses = [c for c in course_list if c["semester"] == current_semester]
        
        for course_data in current_semester_courses:
            # Get course from database
            course = await courses_collection.find_one({
                "course_code": course_data["course_code"],
                "term": term
            })
            
            if not course:
                print(f"    Course {course_data['course_code']} not found")
                continue
            
            course_id = str(course["_id"])
            course_code = course["course_code"]
            
            # Check if already enrolled
            existing = await enrollments_collection.find_one({
                "student_id": student_id,
                "course_id": course_id,
                "term": term
            })
            
            if existing:
                skipped_count += 1
                continue
            
            enrollment_doc = {
                "student_id": student_id,
                "student_username": student_username,
                "course_id": course_id,
                "course_code": course_code,
                "term": term,
                "status": "ENROLLED",
                "enrolled_at": datetime.utcnow(),
                "is_forced": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            
            await enrollments_collection.insert_one(enrollment_doc)
            
            # Update course enrolled_count
            await courses_collection.update_one(
                {"_id": course["_id"]},
                {"$inc": {"enrolled_count": 1}}
            )
            
            print(f"   ENROLLED: {course_code} (Current Semester)")
            inserted_count += 1
        
        # Enroll in previous semesters courses (COMPLETED status)
        for sem in range(1, current_semester):
            semester_courses = [c for c in course_list if c["semester"] == sem]
            
            for course_data in semester_courses:
                # Get course from database
                course = await courses_collection.find_one({
                    "course_code": course_data["course_code"],
                    "term": term
                })
                
                if not course:
                    continue
                
                course_id = str(course["_id"])
                course_code = course["course_code"]
                
                # Check if already enrolled
                existing = await enrollments_collection.find_one({
                    "student_id": student_id,
                    "course_id": course_id,
                    "term": term
                })
                
                if existing:
                    skipped_count += 1
                    continue
                
                enrollment_doc = {
                    "student_id": student_id,
                    "student_username": student_username,
                    "course_id": course_id,
                    "course_code": course_code,
                    "term": term,
                    "status": "COMPLETED",
                    "enrolled_at": datetime(2024 + sem // 2, 1 if sem % 2 == 1 else 7, 1),
                    "is_forced": False,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
                
                await enrollments_collection.insert_one(enrollment_doc)
                print(f"   COMPLETED: {course_code} (Semester {sem})")
                inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_enrollment())
