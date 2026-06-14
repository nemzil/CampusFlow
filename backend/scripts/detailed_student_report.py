"""
Generate detailed student report with grades and enrollment data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import sys

load_dotenv()

async def generate_report():
    # Connect to MongoDB
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    users = db.users
    enrollments = db.enrollments
    courses = db.courses
    grades = db.grades
    
    print("\n" + "="*80)
    print(" "*20 + "CAMPUSFLOW - DETAILED STUDENT REPORT")
    print("="*80)
    
    # Get all students
    students = await users.find({"role": "STUDENT"}).sort("registration_no", 1).to_list(None)
    
    print(f"\nTotal Students: {len(students)}")
    print("="*80)
    
    for student in students:
        reg_no = student.get("registration_no", "N/A")
        username = student.get("username", "N/A")
        first_name = student.get("first_name", "")
        last_name = student.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip()
        
        email = student.get("email", "N/A")
        department = student.get("department", "N/A")
        program = student.get("program", "N/A")
        batch = student.get("batch", "N/A")
        semester = student.get("current_semester", "N/A")
        cell_no = student.get("cell_no", "N/A")
        
        print(f"\n{'='*80}")
        print(f"STUDENT: {full_name} ({reg_no})")
        print(f"{'='*80}")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Program: {program} | Department: {department}")
        print(f"  Batch: {batch} | Current Semester: {semester}")
        print(f"  Contact: {cell_no}")
        
        # Personal details
        dob = student.get("date_of_birth")
        if dob:
            print(f"  Date of Birth: {dob.strftime('%Y-%m-%d') if hasattr(dob, 'strftime') else dob}")
        nic = student.get("nic", "N/A")
        print(f"  NIC: {nic}")
        gender = student.get("gender", "N/A")
        print(f"  Gender: {gender}")
        address = student.get("address", "N/A")
        print(f"  Address: {address}")
        
        # Guardian info
        print(f"\n  Guardian Details:")
        print(f"    Name: {student.get('guardian_name', 'N/A')}")
        print(f"    CNIC: {student.get('guardian_cnic', 'N/A')}")
        print(f"    Contact: {student.get('guardian_contact', 'N/A')}")
        
        # Get enrollments
        student_enrollments = await enrollments.find({
            "student_username": username
        }).to_list(None)
        
        print(f"\n  {''*76}")
        print(f"  ENROLLED COURSES ({len(student_enrollments)})")
        print(f"  {''*76}")
        
        if student_enrollments:
            total_credits = 0
            
            for enrollment in student_enrollments:
                course_code = enrollment.get("course_code", "N/A")
                status = enrollment.get("status", "N/A")
                term = enrollment.get("term", "N/A")
                
                # Get course details
                course = await courses.find_one({"course_code": course_code})
                if course:
                    course_name = course.get("course_name", "Unknown")
                    credits = course.get("credit_hours", 0)
                    total_credits += credits
                    
                    print(f"\n    [{course_code}] {course_name}")
                    print(f"      Credits: {credits} | Status: {status} | Term: {term}")
                    
                    # Get grade for this course
                    grade = await grades.find_one({
                        "student_username": username,
                        "course_code": course_code,
                        "term": term
                    })
                    
                    if grade:
                        components = grade.get("components", {})
                        
                        print(f"      Grade Status: {grade.get('status', 'N/A')}")
                        print(f"      Components:")
                        
                        # Display grade components
                        quiz1 = components.get("quiz1")
                        quiz2 = components.get("quiz2")
                        quiz3 = components.get("quiz3")
                        assign1 = components.get("assignment1")
                        assign2 = components.get("assignment2")
                        assign3 = components.get("assignment3")
                        midterm = components.get("midterm")
                        final = components.get("final")
                        
                        if quiz1 is not None:
                            print(f"        Quiz 1: {quiz1}/10")
                        if quiz2 is not None:
                            print(f"        Quiz 2: {quiz2}/10")
                        if quiz3 is not None:
                            print(f"        Quiz 3: {quiz3}/10")
                        if assign1 is not None:
                            print(f"        Assignment 1: {assign1}/10")
                        if assign2 is not None:
                            print(f"        Assignment 2: {assign2}/10")
                        if assign3 is not None:
                            print(f"        Assignment 3: {assign3}/10")
                        if midterm is not None:
                            print(f"        Midterm: {midterm}/30")
                        if final is not None:
                            print(f"        Final: {final}/30")
                        
                        total_marks = grade.get("total_marks")
                        letter_grade = grade.get("letter_grade")
                        grade_points = grade.get("grade_points")
                        
                        if total_marks is not None:
                            print(f"      Total: {total_marks}/100")
                        if letter_grade:
                            print(f"      Grade: {letter_grade} (GPA: {grade_points})")
                    else:
                        print(f"      Grade: Not yet assigned")
                else:
                    print(f"\n    {course_code}: Course details not found")
            
            print(f"\n  {''*76}")
            print(f"  Total Credit Hours: {total_credits}")
            print(f"  {''*76}")
        else:
            print(f"    No enrollments found")
    
    print(f"\n{'='*80}")
    print(" "*25 + "END OF REPORT")
    print("="*80 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(generate_report())
