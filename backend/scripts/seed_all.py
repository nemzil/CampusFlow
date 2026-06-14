"""
Master seed script - runs all seeders in correct dependency order
NEW comprehensive seeding system
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import all seed functions
from seed_admin_new import seed_admin
from seed_courses_new import seed_courses
from seed_teachers_new import seed_teachers
from seed_students_new import seed_students
from seed_enrollment_new import seed_enrollment
from seed_grades_new import seed_grades
from seed_fees_new import seed_fees
from seed_timetable_new import seed_timetable
from seed_assignments_new import seed_assignments
from seed_forums_new import seed_forums
from seed_announcements_new import seed_announcements

async def seed_all():
    """Run all seed scripts in correct dependency order"""
    
    print("\n" + "="*70)
    print(" " * 20 + "CAMPUSFLOW DATABASE SEEDING")
    print("="*70)
    print("Starting complete database population...")
    print("This will take a few minutes...")
    print("="*70 + "\n")
    
    # Define scripts in dependency order
    scripts = [
        ("Admins", seed_admin),
        ("Courses (BSE + BSCS)", seed_courses),
        ("Teachers (Assigned to Courses)", seed_teachers),
        ("Students (40 total)", seed_students),
        ("Enrollments (Current + Past)", seed_enrollment),
        ("Grades (Completed Semesters)", seed_grades),
        ("Fees (Based on Enrollments)", seed_fees),
        ("Timetable (Class Schedules)", seed_timetable),
        ("Assignments & Quizzes", seed_assignments),
        ("Forum Channels (Per Course)", seed_forums),
        ("Announcements", seed_announcements),
    ]
    
    completed = 0
    failed = 0
    failed_list = []
    
    for i, (name, func) in enumerate(scripts, 1):
        try:
            print(f"\n[{i}/{len(scripts)}] Running: {name}")
            print("="*70)
            await func()
            completed += 1
        except Exception as e:
            print(f"\nERROR in {name}: {str(e)}")
            import traceback
            traceback.print_exc()
            failed += 1
            failed_list.append(name)
            # Continue with remaining scripts
            continue
    
    # Summary
    print("\n" + "="*70)
    print(" " * 25 + "SEEDING COMPLETE")
    print("="*70)
    print(f"Completed: {completed}/{len(scripts)}")
    print(f"Failed: {failed}/{len(scripts)}")
    
    if failed_list:
        print(f"\nFailed scripts: {', '.join(failed_list)}")
    
    print("\n" + "="*70)
    print(" " * 20 + "DATABASE POPULATED:")
    print("="*70)
    print("   5 Admins (password: admin123)")
    print("   ~100 Teachers (password: teacher123) - Assigned to Courses")
    print("   40 Students (password: ssuet+XXX)")
    print("     - 10  2024F-BSE (Semester 4)")
    print("     - 10  2024F-BSCS (Semester 4)")
    print("     - 10  2025S-BSE (Semester 3)")
    print("     - 10  2025S-BSCS (Semester 3)")
    print("   ~110 BSE Courses (Semesters 1-8)")
    print("   ~100 BSCS Courses (Semesters 1-8)")
    print("   Enrollments (Current ENROLLED + Past COMPLETED)")
    print("   Grades for Completed Semesters (All Passed)")
    print("   Fees (Based on Enrolled Courses)")
    print("   Class Timetable (9 periods/day, labs 3 consecutive)")
    print("   Assignments & Quizzes (3+3 per course)")
    print("   Forum Channels (Per Course)")
    print("   Announcements (University-wide)")
    print("="*70)
    print("\n Your CampusFlow database is ready!")
    print("="*70 + "\n")
    
    print(" Sample Login Credentials:")
    print("-" * 70)
    print("  ADMIN:")
    print("    superadmin / admin123")
    print("\n  TEACHERS:")
    print("    (Check seed output for usernames) / teacher123")
    print("\n  STUDENTS:")
    print("    2024F-BSE-001 / ssuet+001")
    print("    2024F-BSCS-001 / ssuet+001")
    print("    2025S-BSE-001 / ssuet+001")
    print("    2025S-BSCS-001 / ssuet+001")
    print("="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(seed_all())
