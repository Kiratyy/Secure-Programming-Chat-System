const chatBox = document.querySelector('.chat-box');
const inputText = document.querySelector('.input-text');
const sendButton = document.querySelector('.send-button');
const fileInput = document.getElementById('file-input');
const attachFileButton = document.querySelector('.attach-file-button');
const fileTransferArea = document.querySelector('.file-transfer-area');
const filePreview = document.querySelector('.file-preview');
const fileProgress = document.querySelector('.file-progress');
const typingIndicator = document.getElementById('typing-indicator');
const recipientName = document.getElementById('recipient-name');
const backButton = document.getElementById('back-button');

let selectedFiles = [];
let typingTimeout;
let isUserTyping = false;
const storedUsername = localStorage.getItem('username');
const recipient = new URLSearchParams(window.location.search).get('user');

recipientName.textContent = recipient;

// WebSocket connection setup
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
    ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Modify WebSocket message handling
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);

    if (message.type === 'private-message' && (message.from === recipient || message.to === recipient)) {
        displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
    }

    if (message.type === 'file-transfer' && (message.from === recipient || message.to === recipient)) {
        console.log('Received file in direct message:', message.fileName);
        receiveFile(message.from, message.fileName, message.fileSize, message.fileType, message.fileData);
    }

    // ... other message handling remains unchanged ...
};

// Modify the function to display messages
const displayMessage = (from, content, isOwnMessage, timestamp) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const messageContentWrapper = document.createElement('div');
    messageContentWrapper.classList.add('message-content-wrapper');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = from;

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isOwnMessage ? 'message-right' : 'message-left');

    const messageText = document.createElement('p');
    messageText.innerText = content;
    messageDiv.appendChild(messageText);

    messageContent.appendChild(usernameSpan);
    messageContent.appendChild(messageDiv);

    messageContentWrapper.appendChild(avatarDiv);
    messageContentWrapper.appendChild(messageContent);

    messageContainer.appendChild(messageContentWrapper);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Add function to receive files
const receiveFile = (from, fileName, fileSize, fileType, fileData) => {
    console.log('Processing received file in direct message:', fileName);
    const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], { type: fileType });
    const url = URL.createObjectURL(blob);
    displayFile(from, { name: fileName, size: fileSize, url: url, type: fileType }, from === storedUsername);
};

// Add function to display files
const displayFile = (from, file, isOwnFile) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = from;

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(messageContent);

    messageContent.appendChild(usernameSpan);

    const fileElement = document.createElement('div');
    fileElement.classList.add('file-attachment', isOwnFile ? 'message-right' : 'message-left');
    
    if (file.type.startsWith('image/')) {
        fileElement.innerHTML = `
            <img src="${file.url}" alt="${file.name}" class="file-preview-image">
            <a href="${file.url}" download="${file.name}" class="file-download-link">
                📎 ${file.name} (${(file.size / 1024).toFixed(2)} KB)
            </a>
        `;
    } else {
        fileElement.innerHTML = `
            <a href="${file.url}" download="${file.name}" class="file-download-link">
                📎 ${file.name} (${(file.size / 1024).toFixed(2)} KB)
            </a>
        `;
    }

    messageContent.appendChild(fileElement);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Modify the function to load chat history
