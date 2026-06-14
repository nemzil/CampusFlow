"""
Quick check for assignment visibility issues
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    db = client.get_database()
    
    # Get the most recent published assignment
    assignment = await db.assignments.find_one(
        {"status": "PUBLISHED"},
        sort=[("created_at", -1)]
    )
    
    if not assignment:
        print("No published assignments found!")
        client.close()
        return
    
    print(f"\nMost Recent Published Assignment:")
    print(f"  Title: {assignment.get('title')}")
    print(f"  Course: {assignment.get('course_code')}")
    print(f"  Status: {assignment.get('status')}")
    print(f"  Course ID: {assignment.get('course_id')}")
    print(f"  Term: {assignment.get('term')}")
    
    # Find students enrolled in this course
    course_id = assignment.get('course_id')
    enrollments = await db.enrollments.find({
        "course_id": course_id,
        "status": "ENROLLED"
    }).to_list(None)
    
    print(f"\n  Students enrolled: {len(enrollments)}")
    
    if enrollments:
        for enr in enrollments[:5]:  # Show first 5
            student = await db.users.find_one({"_id": enr.get('student_id')})
            if student:
                print(f"    - {student.get('username')} (enrollment term: {enr.get('term')})")
    else:
        print("    No students enrolled in this course!")
        print("\n  Checking all enrollments...")
        all_enrollments = await db.enrollments.find({"status": "ENROLLED"}).to_list(None)
        print(f"    Total enrolled students across all courses: {len(all_enrollments)}")
        if all_enrollments:
            unique_courses = set(e.get('course_id') for e in all_enrollments)
            print(f"    Courses with enrollments: {len(unique_courses)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
