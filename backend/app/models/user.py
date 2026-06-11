from beanie import Document
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, Any
from datetime import datetime, timezone

from pymongo import IndexModel, ASCENDING

# ---------------------------------------------------------
# The Document Model (Interacts directly with MongoDB)
# ---------------------------------------------------------
class User(Document):
    # ═══ Core Identity (Everyone - Required) ═══
    username: str
    email: EmailStr
    password_hash: str
    role: str  # "STUDENT", "TEACHER", "ADMIN"
    
    # ═══ Common Profile (Everyone) ═══
    first_name: str
    last_name: str
    cell_no: str
    profile_picture_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    
    # ═══ Student-Specific (Required for role="STUDENT") ═══
    registration_no: Optional[str] = None  # "2024F-BSE-001"
    date_of_birth: Optional[datetime] = None
    nic: Optional[str] = None
    gender: Optional[str] = None  # "Male", "Female", "Other"
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_cnic: Optional[str] = None  # Guardian's CNIC number
    guardian_contact: Optional[str] = None  # Guardian's phone number
    department: Optional[str] = None  # "Computer Science"
    program: Optional[str] = None  # "BSE", "BSCS", "MS", "PhD"
    batch: Optional[str] = None  # "2024F"
    current_semester: Optional[int] = None
    admission_date: Optional[datetime] = None
    
    # ═══ Teacher-Specific (Required for role="TEACHER") ═══
    employee_id: Optional[str] = None  # "EMP-2024-001"
    designation: Optional[str] = None  # "Lecturer", "Assistant Professor", "Associate Professor", "Professor"
    # department is shared with students (already defined above)
    
    # ═══ Teacher-Specific (Optional) ═══
    qualification: Optional[str] = None  # "PhD in Computer Science", "MS in Software Engineering"
    specialization: Optional[str] = None  # "Machine Learning", "Database Systems", "Networks"
    office_location: Optional[str] = None  # "Room 301, CS Block"
    joining_date: Optional[datetime] = None
    
    # ═══ Admin-Specific (For role="ADMIN") ═══
<<<<<<< HEAD
    admin_level: Optional[str] = None  # "SUPER_ADMIN", "ADMIN", "FEE_MANAGEMENT_ADMIN", "COURSE_MANAGEMENT_ADMIN", "EXAM_MANAGEMENT_ADMIN"
=======
    admin_level: Optional[str] = None  # "SUPER_ADMIN", "DEPARTMENT_ADMIN"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

    @model_validator(mode="before")
    @classmethod
    def map_password_fields(cls, data: Any) -> Any:
        """Allow 'password' field to map to 'password_hash' for backward compatibility"""
        if isinstance(data, dict):
            if "password" in data and "password_hash" not in data:
                data["password_hash"] = data["password"]
            elif "password_hash" in data and "password" not in data:
                data["password"] = data["password_hash"]
        return data

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("username", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("registration_no", ASCENDING)], unique=True, sparse=True),
            IndexModel([("employee_id", ASCENDING)], unique=True, sparse=True),
            IndexModel([("role", ASCENDING)]),
        ]
        # Don't store None values in MongoDB
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas (Used for data validation)
# ---------------------------------------------------------

# ═══ Student Creation Schema ═══
class StudentCreate(BaseModel):
    # Identity
    username: str
    email: EmailStr
    password: str
    
    # Personal
    first_name: str
    last_name: str
    registration_no: str
    date_of_birth: datetime
    nic: str
    gender: str
    cell_no: str
    address: str
    guardian_name: str
    profile_picture_url: Optional[str] = None
    
    # Academic
    department: str
    program: str
    batch: str
    current_semester: int
    admission_date: datetime

# ═══ Teacher Creation Schema ═══
class TeacherCreate(BaseModel):
    # Identity (admin provides)
    username: str  # Can be employee_id or custom username
    email: EmailStr  # firstname.lastname@ssuet.edu.pk
    password: str
    
    # Personal (required)
    first_name: str
    last_name: str
    cell_no: str
    
    # Teacher-specific (required)
    employee_id: str  # "EMP-2024-001"
    designation: str  # "Lecturer", "Assistant Professor", "Associate Professor", "Professor"
    
    # Optional fields
    department: Optional[str] = None  # "Computer Science" (optional - teachers can teach across departments)
    qualification: Optional[str] = None  # "PhD in Computer Science"
    specialization: Optional[str] = None  # "DBMS", "SDA", "Operating Systems"
    office_location: Optional[str] = None  # "Room 301, CS Block"
    joining_date: Optional[datetime] = None
    profile_picture_url: Optional[str] = None

# ═══ Admin Creation Schema (TBD) ═══
class AdminCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    cell_no: str
    admin_level: str
    department: Optional[str] = None
    profile_picture_url: Optional[str] = None

# ═══ Login Schema ═══
class UserLogin(BaseModel):
    username: str
    password: str

# ═══ Response Schema ═══
class UserResponse(BaseModel):
    username: str
    email: EmailStr
    role: str
    first_name: str
    last_name: str
    cell_no: str
    profile_picture_url: Optional[str] = None
    is_active: bool
    
    # Student fields (if applicable)
    registration_no: Optional[str] = None
    department: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    current_semester: Optional[int] = None
    
    # Teacher fields (if applicable)
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    
    # Admin fields (if applicable)
    admin_level: Optional[str] = None
