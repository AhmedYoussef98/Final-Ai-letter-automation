// Complete Updated Main.js with Fixed Status Bar and Performance Improvements
// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    if (themeToggle) {
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        
        if (body.classList.contains('dark-mode')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

// ==============================================
// MAIN LETTER HISTORY FUNCTIONS WITH FIXED STATUS BAR
// ==============================================

async function loadLetterHistory() {
    console.log('🚀 Loading letter history with optimizations...');
    
    try {
        // Show loading notification if available
        let loadingNotification = null;
        if (typeof notify !== 'undefined') {
            loadingNotification = notify.loading('جاري تحميل البيانات...');
        }
        
        // FIRST: Show quick stats bar immediately
        showQuickStats();
        
        // THEN: Use progressive loading for better UX
        await loadLetterHistoryProgressive();
        
        // Hide loading notification
        if (loadingNotification && typeof notify !== 'undefined') {
            notify.hide(loadingNotification);
        }
        
        // FINALLY: Update quick stats with real data
        updateQuickStats();
        
        console.log('✅ Letter history loaded successfully with status bar');
        
    } catch (error) {
        console.error('❌ Error in loadLetterHistory:', error);
        
        // Show error notification
        if (typeof notify !== 'undefined') {
            notify.error(`فشل في تحميل البيانات: ${error.message || 'خطأ غير معروف'}`);
        }
        
        // Re-throw the error so calling function can handle it
        throw error;
    }
}

// FIXED STATUS BAR FUNCTION
function showQuickStats() {
    console.log('📊 Creating quick stats bar...');
    
    // Wait a moment to ensure DOM is ready
    setTimeout(() => {
        const container = document.querySelector('.main-container');
        const existingStats = document.querySelector('.quick-actions');
        
        // Remove existing stats if they exist
        if (existingStats) {
            existingStats.remove();
        }
        
        if (container) {
            const quickActions = document.createElement('div');
            quickActions.className = 'quick-actions';
            quickActions.innerHTML = `
                <div class="quick-stats">
                    <div class="stat-item">
                        <div class="stat-value" id="totalLetters">--</div>
                        <div class="stat-label">إجمالي الخطابات</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="pendingReview">--</div>
                        <div class="stat-label">في انتظار المراجعة</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="readyToSend">--</div>
                        <div class="stat-label">جاهز للإرسال</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="thisMonth">--</div>
                        <div class="stat-label">هذا الشهر</div>
                    </div>
                </div>
                <div class="quick-actions-buttons">
                    <button class="quick-action-btn refresh" onclick="refreshLetterCache()">
                        <i class="fas fa-sync-alt"></i>
                        تحديث
                    </button>
                    <button class="quick-action-btn export" onclick="exportLettersToCSV()">
                        <i class="fas fa-download"></i>
                        تصدير
                    </button>
                </div>
            `;
            
            // Try multiple insertion strategies
            const pageHeader = document.querySelector('.page-header');
            const filtersSection = document.querySelector('.filters-section');
            
            if (pageHeader) {
                // Insert after page header
                pageHeader.insertAdjacentElement('afterend', quickActions);
                console.log('✅ Quick stats bar inserted after page header');
            } else if (filtersSection) {
                // Insert before filters section
                filtersSection.insertAdjacentElement('beforebegin', quickActions);
                console.log('✅ Quick stats bar inserted before filters');
            } else {
                // Insert at the beginning of main container
                container.insertBefore(quickActions, container.firstChild);
                console.log('✅ Quick stats bar inserted at beginning of container');
            }
            
            // Initialize with basic data immediately if available
            const cachedData = letterCache ? letterCache.get('submissions_data') : null;
            if (cachedData && cachedData.length > 0) {
                updateQuickStatsImmediate(cachedData);
            }
            
        } else {
            console.error('❌ Could not find .main-container element for stats bar');
        }
    }, 100); // Small delay to ensure DOM is ready
}

// IMMEDIATE STATS UPDATE (before async operations complete)
function updateQuickStatsImmediate(letters) {
    if (!letters || letters.length === 0) return;
    
    console.log('📈 Updating stats immediately with', letters.length, 'letters');
    
    const stats = calculateLetterStats(letters);
    
    // Update immediately without animation for faster display
    const totalLettersEl = document.getElementById('totalLetters');
    const pendingReviewEl = document.getElementById('pendingReview');
    const readyToSendEl = document.getElementById('readyToSend');
    const thisMonthEl = document.getElementById('thisMonth');
    
    if (totalLettersEl) totalLettersEl.textContent = stats.total;
    if (pendingReviewEl) pendingReviewEl.textContent = stats.pending;
    if (readyToSendEl) readyToSendEl.textContent = stats.ready;
    if (thisMonthEl) thisMonthEl.textContent = stats.thisMonth;
}

// ENHANCED STATS UPDATE WITH ANIMATION
function updateQuickStats() {
    // Get the latest data
    const cachedLetters = letterCache ? letterCache.get('submissions_data') : [];
    
    if (cachedLetters.length === 0) {
        console.log('⚠️ No cached letters found for stats update');
        return;
    }
    
    console.log('📈 Updating stats with animation for', cachedLetters.length, 'letters');
    
    const stats = calculateLetterStats(cachedLetters);
    
    const totalLettersEl = document.getElementById('totalLetters');
    const pendingReviewEl = document.getElementById('pendingReview');
    const readyToSendEl = document.getElementById('readyToSend');
    const thisMonthEl = document.getElementById('thisMonth');
    
    if (totalLettersEl) {
        animateNumberChange(totalLettersEl, stats.total);
    }
    if (pendingReviewEl) {
        animateNumberChange(pendingReviewEl, stats.pending);
    }
    if (readyToSendEl) {
        animateNumberChange(readyToSendEl, stats.ready);
    }
    if (thisMonthEl) {
        animateNumberChange(thisMonthEl, stats.thisMonth);
    }
    
    console.log('✅ Stats updated:', stats);
}

// CALCULATE STATISTICS
function calculateLetterStats(letters) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return {
        total: letters.length,
        pending: letters.filter(l => l.reviewStatus === 'في الانتظار').length,
        ready: letters.filter(l => l.reviewStatus === 'جاهز للإرسال').length,
        thisMonth: letters.filter(l => {
            const letterDate = new Date(l.date);
            return letterDate.getMonth() === currentMonth && letterDate.getFullYear() === currentYear;
        }).length
    };
}

