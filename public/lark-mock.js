// Mock Lark App JavaScript for BI Triage Agent Testing

let currentConversation = {
    id: null,
    sessionId: null,
    step: 'initial',
    userId: 'user_001',
    userName: 'Jonathan Shang'
};

let isInConversation = false;

// Initialize the mock Lark app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showInitialBotMessage();
});

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Show mention suggestions when typing @
    messageInput.addEventListener('input', handleMentionInput);
}

function showInitialBotMessage() {
    // This is already in the HTML, but we can add dynamic content here if needed
}

function handleMentionInput() {
    const input = document.getElementById('messageInput');
    const text = input.textContent;
    const suggestions = document.getElementById('mentionSuggestions');
    
    if (text.includes('@') && !text.includes('@BI Agent')) {
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

function selectMention(mentionText) {
    const input = document.getElementById('messageInput');
    input.textContent = `@${mentionText} `;
    document.getElementById('mentionSuggestions').style.display = 'none';
    input.focus();
    
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.textContent.trim();
    
    if (!message) return;
    
    console.log('Sending message:', message);
    console.log('Current conversation state:', isInConversation);
    
    // Add user message to chat
    addMessageToChat({
        type: 'user',
        author: 'Jonathan Shang',
        content: message,
        timestamp: new Date()
    });
    
    // Clear input
    input.textContent = '';
    
    // Check if this is a bot mention to start BI request
    if (message.includes('@BI Agent')) {
        console.log('Bot mention detected, starting BI request');
        // Reset conversation state and start fresh
        isInConversation = false;
        
        // Prevent multiple rapid clicks
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        setTimeout(() => { sendBtn.disabled = false; }, 3000);
        
        await startBIRequest();
    } else if (isInConversation) {
        console.log('In conversation, handling message');
        // Handle ongoing conversation
        await handleConversationMessage(message);
    } else {
        console.log('Regular message, simulating team response');
        // Regular chat message - simulate other team members responding
        setTimeout(() => {
            simulateTeamResponse(message);
        }, 1000 + Math.random() * 2000);
    }
}

async function handleConversationMessage(message) {
    // This function handles messages during an ongoing conversation
    // For now, just simulate a response
    console.log('Handling conversation message:', message);
    addBotMessage('I received your message. Please use the buttons or forms provided to continue the conversation.');
}

async function startBIRequest() {
    console.log('Starting BI request...');
    
    if (isInConversation) {
        console.log('Already in conversation, ignoring request');
        return;
    }
    
    isInConversation = true;
    
    try {
        showBotTyping();
        
        console.log('Sending request to /api/conversation/start');
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
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            currentConversation.id = data.conversationId;
            currentConversation.sessionId = data.sessionId;
            currentConversation.step = data.currentStep;
            
            hideBotTyping();
            
            // Add bot response with request type selection
            console.log('Adding bot message with card...');
            
            // Use simple approach that works
            addBotMessage(data.message);
            
            // Add request type buttons in a simple way
            const messagesContainer = document.getElementById('larkMessages');
            const buttonMessage = document.createElement('div');
            buttonMessage.className = 'message bot-message';
            
            buttonMessage.innerHTML = `
                <div class="message-avatar bot-avatar">
                    <span>🤖</span>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">BI Agent</span>
                        <span class="message-time">${formatTime(new Date())}</span>
                        <span class="bot-badge">BOT</span>
                    </div>
                    <div class="message-body">
                        <div class="lark-card">
                            <div class="card-content">
                                <p><strong>Please select your request type:</strong></p>
                                <div class="request-type-grid">
                                    ${data.requestTypes.map(type => `
                                        <div class="request-type-card" onclick="selectRequestType('${type.id}')">
                                            <span class="request-type-icon">${getTypeIcon(type.id)}</span>
                                            <span class="request-type-name">${type.name}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            messagesContainer.appendChild(buttonMessage);
            scrollToBottom();
            console.log('Request type buttons added successfully');
            
        } else {
            throw new Error(data.error || 'Failed to start conversation');
        }
    } catch (error) {
        console.error('Error starting BI request:', error);
        hideBotTyping();
        addBotMessage('Sorry, I encountered an error starting your BI request. Please try again.');
        isInConversation = false;
    }
}

async function selectRequestType(requestType) {
    try {
        showBotTyping();
        
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
            hideBotTyping();
            currentConversation.step = data.currentStep;
            
            addBotMessageWithCard({
                title: 'Request Details',
                content: `${data.message}\n\n**Question ${data.questionIndex + 1} of ${data.totalQuestions}:**\n${data.question}`,
                showTextInput: true,
                inputPlaceholder: 'Please provide as much detail as possible...',
                submitAction: (response) => submitQuestionResponse(response, data.questionIndex, data.totalQuestions)
            });
            
        } else {
            throw new Error(data.error || 'Failed to select request type');
        }
    } catch (error) {
        console.error('Error selecting request type:', error);
        hideBotTyping();
        addBotMessage('Sorry, I encountered an error. Please try again.');
    }
}

