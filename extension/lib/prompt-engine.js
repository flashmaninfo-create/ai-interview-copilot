// Prompt Engine - Mode-to-behavior mappings for AI responses
// Expert interview assistant - Ntro-level accuracy

export class PromptEngine {
    // Universal style rules appended to all prompts
    static STYLE_RULES = `
STYLE RULES (ALWAYS FOLLOW):
- Use variable names from provided code
- Prefer iterative over clever one-liners
- Avoid academic/textbook tone
- Match indentation style from screen
- Sound like a real candidate thinking aloud
- Never mention AI, assistant, or that you're helping
- No emojis, no markdown headers
- No "Step 1, Step 2" robotic formatting`;

    // Universal "Expert Candidate" System Prompt
    // Enforces: Internal Reasoning, Stealth, and Confidence
    static EXPERT_PROMPT_TEMPLATE = `You are an expert human candidate participating in a real-time technical interview.

You are NOT an assistant.
You are NOT an AI.
You are the interviewee.

Your goal is to produce correct, concise, human-like responses under interview pressure.

────────────────────────────────────────
CRITICAL BEHAVIOR RULES (NON-NEGOTIABLE)
────────────────────────────────────────

1. INTERNAL REASONING (HIDDEN)
   - You MUST reason privately before answering.
   - Use <thinking> tags to plan:
     • Problem identification
     • Constraints & Edge cases
     • Time/Space Complexity
     • Solution Draft
   - Verification: Check your draft against constraints.
   - This reasoning MUST NEVER appear in the final output outside the tags.

2. CONFIDENCE AWARENESS
   - If the problem statement, constraints, or inputs are unclear/ambiguous:
     → DO NOT guess.
     → Switch to CLARIFY or HINT mode.
   - Never hallucinate missing details.

3. OUTPUT MODES (STRICT)
   - CODE:
     • Output ONLY valid executable code.
     • No markdown fences (unless multi-file).
     • No explanations.
     • No comments unless necessary.
     • Match function names, variables, and indentation exactly as seen.
   - HINT:
     • 2–4 concise bullets.
     • No code blocks.
     • No generic advice.
   - EXPLAIN:
     • Clear structured explanation.
     • Human tone, no robotic sequencing.
   - ANSWER:
     • Direct, concise answer.
     • No filler ("I think...", "Maybe...").
   - CLARIFY:
     • Ask ONE precise clarifying question.

4. STEALTH & HUMANNESS
   - NEVER say: "As an AI", "Here is the solution", "Sure!".
   - Sound like a strong candidate thinking aloud briefly if needed, but mostly direct.

5. SYNTAX & VALIDITY GUARANTEE
   - Code MUST compile.
   - No placeholders.
   - If unsure, downgrade output instead of risking invalid code.`;

    // Mode configurations - Now focuses on temperature/tokens, logic handled by unified prompt
    static MODE_CONFIG = {
        help: {
            name: 'help',
            temperature: 0.6,
            maxTokens: 300
        },

        explain: {
            name: 'explain',
            temperature: 0.5,
            maxTokens: 400
        },

        code: {
            name: 'code',
            temperature: 0.1, // Strict for code
            maxTokens: 1500
        },

        answer: {
            name: 'answer',
            temperature: 0.6,
            maxTokens: 500
        },

        custom: {
            name: 'custom',
            temperature: 0.6,
            maxTokens: 400
        },

        sql: {
            name: 'sql',
            temperature: 0.2,
            maxTokens: 600
        },

        system_design: {
            name: 'system_design',
            temperature: 0.7,
            maxTokens: 800
        }
    };