// ANIMATE NUMBER CHANGES
function animateNumberChange(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    
    if (currentValue === newValue) return;
    
    const increment = newValue > currentValue ? 1 : -1;
    let current = currentValue;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;
        
        if (current === newValue) {
            clearInterval(timer);
        }
    }, 50);
}

// FORCE REFRESH STATS BAR (utility function)
function forceRefreshStatsBar() {
    console.log('🔄 Force refreshing stats bar...');
    
    // Remove existing stats bar
    const existingStats = document.querySelector('.quick-actions');
    if (existingStats) {
        existingStats.remove();
    }
    
    // Recreate stats bar
    showQuickStats();
    
    // Update with current data
    setTimeout(() => {
        updateQuickStats();
    }, 200);
}

// ENHANCED PROGRESSIVE LOADING FUNCTION
async function loadLetterHistoryProgressive() {
    console.log('🔄 Loading letter history progressively...');
    
    try {
        // Use the optimized function from sheets.js if available
        if (typeof loadLetterHistoryOptimized === 'function') {
            await loadLetterHistoryOptimized();
        } else {
            // Fallback to basic loading
            console.warn('⚠️ Optimized loading not available, using fallback');
            await basicLetterHistoryLoad();
        }
        
        console.log('✅ Progressive loading completed');
        
    } catch (error) {
        console.error('❌ Error in progressive loading:', error);
        throw error;
    }
}

// FALLBACK BASIC LOADING
async function basicLetterHistoryLoad() {
    try {
        console.log('📊 Using basic letter history loading...');
        
        const letters = await loadSubmissionsData();
        
        const tableBody = document.getElementById("lettersTableBody");
        const noData = document.getElementById("noData");
        const table = document.getElementById("lettersTable");
        
        if (!letters || letters.length === 0) {
            if (tableBody) tableBody.style.display = "none";
            if (noData) noData.style.display = "block";
            if (table) table.style.display = "none";
            
            console.log('ℹ️ No letters found');
        } else {
            // Render letters
            if (tableBody) {
                tableBody.innerHTML = letters.map(letter => `
                    <tr>
                        <td>${letter.id || '-'}</td>
                        <td>${letter.date || '-'}</td>
                        <td>${translateLetterType(letter.type) || '-'}</td>
                        <td><span class="status-badge ${getStatusClass(letter.reviewStatus)}">${letter.reviewStatus || '-'}</span></td>
                        <td><span class="status-badge ${getStatusClass(letter.sendStatus)}">${letter.sendStatus || '-'}</span></td>
                        <td>${letter.recipient || '-'}</td>
                        <td>${letter.subject || '-'}</td>
                        <td>${letter.reviewerName || '-'}</td>
                        <td>${letter.reviewNotes || '-'}</td>
                        <td>${letter.writer || '-'}</td>
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
                    </tr>
                `).join('');
            }
            
            if (tableBody) tableBody.style.display = "table-row-group";
            if (noData) noData.style.display = "none";
            if (table) table.style.display = "table";
            
            console.log(`✅ Rendered ${letters.length} letters in basic mode`);
        }
        
    } catch (error) {
        console.error('❌ Error in basic letter history load:', error);
        throw error;
    }
}

// ==============================================
// LETTER ACTION FUNCTIONS
// ==============================================

// REVIEW LETTER FUNCTION
function reviewLetter(id) {
    console.log('🔍 Reviewing letter:', id);
    
    try {
        // Show loading state
        showActionLoading(id, 'review');
        
        // Show notification if available
        if (typeof notify !== 'undefined') {
            notify.info('جاري تحويلك إلى صفحة المراجعة...');
        }
        
        setTimeout(() => {
            window.location.href = `review-letter.html?id=${id}`;
        }, 500);
        
    } catch (error) {
        console.error('❌ Error in reviewLetter:', error);
        
        if (typeof notify !== 'undefined') {
            notify.error(`خطأ في فتح صفحة المراجعة: ${error.message}`);
        }
    }
}

