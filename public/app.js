const chatBox = document.querySelector('.chat-box');
const inputText = document.querySelector('.input-text');
const sendButton = document.querySelector('.send-button');
const fileInput = document.getElementById('file-input');
const attachFileButton = document.querySelector('.attach-file-button');
const fileTransferArea = document.querySelector('.file-transfer-area');
const filePreview = document.querySelector('.file-preview');
const fileProgress = document.querySelector('.file-progress');
const typingIndicator = document.getElementById('typing-indicator');
let selectedFiles = [];
let typingTimeout;
let activityTimeout;
let isUserTyping = false;
let lastTimestamp = null;
const timestampThreshold = 30 * 60 * 1000;
const storedUsername = sessionStorage.getItem('username');

let members = [];

const memberList = document.getElementById('member-list');

// Initialize WebSocket connection
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
    if (storedUsername) {
        ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
    } else {
        window.location.href = '/';
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

let typingUsers = new Set();

const updateTypingUsers = () => {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingUsers.size > 0) {
        const userList = Array.from(typingUsers).filter(user => user !== storedUsername);
        if (userList.length > 0) {
            const displayText = userList.length === 1 ? 
                `${userList[0]} is typing...` : 
                `${userList.join(' and ')} are typing...`;
            typingIndicator.textContent = displayText;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    } else {
        typingIndicator.style.display = 'none';
    }
};

let chatHistory = [];

const saveMessage = (message) => {
    chatHistory.push(message);
    if (chatHistory.length > 3) {
        chatHistory.shift();
    }
};

const loadChatHistory = () => {
    chatBox.innerHTML = '';
    chatHistory.forEach(message => {
        displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
    });
};

let unreadPrivateMessages = {};

let unreadMessages = {};

let messageBellIcon;

const updateMessageBellIcon = () => {
    if (messageBellIcon) {
        if (Object.keys(unreadMessages).length > 0) {
            messageBellIcon.src = './images/notification-icon.webp';
            messageBellIcon.classList.add('notification');
        } else {
            messageBellIcon.src = './images/message-bell-icon.png';
            messageBellIcon.classList.remove('notification');
        }
    }
};

const handlePrivateMessage = (message) => {
    if (message.to === storedUsername) {
        if (!unreadMessages[message.from]) {
            unreadMessages[message.from] = [];
        }
        unreadMessages[message.from].push(message);
        updateMessageBellIcon();
        updatePrivateMessageList();
    }
};

const createMessageBell = () => {
    const bellContainer = document.createElement('div');
    bellContainer.classList.add('message-bell-container');

    messageBellIcon = document.createElement('img');
    messageBellIcon.src = './images/message-bell-icon.png';
    messageBellIcon.classList.add('message-bell-icon');
    messageBellIcon.addEventListener('click', togglePrivateMessagePopup);

    bellContainer.appendChild(messageBellIcon);

    return bellContainer;
};

const createPrivateMessagePopup = () => {
    const popup = document.createElement('div');
    popup.classList.add('private-message-popup');
    popup.style.display = 'none';

    const header = document.createElement('div');
    header.classList.add('private-message-popup-header');

    const title = document.createElement('h3');
    title.textContent = 'Private Messages';

    const closeButton = document.createElement('button');
    closeButton.classList.add('close-popup-button');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        popup.style.display = 'none';
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    const messageList = document.createElement('div');
    messageList.classList.add('private-message-list');

    popup.appendChild(header);
    popup.appendChild(messageList);

    document.body.appendChild(popup);

    return popup;
};

const togglePrivateMessagePopup = () => {
    let popup = document.querySelector('.private-message-popup');
    if (!popup) {
        popup = createPrivateMessagePopup();
    }
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    if (popup.style.display === 'block') {
        updatePrivateMessageList();
    }
};

const updatePrivateMessageList = () => {
    const messageList = document.querySelector('.private-message-list');
    messageList.innerHTML = '';

    Object.entries(unreadMessages).forEach(([userId, messages]) => {
        const latestMessage = messages[messages.length - 1];
        const messageItem = createMessageItem(userId, latestMessage);
        messageList.appendChild(messageItem);
    });
};

const createMessageItem = (userId, message) => {
    const messageItem = document.createElement('div');
    messageItem.classList.add('private-message-item');

    const userName = document.createElement('span');
    userName.classList.add('username');
    userName.textContent = userId;

    const time = document.createElement('span');
    time.classList.add('time');
    time.textContent = new Date(message.timestamp).toLocaleTimeString();

    messageItem.appendChild(userName);
    messageItem.appendChild(time);

    messageItem.addEventListener('click', () => {
        window.location.href = `directMessage.html?user=${encodeURIComponent(userId)}`;
    });

    return messageItem;
};

// Handle incoming messages
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);

    switch (message.type) {
        case 'register':
            updateUserStatus(message.userId, 'online');
            if (message.userId !== storedUsername) {
                displayWelcomeMessage(message.userId);
            }
            break;
        case 'status-update':
            updateUserStatus(message.userId, message.status);
            break;
        case 'typing-start':
            updateUserStatus(message.userId, 'online', true);
            break;
        case 'typing-stop':
            updateUserStatus(message.userId, 'online', false);
            break;
        case 'group-message':
            displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
            break;
        case 'member-list':
            console.log('Received member list:', message.data);
            if (Array.isArray(message.data)) {
                updateMemberList(message.data);
            } else {
                console.error('Invalid member list data:', message.data);
            }
            break;
        case 'file-transfer':
            console.log('Received file:', message.fileName);
            receiveFile(message.from, message.fileName, message.fileSize, message.fileType, message.fileData);
            break;
        case 'private-message':
            handlePrivateMessage(message);
            break;
        case 'register':
            console.log('User registered:', message.userId);
            break;
        case 'user-list':
            message.data.forEach(user => {
                updateUserStatus(user.id, user.status, user.isTyping);
            });
            break;
        case 'welcome':
            if (message.userId !== storedUsername) {
                displayWelcomeMessage(message.userId);
            }
            break;
        case 'chat-history':
            chatHistory = message.data;
            loadChatHistory();
            break;
        case 'user-list':
            updateMemberList(message.data);
            break;
        case 'group-chat-history':
            loadGroupChatHistory(message.data);
            break;
        default:
            console.log('Unhandled message type:', message.type);
    }
};

