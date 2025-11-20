const SPREADSHEET_ID = '1cLbTgbluZyWYHRouEgqHQuYQqKexHhu4st9ANzuaxGk';

/**
 * A test function to verify the script is deployed correctly.
 */
function doGet(e) {
    return createJsonResponse({ success: true, message: 'Script is deployed and running correctly.' });
}

/**
 * Handles CORS preflight requests.
 */
function doOptions(e) {
    var output = ContentService.createTextOutput("");
    output.setMimeType(ContentService.MimeType.TEXT);
    
    try {
        if (typeof output.addHttpHeader === 'function') {
            output.addHttpHeader('Access-Control-Allow-Origin', '*');
            output.addHttpHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            output.addHttpHeader('Access-Control-Allow-Headers', 'Content-Type');
            output.addHttpHeader('Access-Control-Max-Age', '86400');
        }
    } catch (headerError) {
        console.error('Could not add CORS headers:', headerError.toString());
    }
    
    return output;
}

// ==================== NEW: WHITELIST FUNCTIONS ====================

/**
 * Check if email is in whitelist and active
 */
function isEmailWhitelisted(email) {
    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Whitelist");
        if (!sheet) {
            console.log('Whitelist sheet not found - allowing access for backward compatibility');
            return { allowed: true, role: 'user' }; // Allow access if no whitelist exists yet
        }
        
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) { // Skip header row
            if (data[i][0] && 
                data[i][0].toString().toLowerCase() === email.toLowerCase() && 
                data[i][2] === 'active') {
                return {
                    allowed: true,
                    role: data[i][1] || 'user'
                };
            }
        }
        return { allowed: false };
    } catch (error) {
        console.log('Error checking whitelist:', error.toString());
        return { allowed: true, role: 'user' }; // Allow access if error occurs (backward compatibility)
    }
}

/**
 * Add email to whitelist (admin only function)
 */
function addToWhitelist(email, role = 'user', addedBy = 'system') {
    try {
        let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Whitelist");
        if (!sheet) {
            // Create whitelist sheet if it doesn't exist
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            sheet = ss.insertSheet("Whitelist");
            sheet.getRange(1, 1, 1, 5).setValues([['Email', 'Role', 'Status', 'Added By', 'Date Added']]);
        }
        
        // Check if email already exists
        const existingCheck = isEmailWhitelisted(email);
        if (existingCheck.allowed) {
            return { success: false, message: 'Email already in whitelist' };
        }
        
        // Add to whitelist
        sheet.appendRow([
            email,
            role,
            'active',
            addedBy,
            new Date().toISOString()
        ]);
        
        SpreadsheetApp.flush();
        return { success: true, message: 'Email added to whitelist' };
    } catch (error) {
        return { success: false, message: 'Error adding to whitelist: ' + error.toString() };
    }
}

/**
 * Remove email from whitelist
 */
function removeFromWhitelist(email) {
    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Whitelist");
        if (!sheet) return { success: false, message: 'Whitelist sheet not found' };

        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
                sheet.deleteRow(i + 1);
                SpreadsheetApp.flush();
                return { success: true, message: 'Email removed from whitelist' };
            }
        }
        return { success: false, message: 'Email not found in whitelist' };
    } catch (error) {
        return { success: false, message: 'Error removing from whitelist: ' + error.toString() };
    }
}

/**
 * Get all whitelist entries
 */
function getWhitelistEntries() {
    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Whitelist");
        if (!sheet) return { success: false, message: 'Whitelist sheet not found' };

        const data = sheet.getDataRange().getValues();
        const entries = data.slice(1).map(row => ({
            email: row[0] || '',
            role: row[1] || '',
            status: row[2] || '',
            addedBy: row[3] || '',
            dateAdded: row[4] || ''
        }));

        return { success: true, data: entries };
    } catch (error) {
        return { success: false, message: 'Error getting whitelist: ' + error.toString() };
    }
}

/**
 * Admin function to manage whitelist
 */
