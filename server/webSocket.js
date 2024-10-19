const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();
let chatHistory = [];
let groupChatHistory = [];
let privateChatHistory = new Map();

// Function to load chat history from files
function loadChatHistory() {
    const groupChatHistoryPath = path.join(__dirname, 'groupChatHistory.json');
    const privateChatHistoryPath = path.join(__dirname, 'privateChatHistory.json');

    // Create files if they don't exist
    if (!fs.existsSync(groupChatHistoryPath)) {
        const exampleGroupPath = path.join(__dirname, 'groupChatHistory.example.json');
        fs.copyFileSync(exampleGroupPath, groupChatHistoryPath);
    }
    if (!fs.existsSync(privateChatHistoryPath)) {
        const examplePrivatePath = path.join(__dirname, 'privateChatHistory.example.json');
        fs.copyFileSync(examplePrivatePath, privateChatHistoryPath);
    }

    try {
        const groupData = fs.readFileSync(groupChatHistoryPath, 'utf8');
        groupChatHistory = JSON.parse(groupData);

        const privateData = fs.readFileSync(privateChatHistoryPath, 'utf8');
        privateChatHistory = new Map(Object.entries(JSON.parse(privateData)));
    } catch (error) {
        console.error('Error loading chat history:', error);
        groupChatHistory = [];
        privateChatHistory = new Map();
    }
}

// Function to save chat history to files
function saveChatHistory() {
    fs.writeFileSync(path.join(__dirname, 'groupChatHistory.json'), JSON.stringify(groupChatHistory));
    fs.writeFileSync(path.join(__dirname, 'privateChatHistory.json'), JSON.stringify(Object.fromEntries(privateChatHistory)));
}

loadChatHistory();

// Function to broadcast member list to all clients
function broadcastMemberList() {
    const memberList = Array.from(clients.entries()).map(([userId, clientData]) => ({
        id: userId,
        status: clientData.status,
        isTyping: clientData.isTyping
    }));

    console.log('Broadcasting member list:', memberList);
    console.log('Number of clients:', clients.size);

    const message = JSON.stringify({
        type: 'member-list',
        data: memberList
    });

    clients.forEach((clientData, userId) => {
        if (clientData.socket.readyState === WebSocket.OPEN) {
            console.log(`Sending member list to ${userId}`);
            clientData.socket.send(message);
        } else {
            console.log(`Client ${userId} is not ready, state:`, clientData.socket.readyState);
        }
    });
}

// Function to broadcast messages to clients
function broadcastMessage(message) {
    console.log('Broadcasting message:', message.type);
    clients.forEach((clientData, userId) => {
        if (clientData.socket.readyState === WebSocket.OPEN) {
            if (message.type === 'private-message' || message.type === 'file-transfer') {
                if (userId === message.from || userId === message.to) {
                    clientData.socket.send(JSON.stringify(message));
                }
            } else if (message.type === 'group-message') {
                clientData.socket.send(JSON.stringify(message));
            }
        }
    });
}

// Throttle function to limit the frequency of function calls
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

// Throttled version of broadcastMemberList
const throttledBroadcastMemberList = throttle(broadcastMemberList, 1000);

// WebSocket server setup
wss.on('connection', (ws) => {
    console.log('New client connected');
    let userId;

    // Handle incoming messages
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Received message:', message);

        switch (message.type) {
            case 'register':
                userId = message.userId;
                clients.set(userId, { socket: ws, status: 'online', isTyping: false });
                console.log(`User ${userId} registered. Total clients:`, clients.size);
                broadcastMessage({
                    type: 'welcome',
                    userId: userId
                });
                broadcastMemberList();
                ws.send(JSON.stringify({
                    type: 'group-chat-history',
                    data: groupChatHistory
                }));
                ws.send(JSON.stringify({
                    type: 'user-list',
                    data: Array.from(clients.entries()).map(([id, client]) => ({
                        id,
                        status: client.status,
                        isTyping: client.isTyping
                    }))
                }));
                break;

            case 'status-update':
                const client = clients.get(message.userId);
                if (client) {
                    client.status = message.status;
                    broadcastMemberList();
                }
                break;

            case 'group-message':
                groupChatHistory.push(message);
                saveChatHistory();
                broadcastMessage(message);
                break;

            case 'file-transfer':
                console.log('Received file transfer request:', message.fileName);
                const fileMessage = {
                    type: 'file-transfer',
                    from: message.from,
                    to: message.to,
                    fileName: message.fileName,
                    fileSize: message.fileSize,
                    fileType: message.fileType,
                    fileData: message.fileData,
                    timestamp: message.timestamp
                };
                const targetClient = clients.get(message.to);
                if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                    targetClient.socket.send(JSON.stringify(fileMessage));
                }
                ws.send(JSON.stringify(fileMessage));
                
                const chatKey = [message.from, message.to].sort().join('-');
                if (!privateChatHistory.has(chatKey)) {
                    privateChatHistory.set(chatKey, []);
                }
                privateChatHistory.get(chatKey).push(fileMessage);
                saveChatHistory();
                break;

            case 'typing-start':
            case 'typing-stop':
                const typingClient = clients.get(message.userId);
                if (typingClient) {
                    typingClient.isTyping = message.type === 'typing-start';
                    throttledBroadcastMemberList();
                }
                break;

            case 'private-message':
                const privateChatKey = [message.from, message.to].sort().join('-');
                if (!privateChatHistory.has(privateChatKey)) {
                    privateChatHistory.set(privateChatKey, []);
                }
                privateChatHistory.get(privateChatKey).push(message);
                saveChatHistory();
                const privateTargetClient = clients.get(message.to);
                if (privateTargetClient && privateTargetClient.socket.readyState === WebSocket.OPEN) {
                    privateTargetClient.socket.send(JSON.stringify(message));
                }
                ws.send(JSON.stringify(message));
                break;

            case 'request-user-list':
                const userList = Array.from(clients.entries()).map(([userId, clientData]) => ({
                    id: userId,
                    status: clientData.status,
                    isTyping: clientData.isTyping
                }));
                ws.send(JSON.stringify({
                    type: 'user-list',
                    data: userList
                }));
                break;

            case 'request-private-chat-history':
            case 'request-private-history':
                const { user1, user2 } = message;
                const historyChatKey = [user1, user2].sort().join('-');
                const history = privateChatHistory.get(historyChatKey) || [];
                console.log('Sending private chat history:', history);
                ws.send(JSON.stringify({
                    type: 'private-chat-history',
                    data: history
                }));
                break;

            case 'request-group-history':
                ws.send(JSON.stringify({
                    type: 'group-chat-history',
                    data: groupChatHistory
                }));
                break;
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        if (userId) {
            clients.delete(userId);
            console.log(`User ${userId} disconnected. Total clients:`, clients.size);
            broadcastMemberList();
        }
    });
});

// Export the WebSocket server setup function
module.exports = function(server) {
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        // WebSocket connection handling code
    });
};

console.log("WebSocket server is running on ws://localhost:8080");

// Function to validate incoming messages
function validateMessage(message) {
    if (!message || typeof message !== 'object') return false;
    if (!message.type || typeof message.type !== 'string') return false;

    switch (message.type) {
        case 'group-message':
        case 'private-message':
            return message.from && message.content && typeof message.content === 'string';
        case 'file-transfer':
            return message.from && message.fileName && message.fileSize && message.fileType;
        default:
            return false;
    }
}
