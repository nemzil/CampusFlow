import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["campusflow_db"]
    
    # Clean up stale grade for SE-101T that had wrong midterm/final values
    result = await db.grades.delete_many({"course_code": "SE-101T"})
    print(f"Cleaned SE-101T stale grades: {result.deleted_count}")
    
    result2 = await db.grades.delete_many({"course_code": "SE-102T"})
    print(f"Cleaned SE-102T stale grades: {result2.deleted_count}")

asyncio.run(run())