function manageWhitelist(action, email, role, adminEmail) {
    // Verify admin has permission
    const adminCheck = isEmailWhitelisted(adminEmail);
    if (!adminCheck.allowed || adminCheck.role !== 'admin') {
        return {
            success: false,
            message: 'Admin privileges required.'
        };
    }

    switch (action) {
        case 'add':
            return addToWhitelist(email, role, adminEmail);
        case 'remove':
            return removeFromWhitelist(email);
        case 'list':
            return getWhitelistEntries();
        default:
            return {
                success: false,
                message: 'Invalid action.'
            };
    }
}

// ==================== UPDATED: MAIN HANDLERS ====================

/**
 * Handles all POST requests from your web app.
 */
function doPost(e) {
    console.log('=== doPost called ===');
    console.log('Parameters received:', JSON.stringify(e.parameter));
    console.log('PostData:', e.postData ? e.postData.contents : 'No postData');

    // Check if this is a JSON request (PDF extraction)
    if (e.postData && e.postData.contents) {
        try {
            var jsonData = JSON.parse(e.postData.contents);
            if (jsonData.fileId) {
                console.log('Routing to PDF extraction');
                return handlePdfExtraction(e);
            }
        } catch (jsonError) {
            console.log('Not JSON data, treating as form data');
        }
    }

    // Handle form data requests (login, etc.)
    if (e.parameter && e.parameter.action) {
        console.log('Routing to form data handler');
        return handleFormDataRequest(e);
    }

    // Default response
    return createJsonResponse({
        success: false,
        message: 'Invalid request format'
    });
}

/**
 * UPDATED: Handles form data requests with whitelist support
 */
function handleFormDataRequest(e) {
    const response = {
        success: false,
        message: 'An unknown error occurred.',
        timestamp: new Date().toISOString()
    };

    try {
        Logger.log('Incoming POST request parameters: ' + JSON.stringify(e.parameter));
        const action = e.parameter.action;

        if (!action) {
            response.message = 'Missing required parameter: action.';
            return createJsonResponse(response);
        }

        switch (action) {
            case 'login':
                return createJsonResponse(handleLogin(e));
                
            case 'signup':
                return createJsonResponse(handleSignup(e));
                
            case 'checkGoogleAuth': // NEW: Handle Google Auth validation
                return createJsonResponse(handleGoogleAuthCheck(e));
                
            case 'manageWhitelist': // NEW: Handle whitelist management
                return createJsonResponse(manageWhitelist(
                    e.parameter.whitelistAction,
                    e.parameter.targetEmail,
                    e.parameter.targetRole,
                    e.parameter.adminEmail
                ));

            case 'updateReviewStatus':
                try {
                    const letterIdUpdate = e.parameter.letterId;
                    const status = e.parameter.status;
                    const reviewerName = e.parameter.reviewerName;
                    const notes = e.parameter.notes;
                    const letterContent = e.parameter.letterContent;

                    updateReviewStatusInSheet(letterIdUpdate, status, reviewerName, notes, letterContent);

                    response.success = true;
                    response.message = 'Review status updated successfully.';
                } catch (updateError) {
                    Logger.log('Update review status error: ' + updateError.toString());
                    response.message = 'Update error: ' + updateError.toString();
                }
                break;

            case 'deleteLetter':
                try {
                    const letterIdDelete = e.parameter.letterId;
                    deleteLetterFromSheet(letterIdDelete);

                    response.success = true;
                    response.message = 'Letter deleted successfully.';
                } catch (deleteError) {
                    Logger.log('Delete letter error: ' + deleteError.toString());
                    response.message = 'Delete error: ' + deleteError.toString();
                }
                break;

            case 'updateWhatsAppStatus':
                try {
                    const letterIdWhatsApp = e.parameter.letterId;
                    const whatsappStatus = e.parameter.whatsappStatus;
                    const managerName = e.parameter.managerName;
                    const managerPhone = e.parameter.managerPhone;

                    updateWhatsAppStatusInSheet(letterIdWhatsApp, whatsappStatus, managerName, managerPhone);

                    response.success = true;
                    response.message = 'WhatsApp status updated successfully.';
                } catch (whatsappError) {
                    Logger.log('Update WhatsApp status error: ' + whatsappError.toString());
                    response.message = 'WhatsApp update error: ' + whatsappError.toString();
                }
                break;

            default:
                response.message = 'Invalid action received: ' + action;
                break;
        }
    } catch (error) {
        Logger.log('Error in handleFormDataRequest: ' + error.toString());
        response.message = 'Server error: ' + error.toString();
    }

    return createJsonResponse(response);
}

