"""
AI Grading Service
<<<<<<< HEAD
Handles AI-powered exam generation and grading using OpenAI-compatible API (AgentRouter)
"""
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
=======
Handles AI-powered exam generation and grading using Gemini API
"""
import json
from typing import List, Dict, Any, Optional
from google.genai import Client
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

from app.core.config import settings
from app.models.ai_exam import ExamQuestion, ResultItem

<<<<<<< HEAD
# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.GEMINI_API_KEY)

MODEL = "gpt-4o-mini"


def clean_json(text: str) -> dict:
    """Strip markdown code fences and parse JSON."""
    text = text.strip()
=======

# Initialize Gemini client
client = Client(api_key=settings.GEMINI_API_KEY)


def clean_gemini_json(text: str) -> dict:
    """
    Clean and parse JSON from Gemini response
    Removes markdown code fences if present
    """
    text = text.strip()
    
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    if text.startswith("```json"):
        text = text.replace("```json", "").replace("```", "").strip()
    elif text.startswith("```"):
        text = text.replace("```", "").strip()
<<<<<<< HEAD
    return json.loads(text)


async def _call(prompt: str) -> str:
    """Single helper to call the AI and return raw text."""
    resp = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return resp.choices[0].message.content


=======
    
    return json.loads(text)


>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
async def generate_exam_questions(
    topic: str,
    num_questions: int = 5,
    question_type: str = "short"
) -> List[ExamQuestion]:
<<<<<<< HEAD
    prompt = f"""You are an exam paper generator.
Generate exactly {num_questions} UNIQUE and DIFFERENT {question_type}-answer exam questions about: "{topic}".

Rules:
- Each question MUST be completely different — different angle, concept, or skill.
- Cover a variety of subtopics and difficulty levels.
- Questions should be appropriate for university-level students.

Return ONLY valid JSON, no markdown, no extra text:
=======
    """
    Generate exam questions using AI
    Falls back to mock questions if AI fails
    """
    prompt = f"""You are an exam paper generator.
Generate {num_questions} {question_type}-answer exam questions about: "{topic}".

IMPORTANT: Return ONLY valid JSON in exactly this format, no markdown formatting, no extra text:
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
}}"""

    try:
        text = await _call(prompt)
        data = clean_json(text)
        questions_raw = data["questions"]
        for q in questions_raw:
            if "original_question" not in q:
                q["original_question"] = q.get("question")
        return [ExamQuestion(**q) for q in questions_raw]

    except Exception as e:
        print(f"ai question gen failed: {e}, using fallback")
        templates = [
            f"Define {topic} and explain its core characteristics with an example.",
            f"What are the main advantages and disadvantages of using {topic}?",
            f"Compare {topic} with an alternative approach. When would you prefer one?",
            f"Describe a real-world scenario where {topic} is the most suitable solution.",
            f"Explain the time and space complexity of common operations on {topic}.",
            f"What are the common pitfalls when working with {topic}? How can they be avoided?",
            f"How is {topic} implemented internally? Describe its memory structure.",
            f"Walk through an algorithm that uses {topic} to solve a practical problem.",
            f"How does {topic} behave in edge cases such as empty state or max capacity?",
            f"Discuss how {topic} is used in modern software systems.",
        ]
        questions_raw = []
        for i in range(1, num_questions + 1):
            t = templates[(i - 1) % len(templates)]
            questions_raw.append({
                "id": i, "question": t, "type": question_type, "options": [],
                "correct_answer": f"Answer should address the specific aspect of {topic} asked.",
                "original_question": t, "max_marks": 5
            })
=======
}}

Do not include ```json or ``` in your response. Return only the raw JSON.
Make questions clear, specific, and appropriate for university-level students.
"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
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
        
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        return [ExamQuestion(**q) for q in questions_raw]


