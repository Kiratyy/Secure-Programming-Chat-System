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

// Create member elements with dropdown functionality.
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

// Initialize the member list.
updateMemberList();

