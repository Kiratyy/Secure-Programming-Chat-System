require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Adjust this path to point to your public directory
const publicPath = path.join(__dirname, '..', 'public');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicPath));

// MySQL Connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      console.log('Database connection details:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME
      });
      return;
    }
    console.log('Connected to the MySQL server.');
  });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'landing.html'));
});

app.post('/login', (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;
  
  const query = 'SELECT * FROM userinputdata WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (error, results) => {
    if (error) {
      console.error('Error executing query: ' + error.stack);
      return res.status(500).json({ error: 'Server error' });
    }
    
    console.log('Query results:', results);
    
    if (results.length > 0) {
      // User authenticated successfully
      console.log('Login successful for user:', username);
      res.json({ success: true, message: 'Login successful' });
    } else {
      // Authentication failed
      console.log('Login failed for user:', username);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// Serve main.html
app.get('/main', (req, res) => {
  res.sendFile(path.join(publicPath, 'main.html'));
});

// WebSocket server setup
const wss = new WebSocket.Server({ port: process.env.WS_PORT || 8080 });

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

// Broadcast the list of online and offline members to all clients
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
    clients.forEach(clientData => {
        if (clientData.socket.readyState === WebSocket.OPEN) {
            clientData.socket.send(JSON.stringify(message));
        }
    });
}

// Handle WebSocket connection
wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (data) => {
        const message = JSON.parse(data);

        if (message.type === 'register') {
            const userId = message.userId;
            clients.set(userId, { socket: ws, status: 'online', isTyping: false });
            broadcastMemberList();
            ws.send(JSON.stringify({ type: 'chat-history', data: chatHistory }));
        }

        if (message.type === 'status-update') {
            const client = clients.get(message.userId);
            if (client) {
                client.status = message.status;
                broadcastMemberList();
            }
        }

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

        if (message.type === 'private-message') {
            const targetClient = clients.get(message.to);
            if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                targetClient.socket.send(JSON.stringify({
                    type: 'private-message',
                    from: message.from,
                    to: message.to,
                    content: message.content,
                    timestamp: new Date().toISOString()
                }));
            }
        }

        if (message.type === 'file-transfer') {
            const targetClient = clients.get(message.to);
            if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                targetClient.socket.send(JSON.stringify({
                    type: 'file-transfer',
                    from: message.from,
                    to: message.to,
                    fileName: message.fileName,
                    fileSize: message.fileSize,
                    fileType: message.fileType,
                    fileData: message.fileData
                }));
            }
        }

        if (message.type === 'typing-start' || message.type === 'typing-stop') {
            const client = clients.get(message.userId);
            if (client) {
                client.isTyping = message.type === 'typing-start';
                broadcastMemberList();
            }
        }
    });

    ws.on('close', () => {
        for (let [userId, clientData] of clients) {
            if (clientData.socket === ws) {
                clients.delete(userId);
                break;
            }
        }
        broadcastMemberList();
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving static files from: ${publicPath}`);
  console.log(`WebSocket server is running on ws://localhost:${process.env.WS_PORT || 8080}`);
});

// Load chat history when the server starts
loadChatHistory();
