// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const newChatButton = document.getElementById('new-chat-btn');
const chatHistory = document.getElementById('chat-history');
const modelSelect = document.getElementById('model-select');
const profileButton = document.getElementById('profile-btn');
const userInfoModal = document.getElementById('user-info-modal');
const closeModal = document.querySelector('.close-modal');
const userInfoForm = document.getElementById('user-info-form');
const clearHistoryButton = document.getElementById('clear-history-btn');

// Chat state
let chatId = generateChatId();
let messages = [];
let isProcessing = false;
let userInfo = {
    name: '',
    university: '',
    currentYear: '',
    major: '',
    courses: '',
    graduateSchool: false,
    work: false
};

// Initialize the app
function init() {
    // Load chat history from localStorage
    loadChatHistory();
    
    // Load user info from localStorage
    loadUserInfo();
    
    // Set up event listeners
    userInput.addEventListener('input', handleInputChange);
    userInput.addEventListener('keydown', handleKeyDown);
    sendButton.addEventListener('click', sendMessage);
    newChatButton.addEventListener('click', startNewChat);
    profileButton.addEventListener('click', openUserInfoModal);
    closeModal.addEventListener('click', closeUserInfoModal);
    userInfoForm.addEventListener('submit', saveUserInfo);
    clearHistoryButton.addEventListener('click', clearChatHistory);
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === userInfoModal) {
            closeUserInfoModal();
        }
    });
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', autoResizeTextarea);
}

// Generate a unique ID for each chat
function generateChatId() {
    return 'chat_' + Date.now();
}

// Auto-resize the textarea as user types
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
    
    // Reset to original height if empty
    if (userInput.value === '') {
        userInput.style.height = '';
    }
}

// Handle input changes to enable/disable send button
function handleInputChange() {
    sendButton.disabled = userInput.value.trim() === '';
}

// Handle Enter key to send message (Shift+Enter for new line)
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
            sendMessage();
        }
    }
}

// Open user info modal
function openUserInfoModal() {
    userInfoModal.style.display = 'flex';
    
    // Fill form with existing user info
    document.getElementById('user-name').value = userInfo.name;
    document.getElementById('university').value = userInfo.university;
    document.getElementById('current-year').value = userInfo.currentYear;
    document.getElementById('major').value = userInfo.major;
    document.getElementById('courses').value = userInfo.courses;
    document.getElementById('graduate-school').checked = userInfo.graduateSchool;
    document.getElementById('work').checked = userInfo.work;
}

// Close user info modal
function closeUserInfoModal() {
    userInfoModal.style.display = 'none';
}

// Save user info
function saveUserInfo(e) {
    e.preventDefault();
    
    userInfo = {
        name: document.getElementById('user-name').value,
        university: document.getElementById('university').value,
        currentYear: document.getElementById('current-year').value,
        major: document.getElementById('major').value,
        courses: document.getElementById('courses').value,
        graduateSchool: document.getElementById('graduate-school').checked,
        work: document.getElementById('work').checked
    };
    
    // Save to localStorage
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    
    // Close modal
    closeUserInfoModal();
    
    // Show confirmation message
    if (userInfo.name) {
        // Add a system message to indicate the profile was updated if a chat is already open
        if (!document.querySelector('.welcome-message')) {
            addMessageToUI('system', `Profile updated for ${userInfo.name}. Your information will be used to provide better responses.`);
        }
    }
}

// Load user info from localStorage
function loadUserInfo() {
    const savedInfo = localStorage.getItem('user_info');
    if (savedInfo) {
        userInfo = JSON.parse(savedInfo);
    }
}

// Send a message
function sendMessage() {
    if (isProcessing || userInput.value.trim() === '') return;
    
    const userMessage = userInput.value.trim();
    
    // Add user message to UI
    addMessageToUI('user', userMessage);
    
    // Store in messages array
    messages.push({
        role: 'user',
        content: userMessage
    });
    
    // Clear input
    userInput.value = '';
    userInput.style.height = '';
    sendButton.disabled = true;
    
    // Show AI is typing
    showTypingIndicator();
    
    // Get AI response
    getAIResponse(userMessage);
    
    // Save to history if this is the first message
    if (messages.length === 1) {
        addChatToHistory(chatId, userMessage);
    }
}

// Format user info as context string
function formatUserInfoContext() {
    if (!userInfo.name) return '';
    
    let context = `User Information:
- Name: ${userInfo.name}`;
    
    if (userInfo.university) context += `
- University: ${userInfo.university}`;
    
    if (userInfo.currentYear) context += `
- Current Year: ${userInfo.currentYear}`;
    
    if (userInfo.major) context += `
- Major: ${userInfo.major}`;
    
    if (userInfo.courses) context += `
- Courses Taken: ${userInfo.courses}`;
    
    let futurePlans = [];
    if (userInfo.graduateSchool) futurePlans.push('Apply to graduate school');
    if (userInfo.work) futurePlans.push('Enter workforce');
    
    if (futurePlans.length > 0) {
        context += `
- Future Plans: ${futurePlans.join(', ')}`;
    }
    
    return context;
}

