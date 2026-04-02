// Admin Dashboard Logic
// VERSION: MOSJID_ADMIN_V8_ISOLATED
(function() {
    console.log('%c [ADMIN] MOSJID_ADMIN_V8_ISOLATED ', 'background: #333; color: #00ccff; font-size: 16px;');

    // Local State
    let globalInventory = [];
    let editingProductId = null;
    let currentPage = 1;
    const itemsPerPage = 10;
    const ADMIN_EMAILS = ['admin@bakl.org', 'fuadxeem@gmail.com', 'fuad.bioinfo@icloud.com', 'ahsan.tazbir@gmail.com'];

    // Wait for Supabase to be ready
    function initAdmin() {
        if (!window.supabaseClient) {
            console.log('[Admin] Waiting for Supabase client...');
            let retries = 0;
            const checkInt = setInterval(() => {
                retries++;
                if (window.supabaseClient) {
                    clearInterval(checkInt);
                    startAdminLogic();
                } else if (retries > 50) {
                    clearInterval(checkInt);
                    console.error('[Admin] Supabase client failed to initialize.');
                }
            }, 100);
        } else {
            startAdminLogic();
        }
    }

    async function startAdminLogic() {
        console.log('[Admin] Initializing logic...');
        
        // Auth Check
        const path = window.location.pathname.toLowerCase();
        const isLoginPage = path.includes('admin.html') || path.endsWith('/admin');

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        const userEmail = session?.user?.email?.toLowerCase().trim();
        const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail);

        console.log('[Admin] Auth Status:', { path, email: userEmail, isAdmin: !!isAdmin });

        if (!isAdmin && !isLoginPage) {
            console.warn('[Admin] Unauthorized access, redirecting...');
            window.location.href = 'admin.html';
            return;
        }

        if (isAdmin && isLoginPage) {
            window.location.href = 'inventory.html';
            return;
        }

        // Attach Handlers
        setupHandlers(isLoginPage);
    }

    function setupHandlers(isLoginPage) {
        // Login Submission
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm && isLoginPage) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('admin-email').value.trim();
                const password = document.getElementById('password').value;
                const btn = document.getElementById('login-btn');
                const errBox = document.getElementById('error-msg');

                if (errBox) errBox.classList.add('hidden');
                if (btn) {
                    btn.disabled = true;
                    btn.dataset.orig = btn.innerHTML;
                    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Authenticating...';
                }

                try {
                    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) {
                        if (errBox) {
                            errBox.textContent = error.message === 'Invalid login credentials' ? 'Invalid credentials.' : error.message;
                            errBox.classList.remove('hidden');
                        }
                        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig; }
                    } else if (data.session) {
                        window.location.href = 'inventory.html';
                    }
                } catch (err) {
                    console.error('[Admin] Login Error:', err);
                    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig; }
                }
                return false;
            };
        }

        // Inventory Page
        const invTable = document.getElementById('inventory-table-body');
        if (invTable) {
            loadInventory(invTable);
            setupInventoryModals();
            
            // Filters
            document.getElementById('search-input')?.addEventListener('input', () => { currentPage = 1; renderInventory(); });
            document.getElementById('category-filter')?.addEventListener('change', () => { currentPage = 1; renderInventory(); });
            document.getElementById('status-filter')?.addEventListener('change', () => { currentPage = 1; renderInventory(); });
        }

        // Orders Page
        const ordersTable = document.getElementById('orders-table-body');
        if (ordersTable) {
            loadOrders(ordersTable);
        }

        // Global functions (attached to window)
        window.logoutAdmin = async () => {
            await window.supabaseClient.auth.signOut();
            window.location.href = 'admin.html';
        };

        // Realtime
        setupRealtime();
        
        // Profile & Hooks
        setupAdminProfile();
        setupImageUploadHooks();
    }

    // --- SUPPORT FUNCTIONS (Scoped internally) ---

    async function loadInventory() {
        try {
            const { data, error } = await window.supabaseClient.from('products').select('*').order('name', { ascending: true });
            if (error) throw error;
            globalInventory = data;

            const catFilter = document.getElementById('category-filter');
            if (catFilter) {
                const cats = [...new Set(data.map(p => p.category))].filter(Boolean);
                const current = catFilter.value;
                catFilter.innerHTML = `<option>All Categories</option>` + cats.map(c => `<option>${c}</option>`).join('');
                if (cats.includes(current) || current === 'All Categories') catFilter.value = current;
            }
            renderInventory();
        } catch (e) { console.error("[Admin] Inventory Load Fail:", e); }
    }

    function renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        const search = document.getElementById('search-input')?.value.toLowerCase() || '';
        const cat = document.getElementById('category-filter')?.value || 'All Categories';
        const status = document.getElementById('status-filter')?.value || 'Status: All';

        let filtered = globalInventory.filter(p => {
            if (search && !p.name.toLowerCase().includes(search) && !p.id.toLowerCase().includes(search) && !(p.category || '').toLowerCase().includes(search)) return false;
            if (cat !== 'All Categories' && p.category !== cat) return false;
            
            const daysDiff = Math.ceil((new Date(p.expiry).getTime() - new Date().getTime()) / 86400000);
            if (status === 'Available' && p.status !== 'Available') return false;
            if (status === 'Unavailable' && p.status !== 'Unavailable') return false;
            if (status === 'Low on Stock' && Number(p.stock) >= 10) return false;
            if (status === 'Expiring Soon' && (isNaN(daysDiff) || daysDiff > 7 || daysDiff < 0)) return false;
            return true;
        });

        updateStatsGrid(filtered);

        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const items = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        tbody.innerHTML = '';
        items.forEach(p => {
            const daysDiff = Math.ceil((new Date(p.expiry).getTime() - new Date().getTime()) / 86400000);
            let statusMarkup = `<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-green-500"></div><span class="text-xs font-semibold">${p.status}</span></div>`;
            
            if (daysDiff < 0) statusMarkup = `<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-slate-400"></div><span class="text-xs font-semibold text-slate-400">Expired</span></div>`;
            else if (daysDiff <= 7) statusMarkup = `<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-amber-500"></div><span class="text-xs font-semibold text-amber-600">Expiring Soon</span></div>`;

            const isAvail = p.status === 'Available';
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 font-mono text-[10px] text-slate-400">#${p.id.split('_').pop()}</td>
                    <td class="px-6 py-4">
                        <p class="text-sm font-bold text-slate-900">${p.name}</p>
                        <p class="text-[10px] text-slate-400">Exp: ${p.expiry || 'N/A'}</p>
                    </td>
                    <td class="px-6 py-4"><span class="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full uppercase">${p.category}</span></td>
                    <td class="px-6 py-4 text-center font-bold">€${Number(p.price).toFixed(2)}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="${p.stock < 10 ? 'text-amber-600 font-bold' : ''}">${p.stock}</span>
                    </td>
                    <td class="px-6 py-4">${statusMarkup}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2">
                            <button onclick="editProduct('${p.id}')" class="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-md transition-all"><span class="material-symbols-outlined text-lg">edit</span></button>
                            <button onclick="deleteProduct(null, '${p.id}')" class="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-all"><span class="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </td>
                </tr>
            `;
        });

        renderPagination(filtered.length);
    }

    function renderPagination(totalItems) {
        const info = document.getElementById('pagination-info');
        const controls = document.getElementById('pagination-controls');
        if (!info || !controls) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        info.innerHTML = `Showing <b>${totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0}-${Math.min(currentPage * itemsPerPage, totalItems)}</b> of ${totalItems}`;
        
        let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="p-1 disabled:opacity-20"><span class="material-symbols-outlined">chevron_left</span></button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) html += `<button class="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold">${i}</button>`;
            else if (i <= 3 || i > totalPages - 3 || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button onclick="changePage(${i})" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold">${i}</button>`;
            } else if (i === 4 || i === totalPages - 3) html += `<span class="px-1 text-slate-300">...</span>`;
        }
        html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="p-1 disabled:opacity-20"><span class="material-symbols-outlined">chevron_right</span></button>`;
        controls.innerHTML = html;
    }

    // Attachment of required window functions
    window.changePage = (p) => { currentPage = p; renderInventory(); };
    window.editProduct = (id) => {
        const prod = globalInventory.find(p => p.id === id);
        if (!prod) return;
        editingProductId = id;
        const modal = document.getElementById('add-product-modal');
        document.getElementById('modal-title').innerText = "Edit Product";
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-cat').value = prod.category;
        document.getElementById('prod-price').value = prod.price;
        document.getElementById('prod-stock').value = prod.stock;
        document.getElementById('prod-expiry').value = prod.expiry || '';
        document.getElementById('prod-imageurl').value = prod.image_url || '';
        document.getElementById('prod-status').checked = prod.status === 'Available';
        document.getElementById('delete-product-modal-btn')?.classList.remove('hidden');
        modal?.classList.remove('hidden');
    };

    window.deleteProduct = async (e, id) => {
        if (e) e.stopPropagation();
        if (!confirm('Delete this product?')) return;
        try {
            const { error } = await window.supabaseClient.from('products').delete().eq('id', id);
            if (error) throw error;
            loadInventory();
        } catch (err) {
            console.error("[Admin] Delete Failed:", err);
            alert("❌ Delete failed: " + err.message);
        }
    };

    function setupInventoryModals() {
        const modal = document.getElementById('add-product-modal');
        document.getElementById('add-product-btn')?.addEventListener('click', () => {
            editingProductId = null;
            document.getElementById('modal-title').innerText = "Add New Product";
            document.getElementById('admin-login-form')?.reset(); // Actually it should be prod form
            document.getElementById('prod-name').value = '';
            document.getElementById('delete-product-modal-btn')?.classList.add('hidden');
            modal?.classList.remove('hidden');
        });
        document.getElementById('close-modal-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('cancel-modal-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('save-product-btn')?.addEventListener('click', async () => {
            const saveBtn = document.getElementById('save-product-btn');
            const originalText = saveBtn.innerText;
            saveBtn.disabled = true;
            saveBtn.innerText = "Saving...";

            const data = {
                name: document.getElementById('prod-name').value,
                category: document.getElementById('prod-cat').value,
                price: document.getElementById('prod-price').value,
                stock: document.getElementById('prod-stock').value,
                expiry: document.getElementById('prod-expiry').value,
                image_url: document.getElementById('prod-imageurl').value,
                status: document.getElementById('prod-status').checked ? 'Available' : 'Unavailable'
            };

            try {
                let error;
                if (editingProductId) {
                    const res = await window.supabaseClient.from('products').update(data).eq('id', editingProductId);
                    error = res.error;
                } else {
                    const res = await window.supabaseClient.from('products').insert([{ id: 'P_' + Date.now(), ...data }]);
                    error = res.error;
                }

                if (error) throw error;

                modal.classList.add('hidden');
                loadInventory();
                alert("✅ Product saved successfully!");
            } catch (err) {
                console.error("[Admin] Save Failed:", err);
                alert("❌ Save failed: " + err.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = originalText;
            }
        });
    }

    // Dummy versions for missing parts if needed (to prevent crashes)
    function setupRealtime() {
        if (!window.supabaseClient) return;
        window.supabaseClient.channel('admin_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            const tbody = document.getElementById('orders-table-body');
            if (tbody) loadOrders(tbody);
        }).subscribe();
    }

    async function loadOrders(tbody) {
        if (!tbody) return;
        const { data, error } = await window.supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (data) {
            tbody.innerHTML = data.map(o => `
                <tr class="hover:bg-slate-50 border-b border-slate-50">
                    <td class="px-6 py-4"><button onclick="viewOrder('${o.id}')" class="text-primary font-bold">#${o.id.split('-')[0]}</button></td>
                    <td class="px-6 py-4 font-bold">${o.delivery_info?.customer || 'Guest'}</td>
                    <td class="px-6 py-4 font-black">€${Number(o.total_amount).toFixed(2)}</td>
                    <td class="px-6 py-4 text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100">${o.status}</span></td>
                    <td class="px-6 py-4 text-right"><button onclick="viewOrder('${o.id}')" class="p-2 text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-sm">visibility</span></button></td>
                </tr>
            `).join('');
            updateOrderDashboardStats(data);
        }
    }

    function updateStatsGrid(items) {
        const total = document.getElementById('val-total-items');
        const low = document.getElementById('val-low-stock');
        const expiring = document.getElementById('val-expiring-soon');
        const val = document.getElementById('val-inventory-value');
        
        if (total) total.innerText = items.length;
        if (low) low.innerText = items.filter(p => p.stock < 10).length;
        if (expiring) {
            const expCount = items.filter(p => {
                const diff = (new Date(p.expiry).getTime() - new Date().getTime()) / 86400000;
                return diff >= 0 && diff <= 7;
            }).length;
            expiring.innerText = expCount;
        }
        if (val) {
            const sum = items.reduce((acc, p) => acc + (p.price * p.stock), 0);
            val.innerText = '€' + sum.toLocaleString('de-DE', { minimumFractionDigits: 2 });
        }
    }

    function updateOrderDashboardStats(orders) { /* Revenue calc here */ }
    function setupAdminProfile() { 
        const btn = document.getElementById('admin-profile-btn');
        if (btn) btn.onclick = () => window.logoutAdmin(); 
    }
    function setupImageUploadHooks() {
        const fileInput = document.getElementById('prod-image-file');
        const urlInput = document.getElementById('prod-imageurl');
        const statusEl = document.getElementById('upload-status');

        if (fileInput && urlInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Call the shared helper
                if (typeof window.handleImageUpload === 'function') {
                    await window.handleImageUpload(file, urlInput, statusEl);
                } else {
                    console.error("[Admin] handleImageUpload helper not found.");
                    alert("❌ Upload helper missing. Please reload the page.");
                }
            });
        }
    }

    // Kickoff
    initAdmin();
})();
