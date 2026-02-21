/**
 * EarthSpace AI Chatbot - Integrated Lead Generation
 * Consolidates chatbot logic and implements a 2-query limit before suggesting WhatsApp consultation.
 * Security: v2 - XSS-safe message rendering with sanitized innerHTML.
 */

document.addEventListener('DOMContentLoaded', () => {

    const chatToggle = document.getElementById('ai-chat-toggle');
    const chatWindow = document.getElementById('ai-chat-window');
    const closeChat = document.getElementById('close-ai-chat');
    const chatForm = document.getElementById('ai-chat-form');
    const chatInput = document.getElementById('ai-chat-input');
    const chatMessages = document.getElementById('ai-chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    if (!chatToggle || !chatWindow) return;

    // Lead Generation Constants
    const MAX_FREE_QUERIES = 2;
    const WHATSAPP_LINK = "https://wa.me/918086898741";
    const QUERY_COUNT_KEY = 'earthspace_chat_query_count';
    const MAX_INPUT_LENGTH = 500;

    // Get current query count from localStorage
    let queryCount = parseInt(localStorage.getItem(QUERY_COUNT_KEY)) || 0;

    /**
     * SECURITY: Escapes HTML special characters in a string to prevent XSS.
     * This is applied to user-supplied input before any processing.
     */
    const escapeHTML = (str) => {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    };

    /**
     * SECURITY: Safe bot-response renderer.
     * Escapes all HTML first, then ONLY re-introduces a whitelist of safe markdown-converted tags.
     * This prevents any script injection from a compromised API response.
     */
    const renderBotMarkdown = (text) => {
        const escaped = escapeHTML(text);
        return escaped
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\s*[\*\-]\s+(.*)/gm, '• $1')
            .replace(/\n/g, '<br>');
    };

    /**
     * SECURITY: Safe link renderer for the WhatsApp CTA.
     * Uses a hardcoded, trusted link — never from user or API input.
     */
    const renderWhatsAppCTA = (msg, link) => {
        const safeMsg = escapeHTML(msg);
        // Link is hardcoded from our constants, not from API or user input — safe.
        return `${safeMsg} <a href="${link}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline;font-weight:bold;">Chat Now ☕</a>`;
    };

    const addMessage = (html, sender) => {
        const msg = document.createElement('div');
        msg.classList.add('chat-msg', sender);
        msg.innerHTML = html;
        chatMessages.appendChild(msg);
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    };

    const toggleChat = () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            chatInput.focus();
        }
    };

    chatToggle.addEventListener('click', toggleChat);
    if (closeChat) {
        closeChat.addEventListener('click', () => chatWindow.classList.remove('active'));
    }

    // Prevent background scrolling when using mouse wheel over chat
    chatMessages.addEventListener('wheel', (e) => {
        const delta = e.deltaY;
        const isAtTop = chatMessages.scrollTop === 0 && delta < 0;
        const isAtBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight && delta > 0;
        if (!isAtTop && !isAtBottom) {
            e.preventDefault();
            chatMessages.scrollTop += delta;
        }
    }, { passive: false });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawText = chatInput.value.trim();
        if (!rawText) return;

        // SECURITY: Enforce max input length on submit
        if (rawText.length > MAX_INPUT_LENGTH) {
            addMessage(escapeHTML(`Your message is too long (max ${MAX_INPUT_LENGTH} characters).`), 'bot');
            return;
        }

        // SECURITY: User message is rendered via textContent path (escapeHTML output is safe for innerHTML)
        addMessage(escapeHTML(rawText), 'user');
        chatInput.value = '';

        // Check query limit
        if (queryCount >= MAX_FREE_QUERIES) {
            setTimeout(() => {
                addMessage(escapeHTML("To get the most accurate perspective for your project, we recommend a direct consultation with our lead specialist."), 'bot');
                setTimeout(() => {
                    addMessage(renderWhatsAppCTA("Click here to discuss on WhatsApp:", WHATSAPP_LINK), 'bot');
                }, 800);
            }, 1000);
            return;
        }

        // Live AI Backend
        typingIndicator.style.display = 'block';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEUwDzEPfE8ayrs6jXawE-Nviw78O8RrteFcQUgUWgNimeH__JxwbmHR_f0KnzKi-z/exec';

        fetch(`${SCRIPT_URL}?chat_query=${encodeURIComponent(rawText)}`, { method: 'POST' })
            .then(response => response.text())
            .then(aiResponse => {
                typingIndicator.style.display = 'none';
                // SECURITY: Bot response sanitized through renderBotMarkdown — no raw HTML from API
                addMessage(renderBotMarkdown(aiResponse), 'bot');
                queryCount++;
                localStorage.setItem(QUERY_COUNT_KEY, queryCount);
            })
            .catch(() => {
                typingIndicator.style.display = 'none';
                addMessage(escapeHTML("I'm having trouble connecting. Please try again or use the contact form."), 'bot');
            });
    });
});
