"""
Seed assignments and quizzes for all courses
3 assignments (3, 3, 4 marks) + 3 quizzes (3, 3, 4 marks)
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

async def seed_assignments():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    courses_collection = db.courses
    assignments_collection = db.assignments
    
    term = "2026S"
    
    print("=" * 70)
    print(f"Seeding assignments and quizzes for term {term}...")
    print("=" * 70)
    
    # Get all active courses with enrolled students
    courses = await courses_collection.find({
        "term": term,
        "is_active": True,
        "enrolled_count": {"$gt": 0}
    }).to_list(None)
    
    inserted_count = 0
    skipped_count = 0
    
    for course in courses:
        course_id = str(course["_id"])
        course_code = course["course_code"]
        course_name = course["course_name"]
        teacher_id = course.get("teacher_id")
        
        # Create 3 quizzes
        quiz_marks = [3, 3, 4]
        for i, marks in enumerate(quiz_marks, 1):
            # Check if already exists
            existing = await assignments_collection.find_one({
                "course_id": course_id,
                "type": "QUIZ",
                "number": i
            })
            
            if existing:
                skipped_count += 1
                continue
            
            due_date = datetime.utcnow() + timedelta(days=random.randint(7, 60))
            
            assignment_doc = {
                "course_id": course_id,
                "course_code": course_code,
                "course_name": course_name,
                "teacher_id": teacher_id,
                "title": f"Quiz {i} - {course_name}",
                "description": f"Quiz {i} covering topics from {course_name}",
                "type": "QUIZ",
                "number": i,
                "max_marks": marks,
                "due_date": due_date,
                "status": "PUBLISHED",
                "creation_mode": "MANUAL",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            
            await assignments_collection.insert_one(assignment_doc)
            print(f" {course_code:10} | QUIZ {i} | {marks} marks")
            inserted_count += 1
        
        # Create 3 assignments
        assignment_marks = [3, 3, 4]
        for i, marks in enumerate(assignment_marks, 1):
            # Check if already exists
            existing = await assignments_collection.find_one({
                "course_id": course_id,
                "type": "ASSIGNMENT",
                "number": i
            })
            
            if existing:
                skipped_count += 1
                continue
            
            due_date = datetime.utcnow() + timedelta(days=random.randint(7, 60))
            
            assignment_doc = {
                "course_id": course_id,
                "course_code": course_code,
                "course_name": course_name,
                "teacher_id": teacher_id,
                "title": f"Assignment {i} - {course_name}",
                "description": f"Assignment {i} for {course_name}",
                "type": "ASSIGNMENT",
                "number": i,
                "max_marks": marks,
                "due_date": due_date,
                "status": "PUBLISHED",
                "creation_mode": "MANUAL",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            
            await assignments_collection.insert_one(assignment_doc)
            print(f" {course_code:10} | ASSIGNMENT {i} | {marks} marks")
            inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_assignments())
