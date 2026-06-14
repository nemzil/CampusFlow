"""
Seed BSE and BSCS courses for all 8 semesters
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

async def seed_courses():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    courses_collection = db.courses
    
    term = "2026S"
    
    print("=" * 70)
    print(f"Seeding courses for term {term}...")
    print("=" * 70)
    
    inserted_count = 0
    skipped_count = 0
    
    all_courses = BSE_COURSES + BSCS_COURSES
    
    for course in all_courses:
        existing = await courses_collection.find_one({
            "course_code": course["course_code"],
            "term": term
        })
        
        if existing:
            print(f"  {course['course_code']} already exists - skipping")
            skipped_count += 1
            continue
        
        # Determine department based on course code
        if course["course_code"].startswith("SE") or course["course_code"].startswith("SWE"):
            department = "Software Engineering"
        elif course["course_code"].startswith("CS"):
            department = "Computer Science"
        elif course["course_code"].startswith("HS"):
            department = "Humanities"
        elif course["course_code"].startswith("MS"):
            department = "Mathematics"
        else:
            department = "General"
        
        # Determine max_marks and grading_scale
        if course["category"] == "LAB":
            max_marks = 50
            grading_scale = "lab"
        else:
            max_marks = 100
            grading_scale = "theory"
        
        course_doc = {
            "course_code": course["course_code"],
            "course_name": course["course_name"],
            "course_type": course["course_type"],
            "category": course["category"],
            "semester": course["semester"],
            "credit_hours": course["credit_hours"],
            "prerequisites": course["prerequisites"],
            "max_marks": max_marks,
            "grading_scale": grading_scale,
            "description": f"{course['course_name']} - Semester {course['semester']} {course['course_type'].upper()} course",
            "department": department,
            "term": term,
            "max_students": 60,
            "enrolled_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "system"
        }
        
        await courses_collection.insert_one(course_doc)
        print(f" {course['course_code']:10} | {course['course_name'][:40]:40} | Sem-{course['semester']} | {course['category']}")
        inserted_count += 1
    
    print("=" * 70)
    print(f"Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    # Summary by program
    bse_count = len(BSE_COURSES)
    bscs_count = len(BSCS_COURSES)
    print(f"\nBSE Courses: {bse_count}")
    print(f"BSCS Courses: {bscs_count}")
    print(f"Total: {bse_count + bscs_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_courses())
