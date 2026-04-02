// Supabase Authentication
// VERSION: MOSJID_AUTH_V7_STABLE
console.log('%c [AUTH] MOSJID_AUTH_V7_STABLE ', 'background: #222; color: #bada55; font-size: 16px;');

const SUPABASE_URL = 'https://hqarozktuvzrzhfhhjbd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYXJvemt0dXZ6cnpoZmhoamJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjQ3MjgsImV4cCI6MjA5MDM0MDcyOH0.f-JXg-R5cvyxvgNc3NvjO-aNjr706JrKkSqzNB1T6T0';

var sbClient = null;

function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            if (!window.supabaseClient) {
                window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
            sbClient = window.supabaseClient;
            console.log('[auth.js] Supabase client initialized (V7_STABLE)');
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

    // 🔑 INITIAL UI CHECK FOR RECOVERY (Mobile Callback Fix)
    const h = window.location.hash;
    if (h.includes('type=recovery') || h.includes('access_token=')) {
        const updateContainer = document.getElementById('update-password-container');
        const requestContainer = document.getElementById('request-reset-container');
        if (updateContainer && requestContainer) {
            updateContainer.classList.remove('hidden');
            requestContainer.classList.add('hidden');
        }
    }

    // 🔑 ON AUTH STATE CHANGE
    sbClient.auth.onAuthStateChange(function(event, session) {
        console.log('[AUTH] State changed:', event);
        updateNavigationUI(session);
        
        // Handle Recovery Switch
        if (event === 'PASSWORD_RECOVERY') {
            const updateContainer = document.getElementById('update-password-container');
            const requestContainer = document.getElementById('request-reset-container');
            if (updateContainer && requestContainer) {
                updateContainer.classList.remove('hidden');
                requestContainer.classList.add('hidden');
            }
        }

        // Auto-redirect if on login/register page and signed in (skipping recovery)
        const path = window.location.pathname.toLowerCase();
        const isAuthPage = path.includes('login') || path.includes('register');
        if (session && isAuthPage && event !== 'PASSWORD_RECOVERY') {
            window.location.replace(window.location.origin + '/index.html');
        }
    });

    // 🔑 FORCED ESCAPE FOR CALLBACKS
    if ((h.includes('access_token=') || h.includes('type=recovery')) && (window.location.pathname.includes('login') || window.location.pathname.includes('register'))) {
        setTimeout(function() {
            window.location.replace(window.location.origin + '/index.html');
        }, 2000);
    }

    // 🔑 ATTACH FORM LISTENERS
    attachFormHandlers();
    
    // Initial Nav Check
    sbClient.auth.getSession().then(function(resp) {
        updateNavigationUI(resp.data.session);
    });
}

function attachFormHandlers() {
    // LOGIN FORM
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            const btn = document.getElementById('login-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
            const { error } = await sbClient.auth.signInWithPassword({ email, password: pass });
            if (error) {
                showMsg('login-msg', error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
            } else {
                showMsg('login-msg', '✅ Success!', false);
                window.location.href = '/index.html';
            }
            return false;
        };
    }

    // REGISTER FORM
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.onsubmit = async function(e) {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const pass = document.getElementById('reg-password').value;
            const btn = document.getElementById('register-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
            const { error } = await sbClient.auth.signUp({ 
                email, 
                password: pass, 
                options: { data: { full_name: name } } 
            });
            if (error) {
                showMsg('register-msg', error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
            } else {
                showMsg('register-msg', '✅ Account created!', false);
                window.location.href = '/index.html';
            }
            return false;
        };
    }

    // RESET LINK FORM
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.onsubmit = async function(e) {
            e.preventDefault();
            const email = document.getElementById('reset-email').value.trim();
            const btn = resetForm.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
            const { error } = await sbClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            if (error) {
                showMsg('reset-msg', error.message, true);
                if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
            } else {
                showMsg('reset-msg', '✅ Success! If an account exists for ' + email + ', you will receive a link shortly. Not receiving anything? ', false);
                if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
                // Dynamically add the create account link
                const box = document.getElementById('reset-msg');
                if (box) {
                    const link = document.createElement('a');
                    link.href = '/register.html?email=' + encodeURIComponent(email);
                    link.className = 'underline font-bold';
                    link.textContent = 'Create a New Account';
                    box.appendChild(link);
                }
            }
            return false;
        };
    }
}

// UPDATE PASSWORD (Global for button)
window.updatePassword = async function() {
    if (!sbClient) return;
    const pass = document.getElementById('new-password').value;
    const btn = document.getElementById('update-btn');
    if (pass.length < 6) { showMsg('update-msg', 'Min 6 characters required', true); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
    const { error } = await sbClient.auth.updateUser({ password: pass });
    if (error) {
        showMsg('update-msg', error.message, true);
        if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
    } else {
        showMsg('update-msg', '✅ Updated! Logging in...', false);
        setTimeout(() => window.location.href = '/index.html', 1500);
    }
};

// Helper: show a message
function showMsg(containerId, text, isError) {
    let box = document.getElementById(containerId);
    if (!box) {
        box = document.createElement('div');
        box.id = containerId;
        const form = document.querySelector('form');
        if (form) form.after(box);
    }
    box.textContent = text;
    box.style.cssText = `display:block;padding:12px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;margin-top:12px;${isError ? 'background:#fee2e2;color:#b91c1c;' : 'background:#dcfce7;color:#15803d;'}`;
}

// Navigation UI
function updateNavigationUI(session) {
    if (typeof document === 'undefined') return;
    const navLink = document.getElementById('user-nav-icon');
    if (navLink) {
        if (session) {
            const name = (session.user.user_metadata && session.user.user_metadata.full_name) || 'Account';
            navLink.innerHTML = `<button class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-full"><span class="w-2 h-2 rounded-full bg-green-500"></span>${name.split(' ')[0]}</button>`;
            navLink.href = 'javascript:void(0)';
            navLink.onclick = (e) => { e.preventDefault(); window.location.href = '/profile.html'; };
        } else {
            navLink.innerHTML = '<span class="material-symbols-outlined text-slate-500 hover:text-primary">account_circle</span>';
            navLink.href = '/login.html';
            navLink.onclick = null;
        }
    }
    const mobileProfile = document.getElementById('mobile-profile-item');
    if (mobileProfile) {
        if (session) {
            mobileProfile.href = '/profile.html';
            mobileProfile.innerHTML = `<span class="material-symbols-outlined text-primary relative">account_circle<span class="absolute top-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></span></span><span class="text-[10px] font-extrabold uppercase text-primary">Profile</span>`;
        } else {
            mobileProfile.href = '/login.html';
            mobileProfile.innerHTML = `<span class="material-symbols-outlined">account_circle</span><span class="text-[10px] font-bold uppercase">Profile</span>`;
        }
    }
    
    // Orders Link Logic
    const ordersLink = document.getElementById('orders-nav-link');
    if (ordersLink) {
        if (session) {
            ordersLink.href = 'javascript:void(0)';
            ordersLink.onclick = (e) => { 
                e.preventDefault(); 
                window.location.href = '/profile.html#orders';
            };
        } else {
            ordersLink.href = '/login.html';
            ordersLink.onclick = null;
        }
    }
}

// Global Auth Actions
window.logOut = async function() {
    if (sbClient) await sbClient.auth.signOut();
    window.location.href = '/index.html';
};

window.authGoogle = async function() {
    if (!sbClient) return;
    let redirect = window.location.origin + '/index.html';
    await sbClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } });
};

window.authFacebook = async function() {
    if (!sbClient) return;
    let redirect = window.location.origin + '/index.html';
    await sbClient.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: redirect } });
};