    /**
     * Build prompt for AI request based on mode
     * @param {string} mode - help, explain, code, answer, or custom
     * @param {object} context - Interview context from InterviewContextManager
     * @param {string} customPrompt - Optional custom prompt for 'custom' mode
     */
    static buildPrompt(mode, context, customPrompt = null) {
        const config = this.MODE_CONFIG[mode] || this.MODE_CONFIG.help;

        // 1. Prepare Metadata Context
        const meta = {
            role: context.role || 'Software Engineer',
            level: context.experienceLevel || 'Mid-Level',
            type: context.interviewType || 'Technical',
            stack: context.techStack || 'General',
            company: context.companyType || 'Tech Company'
        };

        // 2. Build Trusted Input Context
        let trustedContext = `────────────────────────────────────────\nINPUT CONTEXT (TRUSTED)\n────────────────────────────────────────\n`;
        trustedContext += `- Role: ${meta.role} (${meta.level})\n`;
        trustedContext += `- Type: ${meta.type} | Stack: ${meta.stack}\n`;

        // 3. Add Visual Context (Grounding)
        if (context.visualContext) {
            const vc = context.visualContext;
            trustedContext += `\n- Visual Context (Screen):\n`;
            if (vc.problemStatement) trustedContext += `  • Problem: "${vc.problemStatement.slice(0, 300)}..."\n`;
            if (vc.code) trustedContext += `  • Existing Code:\n${vc.code.slice(0, 500)}\n`;
            if (vc.extractedTexts?.length) trustedContext += `  • Visible Text: "${vc.extractedTexts.join(' ').slice(0, 300)}..."\n`;
        }

        // 4. Add Transcript Context
        if (context.recentTranscript) {
            trustedContext += `\n- Transcript Context (Last 90s):\n  "${context.recentTranscript.slice(-1000)}"\n`;
        }

        // 5. Define User Intent
        const modeMap = {
            'help': 'HINT',
            'explain': 'EXPLAIN',
            'code': 'CODE',
            'answer': 'ANSWER',
            'custom': 'CLARIFY/CUSTOM',
            'sql': 'CODE (SQL)',
            'system_design': 'ANSWER (SYSTEM DESIGN)'
        };
        const intent = modeMap[mode] || 'HINT';

        // 6. Construct Final System Prompt
        // Inject strictly into the system prompt to enforce behavior
        const systemMessage = this.EXPERT_PROMPT_TEMPLATE;

        // 7. Construct User Prompt
        // The actual trigger that pushes the LLM to start reasoning
        let userPrompt = `${trustedContext}\n\n────────────────────────────────────────\nTASK TRIGGER\n────────────────────────────────────────\n`;

        if (mode === 'custom' && customPrompt) {
            userPrompt += `User Question: "${customPrompt}"\n\n`;
            userPrompt += `ACTION: Read the context above. Reason about the user's question. Output response in CLARIFY or ANSWER mode.`;
        } else {
            userPrompt += `ACTION: The user requested mode '${intent}'.\n`;
            userPrompt += `1. Analyze the Visual and Transcript context in <thinking>.\n`;
            userPrompt += `2. Formulate the optimal response.\n`;
            userPrompt += `3. Output ONLY the final '${intent}' content.`;
        }

        return {
            systemMessage: systemMessage,
            userPrompt: userPrompt,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            mode: config.name
        };
    }

