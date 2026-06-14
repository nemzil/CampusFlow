"""
Seed admin users - EXACT DATA AS SPECIFIED
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.core.security import get_password_hash

load_dotenv()

ADMINS = [
    {
        "username": "superadmin",
        "email": "superadmin@ssuet.edu.pk",
        "password": "admin123",
        "admin_level": "SUPER_ADMIN",
        "first_name": "Super",
        "last_name": "Admin",
        "cell_no": "+92-300-0000001"
    },
    {
        "username": "feeadmin",
        "email": "feeadmin@ssuet.edu.pk",
        "password": "admin123",
        "admin_level": "FEE_MANAGEMENT_ADMIN",
        "first_name": "Fee",
        "last_name": "Admin",
        "cell_no": "+92-300-0000002"
    },
    {
        "username": "courseadmin",
        "email": "courseadmin@ssuet.edu.pk",
        "password": "admin123",
        "admin_level": "COURSE_MANAGEMENT_ADMIN",
        "first_name": "Course",
        "last_name": "Admin",
        "cell_no": "+92-300-0000003"
    },
    {
        "username": "examadmin",
        "email": "examadmin@ssuet.edu.pk",
        "password": "admin123",
        "admin_level": "EXAM_MANAGEMENT_ADMIN",
        "first_name": "Exam",
        "last_name": "Admin",
        "cell_no": "+92-300-0000004"
    },
    {
        "username": "generaladmin",
        "email": "generaladmin@ssuet.edu.pk",
        "password": "admin123",
        "admin_level": "ADMIN",
        "first_name": "General",
        "last_name": "Admin",
        "cell_no": "+92-300-0000005"
    },
]

async def seed_admin():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    users_collection = db.users
    
    print("=" * 70)
    print("Seeding admin users...")
    print("=" * 70)
    
    inserted_count = 0
    skipped_count = 0
    
    for admin in ADMINS:
        existing = await users_collection.find_one({"username": admin["username"]})
        if existing:
            print(f"  {admin['username']} already exists - skipping")
            skipped_count += 1
            continue
        
        admin_doc = {
            "username": admin["username"],
            "email": admin["email"],
            "password_hash": get_password_hash(admin["password"]),
            "role": "ADMIN",
            "first_name": admin["first_name"],
            "last_name": admin["last_name"],
            "cell_no": admin["cell_no"],
            "admin_level": admin["admin_level"],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        await users_collection.insert_one(admin_doc)
        print(f" {admin['username']:15} | {admin['admin_level']}")
        inserted_count += 1
    
    print("=" * 70)
    print(f"Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_admin())
