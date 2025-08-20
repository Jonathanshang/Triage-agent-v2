// Global state management
let currentConversation = {
    id: null,
    sessionId: null,
    step: 'initial',
    userId: 'user_001',
    userName: 'Jonathan Shang'
};

let conversationHistory = [];

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const inputArea = document.getElementById('inputArea');
const startBtn = document.getElementById('startBtn');
const ticketModal = document.getElementById('ticketModal');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    showWelcomeMessage();
    setupEventListeners();
});

function setupEventListeners() {
    startBtn.addEventListener('click', startConversation);
    
    // Modal event listeners
    window.addEventListener('click', function(event) {
        if (event.target === ticketModal) {
            closeModal();
        }
    });
    
    // Enter key handling for ticket search
    document.getElementById('ticketNumberInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTicket();
        }
    });
}

function showWelcomeMessage() {
    const welcomeMessage = {
        type: 'agent',
        content: `👋 Welcome to the BI Triage Agent!

I'm here to help you submit well-structured Business Intelligence requests. I'll guide you through a conversation to gather all the necessary details, ensuring your request gets the attention it deserves.

**What I can help you with:**
• Troubleshooting BI issues
• Requesting new reports or dashboards  
• Setting up automation
• Managing user access
• Tool-related changes

Click "Start New BI Request" below when you're ready to begin!`,
        timestamp: new Date()
    };
    
    addMessageToChat(welcomeMessage);
}

async function startConversation() {
    try {
        showLoading(startBtn, 'Starting conversation...');
        
        const response = await fetch('/api/conversation/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentConversation.userId,
                userName: currentConversation.userName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentConversation.id = data.conversationId;
            currentConversation.sessionId = data.sessionId;
            currentConversation.step = data.currentStep;
            
            // Add agent message
            addMessageToChat({
                type: 'agent',
                content: data.message,
                timestamp: new Date()
            });
            
            // Show request type buttons
            showRequestTypeSelection(data.requestTypes);
            
        } else {
            throw new Error(data.error || 'Failed to start conversation');
        }
    } catch (error) {
        console.error('Error starting conversation:', error);
        showError('Failed to start conversation. Please try again.');
    } finally {
        hideLoading(startBtn, 'Start New BI Request');
    }
}

function showRequestTypeSelection(requestTypes) {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    requestTypes.forEach(type => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.innerHTML = `${getTypeIcon(type.id)} ${type.name}`;
        button.onclick = () => selectRequestType(type.id, button);
        buttonGroup.appendChild(button);
    });
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    inputContainer.appendChild(buttonGroup);
    
    inputArea.innerHTML = '';
    inputArea.appendChild(inputContainer);
}

function getTypeIcon(typeId) {
    const icons = {
        'troubleshooting': '🔧',
        'reporting': '📊',
        'automation': '⚡',
        'access': '🔐',
        'tools': '🛠️'
    };
    return icons[typeId] || '📝';
}

async function selectRequestType(requestType, selectedButton) {
    try {
        // Visual feedback
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        selectedButton.classList.add('selected');
        
        // Add user message
        addMessageToChat({
            type: 'user',
            content: selectedButton.textContent,
            timestamp: new Date()
        });
        
        showLoading(selectedButton, 'Processing...');
        
        const response = await fetch('/api/conversation/select-type', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: currentConversation.id,
                requestType: requestType
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentConversation.step = data.currentStep;
            
            // Add agent response
            addMessageToChat({
                type: 'agent',
                content: data.message,
                timestamp: new Date()
            });
            
            // Show question input
            showQuestionInput(data.question, data.questionIndex, data.totalQuestions);
            
        } else {
            throw new Error(data.error || 'Failed to select request type');
        }
    } catch (error) {
        console.error('Error selecting request type:', error);
        showError('Failed to process selection. Please try again.');
    }
}

