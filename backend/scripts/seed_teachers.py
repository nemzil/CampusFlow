"""
Seed teacher users with Pakistani names
One teacher per course
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, date
from faker import Faker
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.core.security import get_password_hash
from course_data import BSE_COURSES, BSCS_COURSES

load_dotenv()

# Initialize Faker with seed for deterministic data
fake = Faker()
Faker.seed(42)

# Pakistani common names
PAKISTANI_FIRST_NAMES = [
    "Ahmed", "Ali", "Hassan", "Hussain", "Muhammad", "Omar", "Usman", "Bilal", "Faisal", "Imran",
    "Fatima", "Ayesha", "Zainab", "Maryam", "Khadija", "Sana", "Hira", "Amina", "Rabia", "Laiba",
    "Asad", "Fahad", "Hamza", "Junaid", "Kamran", "Noman", "Saad", "Tariq", "Waqas", "Zubair",
    "Alina", "Farha", "Iqra", "Mahnoor", "Nida", "Rabiya", "Samira", "Uzma", "Zara", "Noor"
]

PAKISTANI_LAST_NAMES = [
    "Khan", "Ahmed", "Ali", "Hassan", "Hussain", "Malik", "Sheikh", "Akhtar", "Ansari", "Baig",
    "Chaudhry", "Dar", "Farooq", "Gilani", "Haider", "Iqbal", "Javed", "Karim", "Mahmood", "Naqvi",
    "Qureshi", "Raza", "Saeed", "Taqi", "Usman", "Wali", "Yousuf", "Zaidi", "Butt", "Siddiqui"
]

DESIGNATIONS = [
    "Lecturer",
    "Assistant Professor",
    "Associate Professor",
    "Professor"
]

def generate_unique_username(first_name, last_name, username_counts):
    """Generate username in format: firstnamelastname+sno"""
    base_username = f"{first_name.lower()}{last_name.lower()}"
    count = username_counts[base_username]
    username_counts[base_username] += 1
    
    if count == 0:
        return base_username
    else:
        return f"{base_username}{count + 1}"

async def seed_teachers():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    users_collection = db.users
    courses_collection = db.courses
    
    print("=" * 70)
    print("Seeding teachers...")
    print("=" * 70)
    
    # Get all unique courses (by course_code)
    all_courses = BSE_COURSES + BSCS_COURSES
    unique_courses = {}
    for course in all_courses:
        if course["course_code"] not in unique_courses:
            unique_courses[course["course_code"]] = course
    
    teachers_to_create = len(unique_courses)
    print(f"Creating {teachers_to_create} teachers (one per unique course)")
    
    inserted_count = 0
    skipped_count = 0
    username_counts = defaultdict(int)
    employee_id_counter = 1
    
    for idx, (course_code, course) in enumerate(unique_courses.items(), 1):
        # Generate Pakistani name
        first_name = fake.random_element(PAKISTANI_FIRST_NAMES)
        last_name = fake.random_element(PAKISTANI_LAST_NAMES)
        username = generate_unique_username(first_name, last_name, username_counts)
        
        # Check if username already exists
        existing = await users_collection.find_one({"username": username})
        if existing:
            print(f"  {username} already exists - skipping")
            skipped_count += 1
            continue
        
        # Generate employee ID with separate counter
        employee_id = f"EMP-2024-{employee_id_counter:03d}"
        employee_id_counter += 1
        
        # Random designation
        designation = fake.random_element(DESIGNATIONS)
        
        # Determine department
        if course_code.startswith("SE") or course_code.startswith("SWE"):
            department = "Software Engineering"
        elif course_code.startswith("CS"):
            department = "Computer Science"
        elif course_code.startswith("HS"):
            department = "Humanities"
        elif course_code.startswith("MS"):
            department = "Mathematics"
        else:
            department = "General"
        
        teacher_doc = {
            "username": username,
            "email": f"{username}@ssuet.edu.pk",
            "password_hash": get_password_hash("teacher123"),
            "role": "TEACHER",
            "first_name": first_name,
            "last_name": last_name,
            "cell_no": f"+92-{fake.random_int(300, 399)}-{fake.random_int(1000000, 9999999)}",
            "employee_id": employee_id,
            "designation": designation,
            "department": department,
            "qualification": f"PhD in {department}",
            "specialization": course["course_name"],
            "office_location": f"Room {fake.random_int(201, 399)}",
            "joining_date": datetime(2020, 1, 1) if fake.random_int(0, 1) else datetime(2022, 1, 1),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        await users_collection.insert_one(teacher_doc)
        
        # Assign teacher to course
        await courses_collection.update_one(
            {"course_code": course_code, "term": "2026S"},
            {"$set": {
                "teacher_id": username,
                "teacher_name": f"{first_name} {last_name}",
                "updated_at": datetime.utcnow()
            }}
        )
        
        print(f" {username:20} | {first_name} {last_name:20} | {designation:20} | {course_code}")
        inserted_count += 1
    
    print("=" * 70)
    print(f"Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_teachers())
