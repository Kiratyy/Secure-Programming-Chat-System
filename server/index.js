console.log('Starting server...');
console.log('Current working directory:', process.cwd());

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const webSocketServer = require('./webSocket');
const session = require('express-session');
const helmet = require('helmet');
const xss = require('xss');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
try {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
  console.log('.env file loaded successfully');
} catch (error) {
  console.log('Error loading .env file:', error);
}

// Log environment variables (excluding sensitive information)
console.log('Environment variables:', {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  DB_PASSWORD: process.env.DB_PASSWORD ? '[REDACTED]' : 'undefined'
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'TestUser1',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TestData1',
  connectTimeout: 60000,
};

let connection;

// Function to connect to the database
const connectToDatabase = async (retries = 5) => {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to the MySQL server.');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectToDatabase(retries - 1);
    }
    throw error;
  }
};

// Routes
// Home route
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/main');
    } else {
        res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
    }
});

// Registration route
app.post('/register', async (req, res) => {
  console.log('Received registration request');
  const username = xss(req.body.username);
  const password = req.body.password;
  
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query = 'INSERT INTO userinputdata (username, password) VALUES (?, ?)';
    await connection.execute(query, [username, hashedPassword]);
    
    console.log('Registration successful for user:', username);
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Error executing query:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists', details: 'Please choose a different username' });
    }
    return res.status(500).json({ error: 'Server error', details: 'An unexpected error occurred' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  console.log('Received login request for username:', xss(req.body.username));
  const username = xss(req.body.username);
  const password = req.body.password;
  
  const query = 'SELECT * FROM userinputdata WHERE username = ?';
  
  try {
    console.log('Executing query:', query);
    console.log('Username:', username);
    const [results] = await connection.execute(query, [username]);
    console.log('Query results:', results);
    
    if (results.length > 0) {
      console.log('User found, comparing passwords');
      const passwordMatch = await bcrypt.compare(password, results[0].password);
      console.log('Password match:', passwordMatch);

      if (passwordMatch) {
        console.log('Login successful for user:', username);
        req.session.user = username;
        res.json({ success: true, message: 'Login successful' });
      } else {
        console.log('Login failed for user:', username, '(incorrect password)');
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      console.log('Login failed for user:', username, '(user not found)');
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Server error', details: 'An unexpected error occurred' });
  }
});

// Authentication middleware
const checkAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
};

// Main chat page route
app.get('/main', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'));
});

// Chat history API route
app.get('/api/chat-history', async (req, res) => {
    const { user1, user2 } = req.query;
    
    try {
        // This should be implemented to fetch chat history from database or file
        const chatHistory = []; // Placeholder for chat history
        
        res.json(chatHistory);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Session setting route
app.post('/set-session', (req, res) => {
    const { username } = req.body;
    req.session.user = username;
    res.json({ success: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err.code === 'ERR_CONTENT_LENGTH_MISMATCH') {
        res.status(500).send('Internal Server Error: Content length mismatch');
    } else {
        res.status(500).send('Something broke!');
    }
});

// Function to check database connection
const checkDatabaseConnection = async () => {
  try {
    await connection.query('SELECT 1');
    console.log('Database connection is working.');
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

// Start the server
const startServer = async () => {
  try {
    await connectToDatabase();
    await checkDatabaseConnection();
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    webSocketServer(server);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Direct message route
app.get('/directMessage', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'directMessage.html'));
});

// Content Security Policy middleware
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws://localhost:8080"]
    }
}));

// XSS protection middleware
app.use(helmet.xssFilter());

// X-Frame-Options middleware
app.use(helmet.frameguard({ action: 'deny' }));

// HSTS middleware
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
}));

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});
