"""
Read and display data from all collections
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Load environment variables
load_dotenv()

async def read_collections():
    """Read and display data from all collections"""
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/campusflow_db")
    client = AsyncIOMotorClient(mongodb_uri)
    
    # Get database
    try:
        db = client.get_default_database()
        if db is None or db.name == "admin":
            db = client.get_database("campusflow_db")
    except Exception:
        db = client.get_database("campusflow_db")
    
    print("\n" + "="*70)
    print(f"DATABASE: {db.name}")
    print("="*70)
    
    # Get all collection names
    collections = await db.list_collection_names()
    
    for coll_name in sorted(collections):
        collection = db[coll_name]
        count = await collection.count_documents({})
        
        print(f"\n{'='*70}")
        print(f"COLLECTION: {coll_name} ({count} documents)")
        print('='*70)
        
        if count > 0:
            # Get sample documents (limit to 5)
            limit = min(5, count)
            cursor = collection.find().limit(limit)
            docs = await cursor.to_list(length=limit)
            
            for i, doc in enumerate(docs, 1):
                print(f"\n--- Document {i}/{count} ---")
                # Print key fields only
                if coll_name == "users":
                    print(f"  Username: {doc.get('username')}")
                    print(f"  Email: {doc.get('email', 'N/A')}")
                    print(f"  Role: {doc.get('role')}")
                    print(f"  Full Name: {doc.get('full_name')}")
                    if doc.get('role') == 'student':
                        print(f"  Registration No: {doc.get('registration_no')}")
                        print(f"  Semester: {doc.get('semester')}")
                        print(f"  Department: {doc.get('department')}")
                
                elif coll_name == "courses":
                    print(f"  Code: {doc.get('course_code')}")
                    print(f"  Name: {doc.get('course_name')}")
                    print(f"  Credits: {doc.get('credit_hours')}")
                    print(f"  Semester: {doc.get('semester')}")
                    print(f"  Department: {doc.get('department')}")
                
                elif coll_name == "enrollments":
                    print(f"  Student: {doc.get('student_username')}")
                    print(f"  Course: {doc.get('course_code')}")
                    print(f"  Status: {doc.get('status')}")
                    print(f"  Semester: {doc.get('semester')}")
                
                elif coll_name == "todos":
                    print(f"  Username: {doc.get('username')}")
                    print(f"  Title: {doc.get('title')}")
                    print(f"  Priority: {doc.get('priority')}")
                    print(f"  Status: {doc.get('status')}")
                    print(f"  Due: {doc.get('due_date')}")
                
                elif coll_name == "announcements":
                    print(f"  Title: {doc.get('title')}")
                    print(f"  Author: {doc.get('author_username')}")
                    print(f"  Target: {doc.get('target_audience')}")
                    print(f"  Date: {doc.get('created_at')}")
                
                elif coll_name == "course_schedules":
                    print(f"  Course: {doc.get('course_code')}")
                    print(f"  Teacher: {doc.get('teacher_username')}")
                    print(f"  Day: {doc.get('day_of_week')}")
                    print(f"  Time: {doc.get('start_time')} - {doc.get('end_time')}")
                    print(f"  Room: {doc.get('room')}")
                
                elif coll_name == "forum_channels":
                    print(f"  Name: {doc.get('name')}")
                    print(f"  Description: {doc.get('description')}")
                    print(f"  Course: {doc.get('course_code', 'General')}")
                
                elif coll_name == "assignments":
                    print(f"  Title: {doc.get('title')}")
                    print(f"  Course: {doc.get('course_code')}")
                    print(f"  Type: {doc.get('type')}")
                    print(f"  Due: {doc.get('due_date')}")
                    print(f"  Max Marks: {doc.get('max_marks')}")
                
                elif coll_name == "exam_schedules":
                    print(f"  Course: {doc.get('course_code')}")
                    print(f"  Type: {doc.get('exam_type')}")
                    print(f"  Date: {doc.get('exam_date')}")
                    print(f"  Time: {doc.get('start_time')} - {doc.get('end_time')}")
                    print(f"  Room: {doc.get('room')}")
                
                elif coll_name == "fees":
                    print(f"  Student: {doc.get('student_username')}")
                    print(f"  Amount: {doc.get('amount')}")
                    print(f"  Status: {doc.get('status')}")
                    print(f"  Due: {doc.get('due_date')}")
                
                else:
                    # Print first few fields for other collections
                    for key, value in list(doc.items())[:5]:
                        if key != '_id':
                            print(f"  {key}: {value}")
            
            if count > 5:
                print(f"\n... and {count - 5} more documents")
        else:
            print("  (Empty collection)")
    
    print("\n" + "="*70)
    print("END OF DATA")
    print("="*70 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(read_collections())