// ==================== UPDATED: AUTH HANDLERS ====================

/**
 * UPDATED: Enhanced login function with whitelist check
 */
function handleLogin(e) {
    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Signing");
        if (!sheet) {
            return {
                success: false,
                message: 'Signing sheet not found in spreadsheet.'
            };
        }

        const email = e.parameter.email;
        const passwordHash = e.parameter.passwordHash;

        if (!email || !passwordHash) {
            return {
                success: false,
                message: 'Missing email or password.'
            };
        }

        // Check whitelist (for active users)
        const whitelistCheck = isEmailWhitelisted(email);
        if (!whitelistCheck.allowed) {
            return {
                success: false,
                message: 'Access denied. Your account has been deactivated or is not authorized.',
                code: 'NOT_AUTHORIZED'
            };
        }

        const userRow = findUserRow(sheet, email);
        if (userRow === 0) {
            return {
                success: false,
                message: 'User not found.'
            };
        }

        const storedHash = sheet.getRange(userRow, 4).getValue();
        
        // Check if user has status column (backward compatibility)
        let userStatus = 'active';
        try {
            if (sheet.getLastColumn() >= 8) {
                userStatus = sheet.getRange(userRow, 8).getValue() || 'active';
            }
        } catch (statusError) {
            userStatus = 'active'; // Default for backward compatibility
        }

        if (userStatus !== 'active') {
            return {
                success: false,
                message: 'Account is inactive. Please contact an administrator.'
            };
        }

        if (storedHash === passwordHash) {
            // Update last login if column exists
            try {
                if (sheet.getLastColumn() >= 9) {
                    sheet.getRange(userRow, 9).setValue(new Date().toISOString());
                }
            } catch (updateError) {
                // Ignore update errors for backward compatibility
            }
            
            return {
                success: true,
                message: 'Login successful.',
                user: {
                    userId: sheet.getRange(userRow, 1).getValue(),
                    fullName: sheet.getRange(userRow, 2).getValue(),
                    email: sheet.getRange(userRow, 3).getValue(),
                    username: sheet.getRange(userRow, 5).getValue(),
                    imageUrl: convertDriveUrlToDirectUrl(sheet.getRange(userRow, 6).getValue()),
                    role: whitelistCheck.role,
                    status: userStatus
                }
            };
        } else {
            return {
                success: false,
                message: 'Incorrect password.'
            };
        }
    } catch (error) {
        Logger.log('Login error: ' + error.toString());
        return {
            success: false,
            message: 'Login processing error: ' + error.toString()
        };
    }
}

/**
 * UPDATED: Enhanced signup function with whitelist check
 */
function handleSignup(e) {
    const name = e.parameter.name;
    const email = e.parameter.email;
    const passwordHash = e.parameter.passwordHash;
    const imageUrl = e.parameter.imageUrl || '';

    if (!name || !email || !passwordHash) {
        return {
            success: false,
            message: 'Missing required signup data: name, email, or password.'
        };
    }

    // Check whitelist first
    const whitelistCheck = isEmailWhitelisted(email);
    if (!whitelistCheck.allowed) {
        return {
            success: false,
            message: 'Registration not allowed. This email is not authorized to access this application. Please contact an administrator.',
            code: 'NOT_WHITELISTED'
        };
    }

    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Signing");
        if (!sheet) {
            return {
                success: false,
                message: 'Signing sheet not found in spreadsheet.'
            };
        }

        // Check if user already exists
        if (findUserRow(sheet, email) !== 0) {
            return {
                success: false,
                message: 'User with this email already exists.'
            };
        }

        // Create new row with enhanced data
        const newRow = [
            '', // ID (auto-generated)
            name,
            email,
            passwordHash,
            name, // username
            imageUrl,
            whitelistCheck.role, // role
            'active', // status
            new Date().toISOString() // signup date
        ];

        sheet.appendRow(newRow);
        SpreadsheetApp.flush();

        return {
            success: true,
            message: 'User registered successfully.',
            role: whitelistCheck.role
        };
    } catch (error) {
        Logger.log('Signup error: ' + error.toString());
        return {
            success: false,
            message: 'Signup processing error: ' + error.toString()
        };
    }
}

