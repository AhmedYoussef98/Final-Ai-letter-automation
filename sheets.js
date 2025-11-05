// Optimized Google Sheets API Configuration
const SPREADSHEET_ID = '1cLbTgbluZyWYHRouEgqHQuYQqKexHhu4st9ANzuaxGk';
const API_KEY = 'AIzaSyBqF-nMxyZMrjmdFbULO9I_j75hXXaiq4A';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzUPSTsNajKH8ffg1fT4Wri9T-63eJYn4_zquPAkdPLF7c5g4nr89IXvbbFhyWEce9T/exec';

// OPTIMIZATION 1: Caching System
class LetterCache {
    constructor() {
        this.cache = new Map();
        this.lastFetch = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.CACHE_KEY = 'letterHistoryCache';
        this.VERSION_KEY = 'letterCacheVersion';
        
        // Load from localStorage if available
        this.loadFromStorage();
    }
    
    saveToStorage() {
        try {
            const cacheData = {
                data: Array.from(this.cache.entries()),
                lastFetch: this.lastFetch,
                version: Date.now()
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
            localStorage.setItem(this.VERSION_KEY, cacheData.version.toString());
        } catch (error) {
            console.warn('Failed to save cache to localStorage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (cached) {
                const cacheData = JSON.parse(cached);
                this.cache = new Map(cacheData.data);
                this.lastFetch = cacheData.lastFetch;
                
                // Check if cache is still valid
                if (this.isExpired()) {
                    this.clear();
                }
            }
        } catch (error) {
            console.warn('Failed to load cache from localStorage:', error);
            this.clear();
        }
    }
    
    isExpired() {
        return !this.lastFetch || (Date.now() - this.lastFetch) > this.CACHE_DURATION;
    }
    
    get(key) {
        if (this.isExpired()) {
            return null;
        }
        return this.cache.get(key);
    }
    
    set(key, value) {
        this.cache.set(key, value);
        this.lastFetch = Date.now();
        this.saveToStorage();
    }
    
    clear() {
        this.cache.clear();
        this.lastFetch = null;
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.VERSION_KEY);
    }
    
    invalidate() {
        this.clear();
    }
}

// Global cache instance
const letterCache = new LetterCache();

// OPTIMIZATION 2: Pagination System
class LetterPagination {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20; // Show 20 letters per page
        this.totalItems = 0;
        this.totalPages = 0;
    }
    
    setTotal(total) {
        this.totalItems = total;
        this.totalPages = Math.ceil(total / this.itemsPerPage);
    }
    
    getPageData(allLetters) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return allLetters.slice(startIndex, endIndex);
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            return true;
        }
        return false;
    }
    
    nextPage() {
        return this.goToPage(this.currentPage + 1);
    }
    
    prevPage() {
        return this.goToPage(this.currentPage - 1);
    }
}

// Global pagination instance
const letterPagination = new LetterPagination();

// OPTIMIZATION 3: Optimized Data Loading with Range Optimization
async function loadSubmissionsDataOptimized(forceRefresh = false) {
    console.time('loadSubmissionsData');
    
    // Check cache first
    const cacheKey = 'submissions_data';
    if (!forceRefresh) {
        const cached = letterCache.get(cacheKey);
        if (cached) {
            console.log('📦 Loading from cache:', cached.length, 'letters');
            console.timeEnd('loadSubmissionsData');
            return cached;
        }
    }
    
    try {
        // OPTIMIZATION: Load only necessary columns and use batch requests
        const range = 'Submissions!A:O'; // Specify exact range
        const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
        
        console.log('🔄 Fetching fresh data from Google Sheets...');
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            const submissions = processSubmissionsOptimized(data.values.slice(1)); // Skip header
            
            // Cache the result
            letterCache.set(cacheKey, submissions);
            
            console.log('✅ Fresh data loaded:', submissions.length, 'letters');
            console.timeEnd('loadSubmissionsData');
            return submissions;
        }
        
        console.timeEnd('loadSubmissionsData');
        return [];
    } catch (error) {
        console.error('❌ Error loading submissions:', error);
        console.timeEnd('loadSubmissionsData');
        
        // Return cached data if available, even if expired
        const cached = letterCache.cache.get(cacheKey);
        if (cached) {
            console.log('🔄 Fallback to cached data due to error');
            return cached;
        }
        
        return [];
    }
}