const updateMemberTypingStatus = (userId, isTyping) => {
    const member = members.find(m => m.id === userId);
    if (member) {
        member.isTyping = isTyping;
        updateMemberList(members);
    }
};

let users = new Map();

function updateUserStatus(userId, status, isTyping = false) {
    users.set(userId, { status, isTyping });
    updateMemberList();
    updateTypingIndicator();
}

function updateMemberList() {
    const memberList = document.getElementById('member-list');
    memberList.innerHTML = '';

    const membersHeader = document.createElement('div');
    membersHeader.className = 'members-header';
    membersHeader.textContent = 'Members';
    memberList.appendChild(membersHeader);

    const onlineUsers = [];
    const offlineUsers = [];

    users.forEach((user, userId) => {
        if (user.status === 'online' || user.isTyping) {
            onlineUsers.push({ id: userId, ...user });
        } else {
            offlineUsers.push({ id: userId, ...user });
        }
    });

    const onlineSection = createUserSection('Online', onlineUsers);
    memberList.appendChild(onlineSection);

    const offlineSection = createUserSection('Offline', offlineUsers);
    memberList.appendChild(offlineSection);
}

function createUserSection(title, userList) {
    const section = document.createElement('div');
    section.className = 'user-section';

    const titleElement = document.createElement('div');
    titleElement.className = 'user-section-title';
    titleElement.textContent = `${title} - ${userList.length}`;
    section.appendChild(titleElement);

    userList.forEach(user => {
        const userElement = createUserElement(user);
        section.appendChild(userElement);
    });

    return section;
}