function showQuestionInput(question, questionIndex, totalQuestions) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    
    const progressInfo = document.createElement('div');
    progressInfo.className = 'progress-info';
    progressInfo.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${((questionIndex + 1) / totalQuestions) * 100}%"></div>
        </div>
        <p class="progress-text">Question ${questionIndex + 1} of ${totalQuestions}</p>
    `;
    
    const questionElement = document.createElement('div');
    questionElement.className = 'current-question';
    questionElement.innerHTML = `<strong>${question}</strong>`;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'text-input';
    textarea.placeholder = 'Please provide as much detail as possible...';
    textarea.rows = 4;
    
    const controls = document.createElement('div');
    controls.className = 'input-controls';
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'primary-btn';
    submitBtn.innerHTML = '<span class="btn-icon">➤</span> Submit Answer';
    submitBtn.onclick = () => submitResponse(textarea.value, questionIndex, totalQuestions);
    
    controls.appendChild(submitBtn);
    
    inputContainer.appendChild(progressInfo);
    inputContainer.appendChild(questionElement);
    inputContainer.appendChild(textarea);
    inputContainer.appendChild(controls);
    
    inputArea.innerHTML = '';
    inputArea.appendChild(inputContainer);
    
    // Focus on textarea
    textarea.focus();
    
    // Enable submit on Enter (with Shift+Enter for new lines)
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (textarea.value.trim()) {
                submitResponse(textarea.value, questionIndex, totalQuestions);
            }
        }
    });
}

async function submitResponse(response, questionIndex, totalQuestions) {
    if (!response.trim()) {
        showError('Please provide a response before continuing.');
        return;
    }
    
    try {
        // Add user message
        addMessageToChat({
            type: 'user',
            content: response,
            timestamp: new Date()
        });
        
        // Show loading
        const submitBtn = document.querySelector('.primary-btn');
        showLoading(submitBtn, 'Processing...');
        
        const apiResponse = await fetch('/api/conversation/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: currentConversation.id,
                response: response
            })
        });
        
        const data = await apiResponse.json();
        
        if (apiResponse.ok) {
            currentConversation.step = data.currentStep;
            
            // Add agent response
            addMessageToChat({
                type: 'agent',
                content: data.message,
                timestamp: new Date()
            });
            
            if (data.currentStep === 'collecting_details') {
                // Continue with next question
                showQuestionInput(data.question, data.questionIndex, data.totalQuestions);
            } else if (data.currentStep === 'impact_timeline') {
                // Show impact and timeline questions
                showImpactTimelineQuestions(data.questions);
            }
            
        } else {
            throw new Error(data.error || 'Failed to submit response');
        }
    } catch (error) {
        console.error('Error submitting response:', error);
        showError('Failed to submit response. Please try again.');
    }
}

function showImpactTimelineQuestions(questions) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    
    const form = document.createElement('div');
    form.className = 'impact-timeline-form';
    
    const responses = {};
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'form-question';
        
        const label = document.createElement('label');
        label.innerHTML = `<strong>${question}</strong>`;
        
        const textarea = document.createElement('textarea');
        textarea.className = 'text-input';
        textarea.rows = 3;
        textarea.placeholder = 'Please provide details...';
        
        const fieldName = getFieldName(index);
        textarea.addEventListener('input', () => {
            responses[fieldName] = textarea.value;
        });
        
        questionDiv.appendChild(label);
        questionDiv.appendChild(textarea);
        form.appendChild(questionDiv);
    });
    
    const controls = document.createElement('div');
    controls.className = 'input-controls';
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'primary-btn';
    submitBtn.innerHTML = '<span class="btn-icon">✓</span> Complete Request Details';
    submitBtn.onclick = () => submitImpactTimeline(responses);
    
    controls.appendChild(submitBtn);
    
    inputContainer.appendChild(form);
    inputContainer.appendChild(controls);
    
    inputArea.innerHTML = '';
    inputArea.appendChild(inputContainer);
}

function getFieldName(index) {
    const fieldNames = ['impact', 'timeline', 'frequency', 'requirements', 'links'];
    return fieldNames[index] || `field_${index}`;
}

async function submitImpactTimeline(responses) {
    try {
        // Add user message summarizing responses
        const userSummary = Object.entries(responses)
            .filter(([key, value]) => value && value.trim())
            .map(([key, value]) => `**${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}`)
            .join('\n\n');
        
        addMessageToChat({
            type: 'user',
            content: userSummary || 'Details provided',
            timestamp: new Date()
        });
        
        // Show loading
        const submitBtn = document.querySelector('.primary-btn');
        showLoading(submitBtn, 'Analyzing request...');
        
        const response = await fetch('/api/conversation/impact-timeline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: currentConversation.id,
                responses: responses
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentConversation.step = data.currentStep;
            
            // Add agent response
            addMessageToChat({
                type: 'agent',
                content: data.message,
                timestamp: new Date()
            });
            
            // Show summary for confirmation
            showSummaryConfirmation(data.summary);
            
        } else {
            throw new Error(data.error || 'Failed to submit details');
        }
    } catch (error) {
        console.error('Error submitting impact/timeline:', error);
        showError('Failed to submit details. Please try again.');
    }
}

function showSummaryConfirmation(summary) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    
    const summaryCard = document.createElement('div');
    summaryCard.className = 'summary-card';
    
    summaryCard.innerHTML = `
        <h4>📋 Request Summary</h4>
        <div class="summary-item">
            <span class="summary-label">Type:</span>
            <span class="summary-value">${summary.requestType}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Priority:</span>
            <span class="summary-value">
                <span class="priority-badge priority-${summary.priority.toLowerCase()}">${summary.priority}</span>
            </span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Difficulty:</span>
            <span class="summary-value">
                <span class="difficulty-badge difficulty-${summary.difficulty.toLowerCase()}">${summary.difficulty}</span>
            </span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Summary:</span>
            <span class="summary-value">${summary.summary}</span>
        </div>
        ${summary.impact ? `
        <div class="summary-item">
            <span class="summary-label">Impact:</span>
            <span class="summary-value">${summary.impact}</span>
        </div>` : ''}
        ${summary.timeline ? `
        <div class="summary-item">
            <span class="summary-label">Timeline:</span>
            <span class="summary-value">${summary.timeline}</span>
        </div>` : ''}
        ${summary.links ? `
        <div class="summary-item">
            <span class="summary-label">References:</span>
            <span class="summary-value">${summary.links}</span>
        </div>` : ''}
    `;
    
    const controls = document.createElement('div');
    controls.className = 'input-controls';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'primary-btn';
    confirmBtn.innerHTML = '<span class="btn-icon">✅</span> Confirm & Create Ticket';
    confirmBtn.onclick = () => confirmRequest(true);
    
    const editBtn = document.createElement('button');
    editBtn.className = 'option-btn';
    editBtn.innerHTML = '<span class="btn-icon">✏️</span> Make Changes';
    editBtn.onclick = () => confirmRequest(false);
    
    controls.appendChild(editBtn);
    controls.appendChild(confirmBtn);
    
    inputContainer.appendChild(summaryCard);
    inputContainer.appendChild(controls);
    
    inputArea.innerHTML = '';
    inputArea.appendChild(inputContainer);
}

async function confirmRequest(confirmed) {
    try {
        if (confirmed) {
            // Add user confirmation message
            addMessageToChat({
                type: 'user',
                content: '✅ Confirmed - Please create the ticket',
                timestamp: new Date()
            });
        } else {
            // Add user edit request
            addMessageToChat({
                type: 'user',
                content: '✏️ I need to make some changes',
                timestamp: new Date()
            });
        }
        
        // Show loading
        const confirmBtn = document.querySelector('.primary-btn');
        showLoading(confirmBtn, confirmed ? 'Creating ticket...' : 'Processing...');
        
        const response = await fetch('/api/conversation/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: currentConversation.id,
                confirmed: confirmed
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Add agent response
            addMessageToChat({
                type: 'agent',
                content: data.message,
                timestamp: new Date()
            });
            
            if (confirmed && data.ticket) {
                // Show completion interface
                showCompletionInterface(data.ticket);
            } else {
                // Show restart options
                showRestartInterface();
            }
            
        } else {
            throw new Error(data.error || 'Failed to process confirmation');
        }
    } catch (error) {
        console.error('Error confirming request:', error);
        showError('Failed to process confirmation. Please try again.');
    }
}

function showCompletionInterface(ticket) {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container completion-interface';
    
    const successCard = document.createElement('div');
    successCard.className = 'summary-card success-card';
    successCard.innerHTML = `
        <h4>🎉 Ticket Created Successfully!</h4>
        <div class="summary-item">
            <span class="summary-label">Ticket Number:</span>
            <span class="summary-value"><strong>${ticket.ticketNumber}</strong></span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Status:</span>
            <span class="summary-value">${ticket.status}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Priority:</span>
            <span class="summary-value">
                <span class="priority-badge priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
            </span>
        </div>
    `;
    
    const controls = document.createElement('div');
    controls.className = 'input-controls';
    
    const newRequestBtn = document.createElement('button');
    newRequestBtn.className = 'primary-btn';
    newRequestBtn.innerHTML = '<span class="btn-icon">➕</span> New Request';
    newRequestBtn.onclick = () => resetConversation();
    
    const checkStatusBtn = document.createElement('button');
    checkStatusBtn.className = 'option-btn';
    checkStatusBtn.innerHTML = '<span class="btn-icon">🔍</span> Check Status';
    checkStatusBtn.onclick = () => checkTicketStatus(ticket.ticketNumber);
    
    controls.appendChild(checkStatusBtn);
    controls.appendChild(newRequestBtn);
    
    inputContainer.appendChild(successCard);
    inputContainer.appendChild(controls);
    
    inputArea.innerHTML = '';
    inputArea.appendChild(inputContainer);
}

function showRestartInterface() {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    
    const controls = document.createElement('div');
    controls.className = 'input-controls';
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'primary-btn';
    restartBtn.innerHTML = '<span class="btn-icon">🔄</span> Start Over';
    restartBtn.onclick = () => resetConversation();
    
    controls.appendChild(restartBtn);
    inputContainer.appendChild(controls);
    
    inputArea.innerHTML = '';
    inputArea.appendChild(inputContainer);
}

function addMessageToChat(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.type === 'agent' ? '🤖' : '👤';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMessageContent(message.content);
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(message.timestamp);
    
    content.appendChild(bubble);
    content.appendChild(time);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store in history
    conversationHistory.push(message);
}

function formatMessageContent(content) {
    // Convert markdown-like formatting to HTML
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function formatTime(timestamp) {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showLoading(button, text) {
    button.disabled = true;
    button.innerHTML = `<span class="loading">${text}</span>`;
}

function hideLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}

function showError(message) {
    addMessageToChat({
        type: 'agent',
        content: `❌ **Error:** ${message}`,
        timestamp: new Date()
    });
}

function resetConversation() {
    // Reset state
    currentConversation = {
        id: null,
        sessionId: null,
        step: 'initial',
        userId: 'user_001',
        userName: 'Jonathan Shang'
    };
    
    // Clear chat
    chatMessages.innerHTML = '';
    
    // Reset input area
    inputArea.innerHTML = `
        <div class="start-conversation">
            <button class="start-btn" id="startBtn">
                <span class="btn-icon">💬</span>
                Start New BI Request
            </button>
            <p class="help-text">Click to begin a guided conversation with the BI Triage Agent</p>
        </div>
    `;
    
    // Re-setup event listeners
    document.getElementById('startBtn').addEventListener('click', startConversation);
    
    // Show welcome message
    showWelcomeMessage();
}

// Modal functions
function checkTicketStatus(ticketNumber = null) {
    if (ticketNumber) {
        document.getElementById('ticketNumberInput').value = ticketNumber;
    }
    ticketModal.style.display = 'block';
}

function closeModal() {
    ticketModal.style.display = 'none';
    document.getElementById('ticketResult').style.display = 'none';
    document.getElementById('ticketNumberInput').value = '';
}

async function searchTicket() {
    const ticketNumber = document.getElementById('ticketNumberInput').value.trim();
    const resultDiv = document.getElementById('ticketResult');
    
    if (!ticketNumber) {
        resultDiv.className = 'error';
        resultDiv.innerHTML = 'Please enter a ticket number.';
        resultDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch(`/api/ticket/${ticketNumber}`);
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.className = 'success';
            resultDiv.innerHTML = `
                <h4>Ticket ${data.ticketNumber}</h4>
                <p><strong>Status:</strong> ${data.status}</p>
                <p><strong>Priority:</strong> <span class="priority-badge priority-${data.priority.toLowerCase()}">${data.priority}</span></p>
                <p><strong>Type:</strong> ${data.requestType}</p>
                <p><strong>Created:</strong> ${new Date(data.createdDate).toLocaleDateString()}</p>
                ${data.ticketOwner ? `<p><strong>Assigned to:</strong> ${data.ticketOwner}</p>` : ''}
                ${data.estimatedStartDate ? `<p><strong>Est. Start:</strong> ${new Date(data.estimatedStartDate).toLocaleDateString()}</p>` : ''}
                ${data.estimatedEndDate ? `<p><strong>Est. Completion:</strong> ${new Date(data.estimatedEndDate).toLocaleDateString()}</p>` : ''}
                <p><strong>Summary:</strong> ${data.summary}</p>
            `;
        } else {
            resultDiv.className = 'error';
            resultDiv.innerHTML = data.error || 'Ticket not found.';
        }
        
        resultDiv.style.display = 'block';
    } catch (error) {
        console.error('Error searching ticket:', error);
        resultDiv.className = 'error';
        resultDiv.innerHTML = 'Failed to search ticket. Please try again.';
        resultDiv.style.display = 'block';
    }
}

function viewAdminDashboard() {
    window.open('/admin', '_blank');
}