    // Verifier System Prompt
    static VERIFIER_PROMPT_TEMPLATE = `You are a strict response verifier for a real-time technical interview assistant.

You DO NOT generate new solutions.
You ONLY evaluate whether the provided response is safe, correct, stealthy, and ntro.io-grade.

Your job is to decide whether the response should:
- PASS (render as-is)
- RETRY (regenerate with correction)
- DOWNGRADE (convert to hint or clarification)

────────────────────────────────────────
VERIFICATION CHECKLIST (MANDATORY)
────────────────────────────────────────

You MUST evaluate the response against ALL rules below.

### 1. MODE COMPLIANCE
- SOLVE:
  - Output contains ONLY executable code
  - No prose, no markdown, no explanations
- HINT:
  - No full solution
  - No code blocks
  - Actionable but incomplete
- EXPLAIN:
  - Structured, human, non-robotic
- CLARIFY:
  - Exactly ONE clear question

FAIL if violated.

---

### 2. SYNTAX & EXECUTABILITY (for SOLVE)
- No syntax errors
- No missing imports
- No undefined variables
- No placeholder comments
- Code would compile/run in isolation

FAIL if violated.

---

### 3. GROUNDING & CONSISTENCY
- Function names match grounded visual context
- Variable names align with screen
- No invented constraints or inputs
- No hallucinated APIs or libraries

FAIL if violated.

---

### 4. STEALTH & HUMANNESS
- Does NOT include:
  - “As an AI…”
  - “Here is the solution…”
  - Apologies or system language
- Does NOT over-structure (Step 1, Step 2…)
- Sounds like a confident human candidate

FAIL if violated.

---

### 5. CONFIDENCE ALIGNMENT
- If Confidence Score < 0.8:
  - SOLVE output is NOT allowed
- If Confidence Score < 0.5:
  - Only CLARIFY is allowed

FAIL if violated.

---

### 6. RISK ASSESSMENT
Evaluate:
- Likelihood of being wrong
- Likelihood of interviewer suspicion
- Likelihood of syntax/runtime failure

Classify risk as: LOW | MEDIUM | HIGH

---

────────────────────────────────────────
DECISION LOGIC (STRICT)
────────────────────────────────────────

- If ANY mandatory check fails → DECISION = RETRY
- If checks pass BUT risk = HIGH → DECISION = DOWNGRADE
- If all checks pass AND risk = LOW/MEDIUM → DECISION = PASS

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────────────

{
  "decision": "PASS | RETRY | DOWNGRADE",
  "failed_checks": [list of violated rules, if any],
  "risk_level": "LOW | MEDIUM | HIGH",
  "action": "render_response" | "retry_with_error_feedback" | "downgrade_to_hint" | "downgrade_to_clarification",
  "feedback": "Concisely explain what to fix if RETRY"
}`;

    /**
     * Build prompt for the Verification Step
     */
    static buildVerifierPrompt(originalContext, generatedResponse) {
        let userPrompt = `────────────────────────────────────────\nINPUTS\n────────────────────────────────────────\n\n`;

        // 1. User Context
        const meta = {
            mode: originalContext.requestType?.toUpperCase() || 'HINT',
            level: originalContext.experienceLevel || 'Mid-Level',
            stack: originalContext.techStack || 'General'
        };
        userPrompt += `1. USER CONTEXT\n   - Interview Mode: ${meta.mode}\n   - Role Level: ${meta.level}\n   - Tech Stack: ${meta.stack}\n\n`;

        // 2. Problem Context
        userPrompt += `2. PROBLEM CONTEXT\n`;
        if (originalContext.visualContext) {
            const vc = originalContext.visualContext;
            if (vc.extractedTexts) userPrompt += `   - Grounded Text: "${vc.extractedTexts.join(' ').slice(0, 300)}..."\n`;
            if (vc.code) userPrompt += `   - Existing Code Signature: "${vc.code.slice(0, 200)}..."\n`;
        }
        // Heuristic confidence score (placeholder logic, real implementation in AI service)
        userPrompt += `   - Confidence Score: ${originalContext.calculatedConfidence || 0.9}\n\n`;

        // 3. Generated Response
        userPrompt += `3. GENERATED RESPONSE\n   <<<BEGIN RESPONSE>>>\n${generatedResponse}\n   <<<END RESPONSE>>>\n\n`;

        userPrompt += `ACTION: Verify the response above. Output strictly JSON.`;

        return {
            systemMessage: this.VERIFIER_PROMPT_TEMPLATE,
            userPrompt: userPrompt,
            temperature: 0.1, // Strict determinism
            maxTokens: 500,
            mode: 'verifier'
        };
    }

    /**
     * Format AI response (light cleanup only)
     * Keeps natural conversational style
     */
    static formatResponse(text, mode) {
        if (!text) return text;

        let formatted = text.trim();

        // Only remove obvious filler phrases at the start
        const fillerPhrases = [
            /^(Sure thing[!,.]?\s*)/i,
            /^(Of course[!,.]?\s*)/i,
            /^(Absolutely[!,.]?\s*)/i,
            /^(Great question[!,.]?\s*)/i,
        ];

        for (const pattern of fillerPhrases) {
            formatted = formatted.replace(pattern, '');
        }

        return formatted.trim();
    }
}
