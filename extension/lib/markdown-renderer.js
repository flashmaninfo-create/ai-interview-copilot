// Lightweight Markdown Renderer for Stealth Overlay
// Minimal parsing without heavy dependencies

/**
 * Render markdown text to HTML for overlay display
 * Supports: code blocks, inline code, bold, italic, bullet lists
 */
export function renderMarkdown(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks: ```lang\ncode\n``` or ```\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const langClass = lang ? ` data-lang="${lang}"` : '';
        return `<pre class="ic-code-block"${langClass}><code>${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="ic-inline-code">$1</code>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_ (but not inside words)
    html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

    // Bullet lists: - item or * item (at line start)
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> items in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="ic-list">$&</ul>');

    // Numbered lists: 1. item
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Line breaks: preserve newlines as <br> (except inside code blocks)
    html = html.replace(/\n(?![^<]*<\/pre>)/g, '<br>');

    return html;
}

/**
 * Format hint content with smart detection
 * Auto-detects if content is primarily code
 */
export function formatHintContent(text, type) {
    if (!text) return '';

    // For code type, wrap entire content in code block if not already
    if (type === 'code' && !text.includes('```')) {
        // Detect language from content
        const lang = detectLanguage(text);
        return `<pre class="ic-code-block" data-lang="${lang}"><code>${escapeHtml(text)}</code></pre>`;
    }

    return renderMarkdown(text);
}

/**
 * Detect programming language from code content
 */
function detectLanguage(code) {
    if (!code) return 'plaintext';

    const patterns = {
        python: /\b(def |class |import |from |if __name__|print\(|self\.|lambda )/,
        javascript: /\b(const |let |var |function |=>|require\(|import |export |console\.)/,
        typescript: /\b(interface |type |: string|: number|: boolean|<T>)/,
        java: /\b(public |private |class |static void|System\.out)/,
        cpp: /\b(#include|std::|cout|cin|int main\()/,
        sql: /\b(SELECT |FROM |WHERE |JOIN |INSERT |UPDATE |DELETE )/i,
        html: /<\/?[a-z][\s\S]*>/i,
        css: /\{[\s\S]*:[\s\S]*;[\s\S]*\}/
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
        if (pattern.test(code)) return lang;
    }

    return 'plaintext';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Stream text with typing effect
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to stream
 * @param {number} speed - Delay between characters (ms)
 * @param {function} onComplete - Callback when complete
 */
export function streamText(element, text, speed = 15, onComplete = null) {
    if (!element || !text) return;

    element.classList.add('ic-streaming');
    element.innerHTML = '';

    let i = 0;
    const words = text.split(' ');
    let wordIndex = 0;

    // Stream word by word for faster, more natural effect
    const interval = setInterval(() => {
        if (wordIndex >= words.length) {
            clearInterval(interval);
            element.classList.remove('ic-streaming');
            // Final render with full markdown
            element.innerHTML = renderMarkdown(text);
            if (onComplete) onComplete();
            return;
        }

        const currentText = words.slice(0, wordIndex + 1).join(' ');
        element.innerHTML = renderMarkdown(currentText);
        wordIndex++;
    }, speed);

    return () => {
        // Return cancel function
        clearInterval(interval);
        element.classList.remove('ic-streaming');
        element.innerHTML = renderMarkdown(text);
    };
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (e) {
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

/**
 * Format timestamp for display
 */
export function formatTime(timestamp) {
    if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get friendly model name for display
 */
export function formatModelName(provider, model) {
    const modelNames = {
        'deepseek-chat': 'DeepSeek Chat',
        'deepseek-coder': 'DeepSeek Coder',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gpt-4-turbo': 'GPT-4 Turbo',
        'gpt-3.5-turbo': 'GPT-3.5',
        'claude-3-5-sonnet': 'Claude 3.5',
        'claude-3-opus': 'Claude 3 Opus',
        'gemini-2.5-flash': 'Gemini 2.5',
        'gemini-1.5-pro': 'Gemini 1.5 Pro'
    };

    return modelNames[model] || model || provider || 'AI';
}