// OPTIMIZATION 4: Faster Data Processing
function processSubmissionsOptimized(submissions) {
    console.time('processSubmissions');
    
    // Use array map for better performance than forEach
    const processed = submissions.map(row => {
        // Pre-compute values to avoid repeated access
        const id = row[0] || '';
        const date = row[1] || '';
        const type = row[3] || '';
        const recipient = row[4] || '';
        const subject = row[5] || '';
        const content = row[6] || '';
        const letterLink = row[8] || '';
        const reviewStatus = row[9] || 'في الانتظار';
        const sendStatus = row[10] || 'في الانتظار';
        const reviewerName = row[12] || '';
        const reviewNotes = row[13] || '';
        const writer = row[14] || '';
        
        return {
            id,
            date,
            type,
            recipient,
            subject,
            content,
            letterLink,
            reviewStatus,
            sendStatus,
            reviewerName,
            reviewNotes,
            writer
        };
    }).filter(letter => letter.id); // Remove empty rows
    
    console.timeEnd('processSubmissions');
    return processed;
}

// OPTIMIZATION 5: Virtual Scrolling / Lazy Loading for Large Datasets
class VirtualLetterRenderer {
    constructor(containerId, itemHeight = 100) {
        this.container = document.getElementById(containerId);
        this.itemHeight = itemHeight;
        this.visibleItems = Math.ceil(window.innerHeight / itemHeight) + 5; // Buffer
        this.startIndex = 0;
        this.endIndex = this.visibleItems;
        this.allLetters = [];
        this.filteredLetters = [];
    }
    
    setData(letters) {
        this.allLetters = letters;
        this.filteredLetters = letters;
        this.render();
    }
    
    filter(filteredLetters) {
        this.filteredLetters = filteredLetters;
        this.startIndex = 0;
        this.endIndex = Math.min(this.visibleItems, filteredLetters.length);
        this.render();
    }
    
    render() {
        if (!this.container) return;

        const visibleLetters = this.filteredLetters.slice(this.startIndex, this.endIndex);

        // Clear container
        this.container.innerHTML = '';

        // Create virtual spacer for items above
        if (this.startIndex > 0) {
            const topSpacer = document.createElement('div');
            topSpacer.style.height = `${this.startIndex * this.itemHeight}px`;
            this.container.appendChild(topSpacer);
        }

        // Render visible items
        visibleLetters.forEach(letter => {
            const row = this.createLetterRow(letter);
            this.container.appendChild(row);
        });

        // Create virtual spacer for items below
        const remainingItems = this.filteredLetters.length - this.endIndex;
        if (remainingItems > 0) {
            const bottomSpacer = document.createElement('div');
            bottomSpacer.style.height = `${remainingItems * this.itemHeight}px`;
            this.container.appendChild(bottomSpacer);
        }

        // Initialize comment buttons after rendering
        initializeCommentButtons();
    }
    