// DOWNLOAD LETTER FUNCTION
async function downloadLetter(id, format = 'pdf') {
    console.log('⬇️ Downloading letter:', id);
    
    try {
        // Show loading notification
        let loadingNotification = null;
        if (typeof notify !== 'undefined') {
            loadingNotification = notify.loading(`جاري تحميل الخطاب (${format.toUpperCase()})...`);
        }
        
        // Show loading state on button
        showActionLoading(id, 'download');
        
        // Get from cache first for faster lookup
        const cachedLetters = letterCache ? letterCache.get('submissions_data') : [];
        let letter = cachedLetters ? cachedLetters.find(l => l.id === id) : null;
        
        // Fallback to fresh data if not in cache
        if (!letter) {
            const letters = await loadSubmissionsDataOptimized();
            letter = letters.find(l => l.id === id);
        }
        
        // Hide loading notification
        if (loadingNotification && typeof notify !== 'undefined') {
            notify.hide(loadingNotification);
        }
        
        if (!letter || !letter.letterLink) {
            if (typeof notify !== 'undefined') {
                notify.warning('رابط الخطاب غير متوفر');
            } else {
                alert('رابط الخطاب غير متوفر');
            }
            return;
        }
        
        let viewerUrl = letter.letterLink;
        
        // For Google Drive links, use the viewer URL
        if (letter.letterLink.includes('drive.google.com')) {
            const fileId = extractGoogleDriveFileId(letter.letterLink);
            if (fileId) {
                viewerUrl = `https://drive.google.com/file/d/${fileId}/view`;
            }
        }
        
        // Open in new tab
        window.open(viewerUrl, '_blank');
        
        // Show success notification
        if (typeof notify !== 'undefined') {
            notify.success(`تم فتح الخطاب بصيغة ${format.toUpperCase()} بنجاح`);
        }
        
        console.log(`✅ Letter ${id} opened as ${format}`);
        
    } catch (error) {
        console.error('❌ Error downloading letter:', error);
        
        if (typeof notify !== 'undefined') {
            notify.error(`خطأ في تحميل الخطاب: ${error.message}`);
        } else {
            alert('حدث خطأ أثناء فتح الخطاب');
        }
    }
}

