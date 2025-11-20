// Manager Dispatch - Send letters to managers via WhatsApp
// Configuration
const WHATSAPP_PROXY_URL = '/api/whatsapp-proxy';

// State management
let allLetters = [];
let managers = [];
let selectedLetter = null;

// DOM Elements
const lettersTableContainer = document.getElementById('lettersTableContainer');
const loadingMessage = document.getElementById('loadingMessage');
const lettersTable = document.getElementById('lettersTable');
const lettersTableBody = document.getElementById('lettersTableBody');
const noData = document.getElementById('noData');
const searchInput = document.getElementById('searchInput');
const managerModal = document.getElementById('managerModal');
const closeModal = document.getElementById('closeModal');
const cancelSend = document.getElementById('cancelSend');
const confirmSend = document.getElementById('confirmSend');
const managerSelect = document.getElementById('managerSelect');
const letterDetails = document.getElementById('letterDetails');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Manager Dispatch page loaded');

    // Load managers first
    await loadManagers();

    // Load ready-to-send letters
    await loadReadyLetters();

    // Setup event listeners
    setupEventListeners();
});

// Load managers from WhatsApp API
async function loadManagers() {
    try {
        console.log('📞 Fetching managers from WhatsApp API...');

        const response = await fetch(WHATSAPP_PROXY_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch managers: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.users && Array.isArray(data.users)) {
            managers = data.users;
            console.log(`✅ Loaded ${managers.length} managers`);
            populateManagerDropdown();
        } else {
            throw new Error('Invalid response format from managers API');
        }
    } catch (error) {
        console.error('❌ Error loading managers:', error);
        notify.error('فشل تحميل قائمة المدراء. يرجى المحاولة مرة أخرى.');
    }
}

// Populate manager dropdown
function populateManagerDropdown() {
    managerSelect.innerHTML = '<option value="">-- اختر المدير --</option>';

    managers.forEach(manager => {
        const option = document.createElement('option');
        option.value = manager.number;
        option.textContent = `${manager.name} (${manager.number})`;
        option.dataset.name = manager.name;
        managerSelect.appendChild(option);
    });
}