    createLetterRow(letter) {
        const row = document.createElement('tr');
        const reviewStatusClass = getStatusClass(letter.reviewStatus);
        const sendStatusClass = getStatusClass(letter.sendStatus);
        
        row.innerHTML = `
            <td>${letter.id}</td>
            <td>${letter.date}</td>
            <td>${translateLetterType(letter.type)}</td>
            <td><span class="status-badge ${reviewStatusClass}">${displayStatusLabel(letter.reviewStatus)}</span></td>
            <td><span class="status-badge ${sendStatusClass}">${displayStatusLabel(letter.sendStatus)}</span></td>
            <td>${letter.recipient}</td>
            <td>${letter.subject}</td>
            <td>${letter.reviewerName || "-"}</td>
            <td class="comment-cell">${renderCommentCell(letter.reviewNotes, letter.id)}</td>
            <td>${letter.writer || "-"}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-icon" onclick="reviewLetter('${letter.id}')" title="مراجعة">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-icon" onclick="downloadLetter('${letter.id}')" title="تحميل وطباعة">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-icon delete" onclick="deleteLetter('${letter.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
}

// OPTIMIZATION 6: Debounced Search and Filters
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

// OPTIMIZATION 7: Improved Main Loading Function
async function loadLetterHistoryOptimized() {
    const tableBody = document.getElementById("lettersTableBody");
    const noData = document.getElementById("noData");
    const loadingIndicator = showLoadingIndicator();
    
    try {
        console.log('🚀 Starting optimized letter history load...');
        
        // Load data with caching
        const letters = await loadSubmissionsDataOptimized();
        
        if (letters.length === 0) {
            tableBody.style.display = "none";
            noData.style.display = "block";
        } else {
            console.log(`📊 Loaded ${letters.length} letters`);
            
            // Set up pagination
            letterPagination.setTotal(letters.length);
            
            // Initial render with pagination
            renderLettersTableOptimized(letters);
            setupFiltersOptimized(letters);
            setupPaginationControls(letters);
            
            // Update UI
            tableBody.style.display = "table-row-group";
            noData.style.display = "none";
        }
    } catch (error) {
        console.error('❌ Error in loadLetterHistoryOptimized:', error);
        showErrorMessage('حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.');
    } finally {
        hideLoadingIndicator(loadingIndicator);
    }
}

// OPTIMIZATION 8: Optimized Rendering with Pagination
function renderLettersTableOptimized(allLetters) {
    console.time('renderLettersTable');
    
    const tableBody = document.getElementById("lettersTableBody");
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get("highlight");
    
    // Get current page data
    const pageLetters = letterPagination.getPageData(allLetters);
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    pageLetters.forEach(letter => {
        const row = document.createElement("tr");
        
        if (highlightId && letter.id === highlightId) {
            row.classList.add("highlighted-letter");
        }
        
        const reviewStatusClass = getStatusClass(letter.reviewStatus);
        const sendStatusClass = getStatusClass(letter.sendStatus);
        
        row.innerHTML = `
            <td>${letter.id}</td>
            <td>${letter.date}</td>
            <td>${translateLetterType(letter.type)}</td>
            <td><span class="status-badge ${reviewStatusClass}">${displayStatusLabel(letter.reviewStatus)}</span></td>
            <td><span class="status-badge ${sendStatusClass}">${displayStatusLabel(letter.sendStatus)}</span></td>
            <td>${letter.recipient}</td>
            <td>${letter.subject}</td>
            <td>${letter.reviewerName || "-"}</td>
            <td class="comment-cell">${renderCommentCell(letter.reviewNotes, letter.id)}</td>
            <td>${letter.writer || "-"}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-icon" onclick="reviewLetter('${letter.id}')" title="مراجعة">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-icon" onclick="downloadLetter('${letter.id}')" title="تحميل وطباعة">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-icon delete" onclick="deleteLetter('${letter.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    // Single DOM update
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    
    // Update pagination info
    updatePaginationInfo(allLetters.length);

    console.timeEnd('renderLettersTable');

    // Initialize comment buttons after rendering
    initializeCommentButtons();

    // Handle highlighting
    if (highlightId) {
        setTimeout(() => {
            const highlightedRow = document.querySelector(".highlighted-letter");
            if (highlightedRow) {
                highlightedRow.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                    highlightedRow.classList.remove("highlighted-letter");
                }, 3000);
            }
        }, 100);
    }
}

