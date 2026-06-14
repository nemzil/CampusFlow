"""
Seed forum channels for all courses
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

async def seed_forums():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    courses_collection = db.courses
    channels_collection = db.forum_channels
    
    term = "2026S"
    
    print("=" * 70)
    print(f"Seeding forum channels for term {term}...")
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
        
        # Check if channel already exists
        existing = await channels_collection.find_one({
            "course_code": course_code,
            "term": term
        })
        
        if existing:
            skipped_count += 1
            continue
        
        channel_id = f"CH-{course_code}-{term}"
        
        channel_doc = {
            "channel_id": channel_id,
            "name": f"{course_name} Discussion",
            "description": f"Discussion forum for {course_name} ({course_code})",
            "course_id": course_id,
            "course_code": course_code,
            "term": term,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        
        await channels_collection.insert_one(channel_doc)
        print(f" {course_code:10} | {course_name[:40]}")
        inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_forums())
