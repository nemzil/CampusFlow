"""
Clear database automatically - NO confirmation needed
Use with caution!

Usage:
    python -m scripts.clear_db_auto
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

async def clear_database_auto():
    # Connect to MongoDB
    MONGO_URI = os.getenv("MONGODB_URI")
    if not MONGO_URI:
        print("ERROR: MONGODB_URI not found in .env file")
        return
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    print("=" * 70)
    print("DATABASE AUTO-CLEAR")
    print("=" * 70)
    print(f"Database: {db.name}")
    print("=" * 70)
    
    # Collections to clear
    collections = [
        "users",
        "courses",
        "enrollments",
        "registration_windows",
        "fee_config",
        "department_fee_structures",
        "fees",
        "todos",
        "announcements",
        "course_schedules",
        "forum_channels",
        "forum_threads",
        "forum_replies",
        "assignments",
        "submissions",
        "attendance_sessions",
        "attendance_records",
        "exam_schedules",
        "grades",
        "semester_gpa",
        "cgpa",
    ]
    
    print("\nClearing all collections...\n")
    
    deleted_total = 0
    
    for collection_name in collections:
        collection = db[collection_name]
        result = await collection.delete_many({})
        if result.deleted_count > 0:
            print(f"   Deleted {result.deleted_count:>5} from {collection_name}")
            deleted_total += result.deleted_count
        else:
            print(f"   Deleted {result.deleted_count:>5} from {collection_name}")
    
    print("\n" + "=" * 70)
    print(f" Database cleared! Deleted {deleted_total} documents")
    print("=" * 70)
    print("\nReady to seed:")
    print("  python -m scripts.seed_all")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_database_auto())