// OPTIMIZATION 9: Optimized Filters with Debouncing
function setupFiltersOptimized(allLetters) {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('letterTypeFilter');
    const reviewFilter = document.getElementById('reviewStatusFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    // Debounced filter function
    const debouncedFilter = debounce(() => {
        filterAndRenderLetters(allLetters);
    }, 300); // 300ms delay
    
    // Add event listeners with debouncing
    if (searchInput) {
        searchInput.addEventListener('input', debouncedFilter);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', () => filterAndRenderLetters(allLetters));
    }
    
    if (reviewFilter) {
        reviewFilter.addEventListener('change', () => filterAndRenderLetters(allLetters));
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', () => filterAndRenderLetters(allLetters));
    }
}

function filterAndRenderLetters(allLetters) {
    console.time('filterAndRender');
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedType = document.getElementById('letterTypeFilter')?.value || '';
    const selectedReview = document.getElementById('reviewStatusFilter')?.value || '';
    const selectedSort = document.getElementById('sortFilter')?.value || '';
    
    // Apply filters
    let filtered = allLetters.filter(letter => {
        const matchesSearch = !searchTerm || 
            letter.recipient.toLowerCase().includes(searchTerm) || 
            letter.id.toLowerCase().includes(searchTerm) ||
            (letter.writer && letter.writer.toLowerCase().includes(searchTerm));
        
        const matchesType = !selectedType || translateLetterType(letter.type) === selectedType;
        const matchesReview = !selectedReview || letter.reviewStatus === selectedReview;
        
        return matchesSearch && matchesType && matchesReview;
    });
    
    // Apply sorting (default to newest first if no sort selected)
    if (selectedSort) {
        filtered = sortLetters(filtered, selectedSort);
    } else {
        // Default sorting: newest to oldest
        filtered = sortLetters(filtered, 'date-new-old');
    }
    
    // Reset pagination for filtered results
    letterPagination.setTotal(filtered.length);
    letterPagination.currentPage = 1;
    
    // Render filtered results
    renderLettersTableOptimized(filtered);
    
    console.timeEnd('filterAndRender');
}

// OPTIMIZATION 10: Pagination Controls
function setupPaginationControls(allLetters) {
    const tableContainer = document.querySelector('.letters-table-container');
    
    // Remove existing pagination
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    // Create pagination container
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    paginationContainer.innerHTML = `
        <div class="pagination-info">
            <span id="paginationInfo">صفحة 1 من 1 (0 خطاب)</span>
        </div>
        <div class="pagination-controls">
            <button id="firstPageBtn" class="pagination-btn">الأولى</button>
            <button id="prevPageBtn" class="pagination-btn">السابق</button>
            <span id="pageNumbers" class="page-numbers"></span>
            <button id="nextPageBtn" class="pagination-btn">التالي</button>
            <button id="lastPageBtn" class="pagination-btn">الأخيرة</button>
        </div>
        <div class="pagination-size">
            <label for="pageSizeSelect">عدد العناصر في الصفحة:</label>
            <select id="pageSizeSelect">
                <option value="10">10</option>
                <option value="20" selected>20</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </div>
    `;
    
    tableContainer.appendChild(paginationContainer);
    
    // Add event listeners
    document.getElementById('firstPageBtn').addEventListener('click', () => {
        if (letterPagination.goToPage(1)) {
            renderLettersTableOptimized(allLetters);
        }
    });
    
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (letterPagination.prevPage()) {
            renderLettersTableOptimized(allLetters);
        }
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        if (letterPagination.nextPage()) {
            renderLettersTableOptimized(allLetters);
        }
    });
    
    document.getElementById('lastPageBtn').addEventListener('click', () => {
        if (letterPagination.goToPage(letterPagination.totalPages)) {
            renderLettersTableOptimized(allLetters);
        }
    });
    
    document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
        letterPagination.itemsPerPage = parseInt(e.target.value);
        letterPagination.setTotal(allLetters.length);
        letterPagination.currentPage = 1;
        renderLettersTableOptimized(allLetters);
    });
}

function updatePaginationInfo(totalItems) {
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        const start = (letterPagination.currentPage - 1) * letterPagination.itemsPerPage + 1;
        const end = Math.min(letterPagination.currentPage * letterPagination.itemsPerPage, totalItems);
        paginationInfo.textContent = `صفحة ${letterPagination.currentPage} من ${letterPagination.totalPages} (${start}-${end} من ${totalItems} خطاب)`;
    }
    
    // Update button states
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    
    if (firstBtn) firstBtn.disabled = letterPagination.currentPage === 1;
    if (prevBtn) prevBtn.disabled = letterPagination.currentPage === 1;
    if (nextBtn) nextBtn.disabled = letterPagination.currentPage === letterPagination.totalPages;
    if (lastBtn) lastBtn.disabled = letterPagination.currentPage === letterPagination.totalPages;
}

