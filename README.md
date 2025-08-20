# Lark BI Triage Agent - Mock Implementation

A conversational AI agent designed to streamline Business Intelligence request intake through guided conversations. This mock implementation demonstrates the core functionality before integration with Lark's platform.

## 🚀 Features

### Core Functionality
- **Conversational Interface**: Guided conversation flow for BI request submission
- **Request Type Classification**: Support for 5 main request types:
  - 🔧 Troubleshooting
  - 📊 Reporting/Dashboard
  - ⚡ Automation
  - 🔐 User Access
  - 🛠️ Tool-related Changes

### Intelligence & Automation
- **Mock AI Integration**: Simulated Google Gemini API for:
  - Request summarization
  - Automatic priority rating (P0-P3)
  - Difficulty assessment (Low/Medium/High)
  - Duplicate detection
- **Memory Management**: Conversation state persistence
- **Smart Questioning**: Dynamic follow-up questions based on request type

### Data Management
- **SQLite Database**: Local storage for tickets and conversations
- **Structured Ticket Creation**: All PRD-specified fields captured
- **Real-time Status Updates**: Query ticket status anytime
- **Admin Dashboard**: Full ticket management interface

## 📋 PRD Implementation Status

### ✅ Completed Features
- **F-1**: Conversational Interface ✓
- **F-2**: Guided Question Flow ✓
- **F-3**: Contextual Questioning ✓
- **F-4**: LLM-Powered Summarization (Mock) ✓
- **F-5**: Request Confirmation ✓
- **F-6**: Memory Management ✓
- **F-7**: Automated Urgency & Difficulty Rating ✓
- **F-8**: Real-Time Status Updates ✓
- **F-9**: Self-Service Suggestions (Basic) ✓
- **F-10**: Duplicate Detection ✓
- **F-12**: Database Integration (SQLite instead of Lark Base) ✓

### 🔄 Partially Implemented
- **F-11**: Knowledge Base Integration (Framework ready)

## 🛠️ Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite3 for local development
- **Frontend**: Vanilla JavaScript with modern CSS
- **Mock AI**: Simulated Google Gemini API responses
- **Styling**: Custom CSS with Lark-inspired design

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Start

1. **Clone and Install**
   ```bash
   cd "Triage Agent_v2"
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

3. **Access the Application**
   - **Main Chat Interface**: http://localhost:3000
   - **Admin Dashboard**: http://localhost:3000/admin

## 🎯 Usage Guide

### For End Users (Requestors)

1. **Start a Conversation**
   - Click "Start New BI Request"
   - Select your request type from the menu

2. **Answer Guided Questions**
   - Provide detailed responses to type-specific questions
   - Answer impact and timeline questions

3. **Review & Confirm**
   - Review the AI-generated summary
   - Confirm to create your ticket
   - Note your ticket number for future reference

4. **Check Status**
   - Use "Check Ticket Status" in the sidebar
   - Enter your ticket number to get updates

### For Administrators (BI Team)

1. **Access Admin Dashboard**
   - Navigate to http://localhost:3000/admin
   - View ticket statistics and overview

2. **Manage Tickets**
   - View all submitted tickets
   - Edit ticket status, owner, and dates
   - Track progress and priorities

## 📊 Database Schema

### Tickets Table
```sql
- id (TEXT PRIMARY KEY)
- ticket_number (TEXT UNIQUE)
- created_date (DATETIME)
- requester_name (TEXT)
- requester_id (TEXT)
- request_type (TEXT)
- summary (TEXT)
- impact (TEXT)
- priority (TEXT) -- P0, P1, P2, P3
- difficulty (TEXT) -- Low, Medium, High
- status (TEXT) -- New, In Progress, On Hold, Completed, Closed
- ticket_owner (TEXT)
- estimated_start_date (DATE)
- estimated_end_date (DATE)
- links (TEXT)
- raw_conversation (TEXT)
```

### Conversations Table
```sql
- id (TEXT PRIMARY KEY)
- user_id (TEXT)
- session_id (TEXT)
- created_date (DATETIME)
- updated_date (DATETIME)
- conversation_state (TEXT)
- current_step (TEXT)
- collected_data (TEXT)
```

## 🔌 API Endpoints

### Conversation Management
- `POST /api/conversation/start` - Start new conversation
- `POST /api/conversation/select-type` - Select request type
- `POST /api/conversation/respond` - Submit question response
- `POST /api/conversation/impact-timeline` - Submit impact/timeline details
- `POST /api/conversation/confirm` - Confirm and create ticket

### Ticket Management
- `GET /api/ticket/:ticketNumber` - Get ticket status
- `GET /api/admin/tickets` - Get all tickets (admin)
- `PUT /api/admin/ticket/:id` - Update ticket (admin)

## 🎨 UI/UX Features

### Modern Design
- Lark-inspired color scheme and components
- Responsive design for mobile and desktop
- Smooth animations and transitions
- Loading states and error handling

### Conversational Flow
- Chat-like message bubbles
- Progress indicators for multi-step processes
- Clear action buttons and confirmations
- Real-time typing indicators

### Admin Interface
- Dashboard with key metrics
- Sortable and filterable ticket table
- Inline editing capabilities
- Status and priority badges

## 🔄 Next Steps for Lark Integration

### Phase 1: Lark Platform Integration
1. Replace mock UI with Lark Bot Framework
2. Implement Lark Open API authentication
3. Replace SQLite with Lark Base integration
4. Add Lark notification system

### Phase 2: AI Enhancement
1. Integrate real Google Gemini API
2. Implement advanced duplicate detection
3. Add knowledge base suggestions
4. Enhance conversation memory

### Phase 3: Advanced Features
1. Multi-language support
2. Advanced analytics and reporting
3. Integration with BI tools
4. Automated workflow triggers

## 🐛 Known Limitations (Mock Version)

- **Mock AI**: Uses simple keyword-based logic instead of real LLM
- **Single User**: No multi-user authentication
- **Local Storage**: SQLite instead of cloud database
- **No Real Notifications**: Console logging instead of Lark notifications
- **Basic Duplicate Detection**: Simple text matching

## 📝 Development Notes

### Code Structure
```
├── server.js              # Main Express server
├── public/
│   ├── index.html         # Main chat interface
│   ├── admin.html         # Admin dashboard
│   ├── app.js            # Frontend chat logic
│   ├── admin.js          # Admin dashboard logic
│   └── styles.css        # Shared styles
├── package.json          # Dependencies
└── triage_agent.db       # SQLite database (auto-created)
```

### Key Classes
- `MockGeminiAPI`: Simulates AI functionality
- Request type definitions with specific questions
- Conversation state management
- Ticket lifecycle management

## 🤝 Contributing

This is a mock implementation for demonstration purposes. For production deployment:

1. Replace mock components with real integrations
2. Add proper error handling and logging
3. Implement security measures
4. Add comprehensive testing
5. Set up CI/CD pipeline

## 📄 License

MIT License - See LICENSE file for details

---

**Note**: This is a mock implementation designed to demonstrate the BI Triage Agent concept before full Lark platform integration. The actual production version will require additional security, scalability, and integration considerations.
