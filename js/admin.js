// Admin Dashboard Logic
// VERSION: MOSJID_ADMIN_V8_ISOLATED
(function() {
    console.log('%c [ADMIN] MOSJID_ADMIN_V8_ISOLATED ', 'background: #333; color: #00ccff; font-size: 16px;');

    // Local State
    let globalInventory = [];
    let editingProductId = null;
    let currentPage = 1;
    const itemsPerPage = 10;
    // Admin list is now database-driven via 'admin_users' table.

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

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
        
        // Wait for auth.js to finish admin check if it hasn't already
        let isAdmin = window.userIsAdmin;
        if (session && !isAdmin) {
            // Re-verify if auth.js hasn't set it yet
            const { data } = await window.supabaseClient
                .from('admin_users')
                .select('email')
                .eq('email', session.user.email.toLowerCase().trim())
                .maybeSingle();
            isAdmin = !!data;
        }

        console.log('[Admin] Auth session check...');

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
                catFilter.innerHTML = `<option>All Categories</option>` + cats.map(c => `<option>${escapeHTML(c)}</option>`).join('');
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

            const safeName = escapeHTML(p.name);
            const safeId = escapeHTML(p.id);
            const shortId = escapeHTML(p.id.split('_').pop());
            const safeCat = escapeHTML(p.category);
            const safeExpiry = escapeHTML(p.expiry || 'N/A');

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 font-mono text-[10px] text-slate-400">#${shortId}</td>
                    <td class="px-6 py-4">
                        <p class="text-sm font-bold text-slate-900">${safeName}</p>
                        <p class="text-[10px] text-slate-400">Exp: ${safeExpiry}</p>
                    </td>
                    <td class="px-6 py-4"><span class="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full uppercase">${safeCat}</span></td>
                    <td class="px-6 py-4 text-center font-bold">€${Number(p.price).toFixed(2)}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="${p.stock < 10 ? 'text-amber-600 font-bold' : ''}">${p.stock}</span>
                    </td>
                    <td class="px-6 py-4">${statusMarkup}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2">
                            <button onclick="editProduct('${safeId}')" class="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-md transition-all"><span class="material-symbols-outlined text-lg">edit</span></button>
                            <button onclick="deleteProduct(null, '${safeId}')" class="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-all"><span class="material-symbols-outlined text-lg">delete</span></button>
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
            tbody.innerHTML = data.map(o => {
                const status = o.status || 'pending_delivery';
                const safeId = escapeHTML(o.id);
                const shortId = escapeHTML((o.id || '').split('-')[0]);
                const safeCustomer = escapeHTML(o.delivery_info?.customer || 'Guest');
                const safeTotal = Number(o.total_amount || 0).toFixed(2);
                const safeDate = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A';
                
                return `
                <tr class="hover:bg-slate-50 border-b border-slate-50 cursor-pointer" onclick="viewOrder('${safeId}')" role="button" tabindex="0">
                    <td class="px-6 py-4 text-primary font-bold">#${shortId}</td>
                    <td class="px-6 py-4 font-bold text-slate-900">${safeCustomer}</td>
                    <td class="px-6 py-4 font-black text-slate-900">€${safeTotal}</td>
                    <td class="px-6 py-4 text-xs text-slate-500">${escapeHTML(safeDate)}</td>
                    <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${status.toLowerCase() === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">${escapeHTML(status)}</span></td>
                    <td class="px-6 py-4 text-right">
                        <button class="p-2 text-slate-400 hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-sm">visibility</span>
                        </button>
                    </td>
                </tr>
                `;
            }).join('');
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

    function updateOrderDashboardStats(orders) {
        if (!orders) return;
        
        // 1. Total Revenue (Sum of all total_amount)
        const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
        
        // 2. Pending Orders (Not Delivered and Not Cancelled)
        const pendingOrders = orders.filter(o => {
            const status = (o.status || '').toLowerCase();
            return status !== 'delivered' && status !== 'cancelled';
        });
        
        // 3. Delivered (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const deliveredRecent = orders.filter(o => {
            const status = (o.status || '').toLowerCase();
            const orderDate = new Date(o.created_at);
            return status === 'delivered' && orderDate >= thirtyDaysAgo;
        });

        // 4. Update DOM
        const revEl = document.getElementById('stat-revenue');
        const pendingEl = document.getElementById('stat-pending');
        const deliveredEl = document.getElementById('stat-delivered');
        
        if (revEl) revEl.innerText = '€' + totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (pendingEl) pendingEl.innerText = pendingOrders.length;
        if (deliveredEl) deliveredEl.innerText = deliveredRecent.length;
        
        // Update subtext labels
        const pendingSub = document.getElementById('stat-pending-subtext');
        if (pendingSub) pendingSub.innerHTML = `<span class="material-symbols-outlined text-[14px]">schedule</span> ${pendingOrders.length} active orders`;
        
        const deliveredRate = document.getElementById('stat-delivered-rate');
        if (deliveredRate && orders.length > 0) {
            const rate = ((orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length / orders.length) * 100).toFixed(1);
            deliveredRate.innerHTML = `<span class="material-symbols-outlined text-[14px]">check_circle</span> ${rate}% Success rate`;
        }
    }
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

    // --- Order Detail Logic ---
    window.currentOrderId = null;

    window.viewOrder = async (id) => {
        window.currentOrderId = id;
        const modal = document.getElementById('order-detail-modal');
        if (!modal) return;

        // Reset & Show Loading
        document.getElementById('modal-order-id').innerText = '#' + id.split('-')[0];
        document.getElementById('modal-order-items').innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">Loading items...</td></tr>';
        modal.classList.remove('hidden');
        modal.classList.add('modal-active');

        try {
            // Fetch Order Details
            const { data: order, error: orderErr } = await window.supabaseClient.from('orders').select('*').eq('id', id).single();
            if (orderErr) throw orderErr;

            // Populate Info
            document.getElementById('modal-order-date').innerText = 'Placed on ' + new Date(order.created_at).toLocaleString();
            document.getElementById('modal-customer-name').innerText = order.delivery_info?.customer || 'N/A';
            document.getElementById('modal-customer-phone').innerText = order.delivery_info?.phone || 'N/A';
            document.getElementById('modal-customer-address').innerText = order.delivery_info?.address || 'N/A';
            document.getElementById('modal-order-total').innerText = '€' + Number(order.total_amount).toFixed(2);

            // Handle "Delivered" button visibility
            const deliveredBtn = document.getElementById('modal-delivered-btn');
            if (deliveredBtn) {
                const currentStatus = (order.status || '').toLowerCase();
                if (currentStatus !== 'delivered') {
                    deliveredBtn.classList.remove('hidden');
                } else {
                    deliveredBtn.classList.add('hidden');
                }
            }

            // Fetch Order Items
            const { data: items, error: itemsErr } = await window.supabaseClient.from('order_items').select('*').eq('order_id', id);
            if (itemsErr) throw itemsErr;

            // Populate Items Table
            const tbody = document.getElementById('modal-order-items');
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">No items found.</td></tr>';
            } else {
                tbody.innerHTML = items.map(item => {
                    const safeProductName = escapeHTML(item.product_name);
                    const safeProductId = escapeHTML(item.product_id);
                    const safeQty = item.quantity;
                    const safePrice = Number(item.price).toFixed(2);
                    const safeSubtotal = (item.price * item.quantity).toFixed(2);
                    
                    return `
                    <tr>
                        <td class="px-6 py-4">
                            <p class="text-sm font-bold text-slate-900">${safeProductName}</p>
                            <p class="text-[10px] text-slate-400">ID: ${safeProductId}</p>
                        </td>
                        <td class="px-6 py-4 text-center font-bold text-slate-600">${safeQty}</td>
                        <td class="px-6 py-4 text-right text-slate-400">€${safePrice}</td>
                        <td class="px-6 py-4 text-right font-black text-slate-900">€${safeSubtotal}</td>
                    </tr>
                `;}).join('');
            }

        } catch (err) {
            console.error("[Admin] View Order Fail:", err);
            alert("❌ Failed to load order details: " + err.message);
            closeOrderModal();
        }
    };

    window.closeOrderModal = () => {
        const modal = document.getElementById('order-detail-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('modal-active');
        }
        window.currentOrderId = null;
    };

    window.markAsDelivered = async (id) => {
        if (!id) return;
        if (!confirm('Confirm delivery for this order?')) return;

        const btn = document.getElementById('modal-delivered-btn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Processing...';

            const { error } = await window.supabaseClient.from('orders').update({ status: 'Delivered' }).eq('id', id);
            if (error) throw error;

            alert("✅ Order marked as Delivered.");
            closeOrderModal();
            
            // Refresh Orders Table if on orders page
            const ordersTbody = document.getElementById('orders-table-body');
            if (ordersTbody) loadOrders(ordersTbody);

        } catch (err) {
            console.error("[Admin] Update Status Fail:", err);
            alert("❌ Failed to update status: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    window.printInvoice = () => {
        window.print();
    };

    // Kickoff
    initAdmin();
})();