/**
 * NEW: Handle Google Authentication with whitelist check
 */
function handleGoogleAuthCheck(e) {
    const email = e.parameter.email;
    const name = e.parameter.name;
    const imageUrl = e.parameter.imageUrl;

    if (!email || !name) {
        return {
            success: false,
            message: 'Missing required Google auth data.'
        };
    }

    // Check whitelist first
    const whitelistCheck = isEmailWhitelisted(email);
    if (!whitelistCheck.allowed) {
        return {
            success: false,
            message: 'Access denied. This Google account is not authorized to access this application.',
            code: 'NOT_WHITELISTED'
        };
    }

    try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Signing");
        if (!sheet) {
            return {
                success: false,
                message: 'Signing sheet not found.'
            };
        }

        const existingRow = findUserRow(sheet, email);

        // If user doesn't exist, create them
        if (existingRow === 0) {
            const newRow = [
                '', // ID (auto-generated)
                name,
                email,
                '', // No password hash for Google users
                name, // username
                convertDriveUrlToDirectUrl(imageUrl || ''),
                whitelistCheck.role,
                'active',
                new Date().toISOString()
            ];
            sheet.appendRow(newRow);
            SpreadsheetApp.flush();
        } else {
            // Update existing user's info if needed
            sheet.getRange(existingRow, 2).setValue(name); // Update name
            sheet.getRange(existingRow, 6).setValue(convertDriveUrlToDirectUrl(imageUrl || '')); // Update image
            
            // Update last login if column exists
            try {
                if (sheet.getLastColumn() >= 9) {
                    sheet.getRange(existingRow, 9).setValue(new Date().toISOString());
                }
            } catch (updateError) {
                // Ignore for backward compatibility
            }
        }

        return {
            success: true,
            message: 'Google authentication successful.',
            user: {
                fullName: name,
                email: email,
                username: name,
                imageUrl: convertDriveUrlToDirectUrl(imageUrl || ''),
                role: whitelistCheck.role,
                status: 'active',
                isGoogleUser: true
            }
        };
    } catch (error) {
        Logger.log('Google auth error: ' + error.toString());
        return {
            success: false,
            message: 'Google authentication error: ' + error.toString()
        };
    }
}

// ==================== EXISTING FUNCTIONS (PRESERVED) ====================

/**
 * Handles PDF extraction requests (JSON data) with proper OCR
 */