async function submitQuestionResponse(response, questionIndex, totalQuestions) {
    try {
        showBotTyping();
        
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
            hideBotTyping();
            currentConversation.step = data.currentStep;
            
            if (data.currentStep === 'collecting_details') {
                // Continue with next question
                addBotMessageWithCard({
                    title: 'Next Question',
                    content: `${data.message}\n\n**Question ${data.questionIndex + 1} of ${data.totalQuestions}:**\n${data.question}`,
                    showTextInput: true,
                    inputPlaceholder: 'Please provide as much detail as possible...',
                    submitAction: (response) => submitQuestionResponse(response, data.questionIndex, data.totalQuestions)
                });
            } else if (data.currentStep === 'impact_timeline') {
                // Show impact and timeline form
                showImpactTimelineForm(data.questions);
            } else if (data.currentStep === 'confirmation') {
                // For troubleshooting - go straight to confirmation
                showSummaryConfirmation(data.summary);
            }
            
        } else {
            throw new Error(data.error || 'Failed to submit response');
        }
    } catch (error) {
        console.error('Error submitting response:', error);
        hideBotTyping();
        addBotMessage('Sorry, I encountered an error. Please try again.');
    }
}

function showImpactTimelineForm(questions) {
    const formFields = questions.map((question, index) => ({
        label: question,
        id: `field_${index}`,
        placeholder: 'Please provide details...'
    }));
    
    addBotMessageWithCard({
        title: 'Impact & Timeline Assessment',
        content: 'Now I need to understand the business impact and timeline for your request.',
        showForm: true,
        formFields: formFields,
        submitAction: (formData) => submitImpactTimeline(formData)
    });
}

async function submitImpactTimeline(formData) {
    try {
        showBotTyping();
        
        const responses = {
            impact: formData.field_0 || '',
            timeline: formData.field_1 || '',
            frequency: formData.field_2 || '',
            requirements: formData.field_3 || '',
            links: formData.field_4 || ''
        };
        
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
            hideBotTyping();
            currentConversation.step = data.currentStep;
            
            // Show summary for confirmation
            showSummaryConfirmation(data.summary);
            
        } else {
            throw new Error(data.error || 'Failed to submit details');
        }
    } catch (error) {
        console.error('Error submitting impact/timeline:', error);
        hideBotTyping();
        addBotMessage('Sorry, I encountered an error. Please try again.');
    }
}

function showSummaryConfirmation(summary) {
    const summaryContent = `
**Request Type:** ${summary.requestType}
**Priority:** ${summary.priority}
**Difficulty:** ${summary.difficulty}
**Summary:** ${summary.summary}
${summary.impact ? `**Impact:** ${summary.impact}` : ''}
${summary.timeline ? `**Timeline:** ${summary.timeline}` : ''}
${summary.links ? `**References:** ${summary.links}` : ''}
    `.trim();
    
    addBotMessageWithCard({
        title: '📋 Request Summary',
        content: 'Please review your request summary and confirm to create the ticket:',
        summaryContent: summaryContent,
        actions: [
            {
                id: 'confirm',
                text: '✅ Confirm & Create Ticket',
                primary: true,
                action: () => confirmRequest(true)
            },
            {
                id: 'edit',
                text: '✏️ Make Changes',
                action: () => confirmRequest(false)
            }
        ]
    });
}

