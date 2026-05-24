from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List
from app.models.course import Course
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate, TeacherAssignment, CourseResponse
from app.api.deps import get_current_user

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

async def get_current_user_object(username: str) -> User:
    """Get full user object from username"""
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def calculate_max_marks(category: str) -> int:
    """Calculate max marks based on category"""
    return 50 if category == "LAB" else 100

def get_grading_scale(category: str) -> str:
    """Get grading scale based on category"""
    return "lab" if category == "LAB" else "theory"

# ═══════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS (All authenticated users)
# ═══════════════════════════════════════════════════════════════════

@router.get("/", response_model=List[CourseResponse])
async def list_courses(
    semester: Optional[int] = Query(None, ge=1, le=8),
    term: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: str = Depends(get_current_user)
):
    """
    List courses with optional filters
    Available to all authenticated users
    """
    # Build query
    query = {}
    
    if semester is not None:
        query["semester"] = semester
    if term:
        query["term"] = term
    if type:
        query["course_type"] = type.lower()
    if category:
        query["category"] = category.upper()
    if is_active is not None:
        query["is_active"] = is_active
    
    # Fetch courses
    courses = await Course.find(query).skip(skip).limit(limit).sort("+semester", "+course_code").to_list()
    
    # Convert ObjectId to string for response
    return [
        {
            **course.model_dump(),
            "id": str(course.id)
        }
        for course in courses
    ]

@router.get("/my-courses", response_model=List[CourseResponse])
async def get_my_courses(
    current_user: str = Depends(get_current_user)
):
    """
    Get courses for current user
    - Students: Enrolled courses (TODO: implement after enrollment module)
    - Teachers: Assigned courses
    - Admins: All courses
    """
    user = await get_current_user_object(current_user)
    
    if user.role == "TEACHER":
        # Get courses assigned to this teacher
        courses = await Course.find(Course.teacher_id == user.username).to_list()
        return [
            {
                **course.model_dump(),
                "id": str(course.id)
            }
            for course in courses
        ]
    
    elif user.role == "ADMIN":
        # Admins see all courses
        courses = await Course.find_all().to_list()
        return [
            {
                **course.model_dump(),
                "id": str(course.id)
            }
            for course in courses
        ]
    
    elif user.role == "STUDENT":
        # TODO: After enrollment module, fetch enrolled courses
        # For now, return courses for student's current semester
        if user.current_semester:
            courses = await Course.find(
                Course.semester == user.current_semester,
                Course.is_active == True
            ).to_list()
            return [
                {
                    **course.model_dump(),
                    "id": str(course.id)
                }
                for course in courses
            ]
        return []
    
    return []

