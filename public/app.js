const chatBox = document.querySelector('.chat-box');
const inputText = document.querySelector('.input-text');
const sendButton = document.querySelector('.send-button');
const fileInput = document.getElementById('file-input');
const attachFileButton = document.querySelector('.attach-file-button');
const fileTransferArea = document.querySelector('.file-transfer-area');
const filePreview = document.querySelector('.file-preview');
const fileProgress = document.querySelector('.file-progress');

let selectedFile = null;

const sendMessage = (e) => {
    e.preventDefault();

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

// Event listeners
sendButton.addEventListener('click', sendMessage);

inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(e);
    }
});

attachFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

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

