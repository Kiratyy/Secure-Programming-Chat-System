const chatBox = document.querySelector('.chat-box'); // The chat box container
const inputText = document.querySelector('.input-text'); // The input field
const sendButton = document.querySelector('.send-button'); // The Send button

// Function to send a message
const sendMessage = (e) => {
    e.preventDefault();

    // Check if input text is not empty
    if (inputText.value.trim() === '') {
        return; // Do not send an empty message
    }

    // Capture the current time
    const timestamp = new Date().toLocaleString('en-AU', { hour: 'numeric', minute: 'numeric', hour12: true });

    // Create the message container div
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'message-right'); // Add both classes for the message style

    // Create the text element
    const messageText = document.createElement('p');
    messageText.innerText = inputText.value;

    // Create the timestamp element
    const messageTime = document.createElement('span');
    messageTime.classList.add('time');
    messageTime.innerText = timestamp;

    // Append text and timestamp to the message div
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(messageTime);

    // Append the new message to the chat box
    chatBox.appendChild(messageDiv);

    // Scroll to the bottom of the chat box
    chatBox.scrollTop = chatBox.scrollHeight;

    // Clear the input field after sending
    inputText.value = '';
};

// Add an event listener for the Send button
sendButton.addEventListener('click', sendMessage);

// Optional: You can also send the message when the "Enter" key is pressed
inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(e);
    }
});

