const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve the landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

// Serve the main chat page
app.get('/main.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const crypto = require('crypto');

// Use crypto functionalities
const hash = crypto.createHash('sha256');
hash.update('your data');
console.log(hash.digest('hex'));