function getStatusTitle(status, isTyping) {
    if (isTyping) return 'Typing';
    switch (status) {
        case 'online': return 'Online';
        case 'idle': return 'Idle';
        case 'offline': return 'Offline';
        default: return '';
    }
}

function updateTypingIndicator() {
    const typingUsers = Array.from(users.entries())
        .filter(([id, user]) => user.isTyping && id !== storedUsername)
        .map(([id]) => id);

    const typingIndicator = document.getElementById('typing-indicator');
    if (typingUsers.length > 0) {
        typingIndicator.textContent = typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.join(', ')} are typing...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

const toggleDropdown = (dropdown) => {
    const allDropdowns = document.querySelectorAll('.member-dropdown');
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.style.display = 'none';
        }
    });
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
};

document.addEventListener('click', () => {
    const allDropdowns = document.querySelectorAll('.member-dropdown');
    allDropdowns.forEach(d => d.style.display = 'none');
});

const addTimestampIfNeeded = () => {
    const now = new Date();
    if (!lastTimestamp || now - lastTimestamp > timestampThreshold) {
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('date-divider');
        
        let timestampText = '';
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        if (now.toDateString() === today.toDateString()) {
            timestampText = `Today ${now.toLocaleString('en-AU', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
        } else if (now.toDateString() === yesterday.toDateString()) {
            timestampText = `Yesterday ${now.toLocaleString('en-AU', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
        } else {
            timestampText = now.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true });
        }

        timestampDiv.innerText = timestampText;
        chatBox.appendChild(timestampDiv);
        lastTimestamp = now;
    }
};

const displayMessage = (from, content, isOwnMessage, timestamp = new Date()) => {
    addTimestampIfNeeded(timestamp);

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = escapeHtml(from);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isOwnMessage ? 'message-right' : 'message-left');

    const messageText = document.createElement('p');
    messageText.textContent = escapeHtml(content);
    messageDiv.appendChild(messageText);

    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(usernameSpan);
    messageContainer.appendChild(messageDiv);

    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 使用 toISOString() 之前检查 timestamp 是否为有效日期
    const safeTimestamp = timestamp instanceof Date && !isNaN(timestamp) ? timestamp : new Date();
    saveMessage({ from, content, timestamp: safeTimestamp.toISOString() });
};

const sendMessage = (e) => {
    e.preventDefault();

    if (inputText.value.trim() === '' && selectedFiles.length === 0) {
        return;
    }

    const content = inputText.value.trim();

    if (content !== '') {
        ws.send(JSON.stringify({
            type: 'group-message',
            from: storedUsername,
            content: content
        }));
    }

    if (selectedFiles.length > 0) {
        sendFile();
    }

    inputText.value = '';
};

const displayFile = (from, file, isOwnFile) => {
    console.log('Displaying file:', file.name);
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

const receiveFile = (from, fileName, fileSize, fileType, fileData) => {
    console.log('Processing received file:', fileName);
    const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], { type: fileType });
    const url = URL.createObjectURL(blob);
    displayFile(from, { name: fileName, size: fileSize, url: url, type: fileType }, from === storedUsername);
};

let typingTimer;
const doneTypingInterval = 2000;

inputText.addEventListener('input', () => {
    if (!users.get(storedUsername)?.isTyping) {
        ws.send(JSON.stringify({
            type: 'typing-start',
            userId: storedUsername
        }));
        updateUserStatus(storedUsername, 'online', true);
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'typing-stop',
            userId: storedUsername
        }));
        updateUserStatus(storedUsername, 'online', false);
    }, doneTypingInterval);
});

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

    const fileCountInfo = document.createElement('div');
    fileCountInfo.textContent = `${selectedFiles.length}/5 files selected`;
    fileCountInfo.classList.add('file-count-info');
    filePreview.appendChild(fileCountInfo);
};