function handlePdfExtraction(e) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("Received");

    if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
            "status": "error",
            "message": "Sheet named 'Received' not found."
        })).setMimeType(ContentService.MimeType.JSON);
    }

    var requestBody = JSON.parse(e.postData.contents);
    var fileId = requestBody.fileId;

    if (!fileId) {
        return ContentService.createTextOutput(JSON.stringify({
            "status": "error",
            "message": "No fileId provided in the request body."
        })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var file = DriveApp.getFileById(fileId);
        var pdfBlob = file.getBlob();

        console.log("File name:", file.getName());
        console.log("File MIME type:", pdfBlob.getContentType());

        // Verify it's actually a PDF
        if (pdfBlob.getContentType() !== 'application/pdf') {
            return ContentService.createTextOutput(JSON.stringify({
                "status": "error",
                "message": "File is not a PDF. Detected type: " + pdfBlob.getContentType()
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Method 1: Use Drive API with OCR
        try {
            var convertedDoc = Drive.Files.insert({
                title: file.getName().replace(/\.pdf$/, "_converted_" + Date.now()),
                mimeType: 'application/vnd.google-apps.document'
            }, pdfBlob, {
                convert: true,
                ocr: true,
                ocrLanguage: 'ar',
                uploadType: 'multipart'
            });

            var docId = convertedDoc.id;

            // Wait a moment for conversion to complete
            Utilities.sleep(2000);

            var textContent = DocumentApp.openById(docId).getBody().getText();

            // Find the first empty row in column B
            var lastRow = sheet.getLastRow();
            var nextRow = 1;

            if (lastRow > 0) {
                var range = sheet.getRange("B1:B" + lastRow);
                var values = range.getValues();

                for (var i = 0; i < values.length; i++) {
                    if (values[i][0] === "") {
                        nextRow = i + 1;
                        break;
                    }
                }

                if (nextRow === 1 && values[0][0] !== "") {
                    nextRow = lastRow + 1;
                }
            }

            // Add the content to the sheet
            sheet.getRange("B" + nextRow).setValue(textContent);

            // Clean up temporary document
            try {
                Drive.Files.remove(docId);
            } catch (cleanupError) {
                console.log("Cleanup warning:", cleanupError.toString());
            }

            return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "message": "Text extracted and added to sheet.",
                "row": nextRow,
                "fileName": file.getName(),
                "textPreview": textContent.substring(0, 100) + (textContent.length > 100 ? "..." : "")
            })).setMimeType(ContentService.MimeType.JSON);

        } catch (method1Error) {
            console.log("OCR Method failed:", method1Error.toString());
            // Method 2: Alternative OCR approach
            try {
                // Create a temporary file in Drive first
                var tempFile = DriveApp.createFile(
                    file.getName() + "_temp_" + Date.now(),
                    pdfBlob
                );

                // Convert using Drive API
                var resource = {
                    title: file.getName().replace(/\.pdf$/, "_converted_" + Date.now())
                };

                var convertedDoc = Drive.Files.insert(resource, pdfBlob, {
                    convert: true,
                    ocr: true,
                    ocrLanguage: 'ar'
                });

                var docId = convertedDoc.id;
                Utilities.sleep(2000);

                var textContent = DocumentApp.openById(docId).getBody().getText();

                var lastRow = sheet.getLastRow();
                var nextRow = lastRow + 1;

                sheet.getRange("B" + nextRow).setValue(textContent);

                // Clean up
                try {
                    tempFile.setTrashed(true);
                    Drive.Files.remove(docId);
                } catch (cleanupError) {
                    console.log("Cleanup warning:", cleanupError.toString());
                }

                return ContentService.createTextOutput(JSON.stringify({
                    "status": "success",
                    "message": "Text extracted and added to sheet (alternative method).",
                    "row": nextRow,
                    "fileName": file.getName(),
                    "textPreview": textContent.substring(0, 100) + (textContent.length > 100 ? "..." : "")
                })).setMimeType(ContentService.MimeType.JSON);

            } catch (method2Error) {
                return ContentService.createTextOutput(JSON.stringify({
                    "status": "error",
                    "message": "Both OCR methods failed. Error 1: " + method1Error.message + " Error 2: " + method2Error.message
                })).setMimeType(ContentService.MimeType.JSON);
            }
        }

    } catch (mainError) {
        return ContentService.createTextOutput(JSON.stringify({
            "status": "error",
            "message": "PDF processing failed: " + mainError.message
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Helper function to create a consistent JSON response
 */
function createJsonResponse(responseObject) {
    var jsonString;
    try {
        jsonString = JSON.stringify(responseObject);
    } catch (stringifyError) {
        console.error('JSON stringify error:', stringifyError.toString());
        jsonString = '{"success":false,"message":"JSON stringify error"}';
    }

    var output = ContentService.createTextOutput(jsonString);
    output.setMimeType(ContentService.MimeType.JSON);

    try {
        if (typeof output.addHttpHeader === 'function') {
            output.addHttpHeader('Access-Control-Allow-Origin', '*');
            output.addHttpHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            output.addHttpHeader('Access-Control-Allow-Headers', 'Content-Type');
        }
    } catch (headerError) {
        console.error('Could not add headers:', headerError.toString());
    }

    return output;
}

/**
 * Helper function to find a user's row number by email.
 */
function findUserRow(sheet, email) {
    try {
        const data = sheet.getRange("C:C").getValues();
        for (let i = 0; i < data.length; i++) {
            if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
                return i + 1;
            }
        }
        return 0;
    } catch (error) {
        Logger.log('Error in findUserRow: ' + error.toString());
        return 0;
    }
}

/**
 * Converts Google Drive sharing URL to direct image URL
 */
function convertDriveUrlToDirectUrl(driveUrl) {
    if (!driveUrl || typeof driveUrl !== 'string') {
        return '';
    }

    const match = driveUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        const fileId = match[1];
        return `https://drive.google.com/uc?id=${fileId}`;
    }

    return driveUrl;
}

/**
 * Updates the review status for a letter.
 * UPDATED: Now also updates letter content if provided
 */
function updateReviewStatusInSheet(letterId, status, reviewerName, notes, letterContent) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');

    if (!sheet) {
        throw new Error('Submissions sheet not found in spreadsheet.');
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == letterId) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex === -1) {
        throw new Error('Letter with ID ' + letterId + ' not found.');
    }

    const targetRow = rowIndex + 1;

    // Update review status (column J - index 10)
    sheet.getRange(targetRow, 10).setValue(status);
    
    // Update reviewer name (column M - index 13)
    sheet.getRange(targetRow, 13).setValue(reviewerName);
    
    // Update notes (column N - index 14)
    sheet.getRange(targetRow, 14).setValue(notes);
    
    // NEW: Update letter content if provided (column G - index 7)
    if (letterContent && letterContent.trim() !== '') {
        sheet.getRange(targetRow, 7).setValue(letterContent);
        Logger.log('Updated letter content for ID: ' + letterId);
    }

    SpreadsheetApp.flush();
    return true;
}

/**
 * Updates Send Status in the sheet when sent for WhatsApp approval.
 */
function updateWhatsAppStatusInSheet(letterId, whatsappStatus, managerName, managerPhone) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');

    if (!sheet) {
        throw new Error('Submissions sheet not found in spreadsheet.');
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == letterId) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex === -1) {
        throw new Error('Letter with ID ' + letterId + ' not found.');
    }

    const targetRow = rowIndex + 1;

    // Update Send Status (column K - index 11) instead of separate WhatsApp column
    sheet.getRange(targetRow, 11).setValue(whatsappStatus);

    Logger.log('Updated Send Status for letter ID: ' + letterId + ' to: ' + whatsappStatus);
    Logger.log('Manager: ' + managerName + ' (' + managerPhone + ')');

    SpreadsheetApp.flush();
    return true;
}

