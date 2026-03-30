// Supabase Authentication
// Uses the UMD build which exposes window.supabase = { createClient: fn }
const SUPABASE_URL = 'https://hqarozktuvzrzhfhhjbd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYXJvemt0dXZ6cnpoZmhoamJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjQ3MjgsImV4cCI6MjA5MDM0MDcyOH0.f-JXg-R5cvyxvgNc3NvjO-aNjr706JrKkSqzNB1T6T0';

// --- Init client with a UNIQUE name (not 'supabase' which conflicts with window.supabase) ---
var sbClient = null;
try {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[auth.js] Supabase client initialized:', !!sbClient, 'auth:', !!sbClient?.auth);
} catch (e) {
    console.error('[auth.js] Supabase init FAILED:', e);
    // Show error on page
    document.body.insertAdjacentHTML('afterbegin',
        '<div style="position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;text-align:center;z-index:99999;font-size:14px;">Supabase init failed: ' + e.message + '</div>');
}

// --- Helper: show a message ---
function showMsg(containerId, text, isError) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.textContent = text;
    box.style.cssText = 'display:block;padding:12px 16px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;margin-top:12px;' +
        (isError ? 'background:#fee2e2;color:#b91c1c;' : 'background:#dcfce7;color:#15803d;');
    box.classList.remove('hidden');
}

// ===== LOGIN FORM =====
var loginForm = document.getElementById('login-form');
if (loginForm) {
    // Create message div
    var loginMsgDiv = document.createElement('div');
    loginMsgDiv.id = 'login-msg';
    loginMsgDiv.style.display = 'none';
    loginForm.after(loginMsgDiv);

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var email    = document.getElementById('login-email').value.trim();
        var password = document.getElementById('login-password').value;
        var btn      = loginForm.querySelector('button[type="submit"]');

        if (!email || !password) { showMsg('login-msg', 'Please enter email and password.', true); return; }
        if (!sbClient || !sbClient.auth) { showMsg('login-msg', 'Authentication service not available. Please refresh.', true); return; }

        if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

        try {
            var result = await sbClient.auth.signInWithPassword({ email: email, password: password });
            if (result.error) {
                showMsg('login-msg', result.error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
            } else {
                showMsg('login-msg', '✅ Signed in! Redirecting...', false);
                setTimeout(function() { window.location.href = '/index.html'; }, 1000);
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
        if (!sbClient || !sbClient.auth) { showMsg('register-msg', 'Authentication service not available. Please refresh.', true); return; }

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
                setTimeout(function() { window.location.href = '/index.html'; }, 1500);
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
    var resetMsgDiv = document.createElement('div');
    resetMsgDiv.id = 'reset-msg';
    resetMsgDiv.style.display = 'none';
    resetForm.after(resetMsgDiv);

    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var email = document.getElementById('reset-email').value.trim();
        var btn   = resetForm.querySelector('button[type="submit"]');
        if (!email) { showMsg('reset-msg', 'Please enter your email.', true); return; }
        if (!sbClient || !sbClient.auth) { showMsg('reset-msg', 'Authentication service not available.', true); return; }
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

// ===== AUTH STATE LISTENER =====
if (sbClient && sbClient.auth) {
    sbClient.auth.onAuthStateChange(function(event, session) {
        console.log('[auth.js] Auth event:', event, !!session);
        updateNavigationUI(session);
    });

    // Check session on load
    sbClient.auth.getSession().then(function(resp) {
        updateNavigationUI(resp.data.session);
    });
}

// ===== NAV UI =====
function updateNavigationUI(session) {
    var navLink = document.getElementById('user-nav-icon');
    if (!navLink) return;
    if (session) {
        var name = (session.user.user_metadata && session.user.user_metadata.full_name) || '';
        var firstName = name ? name.split(' ')[0] : 'Account';
        navLink.onclick = function(e) { e.preventDefault(); window.logOut(); };
        navLink.innerHTML = '<button class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-full"><span class="w-2 h-2 rounded-full bg-green-500"></span>' + firstName + ' | Log Out</button>';
        navLink.removeAttribute('href');
    } else {
        navLink.onclick = null;
        navLink.href = '/login.html';
        navLink.innerHTML = '<span class="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary transition-colors">account_circle</span>';
    }
}

// ===== GLOBAL FUNCTIONS =====
window.logOut = async function() {
    if (sbClient && sbClient.auth) await sbClient.auth.signOut();
    window.location.href = '/index.html';
};

window.authGoogle = async function() {
    if (!sbClient || !sbClient.auth) { alert('Auth not available'); return; }
    var result = await sbClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/index.html' }
    });
    if (result.error) alert('Google sign-in failed: ' + result.error.message);
};

window.authFacebook = async function() {
    if (!sbClient || !sbClient.auth) { alert('Auth not available'); return; }
    var result = await sbClient.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: window.location.origin + '/index.html' }
    });
    if (result.error) alert('Facebook sign-in failed: ' + result.error.message);
};
