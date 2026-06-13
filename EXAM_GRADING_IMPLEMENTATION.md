# Exam and Grading System Implementation Plan

## Overview
Complete implementation of exam creation with batch/course/type selection and integration with manage-results grading panel.

## Changes Made

### 1. Updated Models

#### backend/app/models/exam.py
- Added `courseId`, `courseCode` to ManualExam
- Added `examType` field ("midterm" or "final")
- Added `totalMarks` field (teacher-defined: 30, 40, 50, etc.)

#### backend/app/models/ai_exam.py
- Added `course_id`, `course_code` to AiExam
- Added `exam_type` field ("midterm" or "final")
- Added `total_marks` field

#### backend/app/models/grading.py
- Changed from `components: Dict` to individual fields:
  - `quiz1`, `quiz2`, `quiz3` (Optional[float])
  - `assignment1`, `assignment2`, `assignment3` (Optional[float])
  - `midterm`, `final` (Optional[float])
- Added `midterm_max`, `final_max` for tracking max marks

### 2. Updated Schemas

#### backend/app/schemas/exam.py
- `CreateManualExamRequest`: Now requires `batch`, `course_id`, `exam_type`, `total_marks`
- `CreateAiExamRequest`: Now requires `batch`, `course_id`, `exam_type`, `total_marks`
- Response schemas include new fields

## Implementation Steps

### Step 1: Update Exam Creation APIs

#### Manual Exams (backend/app/api/manual_exams.py)

```python
@router.post("", response_model=ManualExamResponse)
async def create_manual_exam(request: CreateManualExamRequest, username: str = Depends(get_current_user)):
    # 1. Fetch course details
    course = await Course.get(request.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # 2. Create exam with course info
    exam = ManualExam(
        className=request.batch,
        courseId=request.course_id,
        courseCode=course.course_code,
        subject=course.course_name,
        title=request.title,
        examType=request.exam_type,
        totalMarks=request.total_marks,
        teacherUsername=username,
        questions=[convert_to_model_question(q) for q in request.questions]
    )
    await exam.insert()
    
    return ManualExamResponse(...)
```

#### AI Exams (backend/app/api/ai_exams.py)

```python
@router.post("", response_model=AiExamResponse)
async def create_ai_exam(request: CreateAiExamRequest, username: str = Depends(get_current_user)):
    # 1. Fetch course details
    course = await Course.get(request.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # 2. Generate questions with AI
    questions = await ai_grading_service.generate_exam_questions(
        topic=request.topic,
        num_questions=request.num_questions
    )
    
    # 3. Distribute total_marks across questions
    marks_per_question = request.total_marks // request.num_questions
    for i, q in enumerate(questions):
        q.max_marks = marks_per_question if i < request.num_questions - 1 else (request.total_marks - marks_per_question * (request.num_questions - 1))
    
    # 4. Create exam
    exam = AiExam(
        class_name=request.batch,
        course_id=request.course_id,
        course_code=course.course_code,
        subject=course.course_name,
        topic=request.topic,
        exam_type=request.exam_type,
        total_marks=request.total_marks,
        teacher_username=username,
        questions=questions
    )
    await exam.insert()
    
    return serialize_ai_exam(exam)
```

### Step 2: Update Marking/Grading Flow

#### When Teacher Marks Manual Exam (backend/app/api/manual_exams.py)

```python
@router.put("/submissions/{submission_id}/mark", response_model=ManualExamSubmissionResponse)
async def mark_submission(submission_id: str, body: MarkSubmissionRequest):
    # 1. Mark the submission
    submission = await exam_service.mark_manual_submission(...)
    
    # 2. Get exam details
    exam = await ManualExam.get(submission.examId)
    if not exam:
        return submission_response
    
    # 3. Update grade record
    from app.services.grading_service import upsert_course_grade
    
    component_field = "midterm" if exam.examType == "midterm" else "final"
    max_field = "midterm_max" if exam.examType == "midterm" else "final_max"
    
    # Get student
    student = await User.find_one(User.username == submission.studentUsername)
    if student and exam.courseId:
        await upsert_course_grade(
            student_id=str(student.id),
            course_id=exam.courseId,
            term=exam.className,
            components={component_field: float(body.total_marks)},
            # Also update max if changed
        )
        
        # Also update the max marks
        grade = await Grade.find_one(
            Grade.student_id == str(student.id),
            Grade.course_id == exam.courseId,
            Grade.term == exam.className
        )
        if grade:
            await grade.set({
                max_field: exam.totalMarks,
                Grade.updated_at: datetime.now(timezone.utc)
            })
    
    return submission_response
```

#### When Teacher Confirms AI Exam Result (backend/app/api/ai_exams.py)

