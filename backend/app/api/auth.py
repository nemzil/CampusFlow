from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone, date
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import User, UserLogin, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user
import traceback

router = APIRouter()

@router.get("/test")
async def test():
    return {"status": "Auth router working"}

@router.get("/test-student")
async def test_student():
    """Test endpoint to check if we can fetch student data"""
    user = await User.find_one(User.username == "2024F-BSE-001")
    if not user:
        return {"error": "Student not found"}
    
    return {
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name,
        "registration_no": user.registration_no
    }

# ═══════════════════════════════════════════════════════════════════
# AUTHENTICATION ENDPOINTS: Role-Based Login
# ═══════════════════════════════════════════════════════════════════

async def _authenticate_user(username: str, password: str, required_role: str = None):
    """
    Internal helper function for authentication
    Returns user if authentication successful, raises HTTPException otherwise
    """
    # 1. Find user by username
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Invalid username or password"
        )

    # 2. Check if role matches (if role is specified)
    if required_role and user.role != required_role:
        raise HTTPException(
            status_code=403, 
            detail=f"This login portal is for {required_role.lower()}s only"
        )

    # 3. Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=403, 
            detail="Account is deactivated. Please contact administration."
        )

    # 4. Verify password matches hash
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401, 
            detail="Invalid username or password"
        )

    # 5. Update last login timestamp using atomic update
    await user.set({User.last_login: datetime.now(timezone.utc)})

    return user


def _build_login_response(user: User):
    """
    Internal helper function to build login response with role-specific fields
    """
    # Base response data
    response_data = {
        "message": "Login successful",
        "access_token": create_access_token(data={"sub": user.username, "role": user.role}),
        "token_type": "bearer",
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_picture_url": user.profile_picture_url,
    }

    # Add role-specific fields
    if user.role == "STUDENT":
        response_data.update({
            "registration_no": user.registration_no,
            "department": user.department,
            "program": user.program,
            "batch": user.batch,
            "current_semester": user.current_semester
        })
    elif user.role == "TEACHER":
        response_data.update({
            "employee_id": user.employee_id,
            "department": user.department,
            "designation": user.designation,
            "qualification": user.qualification,
            "specialization": user.specialization,
            "office_location": user.office_location
        })
    elif user.role == "ADMIN":
        response_data["admin_level"] = user.admin_level

    return response_data


@router.post("/login/student")
async def student_login(credentials: UserLogin):
    """
    Student login endpoint
    Only allows STUDENT role to authenticate
    """
    user = await _authenticate_user(
        credentials.username, 
        credentials.password, 
        required_role="STUDENT"
    )
    return _build_login_response(user)


@router.post("/login/teacher")
async def teacher_login(credentials: UserLogin):
    """
    Teacher login endpoint
    Only allows TEACHER role to authenticate
    """
    user = await _authenticate_user(
        credentials.username, 
        credentials.password, 
        required_role="TEACHER"
    )
    return _build_login_response(user)


@router.post("/login/admin")
async def admin_login(credentials: UserLogin):
    """
    Admin login endpoint
    Only allows ADMIN role to authenticate
    """
    user = await _authenticate_user(
        credentials.username, 
        credentials.password, 
        required_role="ADMIN"
    )
    return _build_login_response(user)


@router.post("/login")
async def login(credentials: UserLogin):
    """
    Universal login endpoint (backward compatibility)
    Authenticates any role without restriction
    
    NOTE: Frontend should use role-specific endpoints:
    - POST /api/auth/login/student
    - POST /api/auth/login/teacher
    - POST /api/auth/login/admin
    """
    user = await _authenticate_user(credentials.username, credentials.password)
    return _build_login_response(user)