@router.get("/{course_code}", response_model=CourseResponse)
async def get_course(
    course_code: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get single course by code
    Available to all authenticated users
    """
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return CourseResponse(
        id=str(course.id),
        course_code=course.course_code,
        course_name=course.course_name,
        course_type=course.course_type,
        category=course.category,
        semester=course.semester,
        credit_hours=course.credit_hours,
        prerequisites=course.prerequisites,
        max_marks=course.max_marks,
        grading_scale=course.grading_scale,
        description=course.description,
        objectives=course.objectives,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher_name,
        term=course.term,
        max_students=course.max_students,
        enrolled_count=course.enrolled_count,
        is_active=course.is_active,
        created_at=course.created_at,
        updated_at=course.updated_at,
        created_by=course.created_by
    )

# ═══════════════════════════════════════════════════════════════════
# ADMIN-ONLY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Create a new course (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can create courses")
    
    # Check if course code already exists for this term
    existing = await Course.find_one(
        Course.course_code == course_data.course_code,
        Course.term == course_data.term
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Course '{course_data.course_code}' already exists for term '{course_data.term}'"
        )
    
    # Validate course type
    if course_data.course_type.lower() not in ["core", "elective"]:
        raise HTTPException(status_code=400, detail="Course type must be 'core' or 'elective'")
    
    # Validate category
    if course_data.category.upper() not in ["TH", "LAB"]:
        raise HTTPException(status_code=400, detail="Category must be 'TH' or 'LAB'")
    
    # Create course
    course = Course(
        course_code=course_data.course_code,
        course_name=course_data.course_name,
        course_type=course_data.course_type.lower(),
        category=course_data.category.upper(),
        semester=course_data.semester,
        credit_hours=course_data.credit_hours,
        prerequisites=course_data.prerequisites,
        max_marks=calculate_max_marks(course_data.category.upper()),
        grading_scale=get_grading_scale(course_data.category.upper()),
        description=course_data.description,
        objectives=course_data.objectives,
        term=course_data.term,
        max_students=course_data.max_students,
        enrolled_count=0,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        created_by=current_user
    )
    
    await course.insert()
    
    return CourseResponse(
        id=str(course.id),
        course_code=course.course_code,
        course_name=course.course_name,
        course_type=course.course_type,
        category=course.category,
        semester=course.semester,
        credit_hours=course.credit_hours,
        prerequisites=course.prerequisites,
        max_marks=course.max_marks,
        grading_scale=course.grading_scale,
        description=course.description,
        objectives=course.objectives,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher_name,
        term=course.term,
        max_students=course.max_students,
        enrolled_count=course.enrolled_count,
        is_active=course.is_active,
        created_at=course.created_at,
        updated_at=course.updated_at,
        created_by=course.created_by
    )

@router.put("/{course_code}", response_model=CourseResponse)
async def update_course(
    course_code: str,
    updates: CourseUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Update course details (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can update courses")
    
    # Find course
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Build update dict
    update_data = {}
    
    if updates.course_name is not None:
        update_data[Course.course_name] = updates.course_name
    if updates.course_type is not None:
        if updates.course_type.lower() not in ["core", "elective"]:
            raise HTTPException(status_code=400, detail="Course type must be 'core' or 'elective'")
        update_data[Course.course_type] = updates.course_type.lower()
    if updates.category is not None:
        if updates.category.upper() not in ["TH", "LAB"]:
            raise HTTPException(status_code=400, detail="Category must be 'TH' or 'LAB'")
        update_data[Course.category] = updates.category.upper()
        update_data[Course.max_marks] = calculate_max_marks(updates.category.upper())
        update_data[Course.grading_scale] = get_grading_scale(updates.category.upper())
    if updates.semester is not None:
        update_data[Course.semester] = updates.semester
    if updates.credit_hours is not None:
        update_data[Course.credit_hours] = updates.credit_hours
    if updates.prerequisites is not None:
        update_data[Course.prerequisites] = updates.prerequisites
    if updates.description is not None:
        update_data[Course.description] = updates.description
    if updates.objectives is not None:
        update_data[Course.objectives] = updates.objectives
    if updates.max_students is not None:
        update_data[Course.max_students] = updates.max_students
    if updates.is_active is not None:
        update_data[Course.is_active] = updates.is_active
    
    # Add updated_at
    update_data[Course.updated_at] = datetime.now(timezone.utc)
    
    # Apply updates
    await course.set(update_data)
    await course.sync()
    
    return CourseResponse(
        id=str(course.id),
        course_code=course.course_code,
        course_name=course.course_name,
        course_type=course.course_type,
        category=course.category,
        semester=course.semester,
        credit_hours=course.credit_hours,
        prerequisites=course.prerequisites,
        max_marks=course.max_marks,
        grading_scale=course.grading_scale,
        description=course.description,
        objectives=course.objectives,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher_name,
        term=course.term,
        max_students=course.max_students,
        enrolled_count=course.enrolled_count,
        is_active=course.is_active,
        created_at=course.created_at,
        updated_at=course.updated_at,
        created_by=course.created_by
    )

@router.delete("/{course_code}")
async def delete_course(
    course_code: str,
    current_user: str = Depends(get_current_user)
):
    """
    Delete a course (ADMIN ONLY)
    Warning: This will permanently delete the course
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete courses")
    
    # Find course
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if course has enrollments
    if course.enrolled_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete course with {course.enrolled_count} enrolled students. Deactivate instead."
        )
    
    # Delete course
    await course.delete()
    
    return {"message": f"Course '{course_code}' deleted successfully"}