async function confirmRequest(confirmed) {
    try {
        showBotTyping();
        
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
            hideBotTyping();
            
            if (confirmed && data.ticket) {
                // Show success message
                addBotMessageWithCard({
                    title: '🎉 Ticket Created Successfully!',
                    content: `Your BI request has been submitted successfully.\n\n**Ticket Number:** ${data.ticket.ticketNumber}\n**Status:** ${data.ticket.status}\n**Priority:** ${data.ticket.priority}`,
                    actions: [
                        {
                            id: 'view_tickets',
                            text: '📊 View All Tickets',
                            primary: true,
                            action: () => window.open('/lark-base', '_blank')
                        }
                    ]
                });
                
                // Show notification
                showNotification(`Ticket ${data.ticket.ticketNumber} created successfully!`);
                
            } else {
                addBotMessage(data.message);
                resetConversation();
            }
            
        } else {
            throw new Error(data.error || 'Failed to process confirmation');
        }
    } catch (error) {
        console.error('Error confirming request:', error);
        hideBotTyping();
        addBotMessage('Sorry, I encountered an error. Please try again.');
    }
}

// UI Helper Functions
function addMessageToChat(message) {
    const messagesContainer = document.getElementById('larkMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type === 'bot' ? 'bot-message' : 'user-message'}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    if (message.type === 'bot') {
        avatarDiv.className += ' bot-avatar';
        avatarDiv.innerHTML = '<span>🤖</span>';
    } else {
        avatarDiv.innerHTML = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%234f46e5'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='white' font-family='Arial' font-size='12' font-weight='bold'%3EJS%3C/text%3E%3C/svg%3E" alt="${message.author}" />`;
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.innerHTML = `
        <span class="message-author">${message.author || (message.type === 'bot' ? 'BI Agent' : 'You')}</span>
        <span class="message-time">${formatTime(message.timestamp)}</span>
        ${message.type === 'bot' ? '<span class="bot-badge">BOT</span>' : ''}
    `;
    
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'message-body';
    bodyDiv.innerHTML = formatMessageContent(message.content);
    
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(bodyDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(content) {
    addMessageToChat({
        type: 'bot',
        content: content,
        timestamp: new Date()
    });
}

function addBotMessageWithCard(cardData) {
    console.log('addBotMessageWithCard called with:', cardData);
    
    const messagesContainer = document.getElementById('larkMessages');
    if (!messagesContainer) {
        console.error('Messages container not found!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar bot-avatar';
    avatarDiv.innerHTML = '<span>🤖</span>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.innerHTML = `
        <span class="message-author">BI Agent</span>
        <span class="message-time">${formatTime(new Date())}</span>
        <span class="bot-badge">BOT</span>
    `;
    
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'message-body';
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'lark-card';
    
    // Card header
    if (cardData.title) {
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `
            <span class="card-icon">🤖</span>
            <span class="card-title">${cardData.title}</span>
        `;
        cardDiv.appendChild(cardHeader);
    }
    
    // Card content
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.innerHTML = formatMessageContent(cardData.content);
    
    if (cardData.summaryContent) {
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = 'background: #f8f9fa; padding: 12px; border-radius: 6px; margin: 12px 0; white-space: pre-line;';
        summaryDiv.textContent = cardData.summaryContent;
        cardContent.appendChild(summaryDiv);
    }
    
    cardDiv.appendChild(cardContent);
    
    // Text input
    if (cardData.showTextInput) {
        const inputDiv = document.createElement('div');
        inputDiv.style.cssText = 'margin: 12px 0;';
        
        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #e8e8e8; border-radius: 6px; resize: vertical; min-height: 60px;';
        textarea.placeholder = cardData.inputPlaceholder || 'Type your response...';
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'lark-btn primary';
        submitBtn.style.cssText = 'margin-top: 8px;';
        submitBtn.innerHTML = '<span class="btn-icon">➤</span> Submit';
        submitBtn.onclick = () => {
            if (textarea.value.trim()) {
                cardData.submitAction(textarea.value.trim());
                // Disable the form after submission
                textarea.disabled = true;
                submitBtn.disabled = true;
            }
        };
        
        inputDiv.appendChild(textarea);
        inputDiv.appendChild(submitBtn);
        cardDiv.appendChild(inputDiv);
    }
    
    // Form fields
    if (cardData.showForm && cardData.formFields) {
        const formDiv = document.createElement('div');
        formDiv.style.cssText = 'margin: 12px 0;';
        
        const formData = {};
        
        cardData.formFields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.style.cssText = 'margin-bottom: 12px;';
            
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;';
            label.textContent = field.label;
            
            const textarea = document.createElement('textarea');
            textarea.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #e8e8e8; border-radius: 4px; resize: vertical; min-height: 40px; font-size: 13px;';
            textarea.placeholder = field.placeholder || '';
            textarea.addEventListener('input', () => {
                formData[field.id] = textarea.value;
            });
            
            fieldDiv.appendChild(label);
            fieldDiv.appendChild(textarea);
            formDiv.appendChild(fieldDiv);
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'lark-btn primary';
        submitBtn.innerHTML = '<span class="btn-icon">✓</span> Submit Details';
        submitBtn.onclick = () => {
            cardData.submitAction(formData);
            // Disable the form after submission
            formDiv.querySelectorAll('textarea').forEach(ta => ta.disabled = true);
            submitBtn.disabled = true;
        };
        
        formDiv.appendChild(submitBtn);
        cardDiv.appendChild(formDiv);
    }
    
    // Action buttons
    if (cardData.actions) {
        console.log('Adding action buttons:', cardData.actions.length);
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'card-actions';
        
        cardData.actions.forEach((action, index) => {
            console.log(`Creating button ${index}:`, action.text);
            const btn = document.createElement('button');
            btn.className = `lark-btn ${action.primary ? 'primary' : 'secondary'}`;
            btn.innerHTML = action.text;
            btn.onclick = () => {
                console.log(`Button clicked: ${action.text}`);
                try {
                    action.action();
                    // Disable all buttons after one is clicked
                    actionsDiv.querySelectorAll('button').forEach(b => b.disabled = true);
                } catch (error) {
                    console.error('Error executing button action:', error);
                }
            };
            actionsDiv.appendChild(btn);
        });
        
        cardDiv.appendChild(actionsDiv);
        console.log('Action buttons added successfully');
    }
    
    bodyDiv.appendChild(cardDiv);
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(bodyDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    console.log('Bot message card added to DOM successfully');
    scrollToBottom();
}

function showBotTyping() {
    const messagesContainer = document.getElementById('larkMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-avatar bot-avatar">
            <span>🤖</span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">BI Agent</span>
                <span class="bot-badge">BOT</span>
            </div>
            <div class="message-body">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function hideBotTyping() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function simulateTeamResponse(userMessage) {
    const responses = [
        { author: 'Sarah Miller', message: 'Thanks for sharing that! 👍' },
        { author: 'Mike Chen', message: 'Looks good to me.' },
        { author: 'Sarah Miller', message: 'I agree with that approach.' },
        { author: 'Mike Chen', message: 'Let me know if you need any help with that.' }
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    addMessageToChat({
        type: 'user',
        author: randomResponse.author,
        content: randomResponse.message,
        timestamp: new Date()
    });
}

function resetConversation() {
    isInConversation = false;
    currentConversation = {
        id: null,
        sessionId: null,
        step: 'initial',
        userId: 'user_001',
        userName: 'Jonathan Shang'
    };
    
    // Add a new bot message to restart the conversation
    setTimeout(() => {
        addBotMessage(`👋 Ready for a new BI request! 

I'm here to help you submit another well-structured Business Intelligence request. 

**What I can help you with:**
• 🔧 Troubleshooting - Fix issues with existing reports or dashboards
• 📊 Reporting/Dashboard - Create new reports or modify existing ones  
• ⚡ Automation - Set up automated processes or alerts
• 🔐 User Access - Manage permissions and access rights
• 🛠️ Tool Changes - Configuration changes or new tool requests

Type "@BI Agent" followed by your request to get started!`);
    }, 500);
}

function showNotification(message) {
    const toast = document.getElementById('notificationToast');
    const messageSpan = toast.querySelector('.toast-message');
    messageSpan.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// Quick action functions
function startBIRequestFromButton() {
    const input = document.getElementById('messageInput');
    input.textContent = '@BI Agent I need help with a BI request';
    sendMessage();
}

function showHelp() {
    addBotMessage(`Here's how to use the BI Triage Agent:

1. **Start a request**: Mention me with @BI Agent followed by your request
2. **Follow the conversation**: I'll ask you specific questions to understand your needs
3. **Provide details**: The more information you give, the better I can help
4. **Review and confirm**: I'll summarize your request before creating a ticket

**Request Types I can help with:**
• 🔧 Troubleshooting - Fix issues with existing reports or dashboards
• 📊 Reporting/Dashboard - Create new reports or modify existing ones
• ⚡ Automation - Set up automated processes or alerts
• 🔐 User Access - Manage permissions and access rights
• 🛠️ Tool Changes - Configuration changes or new tool requests

Just mention me anytime you need help!`);
}

// Utility functions
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

function formatMessageContent(content) {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function formatTime(timestamp) {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('larkMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function closeRightPanel() {
    document.getElementById('rightPanel').style.display = 'none';
}