const removeFile = (index) => {
    selectedFiles.splice(index, 1);
    updateFilePreview();
    if (selectedFiles.length === 0) {
        fileTransferArea.style.display = 'none';
    }
};

filePreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file')) {
        removeFile(parseInt(e.target.dataset.index));
    }
});

const sendFile = () => {
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result.split(',')[1];
            const fileMessage = {
                type: 'file-transfer',
                from: storedUsername,
                fileName: escapeHtml(file.name),
                fileSize: file.size,
                fileType: file.type,
                fileData: fileData
            };
            console.log('Sending file:', fileMessage.fileName);
            ws.send(JSON.stringify(fileMessage));
        };
        reader.readAsDataURL(file);
    });
    selectedFiles = [];
    updateFilePreview();
    fileTransferArea.style.display = 'none';
};

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

const simulateFileTransfer = (fileSize) => {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        fileProgress.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                fileTransferArea.style.display = 'none';
                fileProgress.style.width = '0';
            }, 1000);
        }
    }, fileSize / 50);
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const monitorActivity = debounce(() => {
    clearTimeout(activityTimeout);
    setUserStatus('online');

    activityTimeout = setTimeout(() => {
        setUserStatus('idle');
    }, 60000); // 1分钟后设置为闲置
}, 1000);

const setUserStatus = (status) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'status-update',
            userId: storedUsername,
            status: status
        }));
        updateUserStatus(storedUsername, status);
    }
};

sendButton.addEventListener('click', sendMessage);

inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(e);
    }
});

attachFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

document.addEventListener('mousemove', monitorActivity);
document.addEventListener('keydown', monitorActivity);

window.addEventListener('focus', () => setUserStatus('online'));
window.addEventListener('blur', () => setUserStatus('offline'));

window.addEventListener('beforeunload', () => setUserStatus('offline'));

updateMemberList();

function joinChat() {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    
    clearErrors();

    let hasError = false;

    if (username.value.trim() === '') {
        showError(username, "Username is required");
        hasError = true;
    }

    if (password.value.trim() === '') {
        showError(password, "Password is required");
        hasError = true;
    }

    if (!hasError) {
        sessionStorage.setItem('username', username.value.trim());
        window.location.href = '/main.html';
    }
}

function showError(input, message) {
    const inputGroup = input.parentElement;
    inputGroup.classList.add('error');

    const errorMessage = document.createElement('p');
    errorMessage.classList.add('error-message');
    errorMessage.textContent = message;

    if (!inputGroup.querySelector('.error-message')) {
        inputGroup.appendChild(errorMessage);
    }
}

function clearErrors() {
    const inputGroups = document.querySelectorAll('.input-group');
    inputGroups.forEach(group => {
        group.classList.remove('error');
        const errorMessage = group.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    });
}

function register() {
    const username = document.getElementById('new-username');
    const password = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    let hasError = false;
    clearErrors();

    if (username.value.trim() === '') {
        showError(username, "Username is required");
        hasError = true;
    }

    if (password.value.trim() === '') {
        showError(password, "Password is required");
        hasError = true;
    }

    if (confirmPassword.value.trim() === '') {
        showError(confirmPassword, "Confirm password is required");
        hasError = true;
    } else if (confirmPassword.value !== password.value) {
        showError(confirmPassword, "Passwords do not match");
        hasError = true;
    }

    if (!hasError) {
        window.location.href = 'landing.html';
    }
}

function showError(input, message) {
    const inputGroup = input.parentElement;
    inputGroup.classList.add('error');

    let errorMessage = document.createElement('p');
    errorMessage.classList.add('error-message');
    errorMessage.textContent = message;

    if (!inputGroup.querySelector('.error-message')) {
        inputGroup.appendChild(errorMessage);
    }

    errorMessage.style.display = 'block';
}