// OPTIMIZATION 11: Loading and Error UI
function showLoadingIndicator() {
    const container = document.querySelector('.letters-table-container');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p>جاري تحميل الخطابات...</p>
    `;
    container.appendChild(loadingDiv);
    return loadingDiv;
}

function hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

function showErrorMessage(message) {
    const container = document.querySelector('.letters-table-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-btn">إعادة المحاولة</button>
        </div>
    `;
    container.appendChild(errorDiv);
}

// OPTIMIZATION 12: Cache Management Functions
function refreshLetterCache() {
    letterCache.invalidate();
    loadLetterHistoryOptimized();
}

function preloadNextPage(allLetters) {
    // Preload next page data in background
    setTimeout(() => {
        const nextPage = letterPagination.currentPage + 1;
        if (nextPage <= letterPagination.totalPages) {
            const nextStartIndex = (nextPage - 1) * letterPagination.itemsPerPage;
            const nextEndIndex = nextStartIndex + letterPagination.itemsPerPage;
            const nextPageData = allLetters.slice(nextStartIndex, nextEndIndex);
            // Data is now in memory for faster rendering
        }
    }, 100);
}

// Keep existing functions that are still needed
async function loadSettings() {
    try {
        const range = 'Settings!A:G';
        const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            const settings = data.values.slice(1);
            return processSettings(settings);
        }
        
        return null;
    } catch (error) {
        console.error('Error loading settings:', error);
        return null;
    }
}

function processSettings(settings) {
    const processed = {
        letterTypes: [],
        recipientTitles: [],
        styles: []
    };
    
    settings.forEach(row => {
        if (row[1]) processed.letterTypes.push(row[1]);
        if (row[2]) processed.recipientTitles.push(row[2]);
        if (row[6]) processed.styles.push(row[6]);
    });
    
    processed.letterTypes = [...new Set(processed.letterTypes)];
    processed.recipientTitles = [...new Set(processed.recipientTitles)];
    processed.styles = [...new Set(processed.styles)];
    
    return processed;
}

async function loadReceivedData() {
    try {
        const range = 'Received!A:B';
        const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            const received = data.values.slice(1);
            return processReceivedData(received);
        }
        
        return [];
    } catch (error) {
        console.error('Error loading received data:', error);
        return [];
    }
}

function processReceivedData(received) {
    return received.map(row => ({
        id: row[0] || '',
        content: row[1] || ''
    }));
}

// Legacy function for backward compatibility
async function loadSubmissionsData(forceRefresh = false) {
    return await loadSubmissionsDataOptimized(forceRefresh);
}

async function updateReviewStatusInSheet(letterId, status, reviewerName, notes, letterContent) {
    const updateTimestamp = new Date().toISOString();
    let retryCount = 0;
    const maxRetries = 3;

    console.log('📡 updateReviewStatusInSheet called');
    console.log('Parameters being sent to Google Sheets:');
    console.log('  - letterId:', letterId);
    console.log('  - status:', status);
    console.log('  - reviewerName:', reviewerName);
    console.log('  - notes:', notes ? `${notes.length} chars` : 'empty');
    console.log('  - letterContent:', letterContent ? `${letterContent.length} chars` : 'empty');

    while (retryCount < maxRetries) {
        try {
            console.log(`📤 Attempt ${retryCount + 1}/${maxRetries} - Sending request to Apps Script...`);

            const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'updateReviewStatus',
                    letterId: letterId,
                    status: status,
                    reviewerName: reviewerName,
                    notes: notes,
                    letterContent: letterContent,
                    timestamp: updateTimestamp
                })
            });

            console.log('✅ Request sent successfully (no-cors mode)');

            // Invalidate cache after update
            letterCache.invalidate();
            console.log('🗑️ Cache invalidated');

            // Wait a moment for Google Sheets to update
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('✅ Status update request completed successfully');
            return true;

        } catch (error) {
            retryCount++;
            console.error(`❌ Attempt ${retryCount} failed:`, error);

            if (retryCount >= maxRetries) {
                console.error('❌ All retry attempts exhausted');
                console.error('Error details:', error);
                throw error;
            }

            // Wait before retrying (exponential backoff)
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

async function deleteLetterFromSheet(letterId) {
    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'deleteLetter',
                letterId: letterId
            })
        });

        // Invalidate cache after deletion
        letterCache.invalidate();

        console.log('Request to delete letter sent to Apps Script.');
    } catch (error) {
        console.error('Error sending delete letter request to Apps Script:', error);
        throw error;
    }
}

