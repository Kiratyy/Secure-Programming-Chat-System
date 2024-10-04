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
let lastTimestamp = null; // Track the last timestamp to determine if a new one should be shown
const timestampThreshold = 30 * 60 * 1000; // 30 minutes
const storedUsername = localStorage.getItem('username'); // Get stored username

let members = [];

const memberList = document.getElementById('member-list');

// WebSocket connection setup
const ws = new WebSocket('ws://localhost:8080');

// Register the user to the WebSocket server
ws.onopen = () => {
    console.log('Connected to WebSocket server');
    ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
};

// Handle WebSocket errors
ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

let typingUsers = new Set();

// Update typing users display
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
        chatHistory.shift(); // Remove the oldest message
    }
};

const loadChatHistory = () => {
    chatBox.innerHTML = ''; // Clear the chat box
    chatHistory.forEach(message => {
        displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
    });
};

// Add an object to store unread private messages
let unreadPrivateMessages = {};

// Handle incoming WebSocket messages
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);

    switch (message.type) {
        case 'member-list':
            if (Array.isArray(message.data)) {
                updateMemberList(message.data);
            } else {
                console.error('Invalid member list data:', message.data);
            }
            break;
        case 'group-message':
            displayMessage(message.from, message.content, message.from === storedUsername, new Date(message.timestamp));
            break;
        case 'file-transfer':
            console.log('Received file:', message.fileName);
            receiveFile(message.from, message.fileName, message.fileSize, message.fileType, message.fileData);
            break;
        case 'private-message':
            handlePrivateMessage(message);
            break;
        case 'typing-start':
        case 'typing-stop':
            if (message.userId !== storedUsername) {
                updateMemberTypingStatus(message.userId, message.type === 'typing-start');
            }
            break;
        default:
            console.log('Unhandled message type:', message.type);
    }
};

// Function to update member typing status
const updateMemberTypingStatus = (userId, isTyping) => {
    const member = members.find(m => m.id === userId);
    if (member) {
        member.isTyping = isTyping;
        updateMemberList(members);
    }
};

// Update the member list and count the number of online/offline members
const updateMemberList = (data) => {
    if (!data || !Array.isArray(data)) {
        console.error('Invalid member list data:', data);
        return;
    }

    // Only update DOM when the member list changes
    if (JSON.stringify(members) !== JSON.stringify(data)) {
        members = data;
        memberList.innerHTML = '';

        const membersHeader = document.createElement('div');
        membersHeader.classList.add('members-header');

        const membersTitle = document.createElement('div');
        membersTitle.innerText = 'Members';
        membersTitle.classList.add('members-title');

        const messageBell = createMessageBell();

        membersHeader.appendChild(membersTitle);
        membersHeader.appendChild(messageBell);

        memberList.appendChild(membersHeader);

        // Add divider
        const membersDivider = document.createElement('div');
        membersDivider.classList.add('members-divider');
        memberList.appendChild(membersDivider);

        let onlineMembers = data.filter(member => member.status === 'online' || member.isTyping);
        let offlineMembers = data.filter(member => member.status === 'offline' && !member.isTyping);

        const onlineTitle = document.createElement('div');
        onlineTitle.innerText = `Online - ${onlineMembers.length}`;
        onlineTitle.classList.add('member-section-title');
        memberList.appendChild(onlineTitle);

        onlineMembers.forEach(member => {
            const memberDiv = createMemberElement(member);
            memberList.appendChild(memberDiv);
        });

        if (offlineMembers.length > 0) {
            const offlineDivider = document.createElement('div');
            offlineDivider.classList.add('members-divider');
            memberList.appendChild(offlineDivider);

            const offlineTitle = document.createElement('div');
            offlineTitle.innerText = `Offline - ${offlineMembers.length}`;
            offlineTitle.classList.add('member-section-title');
            memberList.appendChild(offlineTitle);

            offlineMembers.forEach(member => {
                const memberDiv = createMemberElement(member);
                memberList.appendChild(memberDiv);
            });
        }

        saveUserList(data);
    }
};

