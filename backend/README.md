# CampusFlow Backend

FastAPI-based backend for CampusFlow university management system.

## Project Structure

```
backend/
├── app/
│   ├── api/              # API route handlers
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── todos.py      # Todo management
│   │   ├── exams.py      # Manual exams (legacy)
│   │   ├── exams_v2.py   # Manual exams (v2 - improved)
│   │   ├── ai_exams.py   # AI-generated exams (legacy)
│   │   ├── ai_exams_v2.py # AI exams (v2 - improved)
│   │   ├── chat.py       # Messaging system (REST)
│   │   ├── chat_v2.py    # Messaging system (enhanced)
│   │   ├── websocket.py  # Real-time chat (WebSocket)
│   │   └── deps.py       # Shared dependencies
│   │
│   ├── core/             # Core functionality
│   │   ├── config.py     # Configuration settings
│   │   ├── database.py   # Database connection
│   │   └── security.py   # JWT and password hashing
│   │
│   ├── models/           # Database models (Beanie Documents)
│   │   ├── user.py       # User model (Student, Teacher, Admin)
│   │   ├── todo.py       # Todo model
│   │   ├── exam.py       # Manual exam models
│   │   ├── ai_exam.py    # AI exam models
│   │   └── message.py    # Chat and conversation models
│   │
│   ├── schemas/          # Request/Response DTOs (Pydantic)
│   │   ├── auth.py       # Login, user response schemas
│   │   ├── todo.py       # Todo request/response schemas
│   │   ├── exam.py       # Exam request/response schemas (snake_case)
│   │   └── chat.py       # Chat request/response schemas
│   │
│   ├── services/         # Business logic layer
│   │   ├── todo_service.py      # Todo business logic
│   │   ├── exam_service.py      # Exam business logic (manual + AI)
│   │   ├── ai_grading_service.py # AI grading and question generation
│   │   ├── chat_service.py      # Chat business logic
│   │   └── websocket_manager.py # WebSocket connection management
│   │
│   ├── utils/            # Helper functions
│   │   ├── datetime_utils.py   # Date/time utilities
│   │   └── response_utils.py   # Response formatting
│   │
│   └── main.py           # FastAPI application entry point
│
├── scripts/              # Utility scripts
│   ├── seed_admin.py     # Seed admin user
│   ├── seed_students.py  # Seed student users
│   ├── seed_teachers.py  # Seed teacher users
│   ├── seed_todos.py     # Seed sample todos
│   ├── drop_users.py     # Drop users collection
│   ├── check_teachers.py # Check teacher data
│   └── fix_registration_index.py  # Fix database indexes
│
├── tests/                # Test files
│   ├── test_login.py
│   ├── test_student_login.py
│   ├── test_admin_login.py
│   └── test_all.py
│
├── .env                  # Environment variables
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Architecture Layers

### 1. API Layer (`app/api/`)
- HTTP request handling
- Route definitions
- Request validation
- Response formatting
- Delegates business logic to services

### 2. Service Layer (`app/services/`)
- Business logic
- Data validation
- Complex operations
- Reusable functions
- Called by API layer

### 3. Model Layer (`app/models/`)
- Database schema definitions
- Beanie Document models
- Database indexes
- Field validation

### 4. Schema Layer (`app/schemas/`)
- Request DTOs (Data Transfer Objects)
- Response DTOs
- Pydantic models for validation
- Separates API contracts from database models

### 5. Core Layer (`app/core/`)
- Configuration management
- Database connection
- Security (JWT, password hashing)
- Shared utilities

### 6. Utils Layer (`app/utils/`)
- Helper functions
- Common utilities
- Reusable code

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Create `.env` file:
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=campusflow_db
SECRET_KEY=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Seed Database
```bash
# Seed admin user
python scripts/seed_admin.py

# Seed students
python scripts/seed_students.py

# Seed teachers
python scripts/seed_teachers.py

# Seed sample todos
python scripts/seed_todos.py
```

### 4. Run Server
```bash
# Development
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Exam System

### Overview
CampusFlow supports two types of exams:
1. **Manual Exams** - Teacher-created exams with custom questions
2. **AI Exams** - AI-generated exams using Gemini API

Both systems have been refactored with v2 APIs that follow professional best practices.

### Architecture

#### Service Layer
- **`exam_service.py`** - Handles all exam business logic (CRUD, submissions, grading, statistics)
- **`ai_grading_service.py`** - AI-powered question generation and grading using Gemini

#### API Versions
- **Legacy** (`/api/manual-exams`, `/api/ai-exams`) - Original implementation, still functional
- **v2** (`/api/v2/manual-exams`, `/api/v2/ai-exams`) - Improved with service layer, pagination, statistics

### Key Features (v2)

#### Manual Exams
- Create exams with custom questions
- Set exam live with start/end times
- Student submission with validation
- Teacher grading with feedback
- Automatic result saving
- Pagination support
- Statistics dashboard

#### AI Exams
- AI-generated questions using Gemini
- Edit and undo question changes
- Set exam live with timing validation
- Student submission
- AI-powered grading with feedback
- Confirm and save results
- Teacher and student statistics
- Generic exam grading (grade manual exams with AI)

### API Endpoints

