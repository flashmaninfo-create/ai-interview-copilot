1. Objective

Build a context-aware AI assistant that:

Captures interview screen content

Converts it to structured text

Generates accurate, concise, interview-safe answers

Supports modes:

✅ Code

✅ Explain

✅ Help Me

Works with:

OpenAI models

DeepSeek models

Produces human-like, non-suspicious responses

2. System Overview
Input Sources

Screenshot OCR text

Live editor code (if available)

User-selected scenario

Button pressed

User preferences

Output

Short, precise response

Matching language

Interview tone

No AI markers

3. Architecture
Screen → OCR → Context Builder → Prompt Engine  
        → LLM Router (DeepSeek/OpenAI)  
        → Formatter → Console UI

4. Core Modules
4.1 Context Builder Service
Responsibilities

Clean OCR noise

Detect:

Programming language

Question type

Constraints

Examples

Extract:

Problem statement

Code snippet

Errors

Test cases

Output Schema
{
  "problem_text": "",
  "detected_language": "python/js/java",
  "question_type": "algo/system/debug/frontend",
  "constraints": [],
  "existing_code": "",
  "examples": [],
  "errors": "",
  "complexity_hint": ""
}

4.2 Scenario Context Layer

User selects before interview:

LeetCode

System Design

Frontend

Behavioral

Debugging

Take Home

Each scenario injects:

tone

verbosity

format

allowed output

4.3 Mode Engine (Buttons)
1) CODE MODE

Goal: Direct working solution

Rules:

Output ONLY code

Match detected language

Follow constraints

Optimize complexity

Include edge cases

2) EXPLAIN MODE

Rules:

3–5 bullet points

intuition

complexity

trade-offs

no code unless tiny

3) HELP ME MODE

Rules:

Hints only

Socratic style

No full solution

Interview-friendly

5. Prompt Engineering (CORE)
5.1 System Prompt – Universal
You are a real-time coding interview assistant.

STRICT RULES:
- Be concise and natural
- Never mention AI or assistance
- Match language from screen
- Respect constraints exactly
- Sound like human candidate
- No markdown unless code mode
- Max verbosity: 5 lines (except code)

5.2 Dynamic Prompt Template
SCENARIO: {{scenario}}

MODE: {{mode}}

LANGUAGE: {{detected_language}}

SOURCE MATERIAL:
{{problem_text}}

EXISTING CODE:
{{existing_code}}

CONSTRAINTS:
{{constraints}}

TASK:
{{mode_instructions}}

5.3 Mode Instructions
CODE
- Provide optimal solution only
- No explanations
- Follow variable style from screen
- Include edge cases

EXPLAIN
- 3-5 bullets only
- intuition first
- complexity last

HELP ME
- Provide guiding hints
- Ask what interviewer may ask
- Do not reveal full logic

6. LLM Router Logic
6.1 When to Use What
Use DeepSeek when:

Pure coding

Algorithms

Large context

Cost sensitive

Use OpenAI when:

Reasoning heavy

System design

Explanation mode

Ambiguous OCR

6.2 Router Rules
if (mode === "CODE" && language detected)
    use DeepSeek-Coder
else if (explain or system design)
    use GPT-4o
else
    fallback = DeepSeek

7. Response Formatter
Must Enforce:

No emojis

No AI phrases

No headings

Natural variable names

Interview tone

8. Quality Gates
8.1 Validation

Language match

No markdown in explain

< 7 lines

Complexity present

No banned phrases:

“as an AI”

“I cannot”

“here is the solution”

8.2 Test Cases

LeetCode array question

React bug

SQL query

System design

9. API Contract
Request
{
  "ocr_text": "",
  "editor_code": "",
  "mode": "CODE",
  "scenario": "leetcode",
  "model_preference": "auto"
}

Response
{
  "answer": "",
  "model_used": "",
  "confidence": 0.87
}

10. Security & Stealth

No logging of screen

No platform detection

Human tone guard

Rate limiting

11. Roadmap
Phase 1 – Core

OCR → prompt

3 modes

DeepSeek integration

Phase 2

OpenAI routing

formatter

validation

Phase 3

memory

history

personalization

12. Acceptance Criteria

Answers < 5s

90% language match

No AI markers

Pass 20 interview samples