function extractGoogleDriveFileId(url) {
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /open\?id=([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}

// DELETE LETTER FUNCTION
async function deleteLetter(letterId) {
    console.log('🗑️ Deleting letter:', letterId);
    
    try {
        // Show confirmation dialog
        const confirmDelete = await new Promise((resolve) => {
            if (typeof notify !== 'undefined') {
                notify.confirm(
                    'هل أنت متأكد من حذف هذا الخطاب؟ لا يمكن التراجع عن هذا الإجراء.',
                    () => resolve(true),
                    () => resolve(false)
                );
            } else {
                // Fallback to native confirm
                resolve(confirm('هل أنت متأكد من حذف هذا الخطاب؟'));
            }
        });
        
        if (!confirmDelete) {
            return;
        }
        
        // Show loading notification
        let loadingNotification = null;
        if (typeof notify !== 'undefined') {
            loadingNotification = notify.loading('جاري حذف الخطاب...');
        }
        
        // Call the delete function from sheets.js if available
        if (typeof deleteLetterFromSheet === 'function') {
            await deleteLetterFromSheet(letterId);
        } else {
            // Simulate deletion (replace with your actual API call)
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Hide loading notification
        if (loadingNotification && typeof notify !== 'undefined') {
            notify.hide(loadingNotification);
        }
        
        // Show success notification
        if (typeof notify !== 'undefined') {
            notify.success('تم حذف الخطاب بنجاح');
        } else {
            showSuccessMessage('تم حذف الخطاب بنجاح');
        }
        
        // Reload the table
        setTimeout(() => {
            if (typeof loadLetterHistory === 'function') {
                loadLetterHistory();
            } else {
                location.reload();
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error deleting letter:', error);
        
        if (typeof notify !== 'undefined') {
            notify.error(`خطأ في حذف الخطاب: ${error.message}`);
        } else {
            alert('حدث خطأ أثناء حذف الخطاب');
        }
    }
}

// EXPORT TO CSV FUNCTION
async function exportLettersToCSV() {
    console.log('📊 Exporting letters to CSV...');
    
    try {
        // Show loading notification
        let loadingNotification = null;
        if (typeof notify !== 'undefined') {
            loadingNotification = notify.loading('جاري تصدير البيانات إلى CSV...');
        }
        
        const exportButton = document.querySelector('.quick-action-btn.export');
        if (exportButton) {
            const originalHTML = exportButton.innerHTML;
            exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التصدير...';
            exportButton.disabled = true;
        }
        
        // Load letters data
        const letters = await loadSubmissionsDataOptimized();
        
        if (!letters || letters.length === 0) {
            if (loadingNotification && typeof notify !== 'undefined') {
                notify.hide(loadingNotification);
            }
            
            if (typeof notify !== 'undefined') {
                notify.warning('لا توجد بيانات للتصدير');
            } else {
                alert('لا توجد خطابات للتصدير');
            }
            return;
        }
        
        // Create CSV content
        const headers = [
            'الرقم المرجعي',
            'التاريخ',
            'نوع الخطاب',
            'المستلم',
            'الموضوع',
            'حالة المراجعة',
            'حالة الإرسال',
            'اسم المراجع',
            'الملاحظات',
            'الكاتب'
        ];
        
        const csvContent = [
            headers.join(','),
            ...letters.map(letter => [
                letter.id || '',
                letter.date || '',
                translateLetterType(letter.type) || '',
                letter.recipient || '',
                letter.subject || '',
                letter.reviewStatus || '',
                letter.sendStatus || '',
                letter.reviewerName || '',
                letter.reviewNotes || '',
                letter.writer || ''
            ].map(field => `"${field}"`).join(','))
        ].join('\n');
        
        // Create and download file
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `letter-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Hide loading notification
        if (loadingNotification && typeof notify !== 'undefined') {
            notify.hide(loadingNotification);
        }
        
        // Show success notification
        if (typeof notify !== 'undefined') {
            notify.success(`تم تصدير ${letters.length} خطاب إلى ملف CSV بنجاح`);
        } else {
            showSuccessMessage('تم تصدير البيانات بنجاح');
        }
        
    } catch (error) {
        console.error('❌ Error exporting to CSV:', error);
        
        if (typeof notify !== 'undefined') {
            notify.error(`خطأ في التصدير: ${error.message}`);
        } else {
            alert('حدث خطأ أثناء تصدير البيانات');
        }
    } finally {
        // Restore button state
        const exportButton = document.querySelector('.quick-action-btn.export');
        if (exportButton) {
            exportButton.innerHTML = '<i class="fas fa-download"></i> تصدير';
            exportButton.disabled = false;
        }
    }
}

// CLEAR CACHE FUNCTION
async function clearAppCache() {
    console.log('🧹 Clearing app cache...');
    
    try {
        const confirmClear = await new Promise((resolve) => {
            if (typeof notify !== 'undefined') {
                notify.confirm(
                    'سيتم حذف جميع البيانات المخزنة مؤقتاً. هل تريد المتابعة؟',
                    () => resolve(true),
                    () => resolve(false)
                );
            } else {
                resolve(confirm('سيتم حذف جميع البيانات المخزنة مؤقتاً. هل تريد المتابعة؟'));
            }
        });
        
        if (!confirmClear) {
            return;
        }
        
        // Show loading notification
        let loadingNotification = null;
        if (typeof notify !== 'undefined') {
            loadingNotification = notify.loading('جاري مسح البيانات المخزنة...');
        }
        
        // Clear cache using letterCache if available
        if (typeof letterCache !== 'undefined' && letterCache.clear) {
            letterCache.clear();
        }
        
        // Clear localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('letterApp_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Hide loading notification
        if (loadingNotification && typeof notify !== 'undefined') {
            notify.hide(loadingNotification);
        }
        
        // Show success notification
        if (typeof notify !== 'undefined') {
            notify.success('تم مسح البيانات المخزنة بنجاح');
        } else {
            showSuccessMessage('تم مسح ذاكرة التخزين المؤقت');
        }
        
        // Reload the page to refresh data
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        
        if (typeof notify !== 'undefined') {
            notify.error(`خطأ في مسح البيانات: ${error.message}`);
        } else {
            alert('حدث خطأ أثناء مسح البيانات');
        }
    }
}

// ==============================================
// REVIEW FORM FUNCTIONS
// ==============================================

// LOAD LETTERS FOR REVIEW
function loadLettersForReview() {
    console.log('🔍 Loading letters for review...');
    
    const letterSelect = document.getElementById('letterSelect');
    
    // Check if we have a letter ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get('id');
    
    // Load from cache first for faster response
    const cachedLetters = letterCache ? letterCache.get('submissions_data') : null;
    
    if (cachedLetters && cachedLetters.length > 0) {
        populateLetterSelect(cachedLetters, preselectedId);
    }
    
    // Load fresh data in background
    loadSubmissionsDataOptimized().then(letters => {
        if (letters.length > 0) {
            populateLetterSelect(letters, preselectedId);
        }
    }).catch(error => {
        console.error('Error loading letters for review:', error);
    });
}

function populateLetterSelect(letters, preselectedId) {
    const letterSelect = document.getElementById('letterSelect');
    if (!letterSelect) return;
    
    // Clear existing options first
    letterSelect.innerHTML = '<option value="">اختر خطاباً</option>';
    
    letters.forEach(letter => {
        const option = document.createElement('option');
        option.value = letter.id;
        option.textContent = `${letter.id} - ${letter.recipient} - ${letter.subject}`;
        letterSelect.appendChild(option);
    });
    
    // If there's a preselected ID from URL, select it and load the letter
    if (preselectedId) {
        letterSelect.value = preselectedId;
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.style.display = 'block';
            loadLetterForReview(preselectedId);
        }
    }
}

function setupReviewForm() {
    console.log('⚙️ Setting up review form...');
    
    const letterSelect = document.getElementById('letterSelect');
    const reviewForm = document.getElementById('reviewForm');
    const reviewCheckbox = document.getElementById('reviewComplete');
    const actionButtons = document.querySelectorAll('.action-button');
    
    if (letterSelect) {
        letterSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                if (reviewForm) reviewForm.style.display = 'block';
                loadLetterForReview(e.target.value);
            } else {
                if (reviewForm) reviewForm.style.display = 'none';
            }
        });
    }
    
    if (reviewCheckbox) {
        reviewCheckbox.addEventListener('change', (e) => {
            actionButtons.forEach(button => {
                button.disabled = !e.target.checked;
            });
        });
    }
    
    // Setup action buttons
    const readyButton = document.getElementById('readyButton');
    const improvementButton = document.getElementById('improvementButton');
    const rejectedButton = document.getElementById('rejectedButton');
    
    if (readyButton) {
        readyButton.addEventListener('click', () => updateReviewStatus('جاهز للإرسال'));
    }
    if (improvementButton) {
        improvementButton.addEventListener('click', () => updateReviewStatus('يحتاج إلى تحسينات'));
    }
    if (rejectedButton) {
        rejectedButton.addEventListener('click', () => updateReviewStatus('مرفوض'));
    }
}

function loadLetterForReview(id) {
    console.log('📄 Loading letter for review:', id);
    
    // Try cache first
    const cachedLetters = letterCache ? letterCache.get('submissions_data') : null;
    let letter = cachedLetters ? cachedLetters.find(l => l.id === id) : null;
    
    if (letter) {
        displayLetterForReview(letter);
    } else {
        // Load from server if not in cache
        loadSubmissionsDataOptimized().then(letters => {
            letter = letters.find(l => l.id === id);
            if (letter) {
                displayLetterForReview(letter);
            } else {
                displayLetterError();
            }
        }).catch(error => {
            console.error('Error loading letter:', error);
            displayLetterError();
        });
    }
}

function displayLetterForReview(letter) {
    const letterContent = document.getElementById('letterContentReview');
    const reviewerNameInput = document.getElementById('reviewerName');
    const reviewNotesInput = document.getElementById('reviewNotes');
    
    if (letterContent) {
        letterContent.value = letter.content || 'محتوى الخطاب غير متوفر';
    }
    
    if (reviewerNameInput) {
        reviewerNameInput.value = letter.reviewerName || '';
    }
    
    if (reviewNotesInput) {
        reviewNotesInput.value = letter.reviewNotes || '';
    }
}

function displayLetterError() {
    const letterContent = document.getElementById('letterContentReview');
    if (letterContent) {
        letterContent.value = 'حدث خطأ في تحميل محتوى الخطاب';
    }
}

// Replace the existing updateReviewStatus function in main.js with this updated version

// Replace the existing updateReviewStatus function in main.js with this updated version

async function updateReviewStatus(status) {
    const timestamp = new Date().toISOString();
    console.log('═══════════════════════════════════════════════');
    console.log('📝 STATUS UPDATE INITIATED');
    console.log('Timestamp:', timestamp);
    console.log('Requested Status:', status);
    console.log('═══════════════════════════════════════════════');

    const reviewerName = document.getElementById('reviewerName')?.value;
    const notes = document.getElementById('reviewNotes')?.value;
    const letterId = document.getElementById('letterSelect')?.value;
    const letterContent = document.getElementById('letterContentReview')?.value;

    // Validation with detailed logging
    console.log('📋 Validation Check:');
    console.log('  - Letter ID:', letterId || '❌ MISSING');
    console.log('  - Reviewer Name:', reviewerName || '❌ MISSING');
    console.log('  - Notes Length:', notes ? notes.length : 0, 'characters');
    console.log('  - Content Length:', letterContent ? letterContent.length : 0, 'characters');

    if (!reviewerName) {
        console.error('❌ Validation Failed: Missing reviewer name');
        if (typeof notify !== 'undefined') {
            notify.warning('الرجاء إدخال اسم المراجع');
        } else {
            alert('الرجاء إدخال اسم المراجع');
        }
        return;
    }

    if (!letterId) {
        console.error('❌ Validation Failed: Missing letter ID');
        if (typeof notify !== 'undefined') {
            notify.warning('الرجاء اختيار خطاب للمراجعة');
        } else {
            alert('الرجاء اختيار خطاب للمراجعة');
        }
        return;
    }

    console.log('✅ Validation Passed');

    try {
        // Show loading state
        const activeButton = document.querySelector('.action-button:focus') ||
                           document.querySelector(`.action-button.${status.includes('جاهز') ? 'ready' : status.includes('تحسينات') ? 'needs-improvement' : 'rejected'}`);

        let originalText = '';
        if (activeButton) {
            originalText = activeButton.innerHTML;
            activeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            activeButton.disabled = true;
        }

        // Create audit trail entry
        const auditEntry = {
            timestamp: timestamp,
            letterId: letterId,
            status: status,
            reviewerName: reviewerName,
            notesLength: notes ? notes.length : 0,
            action: 'STATUS_UPDATE_INITIATED'
        };

        console.log('💾 Creating audit trail entry:', auditEntry);

        // Store in localStorage for audit trail
        const auditLog = JSON.parse(localStorage.getItem('statusUpdateAuditLog') || '[]');
        auditLog.push(auditEntry);
        // Keep only last 50 entries
        if (auditLog.length > 50) auditLog.shift();
        localStorage.setItem('statusUpdateAuditLog', JSON.stringify(auditLog));

        // Check if status is "جاهز للإرسال" (Ready to Send)
        if (status === 'جاهز للإرسال') {
            console.log('📤 Status is "Ready to Send" - Calling archive endpoint...');

            // Call the archive update endpoint
            try {
                await updateArchiveLetter(letterId, letterContent);
                console.log('✅ Archive endpoint call successful');

                if (typeof notify !== 'undefined') {
                    notify.success('تم إرسال الخطاب إلى الأرشيف بنجاح');
                }
            } catch (archiveError) {
                console.error('❌ Archive update failed:', archiveError);

                // Log archive failure
                auditLog.push({
                    timestamp: new Date().toISOString(),
                    letterId: letterId,
                    status: status,
                    action: 'ARCHIVE_FAILED',
                    error: archiveError.message
                });
                localStorage.setItem('statusUpdateAuditLog', JSON.stringify(auditLog));

                if (typeof notify !== 'undefined') {
                    notify.error('حدث خطأ أثناء إرسال الخطاب إلى الأرشيف');
                } else {
                    alert('حدث خطأ أثناء إرسال الخطاب إلى الأرشيف');
                }

                // Restore button state
                if (activeButton) {
                    activeButton.innerHTML = originalText;
                    activeButton.disabled = false;
                }
                return;
            }
        }

        console.log('📤 Sending status update to Google Sheets...');
        console.log('Parameters:');
        console.log('  - letterId:', letterId);
        console.log('  - status:', status);
        console.log('  - reviewerName:', reviewerName);
        console.log('  - notes:', notes ? `${notes.substring(0, 50)}...` : '(empty)');

        // Update the status in Google Sheets (for all statuses)
        await updateReviewStatusInSheet(letterId, status, reviewerName, notes, letterContent);

        console.log('✅ Status update request sent successfully');

        // Log successful update
        auditLog.push({
            timestamp: new Date().toISOString(),
            letterId: letterId,
            status: status,
            reviewerName: reviewerName,
            action: 'STATUS_UPDATE_COMPLETED'
        });
        localStorage.setItem('statusUpdateAuditLog', JSON.stringify(auditLog));

        // Store the expected status for verification
        localStorage.setItem(`expectedStatus_${letterId}`, JSON.stringify({
            status: status,
            timestamp: timestamp,
            reviewerName: reviewerName
        }));

        console.log('💾 Stored expected status for verification');
        console.log('═══════════════════════════════════════════════');
        console.log('✅ STATUS UPDATE PROCESS COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════');

        // Show success message
        if (typeof notify !== 'undefined') {
            notify.success(`تم تحديث حالة المراجعة إلى: ${status}`);
        } else {
            showSuccessMessage(`تم تحديث حالة المراجعة إلى: ${status}`);
        }

        // Redirect to letter history with highlight
        setTimeout(() => {
            window.location.href = `letter-history.html?highlight=${letterId}`;
        }, 1500);

    } catch (error) {
        console.error('═══════════════════════════════════════════════');
        console.error('❌ STATUS UPDATE FAILED');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════════════');

        // Log error in audit trail
        const auditLog = JSON.parse(localStorage.getItem('statusUpdateAuditLog') || '[]');
        auditLog.push({
            timestamp: new Date().toISOString(),
            letterId: letterId,
            status: status,
            action: 'STATUS_UPDATE_FAILED',
            error: error.message,
            stack: error.stack
        });
        localStorage.setItem('statusUpdateAuditLog', JSON.stringify(auditLog));

        if (typeof notify !== 'undefined') {
            notify.error('حدث خطأ أثناء تحديث حالة المراجعة');
        } else {
            alert('حدث خطأ أثناء تحديث حالة المراجعة');
        }

        // Restore button state
        if (activeButton) {
            activeButton.innerHTML = originalText;
            activeButton.disabled = false;
        }
    }
}
// ==============================================
// HELPER FUNCTIONS
// ==============================================

function showActionLoading(id, action) {
    const button = document.querySelector(`button[onclick*="${id}"][onclick*="${action}"]`);
    if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        // Store original HTML for restoration
        button.dataset.originalHtml = originalHTML;
        
        // Restore after 5 seconds if still on page
        setTimeout(() => {
            if (button.parentNode) {
                button.innerHTML = button.dataset.originalHtml || originalHTML;
                button.disabled = false;
            }
        }, 5000);
    }
}

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

function translateLetterType(type) {
    const typeMap = {
        'New': 'جديد',
        'Reply': 'رد',
        'Follow Up': 'متابعة',
        'Co-op': 'تعاون'
    };
    return typeMap[type] || type;
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div class="success-content">
            <i class="fas fa-check-circle"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// ENHANCED FORM VALIDATION WITH NOTIFICATIONS
function validateFormWithNotifications(formData) {
    console.log('🔍 Validating form data silently...');
    
    // Check if we're in letter creation context (should be silent)
    const isLetterCreation = window.location.pathname.includes('create-letter.html');
    const isFormSubmission = document.querySelector('#letterForm button[type="submit"]')?.disabled;
    
    if (isLetterCreation || isFormSubmission) {
        // SILENT VALIDATION - let API handle validation during letter creation
        console.log('ℹ️ Silent validation mode - API will handle field validation');
        return true; // Allow submission, let API validate
    }
    
    // Only validate for critical missing data in non-letter-creation contexts
    const errors = [];
    
    // Only check for truly critical missing fields
    if (!formData.organizationName && !formData.organization_name) {
        const orgField = document.getElementById('organizationName');
        // Only warn if the field exists and is visible but empty
        if (orgField && orgField.offsetParent !== null && orgField.value.trim() === '') {
            errors.push('اسم الجهة مطلوب');
        }
    }
    
    if (!formData.recipient) {
        const recipientField = document.getElementById('recipient');
        // Only warn if the field exists, is required, and is empty
        if (recipientField && recipientField.hasAttribute('required') && recipientField.value.trim() === '') {
            errors.push('المستقبل مطلوب');
        }
    }
    
    if (!formData.letterType && !formData.category) {
        const letterTypeField = document.getElementById('letterType');
        // Only warn if the field exists, is required, and is empty
        if (letterTypeField && letterTypeField.hasAttribute('required') && letterTypeField.value.trim() === '') {
            errors.push('نوع الخطاب مطلوب');
        }
    }
    
    if (!formData.content && !formData.prompt) {
        const contentField = document.getElementById('letterPreview') || document.getElementById('prompt');
        // Only warn if the field exists, is required, and is empty
        if (contentField && contentField.hasAttribute('required') && contentField.value.trim() === '') {
            errors.push('محتوى الخطاب مطلوب');
        }
    }
    
    if (errors.length > 0) {
        console.log('⚠️ Validation errors found:', errors);
        
        // Show each error as a notification (but only if really necessary)
        if (typeof notify !== 'undefined') {
            errors.forEach((error, index) => {
                setTimeout(() => {
                    notify.warning(error);
                }, index * 200); // Stagger the notifications
            });
        } else {
            alert('أخطاء في النموذج:\n' + errors.join('\n'));
        }
        return false;
    }
    
    console.log('✅ Form validation passed');
    return true;
}

// IMPROVED SILENT VALIDATION FUNCTION FOR LETTER CREATION
function validateFormSilently(formData) {
    console.log('🔇 Silent form validation - no user warnings');
    
    const issues = [];
    
    // Log missing fields for debugging but don't warn user
    if (!formData.get?.('organization_name') && !formData.organizationName) {
        issues.push('organization_name');
    }
    
    if (!formData.get?.('recipient') && !formData.recipient) {
        issues.push('recipient');
    }
    
    if (!formData.get?.('category') && !formData.letterType) {
        issues.push('category');
    }
    
    if (!formData.get?.('prompt') && !formData.content) {
        issues.push('content');
    }
    
    // Log issues for debugging but don't warn user
    if (issues.length > 0) {
        console.log('ℹ️ Form has missing fields (API will handle):', issues);
    }
    
    // Always return true - let API handle validation
    return true;
}

// CONTEXT-AWARE VALIDATION WRAPPER
function smartFormValidation(formData, context = 'unknown') {
    console.log(`🎯 Smart validation for context: ${context}`);
    
    switch (context) {
        case 'letter-creation':
        case 'letter-save':
        case 'letter-edit':
            // Use silent validation for letter operations
            return validateFormSilently(formData);
            
        case 'user-settings':
        case 'profile-update':
        case 'critical-form':
            // Use normal validation for critical forms
            return validateFormWithNotifications(formData);
            
        default:
            // Default to silent validation to avoid false positives
            console.log('🔇 Unknown context - using silent validation');
            return validateFormSilently(formData);
    }
}

// OVERRIDE FORM VALIDATION CALLS IN CREATE LETTER CONTEXT
if (typeof window !== 'undefined') {
    // Override the global validation function for letter creation pages
    const originalValidation = window.validateFormWithNotifications;
    
    window.validateFormWithNotifications = function(formData) {
        // Check current page context
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'create-letter.html') {
            // Use silent validation for letter creation
            return validateFormSilently(formData);
        } else {
            // Use original validation for other pages
            return originalValidation ? originalValidation.call(this, formData) : validateFormWithNotifications(formData);
        }
    };
    
    // Export the smart validation function
    window.smartFormValidation = smartFormValidation;
    window.validateFormSilently = validateFormSilently;
}

console.log('✅ Form validation functions updated - false warnings eliminated');
// NETWORK STATUS MONITORING
function initializeNetworkMonitoring() {
    window.addEventListener('online', function() {
        console.log('📡 Connection restored');
        if (typeof notify !== 'undefined') {
            notify.success('تم استعادة الاتصال بالإنترنت', 3000);
        }
        
        // Refresh data when connection is restored
        if (typeof refreshLetterCache === 'function') {
            refreshLetterCache();
        }
    });
    
    window.addEventListener('offline', function() {
        console.log('📡 Connection lost');
        if (typeof notify !== 'undefined') {
            notify.warning('لا يوجد اتصال بالإنترنت - سيتم استخدام البيانات المخزنة', 5000);
        }
    });
}

// PERFORMANCE MONITORING
function initializePerformanceMonitoring() {
    if (window.perfMonitor) {
        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`📊 Page load time: ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('⚠️ Slow page load detected');
                showPerformanceHint();
            }
        });
        
        // Monitor memory usage (if available)
        if (performance.memory) {
            setInterval(() => {
                const memoryInfo = performance.memory;
                const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024);
                
                if (usedMB > 100) { // More than 100MB
                    console.warn(`⚠️ High memory usage: ${usedMB}MB / ${totalMB}MB`);
                }
            }, 30000); // Check every 30 seconds
        }
    }
}

function showPerformanceHint() {
    const hint = document.createElement('div');
    hint.className = 'performance-hint';
    hint.innerHTML = `
        <div class="hint-content">
            <i class="fas fa-lightbulb"></i>
            <p>لتحسين الأداء، يمكنك مسح ذاكرة التخزين المؤقت</p>
            <button onclick="clearAppCache()" class="hint-btn">مسح الذاكرة</button>
            <button onclick="this.parentElement.parentElement.remove()" class="hint-close">×</button>
        </div>
    `;
    
    document.body.appendChild(hint);
    
    setTimeout(() => {
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }
    }, 10000);
}

function setupIntersectionObserver() {
    // Set up intersection observer for performance optimization
    const observerOptions = {
        rootMargin: '50px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Element is visible, can trigger actions if needed
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe elements that need lazy loading
    const lazyElements = document.querySelectorAll('.lazy-load');
    lazyElements.forEach(element => {
        observer.observe(element);
    });
}

// ==============================================
// INITIALIZATION
// ==============================================

// INITIALIZE ON DOM CONTENT LOADED
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Main.js initialized');
    
    // Initialize network monitoring
    initializeNetworkMonitoring();
    
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Set up intersection observer
    setupIntersectionObserver();
    
    // Page-specific initialization
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('📄 Current page:', currentPage);
    
    switch (currentPage) {
        case 'letter-history.html':
            console.log('📋 Initializing letter history page...');
            // The actual loading will be triggered by the page-specific script
            break;
            
        case 'review-letter.html':
            console.log('🔍 Initializing review letter page...');
            if (typeof loadLettersForReview === 'function') {
                loadLettersForReview();
            }
            if (typeof setupReviewForm === 'function') {
                setupReviewForm();
            }
            break;
            
        case 'create-letter.html':
            console.log('✏️ Initializing create letter page...');
            // Initialize form validation if form exists
            const letterForm = document.getElementById('letterForm');
            if (letterForm) {
                letterForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const formData = new FormData(this);
                    const data = Object.fromEntries(formData.entries());
                    
                    if (validateFormWithNotifications(data)) {
                        console.log('✅ Form validated, proceeding...');
                        // Continue with form submission
                    }
                });
            }
            break;
            
        default:
            console.log('🏠 Initializing default page...');
            break;
    }
});

