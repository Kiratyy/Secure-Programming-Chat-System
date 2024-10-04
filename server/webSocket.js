const WebSocket = require('ws');  // WebSocket server setup
const fs = require('fs');
const path = require('path');

const wss = new WebSocket.Server({ port: 8080 });

// A map to store connected clients and their usernames along with their status
const clients = new Map();

// Store chat history
let chatHistory = [];

// Load chat history from file
function loadChatHistory() {
    const historyPath = path.join(__dirname, 'chatHistory.json');
    if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        chatHistory = JSON.parse(data);
    }
}

// Save chat history to file
function saveChatHistory() {
    const historyPath = path.join(__dirname, 'chatHistory.json');
    fs.writeFileSync(historyPath, JSON.stringify(chatHistory), 'utf8');
}

/**
 * Broadcast the list of online and offline members to all clients.
 */
function broadcastMemberList() {
    const memberList = Array.from(clients.entries()).map(([userId, clientData]) => ({
        id: userId,
        status: clientData.status,
        isTyping: clientData.isTyping
    }));

    const message = JSON.stringify({
        type: 'member-list',
        data: memberList
    });

    clients.forEach(clientData => {
        if (clientData.socket.readyState === WebSocket.OPEN) {
            clientData.socket.send(message);
        }
    });
}

// Broadcast message to all clients
function broadcastMessage(message) {
    console.log('Broadcasting message:', message.type);
    clients.forEach(clientData => {
        if (clientData.socket.readyState === WebSocket.OPEN) {
            clientData.socket.send(JSON.stringify(message));
        }
    });
}

// Add a throttling function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Use throttling in broadcastMemberList
const throttledBroadcastMemberList = throttle(broadcastMemberList, 1000);

/**
 * Handle WebSocket connection event.
 */
wss.on('connection', (ws) => {
    console.log('New client connected');

    /**
     * Handle incoming messages from clients.
     */
    ws.on('message', (data) => {
        const message = JSON.parse(data);  // Parse the incoming message
        console.log('Received message:', message.type);

        // Register a user when they connect
        if (message.type === 'register') {
            const userId = message.userId;
            clients.set(userId, { socket: ws, status: 'online', isTyping: false });  // Add the client to the map with status 'online'
            throttledBroadcastMemberList();  // Broadcast the updated member list
            // Send chat history to the newly connected client
            ws.send(JSON.stringify({ type: 'chat-history', data: chatHistory }));
        }

        // Handle user status updates (online, idle, offline)
        if (message.type === 'status-update') {
            const client = clients.get(message.userId);
            if (client) {
                client.status = message.status;  // Update the user's status
                throttledBroadcastMemberList();  // Broadcast the updated member list
            }
        }

        // Handle group messaging
        if (message.type === 'group-message') {
            const groupMessage = {
                type: 'group-message',
                from: message.from,
                content: message.content,
                timestamp: new Date().toISOString()
            };
            chatHistory.push(groupMessage);
            saveChatHistory();
            broadcastMessage(groupMessage);
        }

        // Handle file transfer
        if (message.type === 'file-transfer') {
            console.log('Received file transfer request:', message.fileName);
            const fileMessage = {
                type: 'file-transfer',
                from: message.from,
                fileName: message.fileName,
                fileSize: message.fileSize,
                fileType: message.fileType,
                fileData: message.fileData
            };
            broadcastMessage(fileMessage);
        }

        // Handle typing start
        if (message.type === 'typing-start' || message.type === 'typing-stop') {
            const client = clients.get(message.userId);
            if (client) {
                client.isTyping = message.type === 'typing-start';
                throttledBroadcastMemberList();
            }
        }

        // Handle private messages
        if (message.type === 'private-message') {
            const targetClient = clients.get(message.to);
            if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                targetClient.socket.send(JSON.stringify(message));
            }
            // Save private messages to chat history
            chatHistory.push(message);
            saveChatHistory();
        }
    });

    /**
     * Handle WebSocket close event when a client disconnects.
     */
    ws.on('close', () => {
        // Remove a client from the clients list when they disconnect
        for (let [userId, clientData] of clients) {
            if (clientData.socket === ws) {
                clients.delete(userId);
                break;
            }
        }
        throttledBroadcastMemberList();  // Broadcast the updated member list
    });
});

module.exports = {
    chatHistory,
};

console.log("WebSocket server is running on ws://localhost:8080");