function clearErrors() {
    const inputGroups = document.querySelectorAll('.input-group');
    inputGroups.forEach(group => {
        group.classList.remove('error');
        const errorMessage = group.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    });
}

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

function saveUserList(userList) {
    localStorage.setItem('userList', JSON.stringify(userList));
}

function loadUserList() {
    const savedList = localStorage.getItem('userList');
    return savedList ? JSON.parse(savedList) : [];
}

window.onload = () => {
    const savedUserList = loadUserList();
    if (savedUserList.length > 0) {
        updateMemberList(savedUserList);
    }
    loadChatHistory();
    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        if (storedUsername) {
            ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
        } else {
            window.location.href = '/';
        }
    };
    
    // 创建并添加消息铃铛
    const membersHeader = document.querySelector('.members-header');
    if (membersHeader) {
        membersHeader.appendChild(createMessageBell());
    }
};

const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', function() {
        sessionStorage.removeItem('username');
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        window.location.href = '/landing.html';
    });
}

window.addEventListener('load', () => {
    if (ws.readyState === WebSocket.OPEN) {
        if (storedUsername) {
            ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
        } else {
            window.location.href = '/';
        }
    } else {
        ws.addEventListener('open', () => {
            if (storedUsername) {
                ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
            } else {
                window.location.href = '/';
            }
        });
    }
    updateMemberList([]);  // 初始化空的成员列表
});

let currentChatType = 'group';
let currentRecipient = null;

const sendGroupMessage = (content) => {
    ws.send(JSON.stringify({
        type: 'group-message',
        from: storedUsername,
        content: content
    }));
};

const startPrivateChat = (recipientId) => {
    currentChatType = 'private';
    currentRecipient = recipientId;
    chatBox.innerHTML = '';
};

const switchToGroupChat = () => {
    currentChatType = 'group';
    currentRecipient = null;
    chatBox.innerHTML = '';
    loadChatHistory();
};

const displayWelcomeMessage = (username) => {
    addTimestampIfNeeded();
    const welcomeMessage = document.createElement('div');
    welcomeMessage.classList.add('welcome-message');
    welcomeMessage.textContent = `Welcome ${username} to the chat!`;
    chatBox.appendChild(welcomeMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
};

document.querySelector('.input-text').placeholder = 'Type a message...';
document.querySelector('.send-button').textContent = 'Send';

const updateMemberStatus = (userId, status) => {
    const memberIndex = members.findIndex(m => m.id === userId);
    if (memberIndex !== -1) {
        members[memberIndex].status = status;
        updateMemberList(members);
    }
};

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
         .replace(/`/g, "&#96;");
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

function createUserElement(user) {
    const userElement = document.createElement('div');
    userElement.className = 'user-item';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = '👨';

    const statusDot = document.createElement('span');
    statusDot.className = `status-dot ${user.status}`;
    if (user.isTyping) {
        statusDot.className += ' typing';
    }
    statusDot.title = getStatusTitle(user.status, user.isTyping);

    avatarContainer.appendChild(avatar);
    avatarContainer.appendChild(statusDot);

    const userName = document.createElement('span');
    userName.textContent = user.id;
    userName.className = 'user-name';

    userInfo.appendChild(avatarContainer);
    userInfo.appendChild(userName);

    userElement.appendChild(userInfo);

    if (user.id !== storedUsername) {
        const messageIcon = document.createElement('img');
        messageIcon.src = './images/message-icon.jpg';
        messageIcon.classList.add('message-icon');
        if (unreadMessages[user.id]) {
            messageIcon.classList.add('unread');
        }
        messageIcon.addEventListener('click', () => {
            window.location.href = `directMessage.html?user=${encodeURIComponent(user.id)}`;
        });
        userElement.appendChild(messageIcon);
    }

    return userElement;
}

function loadGroupChatHistory(history) {
    chatBox.innerHTML = '';
    history.forEach(message => {
        displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
    });
}