// Helper functions
function getStatusClass(status) {
    const statusMap = {
        'جاهز للإرسال': 'status-ready',
        'في الانتظار': 'status-waiting',
        'يحتاج إلى تحسينات': 'status-needs-improvement',
        'مرفوض': 'status-rejected',
        'تم الإرسال': 'status-ready'
    };
    return statusMap[status] || 'status-waiting';
}

// Display label for status (UI only - backend keeps original values)
function displayStatusLabel(status) {
    if (status === 'مرفوض') {
        return 'طلب ملغى';
    }
    return status;
}

// Truncate comment to specified length
function truncateComment(text, maxLength = 50) {
    if (!text || text === "-" || text.trim() === "") {
        return "-";
    }

    if (text.length <= maxLength) {
        return text;
    }

    return text.substring(0, maxLength) + "...";
}

// Render comment cell with read more functionality
function renderCommentCell(comment, letterId) {
    if (!comment || comment === "-" || comment.trim() === "") {
        return "-";
    }

    const maxLength = 50;

    if (comment.length <= maxLength) {
        return comment;
    }

    const truncated = truncateComment(comment, maxLength);
    // Use data attribute instead of inline onclick for better reliability
    return `
        <span class="comment-text">${truncated}</span>
        <button class="read-more-btn" data-letter-id="${letterId}" title="اقرأ المزيد">
            <i class="fas fa-expand-alt"></i>
        </button>
    `;
}

// Show full comment in modal
function showFullComment(letterId) {
    console.log('📖 Opening comment modal for letter:', letterId);

    // Find the letter data
    const letters = JSON.parse(localStorage.getItem('cachedLetters') || '[]');
    const letter = letters.find(l => l.id === letterId);

    if (!letter || !letter.reviewNotes) {
        console.warn('⚠️ No review notes found for letter:', letterId);
        return;
    }

    console.log('✅ Found letter with notes:', letter.reviewNotes.substring(0, 50) + '...');

    // Create or get modal
    let modal = document.getElementById('commentModal');
    if (!modal) {
        console.log('🔨 Creating new modal');
        modal = document.createElement('div');
        modal.id = 'commentModal';
        modal.className = 'comment-modal';
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div class="comment-modal-header">
                    <h3>الملاحظات الكاملة</h3>
                    <button class="comment-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="comment-modal-body">
                    <p id="fullCommentText"></p>
                </div>
                <div class="comment-modal-footer">
                    <strong>رقم الخطاب:</strong> <span id="modalLetterId"></span><br>
                    <strong>المراجع:</strong> <span id="modalReviewerName"></span>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add close button listener
        modal.querySelector('.comment-modal-close').addEventListener('click', closeCommentModal);

        // Add click outside to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCommentModal();
            }
        });
    }

    // Update modal content
    document.getElementById('fullCommentText').textContent = letter.reviewNotes;
    document.getElementById('modalLetterId').textContent = letterId;
    document.getElementById('modalReviewerName').textContent = letter.reviewerName || 'غير محدد';

    // Show modal
    modal.style.display = 'flex';
    console.log('✅ Modal displayed');
}

