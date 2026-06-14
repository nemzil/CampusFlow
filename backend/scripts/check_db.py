"""
Check current database state before seeding
Shows what data exists in each collection

Usage:
    python -m scripts.check_db
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

async def check_database():
    # Connect to MongoDB
    MONGO_URI = os.getenv("MONGODB_URI")
    if not MONGO_URI:
        print("ERROR: MONGODB_URI not found in .env file")
        return
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    print("=" * 70)
    print("DATABASE STATUS CHECK")
    print("=" * 70)
    print(f"Connection: {MONGO_URI}")
    print(f"Database: {db.name}")
    print("=" * 70)
    
    # Collections to check (in seeding order)
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
    
    total_documents = 0
    existing_collections = []
    
    print("\n COLLECTION STATUS:\n")
    
    for collection_name in collections:
        collection = db[collection_name]
        count = await collection.count_documents({})
        
        if count > 0:
            existing_collections.append(collection_name)
            total_documents += count
            print(f" {collection_name:30} {count:>6} documents")
        else:
            print(f" {collection_name:30} {count:>6} documents")
    
    print("\n" + "=" * 70)
    print(f"SUMMARY")
    print("=" * 70)
    print(f"Total collections with data: {len(existing_collections)}")
    print(f"Total documents: {total_documents}")
    print("=" * 70)
    
    if total_documents > 0:
        print("\n  WARNING: Database contains existing data!")
        print("\nExisting collections:")
        for col in existing_collections:
            count = await db[col].count_documents({})
            print(f"  - {col}: {count} documents")
        
        print("\n" + "=" * 70)
        print("RECOMMENDATIONS:")
        print("=" * 70)
        print("\n1. SAFE APPROACH (Recommended):")
        print("   - Seed scripts will skip existing data")
        print("   - Run: python -m scripts.seed_all")
        print("   - May result in partial/inconsistent data")
        
        print("\n2. CLEAN START:")
        print("   - Clear database first for consistency")
        print("   - Run: python -m scripts.clear_db")
        print("   - Then run: python -m scripts.seed_all")
        
        print("\n3. MANUAL CLEANUP:")
        print("   - Use MongoDB Compass or mongo shell")
        print("   - Drop specific collections you want to reseed")
        
    else:
        print("\n Database is empty - safe to seed!")
        print("   Run: python -m scripts.seed_all")
    
    print("\n" + "=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_database())
