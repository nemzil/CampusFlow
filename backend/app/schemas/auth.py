"""
Authentication request and response schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Request schemas
class LoginRequest(BaseModel):
    username: str
    password: str


# Response schemas
class UserResponse(BaseModel):
    username: str
    email: str
    role: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None
    last_login: Optional[datetime] = None
    
    # Role-specific fields (only included if present)
    registration_no: Optional[str] = None
    department: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    current_semester: Optional[int] = None
    
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    
    admin_level: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
