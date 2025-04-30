// This would go in your script.js file

// Variables to store state
let userInfo = {};
let selectedModel = "gpt-4o"; // Default model
let chatHistory = [];

// DOM elements
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatContainer = document.getElementById('chat-container');
const modelSelect = document.getElementById('model-select');
const userInfoForm = document.getElementById('user-info-form');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Enable send button when input has text
    userInput.addEventListener('input', () => {
        sendBtn.disabled = userInput.value.trim() === '';
    });
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                sendMessage();
            }
        }
    });
    
    // Model selection
    modelSelect.addEventListener('change', () => {
        switch(modelSelect.value) {
            case 'default':
                selectedModel = "gpt-4o-mini";
                break;
            case 'advanced':
                selectedModel = "gpt-4o";
                break;
            case 'fast':
                selectedModel = "gpt-3.5-turbo";
                break;
        }
    });
    
    // Save user info
    userInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveUserInfo();
        document.getElementById('user-info-modal').style.display = 'none';
    });
    
    // Load user info from localStorage if available
    loadUserInfo();
});

// Send message to backend
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message to UI
    addMessageToUI('user', message);
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // Show typing indicator
    addTypingIndicator();
    
    try {
        // Call backend API
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: message,
                model: selectedModel,
                user_info: userInfo,
                chat_history: chatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to UI
        addMessageToUI('ai', data.response);
        
        // Update chat history
        chatHistory.push(
            { role: "user", content: message },
            { role: "assistant", content: data.response }
        );
        
        // Save updated chat to localStorage
        saveChat();
        
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessageToUI('ai', 'Sorry, there was an error processing your request. Please try again.');
    }
}

// Add message to UI
function addMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'message-icon';
    iconDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = formatMessage(content);
    
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(contentDiv);
    
    // Remove welcome message if present
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    chatContainer.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Format message with markdown-like syntax
function formatMessage(text) {
    // Simple formatting for code blocks, bold, etc. 
    // You could use a library like marked.js for better formatting
    return text.replace(/\n/g, '<br>');
}

// Add typing indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-icon"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Save user info from form
function saveUserInfo() {
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
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

// Load user info from localStorage
function loadUserInfo() {
    const savedInfo = localStorage.getItem('userInfo');
    if (savedInfo) {
        userInfo = JSON.parse(savedInfo);
        
        // Populate form with saved data
        document.getElementById('user-name').value = userInfo.name || '';
        document.getElementById('university').value = userInfo.university || '';
        document.getElementById('current-year').value = userInfo.currentYear || '';
        document.getElementById('major').value = userInfo.major || '';
        document.getElementById('courses').value = userInfo.courses || '';
        document.getElementById('graduate-school').checked = userInfo.graduateSchool || false;
        document.getElementById('work').checked = userInfo.work || false;
    }
}

// Save chat to localStorage
function saveChat() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Handle the new chat button
document.getElementById('new-chat-btn').addEventListener('click', () => {
    // Clear the chat container except for welcome message
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <h1>How can I help you today?</h1>
            <p>This is a simple AI chat interface similar to ChatGPT. Start by typing a message below.</p>
        </div>
    `;
    
    // Reset chat history
    chatHistory = [];
    saveChat();
});

// Handle the profile button to open modal
document.getElementById('profile-btn').addEventListener('click', () => {
    document.getElementById('user-info-modal').style.display = 'block';
});

// Handle the close modal button
document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('user-info-modal').style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('user-info-modal')) {
        document.getElementById('user-info-modal').style.display = 'none';
    }
});