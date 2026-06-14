"""
Seed class timetable for all courses
9 periods per day, lab courses take 3 consecutive periods
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, time
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"]

# Time slots for 9 periods
TIME_SLOTS = [
    {"period": 1, "start": "08:00", "end": "09:00"},
    {"period": 2, "start": "09:00", "end": "10:00"},
    {"period": 3, "start": "10:00", "end": "11:00"},
    {"period": 4, "start": "11:00", "end": "12:00"},
    {"period": 5, "start": "12:00", "end": "13:00"},
    {"period": 6, "start": "13:00", "end": "14:00"},
    {"period": 7, "start": "14:00", "end": "15:00"},
    {"period": 8, "start": "15:00", "end": "16:00"},
    {"period": 9, "start": "16:00", "end": "17:00"},
]

ROOMS = [f"Room {i}" for i in range(101, 131)]

async def seed_timetable():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    courses_collection = db.courses
    schedules_collection = db.course_schedules
    
    term = "2026S"
    
    print("=" * 70)
    print(f"Seeding timetable for term {term}...")
    print("=" * 70)
    
    # Get all active courses with enrolled students
    courses = await courses_collection.find({
        "term": term,
        "is_active": True,
        "enrolled_count": {"$gt": 0}
    }).to_list(None)
    
    inserted_count = 0
    skipped_count = 0
    
    # Track used slots per semester to avoid conflicts
    used_slots = {}  # {semester: {day: [periods]}}
    
    for course in courses:
        course_id = str(course["_id"])
        course_code = course["course_code"]
        category = course["category"]
        teacher_id = course.get("teacher_id")
        teacher_name = course.get("teacher_name")
        semester = course["semester"]
        
        # Check if schedule already exists
        existing = await schedules_collection.find_one({
            "course_id": course_id,
            "term": term
        })
        
        if existing:
            skipped_count += 1
            continue
        
        # Initialize semester slot tracking
        if semester not in used_slots:
            used_slots[semester] = {day: [] for day in DAYS}
        
        # Find available slot
        is_lab = category == "LAB"
        periods_needed = 3 if is_lab else 1
        
        slot_found = False
        attempts = 0
        
        while not slot_found and attempts < 50:
            day = random.choice(DAYS)
            start_period = random.randint(1, 10 - periods_needed)
            
            # Check if slots are available
            required_periods = list(range(start_period, start_period + periods_needed))
            if not any(p in used_slots[semester][day] for p in required_periods):
                # Mark slots as used
                used_slots[semester][day].extend(required_periods)
                
                start_time = TIME_SLOTS[start_period - 1]["start"]
                end_time = TIME_SLOTS[start_period + periods_needed - 2]["end"]
                room = random.choice(ROOMS)
                
                # Generate unique schedule_id
                schedule_id = f"SCH-{course_code}-{day[:3].upper()}-{start_time.replace(':', '')}"
                
                schedule_doc = {
                    "schedule_id": schedule_id,
                    "course_id": course_id,
                    "course_code": course_code,
                    "course_name": course["course_name"],
                    "teacher_id": teacher_id,
                    "teacher_name": teacher_name,
                    "day_of_week": day,
                    "start_time": start_time,
                    "end_time": end_time,
                    "room": room,
                    "periods": required_periods,
                    "term": term,
                    "created_at": datetime.utcnow(),
                }
                
                await schedules_collection.insert_one(schedule_doc)
                print(f" {course_code:10} | {day:10} | {start_time}-{end_time} | {room} | {teacher_name or 'TBA'}")
                inserted_count += 1
                slot_found = True
            
            attempts += 1
        
        if not slot_found:
            print(f"  Could not find slot for {course_code} after 50 attempts")
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_timetable())
