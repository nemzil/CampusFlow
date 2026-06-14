"""
Seed university-wide announcements
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

ANNOUNCEMENTS = [
    {
        "title": "Semester Registration Open - Spring 2026",
        "content": "Course registration for Spring 2026 semester is now open. Please register your courses before the deadline.",
        "category": "academic",
        "priority": "high"
    },
    {
        "title": "Mid-Term Examination Schedule Released",
        "content": "The mid-term examination schedule has been released. Please check the exam schedule section for details.",
        "category": "academic",
        "priority": "high"
    },
    {
        "title": "Fee Submission Deadline Extended",
        "content": "The fee submission deadline has been extended by one week. Last date is now March 15, 2026.",
        "category": "general",
        "priority": "medium"
    },
    {
        "title": "Campus COVID-19 Safety Guidelines",
        "content": "All students and staff must follow COVID-19 safety protocols. Masks are mandatory in all indoor spaces.",
        "category": "rules",
        "priority": "high"
    },
    {
        "title": "Library New Book Arrivals",
        "content": "The library has received new books on Software Engineering, AI, and Data Science. Check them out today!",
        "category": "general",
        "priority": "low"
    },
    {
        "title": "Tech Fest 2026 - Registration Open",
        "content": "Annual Tech Fest 2026 registration is now open. Participate in coding competitions, hackathons, and more!",
        "category": "events",
        "priority": "medium"
    },
    {
        "title": "Final Year Project Proposal Submission",
        "content": "Final year students must submit their project proposals by April 30, 2026.",
        "category": "academic",
        "priority": "high"
    },
    {
        "title": "Sports Week Announcement",
        "content": "Sports week will be held from March 20-25, 2026. Register for cricket, football, and other sports.",
        "category": "events",
        "priority": "medium"
    },
]

async def seed_announcements():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    announcements_collection = db.announcements
    
    print("=" * 70)
    print("Seeding announcements...")
    print("=" * 70)
    
    inserted_count = 0
    skipped_count = 0
    
    for i, announcement in enumerate(ANNOUNCEMENTS):
        # Check if already exists
        existing = await announcements_collection.find_one({
            "title": announcement["title"]
        })
        
        if existing:
            skipped_count += 1
            continue
        
        announcement_doc = {
            "title": announcement["title"],
            "content": announcement["content"],
            "category": announcement["category"],
            "priority": announcement["priority"],
            "author_username": "superadmin",
            "author_name": "Super Admin",
            "target_audience": "ALL",
            "is_pinned": announcement["priority"] == "high",
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            "updated_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
        }
        
        await announcements_collection.insert_one(announcement_doc)
        print(f" {announcement['title']}")
        inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_announcements())
