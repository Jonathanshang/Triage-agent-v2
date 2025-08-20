const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./triage_agent.db');

// Initialize database tables
db.serialize(() => {
    // Tickets table
    db.run(`CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT UNIQUE,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        requester_name TEXT,
        requester_id TEXT,
        request_type TEXT,
        summary TEXT,
        impact TEXT,
        priority TEXT,
        difficulty TEXT,
        status TEXT DEFAULT 'New',
        ticket_owner TEXT,
        estimated_start_date DATE,
        estimated_end_date DATE,
        links TEXT,
        raw_conversation TEXT
    )`);

    // Conversations table for memory management
    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        conversation_state TEXT,
        current_step TEXT,
        collected_data TEXT
    )`);

    // Knowledge base for self-service suggestions
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        keywords TEXT,
        category TEXT,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Mock Gemini API functions
class MockGeminiAPI {
    static async summarizeRequest(conversationData) {
        // Mock summarization logic
        const { requestType, responses } = conversationData;
        
        const summary = `${requestType} request: ${responses.description || 'No description provided'}. 
        Impact: ${responses.impact || 'Not specified'}. 
        Timeline: ${responses.timeline || 'Not specified'}. 
        Requirements: ${responses.requirements || 'None specified'}.`;
        
        return summary.trim();
    }

    static async rateUrgencyAndDifficulty(conversationData) {
        // Mock rating logic based on keywords and context
        const { responses } = conversationData;
        const text = JSON.stringify(responses).toLowerCase();
        
        // Simple keyword-based urgency rating
        let priority = 'P2'; // Default
        if (text.includes('urgent') || text.includes('asap') || text.includes('critical')) {
            priority = 'P0';
        } else if (text.includes('soon') || text.includes('important')) {
            priority = 'P1';
        } else if (text.includes('whenever') || text.includes('no rush')) {
            priority = 'P3';
        }

        // Simple keyword-based difficulty rating
        let difficulty = 'Medium'; // Default
        if (text.includes('complex') || text.includes('integration') || text.includes('custom')) {
            difficulty = 'High';
        } else if (text.includes('simple') || text.includes('quick') || text.includes('standard')) {
            difficulty = 'Low';
        }

        return { priority, difficulty };
    }

    static async detectDuplicates(newRequest, existingTickets) {
        // Mock duplicate detection - simple keyword matching
        const newText = newRequest.summary.toLowerCase();
        const duplicates = existingTickets.filter(ticket => {
            const existingText = ticket.summary.toLowerCase();
            const commonWords = newText.split(' ').filter(word => 
                word.length > 3 && existingText.includes(word)
            );
            return commonWords.length >= 3; // Simple threshold
        });
        
        return duplicates;
    }

    static async suggestKnowledgeBase(requestData, knowledgeBase) {
        // Mock knowledge base suggestions
        const keywords = requestData.summary.toLowerCase().split(' ');
        const suggestions = knowledgeBase.filter(item => {
            const itemKeywords = item.keywords.toLowerCase().split(',');
            return keywords.some(keyword => 
                itemKeywords.some(itemKeyword => itemKeyword.trim().includes(keyword))
            );
        });
        
        return suggestions.slice(0, 3); // Return top 3 suggestions
    }
}

// Request type definitions
const REQUEST_TYPES = {
    'troubleshooting': {
        name: 'Troubleshooting',
        questions: [
            'What specific issue are you experiencing?',
            'What steps have you already tried?',
            'When did this issue first occur?',
            'How is this affecting your daily work?'
        ]
    },
    'reporting': {
        name: 'Reporting/Dashboard',
        questions: [
            'What type of report or dashboard do you need?',
            'What data sources should be included?',
            'Who will be using this report?',
            'How often will this report be needed?'
        ]
    },
    'automation': {
        name: 'Automation',
        questions: [
            'What process would you like to automate?',
            'How is this currently being done manually?',
            'What triggers should start this automation?',
            'What should happen when the automation completes?'
        ]
    },
    'access': {
        name: 'User Access',
        questions: [
            'What system or tool do you need access to?',
            'What level of access do you require?',
            'What is your role and why do you need this access?',
            'Is this temporary or permanent access?'
        ]
    },
    'tools': {
        name: 'Tool-related Changes',
        questions: [
            'What tool needs to be changed or configured?',
            'What specific changes are required?',
            'Who else might be affected by this change?',
            'Is this related to a new business requirement?'
        ]
    }
};

// API Routes

// Get conversation or create new one
app.post('/api/conversation/start', async (req, res) => {
    const { userId, userName } = req.body;
    const sessionId = uuidv4();
    const conversationId = uuidv4();

    const conversation = {
        id: conversationId,
        user_id: userId,
        session_id: sessionId,
        conversation_state: 'started',
        current_step: 'request_type_selection',
        collected_data: JSON.stringify({
            userName: userName,
            responses: {}
        })
    };

    db.run(`INSERT INTO conversations (id, user_id, session_id, conversation_state, current_step, collected_data)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [conversation.id, conversation.user_id, conversation.session_id, 
         conversation.conversation_state, conversation.current_step, conversation.collected_data],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                conversationId: conversationId,
                sessionId: sessionId,
                message: `Hi ${userName}! I'm your BI Triage Agent. I'm here to help you submit a well-structured BI request. Let's start by selecting the type of request you need help with:`,
                requestTypes: Object.keys(REQUEST_TYPES).map(key => ({
                    id: key,
                    name: REQUEST_TYPES[key].name
                })),
                currentStep: 'request_type_selection'
            });
        });
});

