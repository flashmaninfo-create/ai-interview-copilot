// AI Service - Generates hints based on context
// SIMULATED INTELLIGENCE ENGINE

export class AIService {
    async getHint(context) {
        // Simulate API delay for realism
        await new Promise(resolve => setTimeout(resolve, 800));

        const hint = this.generateContextualHint(context);
        return {
            hint: hint,
            type: context.requestType || 'hint',
            timestamp: new Date().toISOString()
        };
    }

    generateContextualHint(context) {
        // Destructure with safe defaults
        const { interviewContext = {}, requestType, transcripts, customPrompt } = context;
        const {
            role = 'General Engineer',
            experienceLevel = 'mid',
            interviewType = 'technical',
            techStack = 'general',
            companyType = 'startup',
            responseStyle = 'balanced',
            weakAreas = ''
        } = interviewContext;

        // Get recent transcript context for "listening" capabilities
        const recentText = transcripts?.slice(-4).map(t => t.text).join(' ').toLowerCase() || '';

        // 1. HANDLE CUSTOM PROMPTS (User typed in the box)
        if (requestType === 'custom' && customPrompt) {
            return this.generateCustomResponse(customPrompt, interviewContext, recentText);
        }

        // 2. HANDLE CODE GENERATION REQUESTS
        if (requestType === 'code') {
            return this.generateCodeHint(techStack, experienceLevel, recentText);
        }

        // 3. HANDLE EXPLANATION REQUESTS
        if (requestType === 'explain') {
            return this.generateExplanationHint(recentText, responseStyle, experienceLevel);
        }

        // 4. DEFAULT: SMART HINTS (Bulb Icon)
        return this.generateSmartHint(interviewContext, recentText);
    }

    // =========================================================================================
    // 🧠 LOGIC ENGINE: SMART HINTS
    // =========================================================================================
    generateSmartHint(context, recentText) {
        const { role, experienceLevel, interviewType, techStack, companyType } = context;

        const stack = (techStack || '').toLowerCase();

        // --- DETECT TOPIC FROM SPEECH ---
        if (recentText.includes('complexity') || recentText.includes('big o')) {
            return "Mention time vs space tradeoffs. If using a hash map, explain it's O(1) time but O(n) space. If sorting, mention O(n log n).";
        }
        if (recentText.includes('scale') || recentText.includes('millions')) {
            return "Focus on horizontal scaling. Suggest Load Balancers, Caching (Redis), and Database Sharding.";
        }
        if (recentText.includes('conflict') || recentText.includes('disagree')) {
            return "Use STAR method. Focus on the *resolution* and *what you learned*. Don't badmouth the other party.";
        }

        // --- BEHAVIORAL INTERVIEW ---
        if (interviewType === 'behavioral') {
            const behavioralTips = [
                "Structure your answer with STAR: Situation, Task, Action, Result.",
                "Quantify your impact. Use numbers (e.g., 'improved latency by 20%', 'saved $10k').",
                "Focus on 'I', not 'We'. Highlights YOUR specific contribution.",
                "Keep the 'Situation' brief. Spend 70% of time on 'Action' and 'Result'."
            ];
            return behavioralTips[Math.floor(Math.random() * behavioralTips.length)];
        }

        // --- SYSTEM DESIGN ---
        if (interviewType === 'system-design') {
            return "Start with high-level requirement clarification.\n1. Functional Requirements (User actions)\n2. Non-Functional (Scale, Latency, CAP Theorem)\n3. Estimates (Traffic, Storage)";
        }

        // --- TECHNICAL / CODING (By Stack) ---
        if (stack.includes('react')) {
            return "React Tips:\n- Don't mutate state directly.\n- Explain useEffect dependency array.\n- Mention Virtual DOM for performance.\n- Custom hooks for reusable logic.";
        }
        if (stack.includes('node') || stack.includes('express')) {
            return "Node.js Tips:\n- Mention the Event Loop (single-threaded).\n- Blocking vs Non-blocking I/O.\n- Middleware pattern in Express.\n- Error handling with try/catch in final middleware.";
        }
        if (stack.includes('python')) {
            return "Python Tips:\n- Use List Comprehensions for cleaner code.\n- Generator expressions for memory efficiency.\n- Explain GIL if asked about threading.\n- Use `set` for O(1) lookups.";
        }
        if (stack.includes('java')) {
            return "Java Tips:\n- StringBuilder for string concatenation.\n- HashMap vs concurrentMap for threads.\n- Java Stream API for data processing.\n- GC (Garbage Collection) basics.";
        }

        // --- GENERIC FALLBACK ---
        return "Clarify the problem first. 'Just to make sure I understand, the goal is to input X and get Y output?' This buys you thinking time.";
    }

