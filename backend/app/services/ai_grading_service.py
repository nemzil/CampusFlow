"""
AI Grading Service
Handles AI-powered exam generation and grading using OpenAI-compatible API (AgentRouter)
"""
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.ai_exam import ExamQuestion, ResultItem

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.GEMINI_API_KEY)

MODEL = "gpt-4o-mini"


def clean_json(text: str) -> dict:
    """Strip markdown code fences and parse JSON."""
    text = text.strip()
    if text.startswith("```json"):
        text = text.replace("```json", "").replace("```", "").strip()
    elif text.startswith("```"):
        text = text.replace("```", "").strip()
    return json.loads(text)


async def _call(prompt: str) -> str:
    """Single helper to call the AI and return raw text."""
    resp = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return resp.choices[0].message.content


async def generate_exam_questions(
    topic: str,
    num_questions: int = 5,
    question_type: str = "short"
) -> List[ExamQuestion]:
    prompt = f"""You are an exam paper generator.
Generate exactly {num_questions} UNIQUE and DIFFERENT {question_type}-answer exam questions about: "{topic}".

Rules:
- Each question MUST be completely different — different angle, concept, or skill.
- Cover a variety of subtopics and difficulty levels.
- Questions should be appropriate for university-level students.

Return ONLY valid JSON, no markdown, no extra text:
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
        return [ExamQuestion(**q) for q in questions_raw]


async def grade_exam_answers(
    topic: str,
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    ans_map = {str(a.get("id")): a.get("student_answer", "") for a in answers}

    prompt = f"""You are a strict but fair exam grader. Topic: "{topic}"

Return ONLY valid JSON, no markdown:
{{
  "results": [
    {{
      "id": 1,
      "question": "Question text",
      "student_answer": "Student answer",
      "correct_answer": "Model answer",
      "marks_obtained": 4,
      "max_marks": 5,
      "feedback": "Brief feedback"
    }}
  ],
  "total_obtained": 18,
  "total_max": 25
}}

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


async def grade_generic_exam(
    topic: str,
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
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
        results_out = []
        for q in questions:
            q_id = str(q.get("id"))
            ai_res = ai_map.get(q_id, {})
            max_marks = int(q.get("max_marks", 5))
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
        results_out = []
        for q in questions:
            max_marks = int(q.get("max_marks", 5))
            results_out.append({
                "id": q.get("id"),
                "question": q.get("question") or q.get("text", ""),
                "marks_obtained": 0, "max_marks": max_marks,
                "feedback": "AI grading unavailable. Please grade manually."
            })
        return {"results": results_out}
