// Supabase Authentication
// VERSION: MOSJID_AUTH_V6_STABLE
console.log('%c [AUTH] MOSJID_AUTH_V6_STABLE ', 'background: #222; color: #bada55; font-size: 16px;');

const SUPABASE_URL = 'https://hqarozktuvzrzhfhhjbd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYXJvemt0dXZ6cnpoZmhoamJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjQ3MjgsImV4cCI6MjA5MDM0MDcyOH0.f-JXg-R5cvyxvgNc3NvjO-aNjr706JrKkSqzNB1T6T0';

// --- Init client with a UNIQUE name ---
var sbClient = null;
function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            if (!window.supabaseClient) {
                window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
            sbClient = window.supabaseClient;
            console.log('[auth.js] Supabase client initialized (V6_STABLE)');
            setupAuthListeners();
            return true;
        }
    } catch (e) {
        console.error('[auth.js] Supabase init error:', e);
    }
    return false;
}

// Retry initialization if script isn't ready
if (!initSupabase()) {
    var retryCount = 0;
    var retryInterval = setInterval(function() {
        retryCount++;
        if (initSupabase() || retryCount > 50) {
            clearInterval(retryInterval);
            if (retryCount > 50) console.error('[auth.js] Supabase failed to load after 5s');
        }
    }, 100);
}

function setupAuthListeners() {
    if (!sbClient) return;

    sbClient.auth.onAuthStateChange(function(event, session) {
        console.log('[AUTH] State changed:', event);
        updateNavigationUI(session);
        
        // Auto-redirect if on login/register page and signed in
        const path = window.location.pathname.toLowerCase();
        const isAuthPage = path.includes('login') || path.includes('register');
        
            if (session && isAuthPage) {
                console.log('[AUTH] Redirecting to index (onAuthStateChange)...');
                window.location.replace(window.location.origin + '/index.html');
            }
        });
    
        sbClient.auth.getSession().then(function(resp) {
            var session = resp.data.session;
            updateNavigationUI(session);
            
            const path = window.location.pathname.toLowerCase();
            const isAuthPage = path.includes('login') || path.includes('register');
            
            if (session && isAuthPage) {
                console.log('[AUTH] Redirecting to index (getSession)...');
                window.location.replace(window.location.origin + '/index.html');
            }
        });
}

// --- Helper: show a message ---
function showMsg(containerId, text, isError) {
    var box = document.getElementById(containerId);
    if (!box) {
        box = document.createElement('div');
        box.id = containerId;
        var form = document.querySelector('form');
        if (form) form.after(box);
    }
    box.textContent = text;
    box.style.cssText = 'display:block;padding:12px 16px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;margin-top:12px;' +
        (isError ? 'background:#fee2e2;color:#b91c1c;' : 'background:#dcfce7;color:#15803d;');
    box.classList.remove('hidden');
}

// ===== LOGIN FORM =====
var loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var email    = document.getElementById('login-email').value.trim();
        var password = document.getElementById('login-password').value;
        var btn      = document.getElementById('login-btn') || loginForm.querySelector('button[type="submit"]');

        if (!email || !password) { showMsg('login-msg', 'Please enter email and password.', true); return; }
        if (!sbClient) { showMsg('login-msg', 'Authentication error: Supabase not initialized. Please check console.', true); return; }

        if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

        try {
            var result = await sbClient.auth.signInWithPassword({ email: email, password: password });
            if (result.error) {
                showMsg('login-msg', result.error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
            } else {
                showMsg('login-msg', '✅ Signed in! Redirecting...', false);
                setTimeout(function() { window.location.href = '/index.html'; }, 500);
            }
        } catch (err) {
            showMsg('login-msg', 'Error: ' + err.message, true);
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        }
    });
}

// ===== REGISTER FORM =====
var registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        var name     = document.getElementById('reg-name').value.trim();
        var email    = document.getElementById('reg-email').value.trim();
        var password = document.getElementById('reg-password').value;
        var btn      = document.getElementById('register-btn');

        if (!email || !password) { showMsg('register-msg', 'Please fill in all fields.', true); return; }
        if (password.length < 6) { showMsg('register-msg', 'Password must be at least 6 characters.', true); return; }
        if (!sbClient) { showMsg('register-msg', 'Authentication error: Supabase not initialized.', true); return; }

        if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }

        try {
            var result = await sbClient.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: name } }
            });
            if (result.error) {
                showMsg('register-msg', result.error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
            } else {
                showMsg('register-msg', '✅ Account created! Redirecting to homepage...', false);
                setTimeout(function() { window.location.href = '/index.html'; }, 500);
            }
        } catch (err) {
            showMsg('register-msg', 'Error: ' + err.message, true);
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
        }
    });
}