// Create member elements with dropdown functionality
const createMemberElement = (member) => {
    const memberDiv = document.createElement('div');
    memberDiv.classList.add('member');
    memberDiv.setAttribute('data-user-id', member.id);

    const memberInfo = document.createElement('div');
    memberInfo.classList.add('member-info');

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.innerHTML = '🧑';

    const statusDot = document.createElement('div');
    statusDot.classList.add('status-dot');

    if (member.isTyping) {
        statusDot.classList.add('typing-status');
        statusDot.title = 'Typing';
    } else if (member.status === 'online') {
        statusDot.classList.add('online');
        statusDot.title = 'Online';
    } else if (member.status === 'offline') {
        statusDot.classList.add('offline');
        statusDot.title = 'Offline';
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = member.id;

    memberInfo.appendChild(avatar);
    avatar.appendChild(statusDot);
    memberInfo.appendChild(nameSpan);

    memberDiv.appendChild(memberInfo);

    if (member.id !== storedUsername) {
        const messageIcon = document.createElement('img');
        messageIcon.src = './images/message-icon.jpg';
        messageIcon.classList.add('message-icon');
        messageIcon.addEventListener('click', () => {
            window.location.href = `directMessage.html?user=${encodeURIComponent(member.id)}`;
        });

        if (unreadPrivateMessages[member.id] && unreadPrivateMessages[member.id].length > 0) {
            const notificationDot = document.createElement('div');
            notificationDot.classList.add('notification-dot');
            messageIcon.appendChild(notificationDot);
        }

        memberDiv.appendChild(messageIcon);
    }

    return memberDiv;
};

// Toggle dropdown visibility
const toggleDropdown = (dropdown) => {
    const allDropdowns = document.querySelectorAll('.member-dropdown');
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.style.display = 'none';
        }
    });
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
};

// Close all dropdowns when clicking outside
document.addEventListener('click', () => {
    const allDropdowns = document.querySelectorAll('.member-dropdown');
    allDropdowns.forEach(d => d.style.display = 'none');
});

// Function to add a timestamp at the top of a message if necessary
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

// Function to display messages
const displayMessage = (from, content, isOwnMessage, timestamp = new Date()) => {
    addTimestampIfNeeded(timestamp);

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = from;

    messageContainer.appendChild(avatarDiv);
    messageContainer.appendChild(usernameSpan);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isOwnMessage ? 'message-right' : 'message-left');

    const messageText = document.createElement('p');
    messageText.innerText = content;
    messageDiv.appendChild(messageText);

    messageContainer.appendChild(messageDiv);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    saveMessage({ from, content, timestamp: timestamp.toISOString() });
};

// Function to send a message
const sendMessage = (e) => {
    e.preventDefault();

    if (inputText.value.trim() === '' && selectedFiles.length === 0) {
        return; // Do not send empty messages
    }

    const content = inputText.value.trim();

    // Send text message
    if (content !== '') {
        ws.send(JSON.stringify({
            type: 'group-message',
            from: storedUsername,
            content: content
        }));
    }

    // Send files
    if (selectedFiles.length > 0) {
        sendFile();
    }

    inputText.value = '';
};

// Function to display file
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

// Function to receive file
const receiveFile = (from, fileName, fileSize, fileType, fileData) => {
    console.log('Processing received file:', fileName);
    const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], { type: fileType });
    const url = URL.createObjectURL(blob);
    displayFile(from, { name: fileName, size: fileSize, url: url, type: fileType }, from === storedUsername);
};

let typingTimer;
const doneTypingInterval = 2000; // 2 seconds

inputText.addEventListener('input', () => {
    if (!isUserTyping) {
        isUserTyping = true;
        ws.send(JSON.stringify({
            type: 'typing-start',
            userId: storedUsername
        }));
        updateMemberTypingStatus(storedUsername, true);
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isUserTyping = false;
        ws.send(JSON.stringify({
            type: 'typing-stop',
            userId: storedUsername
        }));
        updateMemberTypingStatus(storedUsername, false);
    }, doneTypingInterval);
});

// File upload logic
const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    if (selectedFiles.length + newFiles.length > 5) {
        showWarning("You can only send up to 5 files at once.");
        return;
    }
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFilePreview();
    fileTransferArea.style.display = 'block';
    
    // Reset the file input to allow selecting the same file again
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

    // Add file count info
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
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData: fileData
            };
            console.log('Sending file:', fileMessage.fileName);
            ws.send(JSON.stringify(fileMessage));
            // Remove this line to avoid duplicating the file display
            // displayFile(storedUsername, { name: file.name, size: file.size, url: URL.createObjectURL(file), type: file.type }, true);
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

// Simulate file transfer progress
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

// Add debounce function
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

// Modify monitorActivity function
const monitorActivity = debounce(() => {
    clearTimeout(activityTimeout);
    setUserStatus('online');

    activityTimeout = setTimeout(() => {
        setUserStatus('idle');
    }, 300000); // Change to 5 minutes after becoming idle
}, 1000); // 1 second debounce time

// Modify setUserStatus function
const setUserStatus = (status) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'status-update',
            userId: storedUsername,
            status: status
        }));
    }
};

