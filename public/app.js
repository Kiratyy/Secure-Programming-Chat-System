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
let lastTimestamp = null; // Track the last timestamp to determine if a new one should be shown
const timestampThreshold = 30 * 60 * 1000; // 30 minutes
const storedUsername = localStorage.getItem('username'); // Get stored username

const members = [
    { id: storedUsername || 'User1', status: 'online' },
    { id: 'User2', status: 'idle' },
    { id: 'User3', status: 'offline' }
];

const memberList = document.getElementById('member-list');

// Update the member list and count the number of online/offline members
const updateMemberList = () => {
    memberList.innerHTML = ''; // Clear existing members

    let onlineMembers = members.filter(member => member.status === 'online');
    let offlineMembers = members.filter(member => member.status !== 'online');

    // Render the number of online members and the list
    const onlineTitle = document.createElement('div');
    onlineTitle.innerText = `Online - ${onlineMembers.length}`;
    onlineTitle.classList.add('member-section-title');
    memberList.appendChild(onlineTitle);

    onlineMembers.forEach(member => {
        const memberDiv = createMemberElement(member);
        memberList.appendChild(memberDiv);
    });

    // Render the divider
    const divider = document.createElement('div');
    divider.classList.add('divider');
    memberList.appendChild(divider);

    // Render the number of offline members and the list
    const offlineTitle = document.createElement('div');
    offlineTitle.innerText = `Offline - ${offlineMembers.length}`;
    offlineTitle.classList.add('member-section-title');
    memberList.appendChild(offlineTitle);

    offlineMembers.forEach(member => {
        const memberDiv = createMemberElement(member);
        memberList.appendChild(memberDiv);
    });
};

// Create member elements with dropdown functionality
const createMemberElement = (member) => {
    const memberDiv = document.createElement('div');
    memberDiv.classList.add('member');

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.innerHTML = '🧑'; // Avatar for both chat and sidebar

    const statusDot = document.createElement('div');
    statusDot.classList.add('status-dot');

    if (member.id === storedUsername && isUserTyping) {
        statusDot.classList.add('typing-status'); // Typing gif
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

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.classList.add('member-dropdown');
    dropdown.style.display = 'none';

    const directMessageBtn = document.createElement('button');
    directMessageBtn.textContent = 'Direct Message';
    directMessageBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the dropdown from toggling
        // Redirect to directMessage.html with the member's ID as a query parameter
        window.location.href = `directMessage.html?user=${encodeURIComponent(member.id)}`;
    });

    dropdown.appendChild(directMessageBtn);
    memberDiv.appendChild(dropdown);

    // Toggle dropdown on click
    memberDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dropdown);
    });

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

// Message sending logic
const sendMessage = (e) => {
    e.preventDefault();

    if (inputText.value.trim() === '' && !selectedFile) {
        return; // Do not send empty messages
    }

    addTimestampIfNeeded(); // Add timestamp if necessary

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container'); // New container for each message

    // Add avatar and username outside of message bubble
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '🧑';  // Simple avatar (replace with actual avatar if needed)

    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = storedUsername;

    messageContainer.appendChild(avatarDiv); // Add avatar
    messageContainer.appendChild(usernameSpan); // Add username

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'message-right'); // Message bubble

    // Add message text if available
    if (inputText.value.trim() !== '') {
        const messageText = document.createElement('p');
        messageText.innerText = inputText.value;
        messageDiv.appendChild(messageText);
    }

    // Handle file attachments
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

    messageContainer.appendChild(messageDiv); // Add message bubble to container
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    inputText.value = '';
    selectedFile = null;
    fileTransferArea.style.display = 'none'; // Hide file transfer UI
};

// Typing indicator logic
inputText.addEventListener('input', () => {
    clearTimeout(typingTimeout);
    isUserTyping = true;
    typingIndicator.style.display = 'block'; // Show typing indicator
    typingIndicator.innerText = `${storedUsername} is typing...`; // Customize typing indicator with username
    updateMemberList(); // Update member list to show typing status

    typingTimeout = setTimeout(() => {
        typingIndicator.style.display = 'none'; // Hide typing indicator
        isUserTyping = false;
        updateMemberList(); // Update member list after typing stops
    }, 2000); // Timeout to hide indicator after 2 seconds of no input
});

// File upload logic
const handleFileSelect = (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) { // Check file size (5MB max)
        fileTransferArea.style.display = 'block';
        filePreview.innerHTML = `
            <img src="${URL.createObjectURL(selectedFile)}" alt="File preview">
            <span>${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)</span>
        `;
    } else {
        alert('File size cannot exceed 5MB');
        selectedFile = null;
    }
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

// Monitor user activity and manage the user's idle status
const monitorActivity = () => {
    clearTimeout(activityTimeout);
    setUserStatus('online');

    activityTimeout = setTimeout(() => {
        setUserStatus('idle');
    }, 10000); // Change to idle status after 10 seconds of inactivity
};

// Set user status
const setUserStatus = (status) => {
    members[0].status = status; // Assume the current user is User1
    updateMemberList(); // Update the member list
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

// Monitor activity (for status)
document.addEventListener('keydown', monitorActivity);
document.addEventListener('mousemove', monitorActivity);
window.addEventListener('focus', () => setUserStatus('online'));
window.addEventListener('blur', () => setUserStatus('offline'));

// Initialize the member list on load
updateMemberList();

// Login functionality

// Function to handle username input and redirect to the chat page
function joinChat() {
    const username = document.getElementById('username').value.trim();
    if (username) {
        localStorage.setItem('username', username);
        window.location.href = '/main.html'; // Redirect to chat page
    } else {
        alert('Please enter your name');
    }
}

// Function to check if the 'Enter' key is pressed on the login page
function checkEnter(event) {
    if (event.key === 'Enter') {
        joinChat(); // Call the joinChat function when Enter is pressed
    }
}

// Ensure that the username is displayed on the chat page
window.onload = () => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
        document.getElementById('stored-username').textContent = storedUsername;
        members[0].id = storedUsername; // Update sidebar User1 name to the logged-in username
        updateMemberList();
    }
};

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
