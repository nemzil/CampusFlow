from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Fee Configuration Model
# ---------------------------------------------------------
class FeeConfig(Document):
    """Fee configuration per semester"""
    # ═══ Semester Details ═══
    semester: str  # "2024F", "2025S"
    
    # ═══ Fee Structure ═══
    fee_per_credit_hour: int = Field(default=2350)
    additional_fees: Dict[str, int] = Field(default_factory=lambda: {
        "examination_fee": 0,
        "library_fee": 0,
        "sports_fee": 0
    })
    
    # ═══ Deadlines ═══
    payment_deadline: datetime
    late_fee_enabled: bool = Field(default=False)
    late_fee_amount: int = Field(default=0)
    
    # ═══ Bank Details ═══
    bank_details: Dict[str, str] = Field(default_factory=lambda: {
        "bank_name": "Habib Bank Limited",
        "account_title": "SSUET Fee Collection",
        "account_number": "1234567890",
        "branch_code": "0123"
    })
    
    # ═══ Metadata ═══
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "fee_config"
        indexes = [
            IndexModel([("semester", ASCENDING)], unique=True),
        ]
        keep_nulls = False


# ---------------------------------------------------------
# Fee Model
# ---------------------------------------------------------
class Fee(Document):
    """Student fee record per semester"""
    # ═══ Student & Semester ═══
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    semester: str  # "2024F"
    
    # ═══ Fee Calculation ═══
    courses: List[Dict] = Field(default_factory=list)  # Course breakdown
    total_credit_hours: int = Field(default=0)
    tuition_fee: int = Field(default=0)
    additional_fees: int = Field(default=0)
    total_fee: int = Field(default=0)
    
    # ═══ Payment Details ═══
    status: str = Field(default="pending")  # pending, paid, overdue, rejected
    payment_date: Optional[datetime] = None
    deadline: datetime
    
    # ═══ Receipt ═══
    receipt_url: Optional[str] = None
    transaction_id: Optional[str] = None
    bank_name: Optional[str] = None
    
    # ═══ Verification ═══
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    
    # ═══ Voucher ═══
    voucher_id: Optional[str] = None
    voucher_url: Optional[str] = None
    voucher_generated_at: Optional[datetime] = None
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "fees"
        indexes = [
            IndexModel([("student_id", ASCENDING), ("semester", ASCENDING)], unique=True),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("deadline", ASCENDING)]),
            IndexModel([("semester", ASCENDING)]),
            IndexModel([("student_username", ASCENDING)]),
        ]
        keep_nulls = False


# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class FeeConfigCreate(BaseModel):
    """Schema for creating fee configuration"""
    semester: str = Field(..., description="Semester (e.g., 2024F)")
    fee_per_credit_hour: int = Field(default=2350, description="Fee per credit hour")
    payment_deadline: datetime = Field(..., description="Payment deadline")
    late_fee_enabled: bool = Field(default=False)
    late_fee_amount: int = Field(default=0)

class FeeConfigResponse(BaseModel):
    """Schema for fee configuration response"""
    id: str
    semester: str
    fee_per_credit_hour: int
    additional_fees: Dict[str, int]
    payment_deadline: datetime
    late_fee_enabled: bool
    late_fee_amount: int
    bank_details: Dict[str, str]
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class CourseBreakdown(BaseModel):
    """Schema for course fee breakdown"""
    course_code: str
    course_name: str
    credit_hours: int
    fee_per_credit: int
    total: int

class FeeCalculationResponse(BaseModel):
    """Schema for fee calculation response"""
    student_id: str
    student_username: str
    semester: str
    courses: List[CourseBreakdown]
    total_credit_hours: int
    tuition_fee: int
    additional_fees: int
    total_fee: int
    deadline: datetime
    status: str

class VoucherGenerateRequest(BaseModel):
    """Schema for voucher generation request"""
    student_id: str = Field(..., description="Student ID")
    semester: str = Field(..., description="Semester")

class VoucherResponse(BaseModel):
    """Schema for voucher response"""
    voucher_id: str
    pdf_url: Optional[str] = None
    generated_at: datetime
    expires_at: datetime

class PaymentSubmitRequest(BaseModel):
    """Schema for payment submission"""
    student_id: str = Field(..., description="Student ID")
    semester: str = Field(..., description="Semester")
    receipt_url: str = Field(..., description="Receipt file URL from Cloudinary")
    payment_date: datetime = Field(..., description="Payment date")
    bank_name: str = Field(..., description="Bank name")
    transaction_id: str = Field(..., description="Transaction ID")

class PaymentStatusResponse(BaseModel):
    """Schema for payment status response"""
    student_id: str
    student_username: str
    semester: str
    total_fee: int
    status: str
    payment_date: Optional[datetime] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    receipt_url: Optional[str] = None
    rejection_reason: Optional[str] = None

class PaymentVerifyRequest(BaseModel):
    """Schema for payment verification"""
    payment_id: str = Field(..., description="Fee record ID")
    verified: bool = Field(..., description="Verification status")
    notes: Optional[str] = Field(None, description="Admin notes")

class PaymentRejectRequest(BaseModel):
    """Schema for payment rejection"""
    payment_id: str = Field(..., description="Fee record ID")
    reason: str = Field(..., description="Rejection reason")

class PendingPaymentResponse(BaseModel):
    """Schema for pending payment"""
    payment_id: str
    student_id: str
    student_name: str
    registration_no: str
    semester: str
    amount: int
    submitted_at: datetime
    receipt_url: str
    transaction_id: str
    bank_name: str

class PaymentHistoryItem(BaseModel):
    """Schema for payment history item"""
    semester: str
    total_fee: int
    status: str
    payment_date: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    receipt_url: Optional[str] = None

class PaymentHistoryResponse(BaseModel):
    """Schema for payment history response"""
    student_id: str
    student_username: str
    payment_history: List[PaymentHistoryItem]
    total_paid: int

class FeeReportSummary(BaseModel):
    """Schema for fee report summary"""
    total_students: int
    total_fees_generated: int
    total_collected: int
    total_pending: int
    total_overdue: int
    collection_percentage: float

class FeeReportBreakdown(BaseModel):
    """Schema for fee report breakdown item"""
    student_id: str
    student_name: str
    registration_no: str
    total_fee: int
    status: str
    payment_date: Optional[datetime] = None

class FeeReportResponse(BaseModel):
    """Schema for fee report response"""
    semester: str
    summary: FeeReportSummary
    breakdown: List[FeeReportBreakdown]