# ═══════════════════════════════════════════════════════════════════
# TOKEN VERIFICATION & SESSION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/verify")
async def verify_token(current_user: str = Depends(get_current_user)):
    """
    Verify JWT token validity and return current user info
    Used by frontend to check if user is still authenticated
    """
    user = await User.find_one(User.username == current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    return {
        "valid": True,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active
    }


@router.post("/logout")
async def logout(current_user: str = Depends(get_current_user)):
    """
    Logout endpoint (for audit logging purposes)
    Note: JWT tokens are stateless, so actual invalidation happens on frontend
    """
    # In future, you can:
    # 1. Add token to blacklist in Redis
    # 2. Log the logout event
    # 3. Clear any server-side sessions
    
    return {
        "message": "Logout successful",
        "username": current_user
    }


# ═══════════════════════════════════════════════════════════════════
# PROFILE MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

# Pydantic schemas for profile updates
class ProfileUpdateRequest(BaseModel):
    cell_no: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_cnic: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

@router.get("/users/{username}")
async def get_user_profile(
    username: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get user profile (own profile only)
    Returns all user data except password_hash
    """
    if username != current_user:
        raise HTTPException(status_code=403, detail="Cannot view other profiles")
    
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return all fields except password_hash
    return user.dict(exclude={"password_hash"})

@router.patch("/users/{username}")
async def update_user_profile(
    username: str,
    updates: ProfileUpdateRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Update editable profile fields
    Editable fields: cell_no, address, guardian_name, guardian_cnic
    """
    if username != current_user:
        raise HTTPException(status_code=403, detail="Cannot update other profiles")
    
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update dict (only non-None values)
    update_data = {}
    if updates.cell_no is not None:
        update_data[User.cell_no] = updates.cell_no
    if updates.address is not None:
        update_data[User.address] = updates.address
    if updates.guardian_name is not None:
        update_data[User.guardian_name] = updates.guardian_name
    if updates.guardian_cnic is not None:
        update_data[User.guardian_cnic] = updates.guardian_cnic
    
    # Add updated_at timestamp
    update_data[User.updated_at] = datetime.now(timezone.utc)
    
    # Apply updates
    await user.set(update_data)
    await user.sync()
    
    return user.dict(exclude={"password_hash"})

@router.post("/users/{username}/password")
async def change_password(
    username: str,
    request: PasswordChangeRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Change user password
    Requires old password for verification
    """
    if username != current_user:
        raise HTTPException(status_code=403, detail="Cannot change other passwords")
    
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(request.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    # Hash new password
    new_hash = get_password_hash(request.new_password)
    
    # Update password
    await user.set({
        User.password_hash: new_hash,
        User.updated_at: datetime.now(timezone.utc)
    })
    
    return {"message": "Password changed successfully"}


# ═══════════════════════════════════════════════════════════════════
# ADMIN-ONLY: USER REGISTRATION
# ═══════════════════════════════════════════════════════════════════

class RegisterStudentRequest(BaseModel):
    """Request schema for registering a new student"""
    # Basic Info
    username: str  # registration_no (e.g., "2024F-BSE-001")
    password: str
    email: EmailStr
    first_name: str
    last_name: str
    cell_no: str  # Required
    
    # Student-Specific
    registration_no: str  # Same as username
    date_of_birth: str  # "YYYY-MM-DD"
    nic: str
    gender: str  # "Male" or "Female"
    department: str  # "Computer Science"
    program: str  # "BSE"
    batch: str  # "2024F"
    current_semester: int
    
    # Optional Contact
    address: Optional[str] = None
    
    # Guardian (Optional)
    guardian_name: Optional[str] = None
    guardian_cnic: Optional[str] = None
    guardian_contact: Optional[str] = None

class RegisterTeacherRequest(BaseModel):
    """Request schema for registering a new teacher"""
    # Basic Info
    username: str  # firstname+lastname (e.g., "ahmedkhan")
    password: str
    email: EmailStr
    first_name: str
    last_name: str
    cell_no: str  # Required
    
    # Teacher-Specific
    employee_id: str
    department: str
    designation: str  # "Lecturer", "Assistant Professor", etc.
    qualification: str  # "PhD in Computer Science"
    
    # Optional
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    address: Optional[str] = None

class RegisterAdminRequest(BaseModel):
    """Request schema for registering a new admin"""
    username: str
    password: str
    email: EmailStr
    first_name: str
    last_name: str
    cell_no: str  # Required
    admin_level: str  # "SUPER_ADMIN", "ADMIN", "FEE_MANAGEMENT_ADMIN", "COURSE_MANAGEMENT_ADMIN", "EXAM_MANAGEMENT_ADMIN"

@router.post("/register/student")
async def register_student(
    request: RegisterStudentRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Register a new student (ADMIN ONLY)
    """
    # 1. Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can register new users")
    
    # 2. Normalize email to lowercase
    email = request.email.lower()
    
    # 3. Check if username already exists
    existing = await User.find_one(User.username == request.username)
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{request.username}' already exists")
    
    # 4. Check if email already exists
    existing_email = await User.find_one(User.email == email)
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{email}' already exists")
    
    # 5. Check if registration_no already exists
    existing_reg = await User.find_one(User.registration_no == request.registration_no)
    if existing_reg:
        raise HTTPException(status_code=400, detail=f"Registration number '{request.registration_no}' already exists")
    
    # 6. Parse date of birth
    try:
        dob = datetime.strptime(request.date_of_birth, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # 6. Create student user
    student_data = {
        "username": request.username,
        "email": email,  # Use normalized lowercase email
        "password_hash": get_password_hash(request.password),
        "role": "STUDENT",
        "first_name": request.first_name,
        "last_name": request.last_name,
        "cell_no": request.cell_no,
        "registration_no": request.registration_no,
        "date_of_birth": dob,
        "nic": request.nic,
        "gender": request.gender,
        "department": request.department,
        "program": request.program,
        "batch": request.batch,
        "current_semester": request.current_semester,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Add optional fields only if they have values
    if request.address:
        student_data["address"] = request.address
    if request.guardian_name:
        student_data["guardian_name"] = request.guardian_name
    if request.guardian_cnic:
        student_data["guardian_cnic"] = request.guardian_cnic
    if request.guardian_contact:
        student_data["guardian_contact"] = request.guardian_contact
    
    student = User(**student_data)
    
    await student.insert()
    
    return {
        "message": "Student registered successfully",
        "username": student.username,
        "email": student.email,
        "registration_no": student.registration_no
    }

@router.post("/register/teacher")
async def register_teacher(
    request: RegisterTeacherRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Register a new teacher (ADMIN ONLY)
    """
    # 1. Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can register new users")
    
    # 2. Normalize email to lowercase
    email = request.email.lower()
    
    # 3. Check if username already exists
    existing = await User.find_one(User.username == request.username)
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{request.username}' already exists")
    
    # 4. Check if email already exists
    existing_email = await User.find_one(User.email == email)
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{email}' already exists")
    
    # 5. Check if employee_id already exists
    existing_emp = await User.find_one(User.employee_id == request.employee_id)
    if existing_emp:
        raise HTTPException(status_code=400, detail=f"Employee ID '{request.employee_id}' already exists")
    
    # 5. Create teacher user
    teacher_data = {
        "username": request.username,
        "email": email,  # Use normalized lowercase email
        "password_hash": get_password_hash(request.password),
        "role": "TEACHER",
        "first_name": request.first_name,
        "last_name": request.last_name,
        "cell_no": request.cell_no,
        "employee_id": request.employee_id,
        "department": request.department,
        "designation": request.designation,
        "qualification": request.qualification,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Add optional fields only if they have values
    if request.specialization:
        teacher_data["specialization"] = request.specialization
    if request.office_location:
        teacher_data["office_location"] = request.office_location
    if request.address:
        teacher_data["address"] = request.address
    
    teacher = User(**teacher_data)
    
    await teacher.insert()
    
    return {
        "message": "Teacher registered successfully",
        "username": teacher.username,
        "email": teacher.email,
        "employee_id": teacher.employee_id
    }

@router.post("/register/admin")
async def register_admin(
    request: RegisterAdminRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Register a new admin (SUPER_ADMIN ONLY)
    """
    # 1. Verify super admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN" or admin.admin_level != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admins can register new admins")
    
    # 2. Normalize email to lowercase
    email = request.email.lower()
    
    # 3. Check if username already exists
    existing = await User.find_one(User.username == request.username)
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{request.username}' already exists")
    
    # 4. Check if email already exists
    existing_email = await User.find_one(User.email == email)
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Email '{email}' already exists")
    
    # 4. Create admin user
    admin_data = {
        "username": request.username,
        "email": email,  # Use normalized lowercase email
        "password_hash": get_password_hash(request.password),
        "role": "ADMIN",
        "first_name": request.first_name,
        "last_name": request.last_name,
        "cell_no": request.cell_no,
        "admin_level": request.admin_level,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    new_admin = User(**admin_data)
    
    await new_admin.insert()
    
    return {
        "message": "Admin registered successfully",
        "username": new_admin.username,
        "email": new_admin.email,
        "admin_level": new_admin.admin_level
    }

# ═══════════════════════════════════════════════════════════════════
# ADMIN-ONLY: USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: str = Depends(get_current_user)
):
    """
    List all users (ADMIN ONLY)
    Optional filter by role
    """
    # Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can list users")
    
    # Build query
    query = {}
    if role:
        query["role"] = role.upper()
    
    # Fetch users
    users = await User.find(query).skip(skip).limit(limit).to_list()
    
    # Return without password_hash, with id as string
    return [
        {
            **user.model_dump(exclude={"password_hash"}),
            "id": str(user.id)
        }
        for user in users
    ]

@router.delete("/users/{username}")
async def delete_user(
    username: str,
    current_user: str = Depends(get_current_user)
):
    """
    Delete a user (ADMIN ONLY)
    Cannot delete yourself
    """
    # Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    # Cannot delete yourself
    if username == current_user:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Find and delete user
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await user.delete()
    
    return {"message": f"User '{username}' deleted successfully"}

@router.patch("/users/{username}/activate")
async def activate_user(
    username: str,
    current_user: str = Depends(get_current_user)
):
    """
    Activate a user account (ADMIN ONLY)
    """
    # Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can activate users")
    
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await user.set({User.is_active: True, User.updated_at: datetime.now(timezone.utc)})
    
    return {"message": f"User '{username}' activated successfully"}

@router.patch("/users/{username}/deactivate")
async def deactivate_user(
    username: str,
    current_user: str = Depends(get_current_user)
):
    """
    Deactivate a user account (ADMIN ONLY)
    Cannot deactivate yourself
    """
    # Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can deactivate users")
    
    # Cannot deactivate yourself
    if username == current_user:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await user.set({User.is_active: False, User.updated_at: datetime.now(timezone.utc)})
    
    return {"message": f"User '{username}' deactivated successfully"}

# ═══════════════════════════════════════════════════════════════════
# ADMIN-ONLY: EDIT USER DETAILS
# ═══════════════════════════════════════════════════════════════════

class AdminUpdateUserRequest(BaseModel):
    """Admin can update any user field"""
    # Basic fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    cell_no: Optional[str] = None
    address: Optional[str] = None
    
    # Student fields
    date_of_birth: Optional[str] = None
    nic: Optional[str] = None
    gender: Optional[str] = None
    department: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    current_semester: Optional[int] = None
    guardian_name: Optional[str] = None
    guardian_cnic: Optional[str] = None
    guardian_contact: Optional[str] = None
    
    # Teacher fields
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    
    # Admin fields
    admin_level: Optional[str] = None

    # Credentials (admin-only override)
    new_username: Optional[str] = None
    new_password: Optional[str] = None

@router.patch("/users/{username}/admin-edit")
async def admin_edit_user(
    username: str,
    updates: AdminUpdateUserRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Admin can edit any user's details (ADMIN ONLY)
    """
    # Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can edit users")
    
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update dict
    update_data = {}
    
    # Basic fields
    if updates.first_name is not None:
        update_data[User.first_name] = updates.first_name
    if updates.last_name is not None:
        update_data[User.last_name] = updates.last_name
    if updates.email is not None:
        # Check if email already exists
        existing = await User.find_one(User.email == updates.email, User.username != username)
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        update_data[User.email] = updates.email
    if updates.cell_no is not None:
        update_data[User.cell_no] = updates.cell_no
    if updates.address is not None:
        update_data[User.address] = updates.address
    
    # Student fields
    if updates.date_of_birth is not None:
        try:
            dob = datetime.strptime(updates.date_of_birth, "%Y-%m-%d")
            update_data[User.date_of_birth] = dob
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    if updates.nic is not None:
        update_data[User.nic] = updates.nic
    if updates.gender is not None:
        update_data[User.gender] = updates.gender
    if updates.department is not None:
        update_data[User.department] = updates.department
    if updates.program is not None:
        update_data[User.program] = updates.program
    if updates.batch is not None:
        update_data[User.batch] = updates.batch
    if updates.current_semester is not None:
        update_data[User.current_semester] = updates.current_semester
    if updates.guardian_name is not None:
        update_data[User.guardian_name] = updates.guardian_name
    if updates.guardian_cnic is not None:
        update_data[User.guardian_cnic] = updates.guardian_cnic
    if updates.guardian_contact is not None:
        update_data[User.guardian_contact] = updates.guardian_contact
    
    # Teacher fields
    if updates.employee_id is not None:
        # Check if employee_id already exists
        existing = await User.find_one(User.employee_id == updates.employee_id, User.username != username)
        if existing:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
        update_data[User.employee_id] = updates.employee_id
    if updates.designation is not None:
        update_data[User.designation] = updates.designation
    if updates.qualification is not None:
        update_data[User.qualification] = updates.qualification
    if updates.specialization is not None:
        update_data[User.specialization] = updates.specialization
    if updates.office_location is not None:
        update_data[User.office_location] = updates.office_location
    
    # Admin fields
    if updates.admin_level is not None:
        # Only super admin can change admin level
        if admin.admin_level != "SUPER_ADMIN":
            raise HTTPException(status_code=403, detail="Only super admins can change admin level")
        update_data[User.admin_level] = updates.admin_level

    # Credential overrides
    if updates.new_username is not None:
        new_un = updates.new_username.strip()
        if new_un and new_un != username:
            existing = await User.find_one(User.username == new_un)
            if existing:
                raise HTTPException(status_code=400, detail="Username already taken")
            update_data[User.username] = new_un

    if updates.new_password is not None:
        pw = updates.new_password.strip()
        if len(pw) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        update_data[User.password_hash] = get_password_hash(pw)
    
    # Add updated_at
    update_data[User.updated_at] = datetime.now(timezone.utc)
    
    # Apply updates
    await user.set(update_data)
    await user.sync()
    
    return user.dict(exclude={"password_hash"})

# ═══════════════════════════════════════════════════════════════════
# ADMIN-ONLY: BULK CSV UPLOAD
# ═══════════════════════════════════════════════════════════════════

from fastapi import File, UploadFile
import csv
import io

@router.post("/bulk-register/{role}")
async def bulk_register_users(
    role: str,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """
    Bulk register users from CSV (ADMIN ONLY)
    Role must be: student, teacher, or admin
    """
    # Verify admin permission
    admin = await User.find_one(User.username == current_user)
    if not admin or admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can bulk register users")
    
    # Verify role
    role = role.lower()
    if role not in ['student', 'teacher', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role. Must be student, teacher, or admin")
    
    # Only super admin can bulk register admins
    if role == 'admin' and admin.admin_level != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only super admins can bulk register admins")
    
    # Read CSV file
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        success_count = 0
        error_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
            try:
                if role == 'student':
                    # Parse date of birth
                    dob = datetime.strptime(row['date_of_birth'], "%Y-%m-%d")
                    
                    # Create student
                    student = User(
                        username=row['username'],
                        email=row['email'],
                        password_hash=get_password_hash(row['password']),
                        role="STUDENT",
                        first_name=row['first_name'],
                        last_name=row['last_name'],
                        registration_no=row['registration_no'],
                        date_of_birth=dob,
                        nic=row['nic'],
                        gender=row['gender'],
                        department=row['department'],
                        program=row['program'],
                        batch=row['batch'],
                        current_semester=int(row['current_semester']),
                        cell_no=row.get('cell_no'),
                        address=row.get('address'),
                        guardian_name=row.get('guardian_name'),
                        guardian_cnic=row.get('guardian_cnic'),
                        guardian_contact=row.get('guardian_contact'),
                        is_active=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    await student.insert()
                    
                elif role == 'teacher':
                    # Create teacher
                    teacher = User(
                        username=row['username'],
                        email=row['email'],
                        password_hash=get_password_hash(row['password']),
                        role="TEACHER",
                        first_name=row['first_name'],
                        last_name=row['last_name'],
                        employee_id=row['employee_id'],
                        department=row['department'],
                        designation=row['designation'],
                        qualification=row['qualification'],
                        specialization=row.get('specialization'),
                        office_location=row.get('office_location'),
                        cell_no=row.get('cell_no'),
                        address=row.get('address'),
                        is_active=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    await teacher.insert()
                    
                elif role == 'admin':
                    # Create admin
                    new_admin = User(
                        username=row['username'],
                        email=row['email'],
                        password_hash=get_password_hash(row['password']),
                        role="ADMIN",
                        first_name=row['first_name'],
                        last_name=row['last_name'],
                        admin_level=row['admin_level'],
                        cell_no=row.get('cell_no'),
                        is_active=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    await new_admin.insert()
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "message": f"Bulk registration completed",
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors[:10]  # Return first 10 errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

