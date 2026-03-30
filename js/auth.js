// Supabase Authentication Configuration
const SUPABASE_URL = 'https://hqarozktuvzrzhfhhjbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FlEJDB-nQQblE8kwSisw6w_N6XhXYTG';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

// Initialize script immediately instead of waiting for DOMContentLoaded (since script is at bottom of body)
(async () => {

    // UI Helpers
    const showMessage = (formId, msg, isError = false) => {
        let msgBox = document.getElementById(`${formId}-msg`);
        if (!msgBox) {
            msgBox = document.createElement('div');
            msgBox.id = `${formId}-msg`;
            msgBox.className = 'text-[10px] font-bold uppercase tracking-widest mt-4 p-3 rounded-lg text-center';
            const formObj = document.getElementById(formId);
            formObj.parentNode.insertBefore(msgBox, formObj);
        }
        msgBox.textContent = msg;
        msgBox.className = `text-[10px] font-bold uppercase tracking-widest mt-4 p-3 rounded-lg text-center ${isError ? 'bg-error-container text-on-error-container text-red-600 bg-red-100' : 'bg-success-container text-on-success-container text-green-700 bg-green-100'}`;
    };

    const disableForm = (formId, loading) => {
        const form = document.getElementById(formId);
        if (!form) return;
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">refresh</span> Processing...`;
            btn.classList.add('opacity-70', 'cursor-not-allowed');
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.getAttribute('data-original-text') || 'Submit';
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    };

    // Store original button text
    document.querySelectorAll('form button[type="submit"]').forEach(btn => {
        btn.setAttribute('data-original-text', btn.innerHTML.trim());
    });

    // 1. Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            disableForm('login-form', true);
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            disableForm('login-form', false);
            if (error) {
                showMessage('login-form', error.message, true);
            } else {
                showMessage('login-form', 'Sign in successful! Redirecting...', false);
                setTimeout(() => { window.location.href = '/index.html'; }, 1000);
            }
        });
    }

    // 2. Register form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        const showRegMsg = (msg, isError) => {
            const box = document.getElementById('register-msg');
            if (!box) return;
            box.textContent = msg;
            box.className = `text-sm font-medium p-3 rounded-lg text-center ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
            box.classList.remove('hidden');
        };

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('register-btn');
            btn.disabled = true;
            btn.textContent = 'Creating account...';

            const name  = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            if (password.length < 6) {
                showRegMsg('Password must be at least 6 characters.', true);
                btn.disabled = false;
                btn.textContent = 'Create Account';
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });

            if (error) {
                showRegMsg(error.message, true);
                btn.disabled = false;
                btn.textContent = 'Create Account';
            } else {
                showRegMsg('✅ Account created! You are now logged in. Redirecting...', false);
                setTimeout(() => { window.location.href = '/index.html'; }, 1500);
            }
        });
    }

    // 3. Reset password form submission
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            disableForm('reset-form', true);
            const email = document.getElementById('reset-email').value;

            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html' // Update if a specific reset flow page exists
            });

            disableForm('reset-form', false);
            if (error) {
                showMessage('reset-form', error.message, true);
            } else {
                showMessage('reset-form', 'Password reset instructions sent to your email.', false);
                resetForm.reset();
            }
        });
    }

    // 4. Listen to Auth State changes for dynamic UI updates
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth state changed:", event);

        const path = window.location.pathname;
        const isAuthPage = path.includes('login.html') || path.includes('register.html') || path.includes('reset-password.html');

        if (session && isAuthPage) {
            // Logged in user shouldn't be on login/register pages
            window.location.href = '/index.html';
        }

        // Update Nav UI
        updateNavigationUI(session);
    });

    // Check initial auth state immediately
    const { data: { session } } = await supabase.auth.getSession();
    updateNavigationUI(session);
})();

// Update standard navigation to show login/logout states
function updateNavigationUI(session) {
    const navAccountLink = document.getElementById('user-nav-icon');
    if (navAccountLink && session) {
        // Change icon to a text representation or Log Out button
        navAccountLink.onclick = (e) => {
            e.preventDefault();
            window.logOut();
        };
        navAccountLink.innerHTML = `<button class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-full"><span class="w-2 h-2 rounded-full bg-green-500"></span>${session.user.user_metadata?.full_name?.split(' ')[0] || 'Account'} | Log Out</button>`;
        navAccountLink.removeAttribute('href'); // No longer links to login
    } else if (navAccountLink && !session) {
        // Ensure it's back to normal if logged out
        navAccountLink.onclick = null;
        navAccountLink.href = "/login.html";
        navAccountLink.innerHTML = `<span class="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary transition-colors">account_circle</span>`;
    }
}

// Global Exported Functions
window.logOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
};

window.authGoogle = async () => {
    console.log("Starting Google Auth...");
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) alert('Google Sign in failed: ' + error.message);
    } catch (err) {
        alert("Unexpected error with Google Auth: " + err.message);
        console.error(err);
    }
};

window.authFacebook = async () => {
    console.log("Starting Facebook Auth...");
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'facebook' });
        if (error) alert('Facebook Sign in failed: ' + error.message);
    } catch (err) {
        alert("Unexpected error with Facebook Auth: " + err.message);
        console.error(err);
    }
};