#### Manual Exams (v2)
```
GET    /api/v2/manual-exams                          - List exams (paginated)
POST   /api/v2/manual-exams                          - Create exam
GET    /api/v2/manual-exams/{exam_id}                - Get exam
PUT    /api/v2/manual-exams/{exam_id}/live           - Set live
PUT    /api/v2/manual-exams/{exam_id}/end            - End exam
POST   /api/v2/manual-exams/{exam_id}/submit         - Submit (student)
GET    /api/v2/manual-exams/{exam_id}/submissions    - List submissions
GET    /api/v2/manual-exams/submissions/{id}         - Get submission
PUT    /api/v2/manual-exams/submissions/{id}/mark    - Mark submission
```

#### AI Exams (v2)
```
POST   /api/v2/ai-exams                              - Create AI exam
GET    /api/v2/ai-exams                              - List exams (paginated)
GET    /api/v2/ai-exams/{exam_id}                    - Get exam
PUT    /api/v2/ai-exams/{exam_id}/questions/{qid}    - Update question
POST   /api/v2/ai-exams/{exam_id}/questions/{qid}/undo - Undo edit
PUT    /api/v2/ai-exams/{exam_id}/live               - Set live
PUT    /api/v2/ai-exams/{exam_id}/end                - End exam
POST   /api/v2/ai-exams/student/load                 - Load exam (student)
POST   /api/v2/ai-exams/student/submit               - Submit (student)
GET    /api/v2/ai-exams/{exam_id}/submissions        - List submissions
POST   /api/v2/ai-exams/{exam_id}/grade              - AI grade (preview)
POST   /api/v2/ai-exams/grade-generic                - Grade manual with AI
POST   /api/v2/ai-exams/{exam_id}/results            - Save results
GET    /api/v2/ai-exams/results                      - Teacher results
GET    /api/v2/ai-exams/student/results              - Student results
GET    /api/v2/ai-exams/statistics                   - Teacher stats
GET    /api/v2/ai-exams/student/statistics           - Student stats
```

### Naming Conventions

#### v2 APIs use snake_case (Python standard)
```json
{
  "class_name": "BSE-4A",
  "teacher_username": "john.doe",
  "start_time": "2024-01-01T10:00:00",
  "question_number": 1,
  "max_marks": 10
}
```

#### Legacy APIs use camelCase (backward compatible)
```json
{
  "className": "BSE-4A",
  "teacherUsername": "john.doe",
  "startTime": "2024-01-01T10:00:00",
  "questionNumber": 1,
  "maxMarks": 10
}
```

### Documentation Files
- **`EXAM_SYSTEM_IMPROVEMENTS.md`** - Comprehensive implementation guide
- **`EXAM_API_REFERENCE.md`** - Quick API reference with examples
- **`EXAM_SYSTEM_COMPLETE.md`** - Summary and migration guide
- **`EXAM_SYSTEM_ANALYSIS.md`** - Original analysis and issues identified

## Database

### MongoDB Collections
- `users` - All users (students, teachers, admins)
- `todos` - Student todo items
- `manual_exams` - Teacher-created exams
- `manual_exam_submissions` - Student exam submissions
- `exams` - AI-generated exams
- `submissions` - AI exam submissions
- `results` - Exam results
- `conversations` - Chat conversations
- `messages` - Chat messages

### Indexes
- `users`: username (unique), email (unique, sparse), registration_no (unique, sparse), employee_id (unique, sparse)
- `todos`: (username, due_date), (source, source_id)
- `messages`: (conversation_id, timestamp)
- `conversations`: participants, last_message_at

## Development Guidelines

### Adding a New Feature

1. **Define Model** (`app/models/`)
   - Create Beanie Document model
   - Define fields and validation
   - Add indexes

2. **Define Schemas** (`app/schemas/`)
   - Create request DTOs
   - Create response DTOs
   - Separate from database models

3. **Create Service** (`app/services/`)
   - Implement business logic
   - Handle data operations
   - Keep reusable

4. **Create API Routes** (`app/api/`)
   - Define endpoints
   - Use schemas for validation
   - Call service functions
   - Return responses

5. **Test**
   - Create test file in `tests/`
   - Test all endpoints
   - Test edge cases

### Code Style

- Use descriptive variable names
- Add comments for complex logic
- Keep functions small and focused
- Use type hints
- Follow PEP 8 style guide
- No emojis in code or print statements
- Use human-like but minimal language

### Comments Style
```python
# Good: Clear and concise
# Calculate days until due date

# Bad: Too verbose or with emojis
# This function will calculate the number of days remaining until the due date arrives
```

### Print Statements Style
```python
# Good: Human-like but minimal
print("Seeding admin user")
print("Database connection established")
print("User created successfully")

# Bad: Too casual or with emojis
print("Let's seed the admin! 🚀")
print("Yay! Database is connected! 🎉")
```

## Testing

Run tests:
```bash
# All tests
python tests/test_all.py

# Specific test
python tests/test_login.py
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify database name

### Import Errors
- Ensure virtual environment is activated
- Install dependencies: `pip install -r requirements.txt`

### JWT Token Issues
- Check SECRET_KEY in `.env`
- Verify token expiration settings
- Check token format in requests