// Load letters that are ready to send (جاهز للإرسال)
async function loadReadyLetters() {
    try {
        console.log('📄 Loading ready-to-send letters...');

        // Show loading state
        lettersTableContainer.classList.add('initial-loading');
        loadingMessage.style.display = 'block';
        lettersTable.style.display = 'none';
        noData.style.display = 'none';

        // Fetch all submissions
        const SPREADSHEET_ID = '1cLbTgbluZyWYHRouEgqHQuYQqKexHhu4st9ANzuaxGk';
        const API_KEY = 'AIzaSyBqF-nMxyZMrjmdFbULO9I_j75hXXaiq4A';
        const range = 'Submissions!A:P'; // Include column P for WhatsApp status
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch letters: ${response.statusText}`);
        }

        const data = await response.json();
        const rows = data.values || [];

        if (rows.length <= 1) {
            showNoData();
            return;
        }

        // Process rows (skip header)
        const processedLetters = rows.slice(1).map(row => ({
            id: row[0] || '',
            date: row[1] || '',
            type: row[3] || '',
            recipient: row[4] || '',
            subject: row[5] || '',
            content: row[6] || '',
            letterLink: row[8] || '',
            reviewStatus: row[9] || 'في الانتظار',
            sendStatus: row[10] || 'في الانتظار',
            reviewerName: row[12] || '',
            reviewNotes: row[13] || '',
            writer: row[14] || ''
        }));

        // Filter only "Ready to Send" letters
        allLetters = processedLetters.filter(letter =>
            letter.reviewStatus === 'جاهز للإرسال'
        );

        console.log(`✅ Found ${allLetters.length} ready-to-send letters`);

        if (allLetters.length === 0) {
            showNoData();
        } else {
            displayLetters(allLetters);
        }

    } catch (error) {
        console.error('❌ Error loading letters:', error);
        notify.error('فشل تحميل الخطابات. يرجى تحديث الصفحة.');
        showNoData();
    } finally {
        lettersTableContainer.classList.remove('initial-loading');
        loadingMessage.style.display = 'none';
    }
}

// Display letters in table
function displayLetters(letters) {
    lettersTableBody.innerHTML = '';

    if (letters.length === 0) {
        showNoData();
        return;
    }

    lettersTable.style.display = 'table';
    noData.style.display = 'none';

    letters.forEach(letter => {
        const row = document.createElement('tr');

        // Format date
        const formattedDate = letter.date ? new Date(letter.date).toLocaleDateString('ar-EG') : 'غير محدد';

        // Truncate long text
        const truncate = (text, length = 50) => {
            return text.length > length ? text.substring(0, length) + '...' : text;
        };

        // Send status display with styling
        let sendStatusHTML = '';
        let statusClass = '';

        switch(letter.sendStatus) {
            case 'تم الإرسال للمراجعة':
                statusClass = 'status-sent-for-review';
                sendStatusHTML = `<span class="status-badge ${statusClass}"><i class="fab fa-whatsapp"></i> ${letter.sendStatus}</span>`;
                break;
            case 'تم الإرسال':
                statusClass = 'status-sent';
                sendStatusHTML = `<span class="status-badge ${statusClass}"><i class="fas fa-check-circle"></i> ${letter.sendStatus}</span>`;
                break;
            case 'في الانتظار':
            default:
                statusClass = 'status-pending';
                sendStatusHTML = `<span class="status-badge ${statusClass}"><i class="fas fa-clock"></i> ${letter.sendStatus}</span>`;
                break;
        }

        row.innerHTML = `
            <td>${letter.id}</td>
            <td>${formattedDate}</td>
            <td>${letter.type}</td>
            <td>${truncate(letter.recipient)}</td>
            <td>${truncate(letter.subject)}</td>
            <td>${letter.writer}</td>
            <td>${sendStatusHTML}</td>
            <td>
                <button class="btn-send-whatsapp" data-letter-id="${letter.id}">
                    <i class="fab fa-whatsapp"></i>
                    طلب الموافقة
                </button>
            </td>
        `;

        lettersTableBody.appendChild(row);
    });

    // Add click handlers to send buttons
    document.querySelectorAll('.btn-send-whatsapp').forEach(button => {
        button.addEventListener('click', (e) => {
            const letterId = e.currentTarget.dataset.letterId;
            openManagerModal(letterId);
        });
    });
}

// Show no data message
function showNoData() {
    lettersTable.style.display = 'none';
    noData.style.display = 'block';
}

// Open manager selection modal
function openManagerModal(letterId) {
    selectedLetter = allLetters.find(letter => letter.id === letterId);

    if (!selectedLetter) {
        notify.error('لم يتم العثور على الخطاب');
        return;
    }

    // Populate letter details
    letterDetails.innerHTML = `
        <p><strong>الرقم المرجعي:</strong> ${selectedLetter.id}</p>
        <p><strong>المستلم:</strong> ${selectedLetter.recipient}</p>
        <p><strong>الموضوع:</strong> ${selectedLetter.subject}</p>
        <p><strong>نوع الخطاب:</strong> ${selectedLetter.type}</p>
        <p><strong>الكاتب:</strong> ${selectedLetter.writer}</p>
    `;

    // Reset manager selection
    managerSelect.value = '';
    confirmSend.disabled = true;

    // Show modal
    managerModal.classList.add('active');
}

// Close modal
function closeManagerModal() {
    managerModal.classList.remove('active');
    selectedLetter = null;
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (!searchTerm) {
            displayLetters(allLetters);
            return;
        }

        const filtered = allLetters.filter(letter =>
            letter.id.toLowerCase().includes(searchTerm) ||
            letter.recipient.toLowerCase().includes(searchTerm) ||
            letter.subject.toLowerCase().includes(searchTerm) ||
            letter.writer.toLowerCase().includes(searchTerm)
        );

        displayLetters(filtered);
    });

    // Modal close handlers
    closeModal.addEventListener('click', closeManagerModal);
    cancelSend.addEventListener('click', closeManagerModal);

    // Click outside modal to close
    managerModal.addEventListener('click', (e) => {
        if (e.target === managerModal) {
            closeManagerModal();
        }
    });

    // Manager selection change
    managerSelect.addEventListener('change', (e) => {
        confirmSend.disabled = !e.target.value;
    });

    // Confirm send button
    confirmSend.addEventListener('click', handleSendToManager);
}

// Handle sending letter to manager
function handleSendToManager() {
    if (!selectedLetter || !managerSelect.value) {
        return;
    }

    const managerPhone = managerSelect.value;
    const managerName = managerSelect.options[managerSelect.selectedIndex].dataset.name;

    // Store letter info before closing modal (important!)
    const letterId = selectedLetter.id;

    // Show confirmation using callback style
    notify.confirm(
        `هل أنت متأكد من إرسال الخطاب "${letterId}" إلى المدير ${managerName} عبر واتساب؟`,
        async () => {
            // User confirmed - proceed with sending

            // Close modal and show loading
            closeManagerModal();
            loadingOverlay.classList.add('active');

            try {
                console.log('📤 Sending letter to WhatsApp...', {
                    letter_id: letterId,
                    phone_number: managerPhone,
                    manager_name: managerName
                });

                // Send to WhatsApp API
                const response = await fetch(WHATSAPP_PROXY_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phone_number: managerPhone,
                        letter_id: letterId
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Success
                    console.log('✅ Letter sent successfully:', data);

                    // Update Google Sheets with WhatsApp status
                    await updateWhatsAppStatus(letterId, managerName, managerPhone);

                    // Show success message
                    notify.success(`تم إرسال الخطاب بنجاح إلى ${managerName} عبر واتساب`);

                    // Reload letters to show updated status
                    await loadReadyLetters();

                } else if (response.status === 409) {
                    // Phone already assigned error
                    console.warn('⚠️ Phone already assigned:', data);
                    notify.warning(data.message || 'هذا الرقم مشغول حالياً بخطاب آخر');
                } else {
                    throw new Error(data.message || 'Failed to send letter');
                }

            } catch (error) {
                console.error('❌ Error sending letter:', error);
                notify.error('فشل إرسال الخطاب. يرجى المحاولة مرة أخرى.');
            } finally {
                loadingOverlay.classList.remove('active');
            }
        },
        () => {
            // User cancelled - do nothing
            console.log('❌ User cancelled send');
        }
    );
}

// Update Send Status in Google Sheets when sent for approval
async function updateWhatsAppStatus(letterId, managerName, managerPhone) {
    try {
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzUPSTsNajKH8ffg1fT4Wri9T-63eJYn4_zquPAkdPLF7c5g4nr89IXvbbFhyWEce9T/exec';

        // Update Send Status to "Sent for Review"
        const sendStatus = 'تم الإرسال للمراجعة';
        const timestamp = new Date().toISOString();

        const formData = new FormData();
        formData.append('action', 'updateWhatsAppStatus');
        formData.append('letterId', letterId);
        formData.append('whatsappStatus', sendStatus);
        formData.append('managerName', managerName);
        formData.append('managerPhone', managerPhone);
        formData.append('timestamp', timestamp);

        console.log('📝 Updating Send Status in Google Sheets...', {
            letterId,
            sendStatus,
            managerName
        });

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Required for Apps Script
        });

        console.log('✅ WhatsApp status updated in sheets');
        return true;

    } catch (error) {
        console.error('❌ Error updating WhatsApp status:', error);
        // Don't throw - this is not critical
        return false;
    }
}