// Close comment modal
function closeCommentModal() {
    console.log('❌ Closing modal');
    const modal = document.getElementById('commentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize comment button event listeners using event delegation
function initializeCommentButtons() {
    console.log('🔧 Initializing comment button listeners');

    // Remove existing listener if any
    document.removeEventListener('click', handleCommentButtonClick);

    // Add event delegation for read-more buttons
    document.addEventListener('click', handleCommentButtonClick);
}

// Handle comment button clicks
function handleCommentButtonClick(e) {
    const button = e.target.closest('.read-more-btn');
    if (button) {
        e.preventDefault();
        e.stopPropagation();

        const letterId = button.getAttribute('data-letter-id');
        console.log('🔘 Read more button clicked for letter:', letterId);

        if (letterId) {
            showFullComment(letterId);
        } else {
            console.error('❌ No letter ID found on button');
        }
    }
}

function translateLetterType(type) {
    const typeMap = {
        'New': 'جديد',
        'Reply': 'رد',
        'Follow Up': 'متابعة',
        'Co-op': 'تعاون'
    };
    return typeMap[type] || type;
}

function sortLetters(letters, sortType) {
    if (!sortType) return letters;
    
    const sortedLetters = [...letters];
    
    switch (sortType) {
        case 'date-new-old':
            return sortedLetters.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'date-old-new':
            return sortedLetters.sort((a, b) => new Date(a.date) - new Date(b.date));
        case 'recipient-a-z':
            return sortedLetters.sort((a, b) => a.recipient.localeCompare(b.recipient, 'ar'));
        case 'recipient-z-a':
            return sortedLetters.sort((a, b) => b.recipient.localeCompare(a.recipient, 'ar'));
        case 'subject-a-z':
            return sortedLetters.sort((a, b) => a.subject.localeCompare(b.subject, 'ar'));
        case 'subject-z-a':
            return sortedLetters.sort((a, b) => b.subject.localeCompare(a.subject, 'ar'));
        case 'type-a-z':
            return sortedLetters.sort((a, b) => translateLetterType(a.type).localeCompare(translateLetterType(b.type), 'ar'));
        case 'review-status':
            const statusPriority = {
                'جاهز للإرسال': 1,
                'في الانتظار': 2,
                'يحتاج إلى تحسينات': 3,
                'مرفوض': 4
            };
            return sortedLetters.sort((a, b) => {
                const priorityA = statusPriority[a.reviewStatus] || 5;
                const priorityB = statusPriority[b.reviewStatus] || 5;
                return priorityA - priorityB;
            });
        case 'writer-a-z':
            return sortedLetters.sort((a, b) => {
                const writerA = a.writer || 'zzz';
                const writerB = b.writer || 'zzz';
                return writerA.localeCompare(writerB, 'ar');
            });
        default:
            return sortedLetters;
    }
}

// OPTIMIZATION 13: Background Data Sync
class BackgroundSync {
    constructor() {
        this.syncInterval = 10 * 60 * 1000; // 10 minutes
        this.intervalId = null;
    }
    
    start() {
        console.log('🔄 Starting background sync...');
        this.intervalId = setInterval(() => {
            this.syncData();
        }, this.syncInterval);
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ Background sync stopped');
        }
    }
    
    async syncData() {
        try {
            console.log('🔄 Background sync: Checking for updates...');
            const freshData = await loadSubmissionsDataOptimized(true);
            
            // Check if there are new letters
            const cachedData = letterCache.get('submissions_data');
            if (cachedData && freshData.length !== cachedData.length) {
                console.log('🆕 New letters detected! Updating cache...');
                letterCache.set('submissions_data', freshData);
                
                // Show notification to user
                showUpdateNotification(freshData.length - cachedData.length);
            }
        } catch (error) {
            console.warn('⚠️ Background sync failed:', error);
        }
    }
}

const backgroundSync = new BackgroundSync();

function showUpdateNotification(newCount) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-bell"></i>
            <span>تم العثور على ${newCount} خطاب جديد</span>
            <button onclick="refreshLetterCache()" class="refresh-btn">تحديث</button>
            <button onclick="this.parentElement.parentElement.remove()" class="close-btn">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 10000);
}

// OPTIMIZATION 14: Progressive Loading
async function loadLetterHistoryProgressive() {
    const tableBody = document.getElementById("lettersTableBody");
    const noData = document.getElementById("noData");
    
    try {
        console.log('🚀 Starting progressive loading...');
        
        // Show loading skeleton
        showLoadingSkeleton();
        
        // Load first batch quickly (cached data if available)
        const cachedLetters = letterCache.get('submissions_data');
        if (cachedLetters && cachedLetters.length > 0) {
            console.log('⚡ Quick load from cache');
            renderLettersTableOptimized(cachedLetters.slice(0, 20));
            setupFiltersOptimized(cachedLetters);
            setupPaginationControls(cachedLetters);
        }
        
        // Load fresh data in background
        const freshLetters = await loadSubmissionsDataOptimized();
        
        if (freshLetters.length === 0) {
            tableBody.style.display = "none";
            noData.style.display = "block";
        } else {
            console.log(`📊 Progressive load complete: ${freshLetters.length} letters`);
            
            // Update with fresh data
            letterPagination.setTotal(freshLetters.length);
            renderLettersTableOptimized(freshLetters);
            setupFiltersOptimized(freshLetters);
            setupPaginationControls(freshLetters);
            
            tableBody.style.display = "table-row-group";
            noData.style.display = "none";
        }
        
        // Start background sync
        backgroundSync.start();
        
    } catch (error) {
        console.error('❌ Error in progressive loading:', error);
        showErrorMessage('حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.');
    } finally {
        hideLoadingSkeleton();
    }
}