// Handle request type selection
app.post('/api/conversation/select-type', async (req, res) => {
    const { conversationId, requestType } = req.body;

    db.get(`SELECT * FROM conversations WHERE id = ?`, [conversationId], (err, conversation) => {
        if (err || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const collectedData = JSON.parse(conversation.collected_data);
        collectedData.requestType = requestType;
        collectedData.currentQuestionIndex = 0;

        const questions = REQUEST_TYPES[requestType].questions;
        
        db.run(`UPDATE conversations SET 
                current_step = 'collecting_details',
                collected_data = ?,
                updated_date = CURRENT_TIMESTAMP
                WHERE id = ?`,
            [JSON.stringify(collectedData), conversationId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    message: `Great! You've selected ${REQUEST_TYPES[requestType].name}. Let me ask you a few questions to better understand your needs.`,
                    question: questions[0],
                    questionIndex: 0,
                    totalQuestions: questions.length,
                    currentStep: 'collecting_details'
                });
            });
    });
});

// Handle question responses
app.post('/api/conversation/respond', async (req, res) => {
    const { conversationId, response } = req.body;

    db.get(`SELECT * FROM conversations WHERE id = ?`, [conversationId], async (err, conversation) => {
        if (err || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const collectedData = JSON.parse(conversation.collected_data);
        const { requestType, currentQuestionIndex } = collectedData;
        const questions = REQUEST_TYPES[requestType].questions;

        // Store the response
        if (!collectedData.responses) collectedData.responses = {};
        collectedData.responses[`question_${currentQuestionIndex}`] = response;

        // Check if we need to ask more questions
        if (currentQuestionIndex + 1 < questions.length) {
            collectedData.currentQuestionIndex = currentQuestionIndex + 1;
            
            db.run(`UPDATE conversations SET 
                    collected_data = ?,
                    updated_date = CURRENT_TIMESTAMP
                    WHERE id = ?`,
                [JSON.stringify(collectedData), conversationId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        message: "Thank you for that information!",
                        question: questions[currentQuestionIndex + 1],
                        questionIndex: currentQuestionIndex + 1,
                        totalQuestions: questions.length,
                        currentStep: 'collecting_details'
                    });
                });
        } else {
            // All questions answered, now ask about impact and timeline
            collectedData.currentStep = 'impact_timeline';
            
            db.run(`UPDATE conversations SET 
                    current_step = 'impact_timeline',
                    collected_data = ?,
                    updated_date = CURRENT_TIMESTAMP
                    WHERE id = ?`,
                [JSON.stringify(collectedData), conversationId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        message: "Perfect! Now I need to understand the business impact and timeline.",
                        questions: [
                            "What happens if this request isn't fulfilled? How does it affect your work or decision-making?",
                            "When do you need this completed?",
                            "Is this a one-time request or ongoing need?",
                            "Are there any specific requirements or constraints I should know about?",
                            "Please provide any relevant links, reports, or snapshots that can serve as reference."
                        ],
                        currentStep: 'impact_timeline'
                    });
                });
        }
    });
});

// Handle impact and timeline responses
app.post('/api/conversation/impact-timeline', async (req, res) => {
    const { conversationId, responses } = req.body;

    db.get(`SELECT * FROM conversations WHERE id = ?`, [conversationId], async (err, conversation) => {
        if (err || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const collectedData = JSON.parse(conversation.collected_data);
        
        // Store impact and timeline responses
        collectedData.responses.impact = responses.impact;
        collectedData.responses.timeline = responses.timeline;
        collectedData.responses.frequency = responses.frequency;
        collectedData.responses.requirements = responses.requirements;
        collectedData.responses.links = responses.links;

        // Generate summary using mock Gemini
        const summary = await MockGeminiAPI.summarizeRequest(collectedData);
        const { priority, difficulty } = await MockGeminiAPI.rateUrgencyAndDifficulty(collectedData);

        collectedData.summary = summary;
        collectedData.priority = priority;
        collectedData.difficulty = difficulty;
        collectedData.currentStep = 'confirmation';

        db.run(`UPDATE conversations SET 
                current_step = 'confirmation',
                collected_data = ?,
                updated_date = CURRENT_TIMESTAMP
                WHERE id = ?`,
            [JSON.stringify(collectedData), conversationId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    message: "Thank you! I've analyzed your request and prepared a summary. Please review and confirm:",
                    summary: {
                        requestType: REQUEST_TYPES[collectedData.requestType].name,
                        summary: summary,
                        priority: priority,
                        difficulty: difficulty,
                        impact: responses.impact,
                        timeline: responses.timeline,
                        frequency: responses.frequency,
                        requirements: responses.requirements,
                        links: responses.links
                    },
                    currentStep: 'confirmation'
                });
            });
    });
});