/**
 * Deletes a letter from the sheet.
 */
function deleteLetterFromSheet(letterId) {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');

    if (!sheet) {
        throw new Error('Submissions sheet not found in spreadsheet.');
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == letterId) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex === -1) {
        throw new Error('Letter with ID ' + letterId + ' not found for deletion.');
    }

    const targetRow = rowIndex + 1;
    sheet.deleteRow(targetRow);
    SpreadsheetApp.flush();

    return true;
}

// ==================== SETUP HELPER FUNCTIONS ====================

/**
 * One-time setup function to create whitelist with initial admin
 * Run this manually from the Apps Script editor to set up your first admin
 */
function setupInitialWhitelist() {
    const INITIAL_ADMIN_EMAIL = 'squad@nabatik.com'; // REPLACE WITH YOUR EMAIL
    
    try {
        let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Whitelist");
        if (!sheet) {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            sheet = ss.insertSheet("Whitelist");
            sheet.getRange(1, 1, 1, 5).setValues([['Email', 'Role', 'Status', 'Added By', 'Date Added']]);
        }
        
        // Add initial admin
        sheet.appendRow([
            INITIAL_ADMIN_EMAIL,
            'admin',
            'active',
            'setup',
            new Date().toISOString()
        ]);
        
        SpreadsheetApp.flush();
        console.log('Initial whitelist setup complete. Admin email: ' + INITIAL_ADMIN_EMAIL);
        return 'Setup complete';
    } catch (error) {
        console.error('Setup error:', error.toString());
        return 'Setup failed: ' + error.toString();
    }
}