    // =========================================================================================
    // 💻 LOGIC ENGINE: CODE GENERATION
    // =========================================================================================
    generateCodeHint(techStack, experienceLevel, recentText) {
        const stack = (techStack || '').toLowerCase();

        // React / JS
        if (stack.includes('react') || stack.includes('javascript') || stack.includes('typescript')) {
            if (recentText.includes('api') || recentText.includes('fetch')) {
                return `// Fetch Data Hook
useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    }
  };
  fetchData();
}, []);`;
            }
            return `// Generic Solution Template
function solve(input) {
  // 1. Edge Case
  if (!input) return null;

  // 2. Data Structure
  const map = new Map();
  const result = [];

  // 3. Logic
  for (let item of input) {
    if (!map.has(item)) {
       result.push(item);
       map.set(item, true);
    }
  }

  return result;
}`;
        }

        // Python
        if (stack.includes('python')) {
            return `# Solution Template
def solve(data):
    # 1. Edge Case
    if not data:
        return []
        
    # 2. Logic (Set for O(1) lookup)
    seen = set()
    result = []
    
    for item in data:
        if item not in seen:
            result.append(item)
            seen.add(item)
            
    return result`;
        }

        // Java
        if (stack.includes('java')) {
            return `// Java Solution
public List<String> solve(List<String> input) {
    if (input == null) return new ArrayList<>();

    Set<String> seen = new HashSet<>();
    List<String> result = new ArrayList<>();

    for (String s : input) {
        if (!seen.contains(s)) {
            seen.add(s);
            result.add(s);
        }
    }
    return result;
}`;
        }

        // SQL
        if (stack.includes('sql')) {
            return `-- Common Query Pattern
SELECT 
    u.name, 
    COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2023-01-01'
GROUP BY u.id
ORDER BY order_count DESC;`;
        }

        return `// Psuedocode Approach
Function Solve(input):
  Check for edge cases (null, empty)
  Initialize hash map for tracking
  Loop through input:
    updated state if condition met
  Return result`;
    }

    // =========================================================================================
    // 📖 LOGIC ENGINE: EXPLANATIONS
    // =========================================================================================
    generateExplanationHint(recentText, responseStyle, experienceLevel) {
        const text = (recentText || '').toLowerCase();

        if (text.includes('rest') || text.includes('api')) {
            return "REST API: Stateless architecture style. Uses standard HTTP methods (GET, POST, PUT, DELETE). Resources are identified by URLs. Communication is usually JSON.";
        }
        if (text.includes('react') || text.includes('state')) {
            return "State vs Props: Props are passed down (read-only). State is managed internally by the component. Context API avoids prop-drilling.";
        }
        if (text.includes('thread') || text.includes('async')) {
            return "Async/Sync: Synchronous blocks execution. Asynchronous (Promises, Async/Await) allows other code to run while waiting for I/O operations.";
        }
        if (text.includes('sql') || text.includes('database')) {
            return "ACID Properties: Atomicity (all or nothing), Consistency (valid state), Isolation (transactions independent), Durability (saved permanently).";
        }

        return "Structure your explanation:\n1. Definition (1 sentence)\n2. Why use it? (Benefit)\n3. Example/Use Case.\n4. Drawbacks (optional, shows seniority).";
    }

    // =========================================================================================
    // 💬 LOGIC ENGINE: CUSTOM PROMPTS
    // =========================================================================================
    generateCustomResponse(prompt, interviewContext, recentText) {
        const p = prompt.toLowerCase();

        if (p.includes('hello') || p.includes('hi')) return "Hello! I'm ready to help you ace this interview. Ask me for code, hints, or explanations.";
        if (p.includes('thank')) return "You're welcome! You got this.";

        if (p.includes('time complexity') || p.includes('complexity')) {
            return "Time Complexity Cheat Sheet:\n- Access Array: O(1)\n- Search Sorted Array: O(log n)\n- Search Unsorted: O(n)\n- Sort (Merge/Quick): O(n log n)\n- Nested Loop: O(n^2)";
        }

        if (p.includes('react')) return "React Focus: Hooks, Virtual DOM, State Management (Redux/Context), Component Lifecycle.";
        if (p.includes('python')) return "Python Focus: Decorators, Generators, GIL, Data Structures (Lists, Dicts, Sets), List Comprehensions.";
        if (p.includes('java')) return "Java Focus: Multithreading, JVM Memory Model, Garbage Collection, Spring Boot annotations.";

        return `I can help with that! Since I'm in simulation mode, try asking specific technical questions like "explain dependency injection" or "python decorators".`;
    }
}
