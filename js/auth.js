// Supabase Authentication
const SUPABASE_URL = 'https://hqarozktuvzrzhfhhjbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FlEJDB-nQQblE8kwSisw6w_N6XhXYTG';

// --- Init client ---
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabase;
} catch (e) {
    console.error('Supabase init failed:', e);
}

// --- Helper: show a message inside a container div ---
function showMsg(containerId, text, isError) {
    let box = document.getElementById(containerId);
    if (!box) {
        // Create one if it doesn't exist
        box = document.createElement('div');
        box.id = containerId;
        document.body.appendChild(box);
    }
    box.textContent = text;
    box.style.cssText = `display:block;padding:12px 16px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;margin-top:12px;${isError ? 'background:#fee2e2;color:#b91c1c;' : 'background:#dcfce7;color:#15803d;'}`;
    box.classList.remove('hidden');
}

// ===== LOGIN FORM =====
const loginForm = document.getElementById('login-form');
if (loginForm) {
    // Add a message div after the form
    const loginMsg = document.createElement('div');
    loginMsg.id = 'login-msg';
    loginMsg.style.display = 'none';
    loginForm.after(loginMsg);

    const loginBtn = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showMsg('login-msg', 'Please enter your email and password.', true);
            return;
        }

        if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Signing in...'; }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showMsg('login-msg', error.message, true);
                if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; }
            } else {
                showMsg('login-msg', '✅ Signed in! Taking you home...', false);
                setTimeout(() => { window.location.href = '/index.html'; }, 1000);
            }
        } catch (err) {
            showMsg('login-msg', 'Unexpected error: ' + err.message, true);
            if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; }
        }
    });
}

// ===== REGISTER FORM =====
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        const name     = document.getElementById('reg-name').value.trim();
        const email    = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const btn      = document.getElementById('register-btn');
        const msgBox   = document.getElementById('register-msg');

        function showRegMsg(text, isError) {
            if (!msgBox) return;
            msgBox.textContent = text;
            msgBox.style.cssText = `display:block;padding:12px 16px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;${isError ? 'background:#fee2e2;color:#b91c1c;' : 'background:#dcfce7;color:#15803d;'}`;
            msgBox.classList.remove('hidden');
        }

        if (!email || !password) { showRegMsg('Please fill in all fields.', true); return; }
        if (password.length < 6) { showRegMsg('Password must be at least 6 characters.', true); return; }

        if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });

            if (error) {
                showRegMsg(error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
            } else {
                showRegMsg('✅ Account created! You are now logged in. Redirecting...', false);
                setTimeout(() => { window.location.href = '/index.html'; }, 1500);
            }
        } catch (err) {
            showRegMsg('Unexpected error: ' + err.message, true);
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
        }
    });
}

// ===== RESET PASSWORD FORM =====
const resetForm = document.getElementById('reset-form');
if (resetForm) {
    const resetBtn = resetForm.querySelector('button[type="submit"]');
    const resetMsg = document.createElement('div');
    resetMsg.id = 'reset-msg';
    resetMsg.style.display = 'none';
    resetForm.after(resetMsg);

    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        if (!email) { showMsg('reset-msg', 'Please enter your email.', true); return; }
        if (resetBtn) { resetBtn.disabled = true; resetBtn.textContent = 'Sending...'; }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://shop.bakl.org/reset-password.html'
            });
            if (error) {
                showMsg('reset-msg', error.message, true);
                if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Send Reset Link'; }
            } else {
                showMsg('reset-msg', '✅ Check your email for a password reset link!', false);
                if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Send Reset Link'; }
            }
        } catch (err) {
            showMsg('reset-msg', 'Error: ' + err.message, true);
            if (resetBtn) { resetBtn.disabled = false; resetBtn.textContent = 'Send Reset Link'; }
        }
    });
}

// ===== AUTH STATE: redirect logged-in users away from auth pages =====
if (supabase) {
    supabase.auth.onAuthStateChange(function(event, session) {
        console.log('Auth event:', event, !!session);
        const path = window.location.pathname;
        const onAuthPage = path.includes('login') || path.includes('register') || path.includes('reset-password');
        if (session && onAuthPage && event === 'SIGNED_IN') {
            window.location.href = '/index.html';
        }
        updateNavigationUI(session);
    });

    // Check immediately on load
    supabase.auth.getSession().then(({ data: { session } }) => {
        updateNavigationUI(session);
    });
}

// ===== NAV UI =====
function updateNavigationUI(session) {
    const navLink = document.getElementById('user-nav-icon');
    if (!navLink) return;
    if (session) {
        const name = session.user.user_metadata?.full_name?.split(' ')[0] || 'Account';
        navLink.onclick = (e) => { e.preventDefault(); window.logOut(); };
        navLink.innerHTML = `<button class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-full"><span class="w-2 h-2 rounded-full bg-green-500"></span>${name} | Log Out</button>`;
        navLink.removeAttribute('href');
    } else {
        navLink.onclick = null;
        navLink.href = '/login.html';
        navLink.innerHTML = `<span class="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary transition-colors">account_circle</span>`;
    }
}

// ===== GLOBAL FUNCTIONS =====
window.logOut = async function() {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
};

window.authGoogle = async function() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/index.html' }
    });
    if (error) alert('Google sign-in failed: ' + error.message);
};

window.authFacebook = async function() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: window.location.origin + '/index.html' }
    });
    if (error) alert('Facebook sign-in failed: ' + error.message);
};
