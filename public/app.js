const chatBox = document.querySelector('.chat-box');
const inputText = document.querySelector('.input-text');
const sendButton = document.querySelector('.send-button');
const fileInput = document.getElementById('file-input');
const attachFileButton = document.querySelector('.attach-file-button');
const fileTransferArea = document.querySelector('.file-transfer-area');
const filePreview = document.querySelector('.file-preview');
const fileProgress = document.querySelector('.file-progress');
const typingIndicator = document.getElementById('typing-indicator');
let selectedFile = null;
let typingTimeout;
let activityTimeout;
let isUserTyping = false;

const members = [
    { id: 'User1', status: 'online' },
    { id: 'User2', status: 'idle' },
    { id: 'User3', status: 'offline' }
];

const memberList = document.getElementById('member-list');

// Update the member list and count the number of online/offline members.
const updateMemberList = () => {
    memberList.innerHTML = ''; // Clear existing members.

    let onlineMembers = members.filter(member => member.status === 'online');
    let offlineMembers = members.filter(member => member.status !== 'online');

    // Render the number of online members and the list.
    const onlineTitle = document.createElement('div');
    onlineTitle.innerText = `Online - ${onlineMembers.length}`;
    onlineTitle.classList.add('member-section-title');
    memberList.appendChild(onlineTitle);

    onlineMembers.forEach(member => {
        const memberDiv = createMemberElement(member);
        memberList.appendChild(memberDiv);
    });

    // Render the divider.
    const divider = document.createElement('div');
    divider.classList.add('divider');
    memberList.appendChild(divider);

    // Render the number of offline members and the list.
    const offlineTitle = document.createElement('div');
    offlineTitle.innerText = `Offline - ${offlineMembers.length}`;
    offlineTitle.classList.add('member-section-title');
    memberList.appendChild(offlineTitle);

    offlineMembers.forEach(member => {
        const memberDiv = createMemberElement(member);
        memberList.appendChild(memberDiv);
    });
};

// Create member elements.
const createMemberElement = (member) => {
    const memberDiv = document.createElement('div');
    memberDiv.classList.add('member');

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');

    const statusDot = document.createElement('div');
    statusDot.classList.add('status-dot');

    if (member.id === 'User1' && isUserTyping) {
        statusDot.classList.add('typing-status'); // typing gif
    } else if (member.status === 'online') {
        statusDot.classList.add('online');
        statusDot.title = 'Online';
    } else if (member.status === 'idle') {
        statusDot.classList.add('idle');
        statusDot.title = 'Idle';
    } else if (member.status === 'offline') {
        statusDot.classList.add('offline');
        statusDot.title = 'Offline';
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = member.id;

    memberDiv.appendChild(avatar);
    avatar.appendChild(statusDot);
    memberDiv.appendChild(nameSpan);

    return memberDiv;
};

// Message sending logic.
const sendMessage = (e) => {
    e.preventDefault();

    if (inputText.value.trim() === '' && !selectedFile) {
        return; // Do not send empty messages.
    }

    const timestamp = new Date().toLocaleString('en-AU', { hour: 'numeric', minute: 'numeric', hour12: true });

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'message-right');

    if (inputText.value.trim() !== '') {
        const messageText = document.createElement('p');
        messageText.innerText = inputText.value;
        messageDiv.appendChild(messageText);
    }

    if (selectedFile) {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-attachment');
        
        const blobUrl = URL.createObjectURL(selectedFile);
        
        fileElement.innerHTML = `
            <a href="${blobUrl}" download="${selectedFile.name}" class="file-download-link no-underline">
                📎 ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)
            </a>
        `;
        
        messageDiv.appendChild(fileElement);
    
        simulateFileTransfer(selectedFile.size);
    }

    const messageTime = document.createElement('span');
    messageTime.classList.add('time');
    messageTime.innerText = timestamp;

    messageDiv.appendChild(messageTime);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    inputText.value = '';
    selectedFile = null;
    fileTransferArea.style.display = 'none';
};

// Typing indicator logic.
inputText.addEventListener('input', () => {
    clearTimeout(typingTimeout);
    isUserTyping = true;
    typingIndicator.style.display = 'block'; // Display "Typing..."
    updateMemberList();

    typingTimeout = setTimeout(() => {
        typingIndicator.style.display = 'none'; // Hide the "Typing..." indicator after 2 seconds of no input.
        isUserTyping = false;
        updateMemberList(); // Update status.
    }, 2000);
});

// File upload logic.
const handleFileSelect = (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) { // File upload logic with a 5MB limit.
        fileTransferArea.style.display = 'block';
        filePreview.innerHTML = `
            <img src="${URL.createObjectURL(selectedFile)}" alt="File preview">
            <span>${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)</span>
        `;
    } else {
        alert('文件大小不能超过5MB');
        selectedFile = null;
    }
};

// Simulate file transfer.
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

// Monitor user activity and manage the user's idle status.
const monitorActivity = () => {
    clearTimeout(activityTimeout);
    setUserStatus('online');

    activityTimeout = setTimeout(() => {
        setUserStatus('idle');
    }, 10000); // Change to idle status after 10 seconds of inactivity.
};

// Set user status.
const setUserStatus = (status) => {
    members[0].status = status; // Assume User1 is the current user.
    updateMemberList();
};

// Event listener.
sendButton.addEventListener('click', sendMessage);

inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(e);
    }
});

attachFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

// Monitor user activity.
document.addEventListener('keydown', monitorActivity);
document.addEventListener('mousemove', monitorActivity);
window.addEventListener('focus', () => setUserStatus('online'));
window.addEventListener('blur', () => setUserStatus('offline'));

// Initialize the member list.
updateMemberList();