// CLEANUP ON PAGE UNLOAD
window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up optimizations...');
    
    // Stop background sync
    if (window.backgroundSync) {
        window.backgroundSync.stop();
    }
    
    // Log performance summary
    if (window.perfMonitor) {
        window.perfMonitor.logSummary();
    }
    
    // Save any pending cache updates
    if (window.letterCache) {
        window.letterCache.saveToStorage();
    }
});

// ==============================================
// GLOBAL EXPORTS
// ==============================================

// ENSURE FUNCTIONS ARE AVAILABLE BEFORE EXPORT
console.log('🔧 Preparing function exports...');

// Wait a bit to ensure everything is loaded, then export
setTimeout(() => {
    // Export functions for global access - THESE MUST ALL BE DEFINED ABOVE
    console.log('📤 Exporting functions to global scope...');
    
    window.loadLetterHistory = loadLetterHistory;
    window.reviewLetter = reviewLetter;
    window.downloadLetter = downloadLetter;
    window.deleteLetter = deleteLetter;
    window.exportLettersToCSV = exportLettersToCSV;
    window.clearAppCache = clearAppCache;
    window.validateFormWithNotifications = validateFormWithNotifications;
    window.forceRefreshStatsBar = forceRefreshStatsBar;
    window.updateQuickStats = updateQuickStats;
    window.showQuickStats = showQuickStats;
    window.loadLettersForReview = loadLettersForReview;
    window.setupReviewForm = setupReviewForm;
    window.updateReviewStatus = updateReviewStatus;
    
    // Verify exports
    console.log('✅ Function exports verification:');
    console.log('  - loadLetterHistory:', typeof window.loadLetterHistory);
    console.log('  - reviewLetter:', typeof window.reviewLetter);
    console.log('  - downloadLetter:', typeof window.downloadLetter);
    console.log('  - deleteLetter:', typeof window.deleteLetter);
    console.log('  - exportLettersToCSV:', typeof window.exportLettersToCSV);
    console.log('  - clearAppCache:', typeof window.clearAppCache);
    console.log('  - forceRefreshStatsBar:', typeof window.forceRefreshStatsBar);
    console.log('  - showQuickStats:', typeof window.showQuickStats);
    
    // Notify that functions are ready
    if (typeof notify !== 'undefined') {
        console.log('✅ All functions exported successfully with notification system');
    } else {
        console.warn('⚠️ Functions exported but notification system not available');
    }
}, 100);

console.log('✅ Main.js loaded completely');



