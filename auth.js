// auth.js - Complete authentication with whitelist and domain filtering
const PROXY_URL = '/api/apps-script-proxy';

// GOOGLE SIGN-IN DOMAIN FILTERING (Optional - set empty array to allow all domains)
const ALLOWED_GOOGLE_DOMAINS = ['netzero.sa', 'yallasquad.com','onshobbak.com']; // Add your allowed domains here
// Example: const ALLOWED_GOOGLE_DOMAINS = ['company.com', 'partner.com'];
// To disable filtering: const ALLOWED_GOOGLE_DOMAINS = [];

// ==================== PASSWORD HASHING ====================

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== DOMAIN VALIDATION ====================

function isEmailDomainAllowed(email) {
    // If no domains specified, allow all
    if (ALLOWED_GOOGLE_DOMAINS.length === 0) {
        return { allowed: true };
    }
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return { 
            allowed: false, 
            message: 'صيغة البريد الإلكتروني غير صحيحة' 
        };
    }
    
    const domain = email.split('@')[1].toLowerCase();
    
    if (ALLOWED_GOOGLE_DOMAINS.map(d => d.toLowerCase()).includes(domain)) {
        return { allowed: true };
    }
    
    return { 
        allowed: false, 
        message: `يُسمح فقط بالبريد الإلكتروني من النطاقات: ${ALLOWED_GOOGLE_DOMAINS.join(', ')}`
    };
}

// ==================== DRIVE URL CONVERSION ====================