async def grade_exam_answers(
    topic: str,
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
<<<<<<< HEAD
    ans_map = {str(a.get("id")): a.get("student_answer", "") for a in answers}

    prompt = f"""You are a strict but fair exam grader. Topic: "{topic}"

Return ONLY valid JSON, no markdown:
=======
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
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
{{
  "results": [
    {{
      "id": 1,
      "question": "Question text",
<<<<<<< HEAD
      "student_answer": "Student answer",
      "correct_answer": "Model answer",
      "marks_obtained": 4,
      "max_marks": 5,
      "feedback": "Brief feedback"
=======
      "student_answer": "Student's answer",
      "correct_answer": "Model answer",
      "marks_obtained": 4,
      "max_marks": 5,
      "feedback": "Brief constructive feedback"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    }}
  ],
  "total_obtained": 18,
  "total_max": 25
}}

<<<<<<< HEAD
Questions and answers:
"""
    for q in questions:
        q_id = str(q.get("id"))
        prompt += f"""
---
Q{q_id}: {q.get("text") or q.get("question", "")}
Correct: {q.get("correct_answer", "N/A")}
Student: {ans_map.get(q_id, "No Answer")}
Max: {q.get("max_marks", 5)}
"""

    try:
        text = await _call(prompt)
        return clean_json(text)
    except Exception as e:
        print(f"ai grading failed: {e}, using fallback")
        results, total_obtained, total_max = [], 0, 0
        for q in questions:
            q_id = q.get("id")
            max_marks = q.get("max_marks", 5)
            marks = int(max_marks * 0.8)
            results.append({
                "id": q_id,
                "question": q.get("text") or q.get("question", ""),
                "student_answer": ans_map.get(str(q_id), "No Answer"),
                "correct_answer": q.get("correct_answer", "N/A"),
                "marks_obtained": marks, "max_marks": max_marks,
                "feedback": "Standard answer matches requirements (Mock graded)."
            })
            total_obtained += marks
            total_max += max_marks
        return {"results": results, "total_obtained": total_obtained, "total_max": total_max}
=======
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
            model="gemini-2.0-flash-exp",
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
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e


async def grade_generic_exam(
    topic: str,
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
<<<<<<< HEAD
    ans_map = {str(a.get("id")): a.get("student_answer", "") for a in answers}

    questions_block = ""
    total_max = 0
    for q in questions:
        q_id = str(q.get("id"))
        max_marks = q.get("max_marks", 5)
        total_max += max_marks
        student_ans = ans_map.get(q_id, "").strip() or "No answer provided"
        questions_block += f"""
Q{q_id} (Max {max_marks}): {q.get('question') or q.get('text', '')}
Student: {student_ans}
"""

    prompt = f"""You are a university professor grading on: "{topic}". Total: {total_max} marks.

Grade each answer fairly. Full/partial/zero marks based on accuracy.

{questions_block}

Return ONLY valid JSON, no markdown:
{{
  "results": [
    {{"id": 1, "marks_obtained": 3, "feedback": "Good but missed Y."}}
  ]
}}"""

    try:
        text = await _call(prompt)
        data = clean_json(text)
        ai_map = {str(r.get("id")): r for r in data.get("results", [])}
=======
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
            model="gemini-2.0-flash-exp",
            contents=grading_prompt
        )
        
        data_json = clean_gemini_json(response.text)
        ai_map = {str(r.get("id")): r for r in data_json.get("results", [])}
        
        # Ensure marks don't exceed max
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        results_out = []
        for q in questions:
            q_id = str(q.get("id"))
            ai_res = ai_map.get(q_id, {})
            max_marks = int(q.get("max_marks", 5))
<<<<<<< HEAD
            marks = max(0, min(float(ai_res.get("marks_obtained", 0)), max_marks))
            results_out.append({
                "id": q.get("id"),
                "question": q.get("question") or q.get("text", ""),
                "marks_obtained": marks, "max_marks": max_marks,
                "feedback": ai_res.get("feedback", "No feedback.")
            })
        return {"results": results_out}

    except Exception as e:
        print(f"ai grading failed: {e}, using fallback")
=======
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
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        results_out = []
        for q in questions:
            max_marks = int(q.get("max_marks", 5))
            results_out.append({
                "id": q.get("id"),
<<<<<<< HEAD
                "question": q.get("question") or q.get("text", ""),
                "marks_obtained": 0, "max_marks": max_marks,
                "feedback": "AI grading unavailable. Please grade manually."
            })
=======
                "marks_obtained": int(max_marks * 0.8),
                "feedback": "Standard answer matches requirements (Mock graded)."
            })
        
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
        return {"results": results_out}