// Event listener for sending a message
sendButton.addEventListener('click', sendMessage);

// Send message on Enter key press
inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(e);
    }
});

// File upload event listener
attachFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

// Add event listeners for activity monitoring
document.addEventListener('mousemove', monitorActivity);
document.addEventListener('keydown', monitorActivity);

// Update status when window is focused or blurred
window.addEventListener('focus', () => setUserStatus('online'));
window.addEventListener('blur', () => setUserStatus('offline'));

// Update status when page is about to unload
window.addEventListener('beforeunload', () => setUserStatus('offline'));

// Initialize the member list on load
updateMemberList();

// Login functionality

// Function to handle username input and redirect to the chat page
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
        localStorage.setItem('username', username.value.trim());
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

// Function to handle form submission on register page
function register() {
    const username = document.getElementById('new-username');
    const password = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    let hasError = false;
    clearErrors(); // Clear any previous errors

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

// Function to show error message
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

// Function to clear previous errors
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

// Save user list to local storage
function saveUserList(userList) {
    localStorage.setItem('userList', JSON.stringify(userList));
}

// Load user list from local storage
function loadUserList() {
    const savedList = localStorage.getItem('userList');
    return savedList ? JSON.parse(savedList) : [];
}

// Load user list and chat history on page load
window.onload = () => {
    const savedUserList = loadUserList();
    if (savedUserList.length > 0) {
        updateMemberList(savedUserList);
    }
    loadChatHistory(); // Only call once
    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
    };
};

// Modify handling private messages
const handlePrivateMessage = (message) => {
    if (message.to === storedUsername) {
        if (!unreadPrivateMessages[message.from]) {
            unreadPrivateMessages[message.from] = [];
        }
        unreadPrivateMessages[message.from].push(message);
        updateMessageBellIcon();
        updateMemberMessageIcon(message.from);
        updatePrivateMessageList(); // Update private message preview in real-time
    }
};

// Modify updating message bell icon
const updateMessageBellIcon = () => {
    const bellIcon = document.querySelector('.message-bell-icon');
    if (Object.keys(unreadPrivateMessages).length > 0) {
        bellIcon.src = './images/notification-icon.webp';
    } else {
        bellIcon.src = './images/message-bell-icon.png';
    }
};

// Modify updating private message list
const updatePrivateMessageList = () => {
    const messageList = document.querySelector('.private-message-list');
    messageList.innerHTML = '';

    Object.entries(unreadPrivateMessages).forEach(([userId, messages]) => {
        const latestMessage = messages[messages.length - 1];
        const messageItem = createMessageItem(userId, latestMessage);
        messageList.appendChild(messageItem);
    });

    // If private message popup is open, update its content
    const popup = document.querySelector('.private-message-popup');
    if (popup.style.display === 'block') {
        popup.querySelector('.private-message-list').innerHTML = messageList.innerHTML;
    }
};

// Create message item
const createMessageItem = (userId, message) => {
    const messageItem = document.createElement('div');
    messageItem.classList.add('private-message-item');

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.innerHTML = '🧑';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    const username = document.createElement('span');
    username.classList.add('username');
    username.textContent = message.from;

    const content = document.createElement('p');
    content.textContent = message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content;

    const time = document.createElement('span');
    time.classList.add('time');
    time.textContent = formatMessageTime(new Date(message.timestamp));

    messageContent.appendChild(username);
    messageContent.appendChild(content);
    messageContent.appendChild(time);

    messageItem.appendChild(avatar);
    messageItem.appendChild(messageContent);

    messageItem.addEventListener('click', () => {
        window.location.href = `directMessage.html?user=${encodeURIComponent(userId)}`;
    });

    return messageItem;
};

// Add logout functionality
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('username');
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        window.location.href = '/landing.html';
    });
}

// Ensure WebSocket connection is initialized on page load
window.addEventListener('load', () => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
    } else {
        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'register', userId: storedUsername }));
        });
    }
});

// Add createMessageBell function
const createMessageBell = () => {
    const bellContainer = document.createElement('div');
    bellContainer.classList.add('message-bell-container');

    const bellIcon = document.createElement('img');
    bellIcon.src = './images/message-bell-icon.png';
    bellIcon.classList.add('message-bell-icon');
    bellIcon.addEventListener('click', togglePrivateMessagePopup);

    bellContainer.appendChild(bellIcon);

    return bellContainer;
};

// Add createPrivateMessagePopup function
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

// Modify togglePrivateMessagePopup function
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

// Ensure private message popup is created on page load
window.addEventListener('load', () => {
    createPrivateMessagePopup();
});