// Confirm and create ticket
app.post('/api/conversation/confirm', async (req, res) => {
    const { conversationId, confirmed } = req.body;

    if (!confirmed) {
        return res.json({
            message: "No problem! You can restart the conversation or make changes. What would you like to do?",
            currentStep: 'restart_option'
        });
    }

    db.get(`SELECT * FROM conversations WHERE id = ?`, [conversationId], async (err, conversation) => {
        if (err || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const collectedData = JSON.parse(conversation.collected_data);
        
        // Generate ticket number
        const ticketNumber = `BI-${Date.now().toString().slice(-6)}`;
        const ticketId = uuidv4();

        // Check for duplicates
        db.all(`SELECT * FROM tickets WHERE status != 'Closed'`, async (err, existingTickets) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const duplicates = await MockGeminiAPI.detectDuplicates(
                { summary: collectedData.summary }, 
                existingTickets
            );

            // Create ticket
            const ticket = {
                id: ticketId,
                ticket_number: ticketNumber,
                requester_name: collectedData.userName,
                requester_id: conversation.user_id,
                request_type: REQUEST_TYPES[collectedData.requestType].name,
                summary: collectedData.summary,
                impact: collectedData.responses.impact,
                priority: collectedData.priority,
                difficulty: collectedData.difficulty,
                status: 'New',
                links: collectedData.responses.links || '',
                raw_conversation: JSON.stringify(collectedData)
            };

            db.run(`INSERT INTO tickets (
                id, ticket_number, requester_name, requester_id, request_type,
                summary, impact, priority, difficulty, status, links, raw_conversation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [ticket.id, ticket.ticket_number, ticket.requester_name, ticket.requester_id,
                 ticket.request_type, ticket.summary, ticket.impact, ticket.priority,
                 ticket.difficulty, ticket.status, ticket.links, ticket.raw_conversation],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Update conversation status
                    db.run(`UPDATE conversations SET 
                            current_step = 'completed',
                            updated_date = CURRENT_TIMESTAMP
                            WHERE id = ?`,
                        [conversationId],
                        function(err) {
                            if (err) {
                                console.error('Error updating conversation:', err);
                            }

                            let responseMessage = `Perfect! Your ticket has been created successfully.\n\n` +
                                `**Ticket Number:** ${ticketNumber}\n` +
                                `**Status:** New\n` +
                                `**Priority:** ${ticket.priority}\n` +
                                `**Estimated Difficulty:** ${ticket.difficulty}\n\n` +
                                `Your request has been submitted to the BI team. You can check the status anytime by asking me about ticket ${ticketNumber}.`;

                            if (duplicates.length > 0) {
                                responseMessage += `\n\n⚠️ **Note:** I found ${duplicates.length} similar ticket(s) that might be related to your request. The BI team will review these for potential consolidation.`;
                            }

                            res.json({
                                message: responseMessage,
                                ticket: {
                                    ticketNumber: ticketNumber,
                                    status: ticket.status,
                                    priority: ticket.priority,
                                    difficulty: ticket.difficulty
                                },
                                duplicates: duplicates.length,
                                currentStep: 'completed'
                            });
                        });
                });
        });
    });
});

// Get ticket status
app.get('/api/ticket/:ticketNumber', (req, res) => {
    const { ticketNumber } = req.params;

    db.get(`SELECT * FROM tickets WHERE ticket_number = ?`, [ticketNumber], (err, ticket) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            ticketNumber: ticket.ticket_number,
            status: ticket.status,
            priority: ticket.priority,
            difficulty: ticket.difficulty,
            requestType: ticket.request_type,
            summary: ticket.summary,
            createdDate: ticket.created_date,
            estimatedStartDate: ticket.estimated_start_date,
            estimatedEndDate: ticket.estimated_end_date,
            ticketOwner: ticket.ticket_owner
        });
    });
});

// Admin routes for managing tickets
app.get('/api/admin/tickets', (req, res) => {
    db.all(`SELECT * FROM tickets ORDER BY created_date DESC`, (err, tickets) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(tickets);
    });
});

app.put('/api/admin/ticket/:id', (req, res) => {
    const { id } = req.params;
    const { status, ticket_owner, estimated_start_date, estimated_end_date } = req.body;

    db.run(`UPDATE tickets SET 
            status = COALESCE(?, status),
            ticket_owner = COALESCE(?, ticket_owner),
            estimated_start_date = COALESCE(?, estimated_start_date),
            estimated_end_date = COALESCE(?, estimated_end_date)
            WHERE id = ?`,
        [status, ticket_owner, estimated_start_date, estimated_end_date, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            res.json({ message: 'Ticket updated successfully' });
        });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve the mock Lark app
app.get('/lark-mock.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lark-mock.html'));
});

// Serve the mock Lark Base
app.get('/lark-base', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lark-base.html'));
});

// Serve the debug test page
app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-debug.html'));
});

// Serve the simple Lark test page
app.get('/simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lark-simple.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Lark Triage Agent Mock Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});
