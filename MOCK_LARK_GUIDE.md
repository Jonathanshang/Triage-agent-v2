# 🚀 Mock Lark Interface - Testing Guide

## 🎯 Overview

I've created a simplified mock Lark interface that focuses on testing the BI Triage Agent functionality and displaying the data table that mocks Lark Base. This provides a realistic testing environment before actual Lark integration.

## 🌐 Access Points

With your server running (`npm start`), you can access:

- **Mock Lark Chat**: http://localhost:3000/lark-mock.html
- **Mock Lark Base**: http://localhost:3000/lark-base
- **Original Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin

## 📱 Mock Lark Chat Interface

### **Features**
- **Authentic Lark UI**: Sidebar with chats, groups, and bots
- **Group Chat Simulation**: "BI Team" group with team members
- **Bot Integration**: BI Agent appears as a bot in the sidebar
- **@Mention Functionality**: Type `@BI Agent` to trigger the triage flow
- **Interactive Cards**: Lark-style message cards with buttons and forms
- **Team Member Simulation**: Other team members respond to regular messages

### **How to Test**

1. **Start a BI Request**
   - Type `@BI Agent I need help with a dashboard` in the message input
   - Or click the "Start BI Request" button in the welcome card
   - The bot will respond with request type options

2. **Follow the Conversation**
   - Click on request type buttons (Troubleshooting, Reporting, etc.)
   - Answer questions in the text areas provided
   - Fill out the impact and timeline form
   - Review and confirm the summary

3. **Complete the Flow**
   - Get a ticket number upon completion
   - Click "View All Tickets" to see the Lark Base mock
   - Start new requests or check existing ticket status

4. **Test Team Interaction**
   - Send regular messages (without @BI Agent)
   - See simulated responses from team members (Sarah Miller, Mike Chen)

## 📊 Mock Lark Base Interface

### **Features**
- **Authentic Lark Base UI**: Clean, spreadsheet-like interface
- **Real-time Data**: Shows actual tickets created through the chat
- **Statistics Dashboard**: Key metrics and counts
- **Filtering**: Filter by status, priority, and request type
- **Auto-refresh**: Updates every 30 seconds
- **Responsive Design**: Works on desktop and mobile

### **Data Table Columns**
- Ticket Number
- Created Date
- Requester Name
- Request Type
- Summary
- Impact
- Priority (P0-P3)
- Difficulty (Low/Medium/High)
- Status
- Assigned Owner
- Estimated Start/End Dates
- Reference Links

## 🎮 Complete Testing Workflow

### **Scenario 1: New Dashboard Request**
1. Go to http://localhost:3000/lark-mock.html
2. Type: `@BI Agent I need a new sales dashboard`
3. Select "📊 Reporting/Dashboard"
4. Answer questions about data sources, users, frequency
5. Provide business impact and timeline
6. Confirm the summary
7. Get ticket number (e.g., BI-123456)
8. Click "View All Tickets" to see it in Lark Base

### **Scenario 2: Troubleshooting Request**
1. Type: `@BI Agent My dashboard is broken`
2. Select "🔧 Troubleshooting"
3. Describe the issue and steps tried
4. Explain the impact on daily work
5. Set urgent timeline
6. See P0/P1 priority assignment
7. View in admin dashboard for management

### **Scenario 3: Team Collaboration**
1. Send regular message: "Great work on the Q4 reports!"
2. See team member responses
3. Mix regular chat with BI requests
4. Demonstrate natural conversation flow

## 🔧 Key Differences from Production

### **Simplified for Testing**
- **Focus on Core Flow**: Streamlined to test triage agent functionality
- **Mock Team Members**: Simulated responses instead of real users
- **Local Data**: SQLite database instead of cloud Lark Base
- **Single Group**: One "BI Team" group instead of multiple workspaces

### **What's Realistic**
- **UI/UX**: Authentic Lark look and feel
- **Conversation Flow**: Exact same as production will be
- **Data Structure**: Same fields and format as real Lark Base
- **Bot Behavior**: Identical to how the real integration will work

## 🎯 Testing Checklist

### **Basic Functionality**
- [ ] Start conversation with @BI Agent mention
- [ ] Select different request types
- [ ] Answer all question flows
- [ ] Submit impact and timeline details
- [ ] Review and confirm summaries
- [ ] Receive ticket numbers
- [ ] View tickets in Lark Base mock

### **Edge Cases**
- [ ] Send empty messages
- [ ] Try to start multiple conversations
- [ ] Test with very long responses
- [ ] Cancel and restart conversations
- [ ] Mix regular chat with bot interactions

### **Data Validation**
- [ ] Check ticket creation in Lark Base
- [ ] Verify all fields are populated
- [ ] Test priority and difficulty assignment
- [ ] Confirm duplicate detection works
- [ ] Validate filtering and search

## 🚀 Next Steps

This mock interface provides a complete testing environment for:

1. **User Experience Testing**: How end users will interact with the bot
2. **Data Flow Validation**: Ensuring all information is captured correctly
3. **UI/UX Refinement**: Testing the conversation flow and interface
4. **Stakeholder Demos**: Showing the complete solution in action

When ready for production, the core logic and conversation flow can be directly ported to the real Lark platform with minimal changes!

## 🎉 Ready to Test!

Your mock Lark environment is fully functional and ready for comprehensive testing. The interface provides an authentic Lark experience while focusing on the core BI Triage Agent functionality and data management.
