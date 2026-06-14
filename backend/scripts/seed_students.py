"""
Seed student users with Pakistani names
40 students total: 2024F-BSE (10), 2024F-BSCS (10), 2025S-BSE (10), 2025S-BSCS (10)
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, date
from faker import Faker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.core.security import get_password_hash

load_dotenv()

# Initialize Faker
fake = Faker()
Faker.seed(42)

# Pakistani names
PAKISTANI_FIRST_NAMES = [
    "Ahmed", "Ali", "Hassan", "Hussain", "Muhammad", "Omar", "Usman", "Bilal", "Faisal", "Imran",
    "Fatima", "Ayesha", "Zainab", "Maryam", "Khadija", "Sana", "Hira", "Amina", "Rabia", "Laiba",
    "Asad", "Fahad", "Hamza", "Junaid", "Kamran", "Noman", "Saad", "Tariq", "Waqas", "Zubair",
    "Alina", "Farha", "Iqra", "Mahnoor", "Nida", "Rabiya", "Samira", "Uzma", "Zara", "Noor",
    "Abdullah", "Arslan", "Daniyal", "Haris", "Ibrahim", "Kashif", "Moiz", "Nabeel", "Osama", "Rafay"
]

PAKISTANI_LAST_NAMES = [
    "Khan", "Ahmed", "Ali", "Hassan", "Hussain", "Malik", "Sheikh", "Akhtar", "Ansari", "Baig",
    "Chaudhry", "Dar", "Farooq", "Gilani", "Haider", "Iqbal", "Javed", "Karim", "Mahmood", "Naqvi",
    "Qureshi", "Raza", "Saeed", "Taqi", "Usman", "Wali", "Yousuf", "Zaidi", "Butt", "Siddiqui",
    "Aziz", "Bashir", "Cheema", "Durrani", "Ehsan", "Farhan", "Ghani", "Hayat", "Ilyas", "Jamil"
]

def generate_cnic():
    """Generate fake Pakistani CNIC"""
    return f"42{fake.random_int(1, 9)}01-{fake.random_int(1000000, 9999999)}-{fake.random_int(1, 9)}"

def generate_phone():
    """Generate Pakistani phone number"""
    return f"+92-{fake.random_int(300, 345)}-{fake.random_int(1000000, 9999999)}"

def generate_address():
    """Generate Pakistani address"""
    areas = ["Gulshan-e-Iqbal", "Bahadurabad", "DHA Phase 5", "Clifton", "North Nazimabad", 
             "Malir", "Saddar", "Korangi", "Gulistan-e-Johar", "FB Area", "Nazimabad",
             "Model Colony", "Defence", "Liaquatabad", "Orangi Town", "PECHS", "Tariq Road"]
    return f"House {fake.random_int(1, 999)}, {fake.random_element(areas)}, Karachi"

# Student batches configuration
BATCHES = [
    {"batch": "2024F", "program": "BSE", "count": 10, "current_semester": 4, "admission_year": 2024},
    {"batch": "2024F", "program": "BSCS", "count": 10, "current_semester": 4, "admission_year": 2024},
    {"batch": "2025S", "program": "BSE", "count": 10, "current_semester": 3, "admission_year": 2025},
    {"batch": "2025S", "program": "BSCS", "count": 10, "current_semester": 3, "admission_year": 2025},
]

async def seed_students():
    MONGO_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    users_collection = db.users
    
    print("=" * 70)
    print("Seeding students...")
    print("=" * 70)
    
    inserted_count = 0
    skipped_count = 0
    
    for batch_config in BATCHES:
        batch = batch_config["batch"]
        program = batch_config["program"]
        count = batch_config["count"]
        current_semester = batch_config["current_semester"]
        admission_year = batch_config["admission_year"]
        
        print(f"\n{'='*70}")
        print(f"Batch: {batch}-{program} (Semester {current_semester})")
        print(f"{'='*70}")
        
        for i in range(1, count + 1):
            rollno = f"{i:03d}"
            registration_no = f"{batch}-{program}-{rollno}"
            
            # Check if student already exists
            existing = await users_collection.find_one({"registration_no": registration_no})
            if existing:
                print(f"  {registration_no} already exists - skipping")
                skipped_count += 1
                continue
            
            # Generate student data
            first_name = fake.random_element(PAKISTANI_FIRST_NAMES)
            last_name = fake.random_element(PAKISTANI_LAST_NAMES)
            gender = "Male" if first_name in ["Ahmed", "Ali", "Hassan", "Hussain", "Muhammad", "Omar", "Usman", "Bilal", "Faisal", "Imran", "Asad", "Fahad", "Hamza", "Junaid", "Kamran", "Noman", "Saad", "Tariq", "Waqas", "Zubair", "Abdullah", "Arslan", "Daniyal", "Haris", "Ibrahim", "Kashif", "Moiz", "Nabeel", "Osama", "Rafay"] else "Female"
            
            # Guardian name
            guardian_first = fake.random_element(["Abdul", "Muhammad", "Ahmed", "Ali", "Hassan", "Hussain"])
            guardian_last = fake.random_element(PAKISTANI_LAST_NAMES)
            guardian_name = f"{guardian_first} {guardian_last}"
            
            # Determine department
            department = "Software Engineering" if program == "BSE" else "Computer Science"
            
            student_doc = {
                "username": registration_no,
                "email": f"{registration_no.lower()}@ssuet.edu.pk",
                "password_hash": get_password_hash(f"ssuet+{rollno}"),
                "role": "STUDENT",
                "first_name": first_name,
                "last_name": last_name,
                "cell_no": generate_phone(),
                "registration_no": registration_no,
                "date_of_birth": datetime.combine(date(2005 + fake.random_int(0, 2), fake.random_int(1, 12), fake.random_int(1, 28)), datetime.min.time()),
                "nic": generate_cnic(),
                "gender": gender,
                "address": generate_address(),
                "guardian_name": guardian_name,
                "guardian_cnic": generate_cnic(),
                "guardian_contact": generate_phone(),
                "department": department,
                "program": program,
                "batch": batch,
                "current_semester": current_semester,
                "admission_date": datetime(admission_year, 9 if "F" in batch else 3, 1),
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            
            await users_collection.insert_one(student_doc)
            print(f" {registration_no} | {first_name} {last_name:20} | Sem-{current_semester} | {gender}")
            inserted_count += 1
    
    print("\n" + "=" * 70)
    print(f"Total Inserted: {inserted_count} | Skipped: {skipped_count}")
    print("=" * 70)
    
    # Summary
    print("\n Summary by Batch:")
    print("-" * 70)
    for batch_config in BATCHES:
        print(f"  {batch_config['batch']}-{batch_config['program']:5} : {batch_config['count']} students (Semester {batch_config['current_semester']})")
    print("-" * 70)
    
    print("\n Sample Login Credentials:")
    print("-" * 70)
    print("  2024F-BSE-001  | Password: ssuet+001")
    print("  2024F-BSCS-001 | Password: ssuet+001")
    print("  2025S-BSE-001  | Password: ssuet+001")
    print("  2025S-BSCS-001 | Password: ssuet+001")
    print("-" * 70)
    print("  Pattern: {registration_no} | Password: ssuet+{rollno}")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_students())
