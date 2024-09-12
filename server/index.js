const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Route for the landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

// Route for the home chat page
app.get('/main.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Serving static files from: ${path.join(__dirname, '..', 'public')}`);
});
