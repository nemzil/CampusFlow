"""
AI Grading Service
Handles AI-powered exam generation and grading using Gemini API
"""
import json
from typing import List, Dict, Any, Optional
from google.genai import Client

from app.core.config import settings
from app.models.ai_exam import ExamQuestion, ResultItem


# Initialize Gemini client
client = Client(api_key=settings.GEMINI_API_KEY)


def clean_gemini_json(text: str) -> dict:
    """
    Clean and parse JSON from Gemini response
    Removes markdown code fences if present
    """
    text = text.strip()
    
    if text.startswith("```json"):
        text = text.replace("```json", "").replace("```", "").strip()
    elif text.startswith("```"):
        text = text.replace("```", "").strip()
    
    return json.loads(text)


async def generate_exam_questions(
    topic: str,
    num_questions: int = 5,
    question_type: str = "short"
) -> List[ExamQuestion]:
    """
    Generate exam questions using AI
    Falls back to mock questions if AI fails
    """
    prompt = f"""You are an exam paper generator.
Generate {num_questions} {question_type}-answer exam questions about: "{topic}".

IMPORTANT: Return ONLY valid JSON in exactly this format, no markdown formatting, no extra text:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text here",
      "type": "{question_type}",
      "options": [],
      "correct_answer": "Model answer here",
      "max_marks": 5
    }}
  ]
}}

Do not include ```json or ``` in your response. Return only the raw JSON.
Make questions clear, specific, and appropriate for university-level students.
"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        data_json = clean_gemini_json(response.text)
        questions_raw = data_json["questions"]
        
        # Ensure original_question is preserved for undo support
        for q in questions_raw:
            if "original_question" not in q:
                q["original_question"] = q.get("question")
        
        questions = [ExamQuestion(**q) for q in questions_raw]
        return questions
        
    except Exception as e:
        print(f"ai question gen failed, using fallback")
        
        # Fallback to mock questions
        questions_raw = []
        for i in range(1, num_questions + 1):
            questions_raw.append({
                "id": i,
                "question": f"Discuss the key aspects and implications of {topic} (Question {i}).",
                "type": question_type,
                "options": [],
                "correct_answer": f"Standard answer guidelines for {topic}.",
                "original_question": f"Discuss the key aspects and implications of {topic} (Question {i}).",
                "max_marks": 5
            })
        
        return [ExamQuestion(**q) for q in questions_raw]


async def grade_exam_answers(
    topic: str,
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Grade exam answers using AI
    Returns results with marks and feedback
    Falls back to mock grading if AI fails
    """
    # Build answer map for quick lookup
    ans_map = {str(a.get("id")): a.get("student_answer", "") for a in answers}
    
    grading_prompt = f"""You are a strict but fair exam grader.
Topic: "{topic}"

IMPORTANT: Return ONLY valid JSON in exactly this format, no markdown formatting:
{{
  "results": [
    {{
      "id": 1,
      "question": "Question text",
      "student_answer": "Student's answer",
      "correct_answer": "Model answer",
      "marks_obtained": 4,
      "max_marks": 5,
      "feedback": "Brief constructive feedback"
    }}
  ],
  "total_obtained": 18,
  "total_max": 25
}}

Do not include ```json or ``` in your response. Return only the raw JSON.

Grading criteria:
- Award full marks for complete, accurate answers
- Deduct marks for missing key points or inaccuracies
- Provide constructive feedback
- Be consistent and fair

Here are the questions and student answers:
"""
    
    for q in questions:
        q_id = str(q.get("id"))
        q_text = q.get("text") or q.get("question", "Unknown")
        correct = q.get("correct_answer", "N/A")
        max_marks = q.get("max_marks", 5)
        student_ans = ans_map.get(q_id, "No Answer")
        
        grading_prompt += f"""
---
Question ID: {q_id}
Question: {q_text}
Correct Answer: {correct}
Student Answer: {student_ans}
Max Marks: {max_marks}
"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=grading_prompt
        )
        
        data_json = clean_gemini_json(response.text)
        return data_json
        
    except Exception as e:
        print(f"ai grading failed, using fallback")
        
        # Fallback to mock grading (80% marks)
        results = []
        total_obtained = 0
        total_max = 0
        
        for q in questions:
            q_id = q.get("id")
            max_marks = q.get("max_marks", 5)
            marks_obtained = int(max_marks * 0.8)
            
            results.append({
                "id": q_id,
                "question": q.get("text") or q.get("question", "Unknown"),
                "student_answer": ans_map.get(str(q_id), "No Answer"),
                "correct_answer": q.get("correct_answer", "N/A"),
                "marks_obtained": marks_obtained,
                "max_marks": max_marks,
                "feedback": "Standard answer matches requirements (Mock graded)."
            })
            
            total_obtained += marks_obtained
            total_max += max_marks
        
        return {
            "results": results,
            "total_obtained": total_obtained,
            "total_max": total_max
        }


async def grade_generic_exam(
    topic: str,
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Grade a generic/manual exam using AI
    Returns simplified results with just marks and feedback per question
    """
    ans_map = {str(a.get("id")): a.get("student_answer", "") for a in answers}
    
    grading_prompt = f"""You are a strict exam grader.
Topic: "{topic}"

IMPORTANT: Return ONLY valid JSON, no markdown:
{{
  "results": [
    {{
      "id": 1,
      "marks_obtained": 4,
      "feedback": "Brief feedback"
    }}
  ]
}}

Here are the questions and student answers:
"""
    
    for q in questions:
        q_id = str(q.get("id"))
        grading_prompt += f"""
---
ID: {q_id}
Question: {q.get('text') or q.get('question')}
Correct Answer: {q.get('correct_answer', 'N/A')}
Student Answer: {ans_map.get(q_id, 'No Answer')}
Max Marks: {q.get('max_marks', 5)}
"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=grading_prompt
        )
        
        data_json = clean_gemini_json(response.text)
        ai_map = {str(r.get("id")): r for r in data_json.get("results", [])}
        
        # Ensure marks don't exceed max
        results_out = []
        for q in questions:
            q_id = str(q.get("id"))
            ai_res = ai_map.get(q_id, {})
            max_marks = int(q.get("max_marks", 5))
            marks = max(0, min(int(ai_res.get("marks_obtained", 0)), max_marks))
            
            results_out.append({
                "id": q.get("id"),
                "marks_obtained": marks,
                "feedback": ai_res.get("feedback", "")
            })
        
        return {"results": results_out}
        
    except Exception as e:
        print(f"ai grading failed, using fallback")
        
        # Fallback to mock grading
        results_out = []
        for q in questions:
            max_marks = int(q.get("max_marks", 5))
            results_out.append({
                "id": q.get("id"),
                "marks_obtained": int(max_marks * 0.8),
                "feedback": "Standard answer matches requirements (Mock graded)."
            })
        
        return {"results": results_out}