const loadChatHistory = () => {
    console.log(`Loading chat history for users: ${storedUsername} and ${recipient}`);
    fetch(`/api/chat-history?user1=${encodeURIComponent(storedUsername)}&user2=${encodeURIComponent(recipient)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(history => {
            console.log('Received chat history:', history);
            chatBox.innerHTML = ''; // Clear the chat box
            if (history.length === 0) {
                console.log('No chat history found');
                const noHistoryMessage = document.createElement('div');
                noHistoryMessage.textContent = 'No chat history found. Start a new conversation!';
                noHistoryMessage.style.color = 'gray';
                noHistoryMessage.style.textAlign = 'center';
                chatBox.appendChild(noHistoryMessage);
            } else {
                // Add timestamp to the top of the chat box
                const timeDiv = document.createElement('div');
                timeDiv.classList.add('chat-timestamp');
                timeDiv.textContent = formatMessageTime(new Date(history[0].timestamp));
                chatBox.appendChild(timeDiv);

                history.forEach(message => {
                    displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
                });
            }
        })
        .catch(error => {
            console.error('Error loading chat history:', error);
            const errorMessage = document.createElement('div');
            errorMessage.textContent = `Failed to load chat history: ${error.message}. Please try refreshing the page.`;
            errorMessage.style.color = 'red';
            chatBox.appendChild(errorMessage);
        });
};

// Call the function to load chat history when the page loads
window.addEventListener('load', loadChatHistory);

// Modify the function to send private messages
const sendPrivateMessage = (content) => {
    const message = {
        type: 'private-message',
        from: storedUsername,
        to: recipient,
        content: content,
        timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(message));
    displayMessage(storedUsername, content, true, new Date());
};

// Modify the function to send files
const sendPrivateFile = () => {
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result.split(',')[1];
            const fileMessage = {
                type: 'file-transfer',
                from: storedUsername,
                to: recipient,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData: fileData
            };
            console.log('Sending private file:', fileMessage.fileName);
            ws.send(JSON.stringify(fileMessage));
        };
        reader.readAsDataURL(file);
    });
    selectedFiles = [];
    updateFilePreview();
    fileTransferArea.style.display = 'none';
};

// Add function to handle file selection
const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    if (selectedFiles.length + newFiles.length > 5) {
        showWarning("You can only send up to 5 files at once.");
        return;
    }
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFilePreview();
    fileTransferArea.style.display = 'block';
    
    // Reset file input to allow selecting the same file again
    fileInput.value = '';
};

// Add function to update file preview
const updateFilePreview = () => {
    filePreview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-item');
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            fileElement.appendChild(img);
        }
        
        const fileInfo = document.createElement('span');
        fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        fileElement.appendChild(fileInfo);
        
        const removeButton = document.createElement('button');
        removeButton.textContent = 'x';
        removeButton.classList.add('remove-file');
        removeButton.dataset.index = index;
        fileElement.appendChild(removeButton);
        
        filePreview.appendChild(fileElement);
    });

    // Add file count info
    const fileCountInfo = document.createElement('div');
    fileCountInfo.textContent = `${selectedFiles.length}/5 files selected`;
    fileCountInfo.classList.add('file-count-info');
    filePreview.appendChild(fileCountInfo);
};

// Add function to remove files
const removeFile = (index) => {
    selectedFiles.splice(index, 1);
    updateFilePreview();
    if (selectedFiles.length === 0) {
        fileTransferArea.style.display = 'none';
    }
};

// Add event listeners
sendButton.addEventListener('click', sendMessage);

inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

attachFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

backButton.addEventListener('click', () => {
    window.location.href = 'main.html';
});

// Add sendMessage function
function sendMessage() {
    const content = inputText.value.trim();
    if (content) {
        sendPrivateMessage(content);
        inputText.value = '';
    }
    if (selectedFiles.length > 0) {
        sendPrivateFile();
    }
}

// Add event listeners
filePreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file')) {
        removeFile(parseInt(e.target.dataset.index));
    }
});

// Add showWarning function
const showWarning = (message) => {
    const warningElement = document.createElement('div');
    warningElement.classList.add('warning-message');
    warningElement.textContent = message;
    const closeButton = document.createElement('button');
    closeButton.textContent = 'x';
    closeButton.onclick = () => warningElement.remove();
    warningElement.appendChild(closeButton);
    document.body.appendChild(warningElement);
    setTimeout(() => {
        warningElement.remove();
    }, 10000);
};

// Modify formatMessageTime function
const formatMessageTime = (date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
        return `Today ${date.toLocaleString('en-AU', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${date.toLocaleString('en-AU', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
    } else {
        return date.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true });
    }
};