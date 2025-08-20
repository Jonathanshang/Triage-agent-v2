// Admin Dashboard JavaScript

let tickets = [];
let currentEditingTicket = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    setupEventListeners();
});

function setupEventListeners() {
    // Edit form submission
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveTicketChanges();
    });
    
    // Modal close on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeEditModal();
        }
    });
}

async function loadTickets() {
    try {
        showLoading();
        
        const response = await fetch('/api/admin/tickets');
        const data = await response.json();
        
        if (response.ok) {
            tickets = data;
            renderTickets(tickets);
            updateStats(tickets);
        } else {
            throw new Error(data.error || 'Failed to load tickets');
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        showError('Failed to load tickets. Please try again.');
    }
}

function renderTickets(ticketsData) {
    const container = document.getElementById('ticketsContainer');
    
    if (ticketsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No tickets found</h3>
                <p>No BI requests have been submitted yet.</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Ticket #</th>
                <th>Requester</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Owner</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${ticketsData.map(ticket => `
                <tr>
                    <td>
                        <span class="ticket-number">${ticket.ticket_number}</span>
                    </td>
                    <td>${ticket.requester_name}</td>
                    <td>${ticket.request_type}</td>
                    <td>
                        <span class="priority-badge priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                    </td>
                    <td>
                        <span class="status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
                    </td>
                    <td>${formatDate(ticket.created_date)}</td>
                    <td>${ticket.ticket_owner || 'Unassigned'}</td>
                    <td>
                        <div class="actions">
                            <button class="action-btn view-btn" onclick="viewTicket('${ticket.id}')">View</button>
                            <button class="action-btn edit-btn" onclick="editTicket('${ticket.id}')">Edit</button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    container.innerHTML = '';
    container.appendChild(table);
}

function updateStats(ticketsData) {
    const stats = calculateStats(ticketsData);
    const statsGrid = document.getElementById('statsGrid');
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${stats.total}</span>
            <div class="stat-label">Total Tickets</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.new}</span>
            <div class="stat-label">New Tickets</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.inProgress}</span>
            <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.completed}</span>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.highPriority}</span>
            <div class="stat-label">High Priority (P0-P1)</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.avgResponseTime}</span>
            <div class="stat-label">Avg Response Time</div>
        </div>
    `;
}

function calculateStats(ticketsData) {
    const total = ticketsData.length;
    const new_ = ticketsData.filter(t => t.status === 'New').length;
    const inProgress = ticketsData.filter(t => t.status === 'In Progress').length;
    const completed = ticketsData.filter(t => t.status === 'Completed' || t.status === 'Closed').length;
    const highPriority = ticketsData.filter(t => t.priority === 'P0' || t.priority === 'P1').length;
    
    // Mock average response time calculation
    const avgResponseTime = total > 0 ? '2.3 days' : '0 days';
    
    return {
        total,
        new: new_,
        inProgress,
        completed,
        highPriority,
        avgResponseTime
    };
}

function viewTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    // Create a detailed view modal or navigate to a detail page
    alert(`Ticket Details:\n\nNumber: ${ticket.ticket_number}\nRequester: ${ticket.requester_name}\nType: ${ticket.request_type}\nSummary: ${ticket.summary}\nImpact: ${ticket.impact}\nPriority: ${ticket.priority}\nDifficulty: ${ticket.difficulty}\nStatus: ${ticket.status}`);
}

function editTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    currentEditingTicket = ticket;
    
    // Populate form
    document.getElementById('editTicketId').value = ticket.id;
    document.getElementById('editStatus').value = ticket.status;
    document.getElementById('editOwner').value = ticket.ticket_owner || '';
    document.getElementById('editStartDate').value = ticket.estimated_start_date || '';
    document.getElementById('editEndDate').value = ticket.estimated_end_date || '';
    
    // Show modal
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingTicket = null;
    document.getElementById('editForm').reset();
}

async function saveTicketChanges() {
    if (!currentEditingTicket) return;
    
    const formData = {
        status: document.getElementById('editStatus').value,
        ticket_owner: document.getElementById('editOwner').value || null,
        estimated_start_date: document.getElementById('editStartDate').value || null,
        estimated_end_date: document.getElementById('editEndDate').value || null
    };
    
    try {
        const saveBtn = document.querySelector('.save-btn');
        showButtonLoading(saveBtn, 'Saving...');
        
        const response = await fetch(`/api/admin/ticket/${currentEditingTicket.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local data
            const ticketIndex = tickets.findIndex(t => t.id === currentEditingTicket.id);
            if (ticketIndex !== -1) {
                tickets[ticketIndex] = { ...tickets[ticketIndex], ...formData };
            }
            
            // Refresh display
            renderTickets(tickets);
            updateStats(tickets);
            
            // Close modal
            closeEditModal();
            
            // Show success message
            showSuccessMessage('Ticket updated successfully!');
            
        } else {
            throw new Error(data.error || 'Failed to update ticket');
        }
    } catch (error) {
        console.error('Error updating ticket:', error);
        showErrorMessage('Failed to update ticket. Please try again.');
    } finally {
        const saveBtn = document.querySelector('.save-btn');
        hideButtonLoading(saveBtn, 'Save Changes');
    }
}

function showLoading() {
    const container = document.getElementById('ticketsContainer');
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading">Loading tickets...</div>
        </div>
    `;
    
    const refreshIcon = document.getElementById('refreshIcon');
    refreshIcon.style.animation = 'spin 1s linear infinite';
}

function showError(message) {
    const container = document.getElementById('ticketsContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <h3>Error Loading Tickets</h3>
            <p>${message}</p>
            <button class="primary-btn" onclick="loadTickets()" style="margin-top: 1rem;">
                Try Again
            </button>
        </div>
    `;
}

function showButtonLoading(button, text) {
    button.disabled = true;
    button.innerHTML = `<span class="loading">${text}</span>`;
}

function hideButtonLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
    
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon) {
        refreshIcon.style.animation = '';
    }
}

function showSuccessMessage(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function showErrorMessage(message) {
    // Create a temporary error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