function convertDriveUrlToDirectUrl(driveUrl) {
    if (!driveUrl || typeof driveUrl !== 'string') {
        return '';
    }
    
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9-_]+)/,
        /open\?id=([a-zA-Z0-9-_]+)/,
        /id=([a-zA-Z0-9-_]+)/
    ];
    
    let fileId = null;
    for (const pattern of patterns) {
        const match = driveUrl.match(pattern);
        if (match && match[1]) {
            fileId = match[1];
            break;
        }
    }
    
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200-h200`;
    }
    
    return driveUrl;
}

// ==================== FORM HANDLERS ====================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // ==================== LOGIN FORM ====================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const passwordHash = await hashPassword(password);

            const requestData = {
                action: 'login',
                email: email,
                passwordHash: passwordHash
            };

            try {
                const response = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });

                const result = await response.json();

                if (result.success) {
                    // Save user data to sessionStorage including role
                    const userData = {
                        ...result.user,
                        imageUrl: convertDriveUrlToDirectUrl(result.user.imageUrl)
                    };
                    
                    sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
                    window.location.href = 'index.html';
                } else {
                    // Handle specific error codes
                    if (result.code === 'NOT_AUTHORIZED' || result.code === 'NOT_WHITELISTED') {
                        notify.error('الوصول مرفوض. حسابك غير مصرح له أو تم إلغاء تفعيله.');
                    } else if (result.code === 'DOMAIN_NOT_ALLOWED') {
                        notify.error('يُسمح فقط بالبريد الإلكتروني من نطاقات محددة.');
                    } else {
                        notify.error('فشل تسجيل الدخول: ' + result.message);
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                notify.error('حدث خطأ أثناء تسجيل الدخول.');
            }
        });
    }

    // ==================== SIGNUP FORM ====================
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                notify.error('كلمات المرور غير متطابقة!');
                return;
            }

            const passwordHash = await hashPassword(password);
            const requestData = {
                action: 'signup',
                name: name,
                email: email,
                passwordHash: passwordHash,
                imageUrl: ''
            };

            const submitButton = signupForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'جاري إنشاء الحساب...';
            submitButton.disabled = true;

            try {
                const response = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });

                const result = await response.json();

                if (result.success) {
                    notify.success('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
                    window.location.href = 'login.html';
                } else {
                    // Handle specific error codes
                    if (result.code === 'NOT_WHITELISTED') {
                        notify.error('التسجيل غير مسموح. هذا البريد الإلكتروني غير مصرح له. يرجى التواصل مع المسؤول.');
                    } else if (result.code === 'DOMAIN_NOT_ALLOWED') {
                        notify.error('يُسمح فقط بالبريد الإلكتروني من نطاقات محددة.');
                    } else {
                        notify.error('فشل في إنشاء الحساب: ' + result.message);
                    }
                }
            } catch (error) {
                console.error('Signup error:', error);
                notify.error('حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى.');
            } finally {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
});

// ==================== GOOGLE SIGN-IN HANDLERS ====================

/**
 * Handle Google Sign-In with domain filtering and whitelist check
 */
async function handleGoogleSignIn(response) {
    console.log('Google Sign-In response:', response);
    
    try {
        const payload = parseJwt(response.credential);
        console.log('User info from Google:', payload);
        
        // STEP 1: Check domain (frontend validation)
        const domainCheck = isEmailDomainAllowed(payload.email);
        if (!domainCheck.allowed) {
            notify.error(domainCheck.message);
            return;
        }
        
        // STEP 2: Check with Apps Script whitelist (backend validation)
        const checkResult = await checkGoogleAuthWithAppsScript({
            email: payload.email,
            name: payload.name,
            imageUrl: payload.picture || ''
        });

        if (checkResult.success) {
            // Store validated user data with role from whitelist
            sessionStorage.setItem('loggedInUser', JSON.stringify(checkResult.user));
            notify.success('تم تسجيل الدخول بنجاح باستخدام Google!');
            window.location.href = 'index.html';
        } else {
            // Handle whitelist rejection
            if (checkResult.code === 'NOT_WHITELISTED') {
                notify.error('الوصول مرفوض. حساب Google هذا غير مصرح له بالوصول إلى التطبيق.');
            } else if (checkResult.code === 'DOMAIN_NOT_ALLOWED') {
                notify.error('يُسمح فقط بالبريد الإلكتروني من نطاقات محددة.');
            } else {
                notify.error('فشل تسجيل الدخول: ' + checkResult.message);
            }
        }
        
    } catch (error) {
        console.error('Error processing Google Sign-In:', error);
        notify.error('حدث خطأ أثناء تسجيل الدخول بـ Google');
    }
}

/**
 * Handle Google Sign-Up with domain filtering and whitelist check
 */
async function handleGoogleSignUp(response) {
    console.log('Google Sign-Up response:', response);
    
    try {
        const payload = parseJwt(response.credential);
        console.log('User info from Google:', payload);
        
        // STEP 1: Check domain (front-end validation)
        const domainCheck = isEmailDomainAllowed(payload.email);
        if (!domainCheck.allowed) {
            notify.error(domainCheck.message);
            return;
        }
        
        // STEP 2: Check with Apps Script whitelist (backend validation)
        const checkResult = await checkGoogleAuthWithAppsScript({
            email: payload.email,
            name: payload.name,
            imageUrl: payload.picture || ''
        });

        if (checkResult.success) {
            // Store validated user data with role from whitelist
            sessionStorage.setItem('loggedInUser', JSON.stringify(checkResult.user));
            notify.success('تم إنشاء الحساب بنجاح باستخدام Google!');
            window.location.href = 'index.html';
        } else {
            // Handle whitelist rejection
            if (checkResult.code === 'NOT_WHITELISTED') {
                notify.error('التسجيل غير مسموح. حساب Google هذا غير مصرح له. يرجى التواصل مع المسؤول.');
            } else if (checkResult.code === 'DOMAIN_NOT_ALLOWED') {
                notify.error('يُسمح فقط بالبريد الإلكتروني من نطاقات محددة.');
            } else {
                notify.error('فشل إنشاء الحساب: ' + checkResult.message);
            }
        }
        
    } catch (error) {
        console.error('Error processing Google Sign-Up:', error);
        notify.error('حدث خطأ أثناء إنشاء الحساب بـ Google');
    }
}

/**
 * Check Google Auth with Apps Script whitelist
 */
async function checkGoogleAuthWithAppsScript(userData) {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'checkGoogleAuth',
                email: userData.email,
                name: userData.name,
                imageUrl: userData.imageUrl
            }),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error checking Google auth:', error);
        return {
            success: false,
            message: 'خطأ في التحقق من الحساب'
        };
    }
}

/**
 * Helper function to decode JWT token from Google
 */
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        throw error;
    }
}
