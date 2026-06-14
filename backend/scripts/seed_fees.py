"""
Seed fees for all students based on their enrollments
Fee = (total_credit_hours  2350) + additional_fees
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

async def seed_fees():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    
    users_collection = db.users
    courses_collection = db.courses
    enrollments_collection = db.enrollments
    fees_collection = db.fees
    
    term = "2026S"
    semester = "2026S"
    
    print("=" * 70)
    print(f"Seeding fees for term {term}...")
    print("=" * 70)
    
    # Get all students
    students = await users_collection.find({"role": "STUDENT"}).to_list(None)
    
    inserted_count = 0
    skipped_count = 0
    
    for student in students:
        student_id = str(student["_id"])
        student_username = student["username"]
        
        # Check if fee already exists
        existing = await fees_collection.find_one({
            "student_id": student_id,
            "semester": semester
        })
        
        if existing:
            print(f"  Fee for {student_username} already exists - skipping")
            skipped_count += 1
            continue
        
        # Get current semester enrollments (ENROLLED status)
        enrollments = await enrollments_collection.find({
            "student_id": student_id,
            "status": "ENROLLED",
            "term": term
        }).to_list(None)
        
        if not enrollments:
            print(f"  No enrollments found for {student_username}")
            continue
        
        # Calculate total credit hours and build courses breakdown
        total_credits = 0
        courses_breakdown = []
        
        for enrollment in enrollments:
            from bson import ObjectId
            course = await courses_collection.find_one({"_id": ObjectId(enrollment["course_id"])})
            if course:
                credit_hours = course["credit_hours"]
                total_credits += credit_hours
                courses_breakdown.append({
                    "course_code": course["course_code"],
                    "course_name": course["course_name"],
                    "credit_hours": credit_hours,
                    "fee_per_credit": 2350,
                    "subtotal": credit_hours * 2350
                })
        
        # Calculate fees
        tuition_fee = total_credits * 2350
        examination_fee = 1000
        library_fee = 500
        sports_fee = 500
        other_fees = 500
        
        total_fee = tuition_fee + examination_fee + library_fee + sports_fee + other_fees
        
        # Random payment status (70% paid, 30% pending)
        is_paid = random.random() < 0.7
        payment_status = "paid" if is_paid else "pending"
        
        fee_doc = {
            "student_id": student_id,
            "student_username": student_username,
            "semester": semester,
            "courses": courses_breakdown,
            "total_credits": total_credits,
            "tuition_fee": tuition_fee,
            "examination_fee": examination_fee,
            "library_fee": library_fee,
            "sports_fee": sports_fee,
            "other_fees": other_fees,
            "total_fee": total_fee,
            "status": payment_status,
            "payment_date": datetime.utcnow() if is_paid else None,
            "verified_by": "feeadmin" if is_paid else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        await fees_collection.insert_one(fee_doc)
        print(f" {student_username} | {total_credits} credits | Rs. {total_fee:,} | {payment_status.upper()}")
        inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_fees())