function showLoadingSkeleton() {
    const tableBody = document.getElementById("lettersTableBody");
    if (!tableBody) return;
    
    const skeletonHTML = Array(10).fill().map(() => `
        <tr class="skeleton-row">
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
            <td><div class="skeleton-text"></div></td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = skeletonHTML;
}

function hideLoadingSkeleton() {
    const skeletonRows = document.querySelectorAll('.skeleton-row');
    skeletonRows.forEach(row => row.remove());
}

// OPTIMIZATION 15: Performance Monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }
    
    startTimer(name) {
        this.metrics[name] = { start: performance.now() };
        console.time(name);
    }
    
    endTimer(name) {
        if (this.metrics[name]) {
            this.metrics[name].duration = performance.now() - this.metrics[name].start;
            console.timeEnd(name);
            
            // Log performance metrics
            if (this.metrics[name].duration > 1000) {
                console.warn(`⚠️ Slow operation: ${name} took ${this.metrics[name].duration.toFixed(2)}ms`);
            }
        }
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    logSummary() {
        console.log('📊 Performance Summary:', this.metrics);
    }
}

const perfMonitor = new PerformanceMonitor();

// Export functions for use in main.js
window.loadLetterHistoryOptimized = loadLetterHistoryOptimized;
window.loadLetterHistoryProgressive = loadLetterHistoryProgressive;
window.refreshLetterCache = refreshLetterCache;
window.letterCache = letterCache;
window.letterPagination = letterPagination;
window.backgroundSync = backgroundSync;

// Initialize dropdown population on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('letterType')) {
        const settings = await loadSettings();
        
        if (settings) {
            // Populate letter type dropdown
            const letterTypeSelect = document.getElementById('letterType');
            settings.letterTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                letterTypeSelect.appendChild(option);
            });
            
            // Populate recipient title dropdown
            const recipientTitleSelect = document.getElementById('recipientTitle');
            if (recipientTitleSelect) {
                settings.recipientTitles.forEach(title => {
                    // Keep 'السادة' as-is (no gender variants)
                    if (title === 'السادة') {
                        const option = document.createElement('option');
                        option.value = title;
                        option.textContent = title;
                        recipientTitleSelect.appendChild(option);
                    }
                    // Skip 'أخرى' here (we add it at the end)
                    else if (title === 'أخرى') {
                        return;
                    }
                    // For all other titles, add gender-specific options
                    else {
                        // Add male option
                        const maleOption = document.createElement('option');
                        maleOption.value = `${title} - ذكر`;
                        maleOption.textContent = `${title} - ذكر`;
                        recipientTitleSelect.appendChild(maleOption);

                        // Add female option
                        const femaleOption = document.createElement('option');
                        femaleOption.value = `${title} - أنثى`;
                        femaleOption.textContent = `${title} - أنثى`;
                        recipientTitleSelect.appendChild(femaleOption);
                    }
                });
                // Add 'أخرى' option at the end
                const otherOption = document.createElement('option');
                otherOption.value = 'أخرى';
                otherOption.textContent = 'أخرى';
                recipientTitleSelect.appendChild(otherOption);
            }
            
            // Populate style dropdown
            const styleSelect = document.getElementById('letterStyle');
            if (styleSelect) {
                settings.styles.forEach(style => {
                    const option = document.createElement('option');
                    option.value = style;
                    option.textContent = style;
                    styleSelect.appendChild(option);
                });
            }
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    backgroundSync.stop();
    perfMonitor.logSummary();
});
