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
const storedUsername = sessionStorage.getItem('username');
const recipient = new URLSearchParams(window.location.search).get('user');

recipientName.textContent = recipient;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

// WebSocket connection setup
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
    ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
    ws.send(JSON.stringify({
        type: 'request-private-history',
        user1: storedUsername,
        user2: recipient
    }));
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Modify WebSocket message handling
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);

    switch (message.type) {
        case 'private-chat-history':
            loadPrivateChatHistory(message.data);
            break;
        case 'private-message':
            if (message.from === recipient || message.to === recipient) {
                displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
            }
            break;
        case 'file-transfer':
            if (message.from === recipient || message.to === recipient) {
                console.log('Received file in direct message:', message.fileName);
                receiveFile(message.from, message.fileName, message.fileSize, message.fileType, message.fileData);
            }
            break;
    }
};

// Function to display messages
const displayMessage = (from, content, isOwnMessage, timestamp) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = escapeHtml(from);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isOwnMessage ? 'message-right' : 'message-left');

    const messageText = document.createElement('p');
    messageText.innerHTML = escapeHtml(content);
    messageDiv.appendChild(messageText);

    messageContent.appendChild(usernameSpan);
    messageContent.appendChild(messageDiv);

    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(messageContent);

    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Function to receive files
const receiveFile = (from, fileName, fileSize, fileType, fileData) => {
    console.log('Processing received file in direct message:', fileName);
    const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], { type: fileType });
    const url = URL.createObjectURL(blob);
    displayFile(from, { name: fileName, size: fileSize, url: url, type: fileType }, from === storedUsername);
};

// Function to display files
const displayFile = (from, file, isOwnFile) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = from;

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

    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(messageContent);

    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Function to load chat history
const loadChatHistory = (history) => {
    chatBox.innerHTML = '';
    if (Array.isArray(history)) {
        history.forEach(message => {
            if ((message.from === storedUsername && message.to === recipient) ||
                (message.from === recipient && message.to === storedUsername)) {
                displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
            }
        });
    } else {
        console.error('Received invalid chat history:', history);
        // 可以在这里添加一个错误消息显示给用户
    }
};

// Function to send private messages
const sendPrivateMessage = (content) => {
    const message = {
        type: 'private-message',
        from: storedUsername,
        to: recipient,
        content: content,
        timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(message));
    // 移除这行，因为服务器会广播消息，会在 onmessage 中处理它
    // displayMessage(storedUsername, content, true, new Date());
};

// Function to send files
const sendPrivateFile = () => {
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result.split(',')[1];
            const fileMessage = {
                type: 'file-transfer',
                from: storedUsername,
                to: recipient,
                fileName: escapeHtml(file.name),
                fileSize: file.size,
                fileType: file.type,
                fileData: fileData,
                timestamp: new Date().toISOString()
            };
            console.log('Sending private file:', fileMessage.fileName);
            ws.send(JSON.stringify(fileMessage));
            displayFile(storedUsername, { name: file.name, size: file.size, url: URL.createObjectURL(file), type: file.type }, true);
        };
        reader.readAsDataURL(file);
    });
    selectedFiles = [];
    updateFilePreview();
    fileTransferArea.style.display = 'none';
};

// Function to handle file selection
const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files).filter(file => {
        if (file.size > MAX_FILE_SIZE) {
            showWarning(`File ${file.name} is too large. Maximum size is 5MB.`);
            return false;
        }
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            showWarning(`File type ${file.type} is not allowed.`);
            return false;
        }
        return true;
    });

    if (selectedFiles.length + newFiles.length > 5) {
        showWarning("You can only send up to 5 files at once.");
        return;
    }
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFilePreview();
    fileTransferArea.style.display = 'block';
    
    fileInput.value = '';
};

// Function to update file preview
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

// Function to remove files
const removeFile = (index) => {
    selectedFiles.splice(index, 1);
    updateFilePreview();
    if (selectedFiles.length === 0) {
        fileTransferArea.style.display = 'none';
    }
};

// Function to send message
const sendMessage = () => {
    const content = inputText.value.trim();
    if (content) {
        sendPrivateMessage(content);
        inputText.value = '';
    }
    if (selectedFiles.length > 0) {
        sendPrivateFile();
    }
};

// Function to show warning
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

// Function to format message time
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

// Function to escape HTML
function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
         .replace(/`/g, "&#96;");
}

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

filePreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file')) {
        removeFile(parseInt(e.target.dataset.index));
    }
});

// Load chat history when the page loads
window.addEventListener('load', loadChatHistory);

// 添加新函数
function loadPrivateChatHistory(history) {
    chatBox.innerHTML = '';
    if (Array.isArray(history)) {
        history.forEach(message => {
            if (message.type === 'private-message') {
                displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
            } else if (message.type === 'file-transfer') {
                displayFile(message.from, {
                    name: message.fileName,
                    size: message.fileSize,
                    type: message.fileType,
                    url: `data:${message.fileType};base64,${message.fileData}`
                }, message.from === storedUsername);
            }
        });
    } else {
        console.error('Received invalid chat history:', history);
    }
}