```python
@router.post("/{exam_id}/results")
async def confirm_result(exam_id: str, body: ConfirmResultRequest, username: str = Depends(get_current_user)):
    # 1. Save exam result
    exam = await AiExam.get(exam_id)
    total_obtained = sum(i.marks_obtained for i in body.items)
    result = await exam_service.save_exam_result(...)
    
    # 2. Update grade record
    if exam and exam.course_id:
        student = await User.find_one(User.username == body.student_username)
        if student:
            component_field = "midterm" if exam.exam_type == "midterm" else "final"
            max_field = "midterm_max" if exam.exam_type == "midterm" else "final_max"
            
            await upsert_course_grade(
                student_id=str(student.id),
                course_id=exam.course_id,
                term=exam.class_name,
                components={component_field: float(total_obtained)},
            )
            
            grade = await Grade.find_one(
                Grade.student_id == str(student.id),
                Grade.course_id == exam.course_id,
                Grade.term == exam.class_name
            )
            if grade:
                await grade.set({
                    max_field: exam.total_marks,
                    Grade.updated_at: datetime.now(timezone.utc)
                })
    
    return {"status": "saved", "result_id": str(result.id)}
```

### Step 3: Update Grading Service

#### backend/app/services/grading_service.py

Update `calculate_total_marks()`:
```python
def calculate_total_marks(grade: Grade) -> Optional[float]:
    """Calculate total marks from individual components"""
    components = [
        grade.quiz1, grade.quiz2, grade.quiz3,
        grade.assignment1, grade.assignment2, grade.assignment3,
        grade.midterm, grade.final
    ]
    
    # Check if any required component is missing
    if any(c is None for c in components):
        return None
    
    # Calculate total
    total = sum(c for c in components if c is not None)
    return round(total, 2)
```

Update `is_grade_complete()`:
```python
def is_grade_complete(grade: Grade) -> bool:
    """Check if all grade components are present"""
    return all([
        grade.quiz1 is not None,
        grade.quiz2 is not None,
        grade.quiz3 is not None,
        grade.assignment1 is not None,
        grade.assignment2 is not None,
        grade.assignment3 is not None,
        grade.midterm is not None,
        grade.final is not None,
    ])
```

### Step 4: Update Frontend Exam Creation

#### frontend/src/app/teacher/exams/page.js

Update exam creation forms:

```javascript
// AI Exam Form
const [aiForm, setAiForm] = useState({
  batch: '',
  courseId: '',
  examType: 'midterm',  // or 'final'
  topic: '',
  num_questions: 5,
  total_marks: 30
});

// Manual Exam Form
const [manualForm, setManualForm] = useState({
  batch: '',
  courseId: '',
  examType: 'midterm',
  title: '',
  total_marks: 30,
});
```

Update form UI to include:
1. Batch selector (dropdown)
2. Course selector (dropdown filtered by batch)
3. Exam type selector (Midterm/Final radio buttons)
4. Total marks input (number input with common presets: 30, 40, 50)

### Step 5: Create/Update Manage Results Panel

#### frontend/src/app/teacher/manage-results/page.js

```javascript
// Fetch grades for selected course
const grades = await api.getManageResults(courseId, term);

// Display table with:
// - Student Name | Registration No
// - Quiz 1 | Quiz 2 | Quiz 3
// - Assignment 1 | Assignment 2 | Assignment 3
// - Midterm (editable) | Final (editable)
// - Total | Grade | Status

// Teacher can:
// 1. Edit any mark
// 2. View marks populated from exams
// 3. Submit to exam department when complete
```

## Testing Checklist

- [ ] Create midterm exam with 30 marks
- [ ] Create final exam with 50 marks
- [ ] Student takes and submits exam
- [ ] Teacher grades exam submission
- [ ] Marks appear in manage-results panel
- [ ] Teacher can edit marks in manage-results
- [ ] Total calculation includes all components
- [ ] Pass/Fail threshold at 50 marks
- [ ] Submit results to exam department
- [ ] Student sees published results

## Database Migration Notes

Existing exams will need migration:
- Set default `examType` = "midterm"
- Set default `totalMarks` based on existing questions
- Link to courses if possible (manual process may be needed)

## Pass/Fail Logic

In grading service, update grade calculation:
```python
# After calculating total_marks
if total_marks is not None:
    letter_grade, grade_points = convert_to_letter_grade(total_marks)
    
    # Pass/Fail logic
    if total_marks >= 50:
        status = "PASS"
    else:
        status = "FAIL"
        letter_grade = "F"
        grade_points = 0.0
```

## Summary

This implementation provides:
1. ✅ Exam creation with batch → course → type → marks flow
2. ✅ Automatic integration with manage-results panel
3. ✅ Teacher can edit marks from manage-results
4. ✅ 100-point grading system with 50-point pass threshold
5. ✅ Proper workflow: Draft → Checked → Submitted → Published

Backend changes require restart after updating models.
Frontend changes are hot-reloaded.
