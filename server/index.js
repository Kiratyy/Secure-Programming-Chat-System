const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' directory located outside of 'server'
app.use(express.static(path.join(__dirname, '../public')));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