// ===== RESET PASSWORD FORM =====
var resetForm = document.getElementById('reset-form');
if (resetForm) {
    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var email = document.getElementById('reset-email').value.trim();
        var btn   = resetForm.querySelector('button[type="submit"]');
        if (!email) { showMsg('reset-msg', 'Please enter your email.', true); return; }
        if (!sbClient) { showMsg('reset-msg', 'Authentication error.', true); return; }
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

        try {
            var result = await sbClient.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://shop.bakl.org/reset-password.html'
            });
            if (result.error) {
                showMsg('reset-msg', result.error.message, true);
            } else {
                showMsg('reset-msg', '✅ Check your email for a password reset link!', false);
            }
        } catch (err) {
            showMsg('reset-msg', 'Error: ' + err.message, true);
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
    });
}

// ===== NAV UI UPDATER (MOVED TO setupAuthListeners) =====
function updateNavigationUI(session) {
    if (typeof document === 'undefined') return;
    // Desktop Account Icon Logic
    var navLink = document.getElementById('user-nav-icon');
    if (navLink) {
        if (session) {
            var name = (session.user.user_metadata && session.user.user_metadata.full_name) || '';
            var firstName = name ? name.split(' ')[0] : 'Account';
            navLink.onclick = function(e) { e.preventDefault(); window.location.href = '/profile.html'; };
            navLink.innerHTML = '<button class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-full"><span class="w-2 h-2 rounded-full bg-green-500"></span>' + firstName + '</button>';
            navLink.removeAttribute('href');
        } else {
            navLink.onclick = null;
            navLink.href = '/login.html';
            navLink.innerHTML = '<span class="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary transition-colors">account_circle</span>';
        }
    }

    // Mobile Bottom Nav Profile Logic
    var mobileProfileLink = document.getElementById('mobile-profile-item');
    if (mobileProfileLink) {
        if (session) {
            mobileProfileLink.href = '/profile.html';
            mobileProfileLink.innerHTML = `
                <span class="material-symbols-outlined text-primary relative">
                    account_circle
                    <span class="absolute top-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></span>
                </span>
                <span class="text-[10px] font-extrabold uppercase tracking-tighter text-primary">Profile</span>
            `;
        } else {
            mobileProfileLink.href = '/login.html';
            mobileProfileLink.innerHTML = `
                <span class="material-symbols-outlined">account_circle</span>
                <span class="text-[10px] font-bold uppercase tracking-tighter">Profile</span>
            `;
        }
    }

    // Orders Link Logic
    var ordersLink = document.getElementById('orders-nav-link');
    if (ordersLink) {
        if (session) {
            ordersLink.href = '/profile.html#orders';
            ordersLink.onclick = function(e) { 
                e.preventDefault(); 
                window.location.href = '/profile.html#orders';
                // Trigger hashchange event if already on profile page
                if (window.location.pathname === '/profile.html') {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
            };
        } else {
            ordersLink.href = '/login.html';
            ordersLink.onclick = null;
        }
    }
}

// ===== GLOBAL FUNCTIONS =====
window.logOut = async function() {
    if (sbClient) await sbClient.auth.signOut();
    window.location.href = '/index.html';
};

window.authGoogle = async function() {
    if (!sbClient) return;
    var redirectUrl = window.location.href.split('#')[0].split('?')[0];
    // If we're on login/register, always go to index.html to avoid "stuck" state
    if (redirectUrl.includes('login') || redirectUrl.includes('register')) {
        redirectUrl = window.location.origin + '/index.html';
    }
    await sbClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
    });
};

window.authFacebook = async function() {
    if (!sbClient) return;
    var redirectUrl = window.location.href.split('#')[0].split('?')[0];
    if (redirectUrl.includes('login') || redirectUrl.includes('register')) {
        redirectUrl = window.location.origin + '/index.html';
    }

    try {
        await sbClient.auth.signInWithOAuth({
            provider: 'facebook',
            options: { 
                redirectTo: redirectUrl
            }
        });
    } catch (err) {
        console.error('FB Auth Error:', err);
    }
};