@router.post("/{course_code}/assign-teacher", response_model=CourseResponse)
async def assign_teacher_to_course(
    course_code: str,
    assignment: TeacherAssignment,
    current_user: str = Depends(get_current_user)
):
    """
    Assign a teacher to a course (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can assign teachers")
    
    # Find course
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Find teacher
    teacher = await User.find_one(User.username == assignment.teacher_username)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    if teacher.role != "TEACHER":
        raise HTTPException(status_code=400, detail="User is not a teacher")
    
    # Assign teacher
    await course.set({
        Course.teacher_id: teacher.username,
        Course.teacher_name: f"{teacher.first_name} {teacher.last_name}",
        Course.updated_at: datetime.now(timezone.utc)
    })
    await course.sync()
    
    return CourseResponse(
        id=str(course.id),
        course_code=course.course_code,
        course_name=course.course_name,
        course_type=course.course_type,
        category=course.category,
        semester=course.semester,
        credit_hours=course.credit_hours,
        prerequisites=course.prerequisites,
        max_marks=course.max_marks,
        grading_scale=course.grading_scale,
        description=course.description,
        objectives=course.objectives,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher_name,
        term=course.term,
        max_students=course.max_students,
        enrolled_count=course.enrolled_count,
        is_active=course.is_active,
        created_at=course.created_at,
        updated_at=course.updated_at,
        created_by=course.created_by
    )

@router.post("/{course_code}/unassign-teacher", response_model=CourseResponse)
async def unassign_teacher_from_course(
    course_code: str,
    current_user: str = Depends(get_current_user)
):
    """
    Remove teacher assignment from a course (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can unassign teachers")
    
    # Find course
    course = await Course.find_one(Course.course_code == course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Unassign teacher
    await course.set({
        Course.teacher_id: None,
        Course.teacher_name: None,
        Course.updated_at: datetime.now(timezone.utc)
    })
    await course.sync()
    
    return CourseResponse(
        id=str(course.id),
        course_code=course.course_code,
        course_name=course.course_name,
        course_type=course.course_type,
        category=course.category,
        semester=course.semester,
        credit_hours=course.credit_hours,
        prerequisites=course.prerequisites,
        max_marks=course.max_marks,
        grading_scale=course.grading_scale,
        description=course.description,
        objectives=course.objectives,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher_name,
        term=course.term,
        max_students=course.max_students,
        enrolled_count=course.enrolled_count,
        is_active=course.is_active,
        created_at=course.created_at,
        updated_at=course.updated_at,
        created_by=course.created_by
    )

# ═══════════════════════════════════════════════════════════════════
# BULK OPERATIONS
# ═══════════════════════════════════════════════════════════════════

@router.post("/bulk-create")
async def bulk_create_courses(
    courses: List[CourseCreate],
    current_user: str = Depends(get_current_user)
):
    """
    Bulk create courses (ADMIN ONLY)
    Useful for seeding course catalog
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can bulk create courses")
    
    success_count = 0
    error_count = 0
    errors = []
    
    for course_data in courses:
        try:
            # Check if exists
            existing = await Course.find_one(
                Course.course_code == course_data.course_code,
                Course.term == course_data.term
            )
            if existing:
                error_count += 1
                errors.append(f"{course_data.course_code}: Already exists")
                continue
            
            # Create course
            course = Course(
                course_code=course_data.course_code,
                course_name=course_data.course_name,
                course_type=course_data.course_type.lower(),
                category=course_data.category.upper(),
                semester=course_data.semester,
                credit_hours=course_data.credit_hours,
                prerequisites=course_data.prerequisites,
                max_marks=calculate_max_marks(course_data.category.upper()),
                grading_scale=get_grading_scale(course_data.category.upper()),
                description=course_data.description,
                objectives=course_data.objectives,
                term=course_data.term,
                max_students=course_data.max_students,
                enrolled_count=0,
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                created_by=current_user
            )
            
            await course.insert()
            success_count += 1
            
        except Exception as e:
            error_count += 1
            errors.append(f"{course_data.course_code}: {str(e)}")
    
    return {
        "message": "Bulk course creation completed",
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors[:10]  # Return first 10 errors
    }
