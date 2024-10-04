require('dotenv').config({ path: '../.env' });
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');
const { chatHistory } = require('./webSocket');

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
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'secure_database'
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

// Register route
app.post('/register', (req, res) => {
  console.log('Received registration request:', req.body);
  const { username, password } = req.body;
  
  const query = 'INSERT INTO userinputdata (username, password) VALUES (?, ?)';
  connection.query(query, [username, password], (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
    
    console.log('Registration successful for user:', username);
    res.json({ success: true, message: 'Registration successful' });
  });
});

// Login route
app.post('/login', (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;
  
  const query = 'SELECT * FROM userinputdata WHERE username = ?';
  console.log('Executing query:', query);
  console.log('With parameters:', username);
  
  connection.query(query, [username], (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
    
    console.log('Query results:', results);
    
    if (results.length > 0) {
      if (results[0].password === password) {
        console.log('Login successful for user:', username);
        res.json({ success: true, message: 'Login successful' });
      } else {
        console.log('Login failed for user:', username, '(incorrect password)');
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      console.log('Login failed for user:', username, '(user not found)');
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Serve main.html
app.get('/main', (req, res) => {
  res.sendFile(path.join(publicPath, 'main.html'));
});

// Add API endpoint for chat history
app.get('/api/chat-history', (req, res) => {
    const { user1, user2 } = req.query;
    console.log(`Fetching chat history for users: ${user1} and ${user2}`);
    const userChatHistory = getChatHistory(user1, user2);
    res.json(userChatHistory);
});

// Function to retrieve chat history
function getChatHistory(user1, user2) {
    return chatHistory.filter(message => 
        (message.type === 'private-message' && 
        ((message.from === user1 && message.to === user2) || 
        (message.from === user2 && message.to === user1)))
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving static files from: ${publicPath}`);
  console.log(`WebSocket server is running on ws://localhost:${process.env.WS_PORT || 8080}`);
});