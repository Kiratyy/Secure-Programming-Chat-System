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

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'private-message' && (message.from === recipient || message.to === recipient)) {
        displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
    }

    if (message.type === 'file-transfer' && (message.from === recipient || message.to === recipient)) {
        receiveFile(message.from, message.fileName, message.fileSize, message.fileType, message.fileData);
    }

    // ... 其他必要的消息处理 ...
};

// 添加显示消息的函数
const displayMessage = (from, content, isOwnMessage, timestamp) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const timeDiv = document.createElement('div');
    timeDiv.classList.add('message-time');
    timeDiv.textContent = formatMessageTime(timestamp);
    messageContainer.appendChild(timeDiv);

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

// 添加接收文件的函数
const receiveFile = (from, fileName, fileSize, fileType, fileData) => {
    const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], { type: fileType });
    const url = URL.createObjectURL(blob);
    displayFile(from, { name: fileName, size: fileSize, url: url, type: fileType }, from === storedUsername);
};

// 添加显示文件的函数
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

// 修改发送私信的函数
const sendPrivateMessage = (content) => {
    ws.send(JSON.stringify({
        type: 'private-message',
        from: storedUsername,
        to: recipient,
        content: content
    }));
    displayMessage(storedUsername, content, true, new Date());
};

// 修改发送文件的函数
const sendPrivateFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const fileData = e.target.result.split(',')[1];
        ws.send(JSON.stringify({
            type: 'file-transfer',
            from: storedUsername,
            to: recipient,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: fileData
        }));
        displayFile(storedUsername, { name: file.name, size: file.size, url: URL.createObjectURL(file), type: file.type }, true);
    };
    reader.readAsDataURL(file);
};

// 添加处理文件选择的函数
const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
        sendPrivateFile(file);
    }
    fileInput.value = ''; // 重置文件输入以允许选择相同的文件
};

// 添加事件监听器
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

// 添加 sendMessage 函数
function sendMessage() {
    const content = inputText.value.trim();
    if (content) {
        sendPrivateMessage(content);
        inputText.value = '';
    }
}

// ... 其他必要的代码 ...

// 修改 formatMessageTime 函数
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