// Add a message to the UI
function addMessageToUI(role, content) {
    // Remove welcome message if it exists
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${role}-avatar`;
    avatar.innerText = role === 'user' ? 'U' : (role === 'system' ? 'S' : 'AI');
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Split content by paragraphs and create p elements
    const paragraphs = content.split('\n').filter(p => p.trim() !== '');
    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        messageContent.appendChild(p);
    });
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    isProcessing = true;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.id = 'typing-indicator-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai-avatar';
    avatar.innerText = 'AI';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingIndicator.appendChild(dot);
    }
    
    messageContent.appendChild(typingIndicator);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Get AI response from backend
async function getAIResponse(userMessage) {
    const selectedModel = 'deepseek-r1';
    
    // Create a context-aware prompt using user info
    const userInfoContext = formatUserInfoContext();
    const contextualPrompt = userInfoContext 
        ? `${userInfoContext}\n\nUser Query: ${userMessage}` 
        : userMessage;

    try {
        // Show thinking indicator first
        showThinkingProcess();
        
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: contextualPrompt,
                model: selectedModel
            })
        });

        const data = await response.json();

        // Process the response to remove thinking tags
        const cleanedResponse = removeThinkingProcess(data.response);

        // Remove typing indicator
        const typingIndicator = document.getElementById('typing-indicator-message');
        if (typingIndicator) typingIndicator.remove();

        // Remove thinking indicator if it exists
        const thinkingIndicator = document.getElementById('thinking-indicator-message');
        if (thinkingIndicator) thinkingIndicator.remove();

        // Add AI response to UI
        addMessageToUI('ai', cleanedResponse);

        // Store in message state
        messages.push({
            role: 'assistant',
            content: cleanedResponse
        });

    } catch (error) {
        console.error('Error calling backend:', error);

        // Remove typing indicator
        const typingIndicator = document.getElementById('typing-indicator-message');
        if (typingIndicator) typingIndicator.remove();

        // Remove thinking indicator if it exists
        const thinkingIndicator = document.getElementById('thinking-indicator-message');
        if (thinkingIndicator) thinkingIndicator.remove();

        addMessageToUI('ai', '⚠️ Error: Unable to fetch response from backend.');

        messages.push({
            role: 'assistant',
            content: '⚠️ Error: Unable to fetch response from backend.'
        });
    } finally {
        isProcessing = false;
    }
}

// Show thinking process indicator
function showThinkingProcess() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.id = 'thinking-indicator-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai-avatar';
    avatar.innerText = 'AI';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const thinkingText = document.createElement('p');
    thinkingText.innerHTML = '<em>Thinking...</em>';
    messageContent.appendChild(thinkingText);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    // Remove typing indicator if it exists
    const typingIndicator = document.getElementById('typing-indicator-message');
    if (typingIndicator) typingIndicator.remove();
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Remove thinking process from response
function removeThinkingProcess(response) {
    // Pattern to match content inside <think> tags
    const thinkingPattern = /<think>([\s\S]*?)<\/think>/;
    
    // Check if response contains thinking pattern
    if (thinkingPattern.test(response)) {
        // Remove the thinking part
        return response.replace(thinkingPattern, '').trim();
    }
    
    return response;
}

// Start a new chat
function startNewChat() {
    // Reset state
    chatId = generateChatId();
    messages = [];
    
    // Clear the chat container and add welcome message
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <h1>How can I help you today?</h1>
            <p>This is a simple AI chat interface similar to ChatGPT. Start by typing a message below.</p>
        </div>
    `;
    
    // Focus on input
    userInput.focus();
}

// Add chat to history
function addChatToHistory(id, firstMessage) {
    const truncatedMessage = firstMessage.length > 30 
        ? firstMessage.substring(0, 30) + '...' 
        : firstMessage;
    
    const chatItem = document.createElement('li');
    chatItem.className = 'chat-history-item';
    chatItem.dataset.chatId = id;
    chatItem.innerHTML = `
        <i class="fas fa-comment history-icon"></i>
        <span>${truncatedMessage}</span>
    `;
    
    // Add click event to load this chat
    chatItem.addEventListener('click', () => {
        // In a real app, this would load the chat from storage
        alert('In a real implementation, this would load the selected chat');
    });
    
    // Add to history list
    chatHistory.prepend(chatItem);
    
    // In a real app, save to localStorage or backend
    saveChatsToLocalStorage();
}

// Load chat history
function loadChatHistory() {
    // In a real app, this would load from localStorage or backend
    const savedChats = JSON.parse(localStorage.getItem('chat_history')) || [];
    
    // Clear existing items
    chatHistory.innerHTML = '';
    
    // Add saved chats to history
    savedChats.forEach(chat => {
        const chatItem = document.createElement('li');
        chatItem.className = 'chat-history-item';
        chatItem.dataset.chatId = chat.id;
        chatItem.innerHTML = `
            <i class="fas fa-comment history-icon"></i>
            <span>${chat.preview}</span>
        `;
        
        // Add click event
        chatItem.addEventListener('click', () => {
            alert('In a real implementation, this would load the selected chat');
        });
        
        chatHistory.appendChild(chatItem);
    });
}

// Save chats to localStorage (simplified)
function saveChatsToLocalStorage() {
    const chatItems = document.querySelectorAll('.chat-history-item');
    const chats = [];
    
    chatItems.forEach(item => {
        chats.push({
            id: item.dataset.chatId,
            preview: item.querySelector('span').textContent
        });
    });
    
    localStorage.setItem('chat_history', JSON.stringify(chats));
}

// Clear chat history
function clearChatHistory() {
    // Confirm before clearing
    if (confirm('Are you sure you want to clear all chat history?')) {
        // Clear the DOM elements
        chatHistory.innerHTML = '';
        
        // Clear localStorage
        localStorage.removeItem('chat_history');
        
        // Visual feedback
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'history-feedback';
        feedbackDiv.textContent = 'History cleared';
        
        chatHistory.appendChild(feedbackDiv);
        
        // Remove feedback after 2 seconds
        setTimeout(() => {
            const feedback = document.querySelector('.history-feedback');
            if (feedback) {
                feedback.remove();
            }
        }, 2000);
    }
}

// Initialize the app
init();