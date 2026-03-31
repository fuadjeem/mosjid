document.addEventListener('DOMContentLoaded', async () => {
    
    // Auth Check
    const isLoginPage = window.location.pathname.includes('admin.html') || window.location.pathname.endsWith('/admin');
    
    // Check Supabase Session directly
    if (!window.supabaseClient) {
        console.error('[Admin] Supabase client not initialized!');
        return;
    }

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const isAdmin = session && session.user && session.user.email === 'admin@bakl.org';

    console.log('[Admin] Path:', window.location.pathname, 'IsLogin:', isLoginPage, 'IsAdmin:', !!isAdmin);
    
    if (!isAdmin && !isLoginPage) {
        console.warn('[Admin] No active admin session, redirecting to login...');
        window.location.href = '/admin.html';
        return;
    }
    
    if (isAdmin && isLoginPage) {
        console.log('[Admin] Already authenticated, redirecting to inventory...');
        window.location.href = '/inventory.html';
        return;
    }
    
    // Login Submission
    const loginForm = document.querySelector('form');
    const errorContainer = document.getElementById('error-msg');

    if (loginForm && isLoginPage) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const email = document.getElementById('admin-email').value;
            const loginBtn = document.getElementById('login-btn');

            if (errorContainer) errorContainer.classList.add('hidden');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.dataset.originalHtml = loginBtn.innerHTML;
                loginBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Authenticating...';
            }
            
            console.log('[Admin] Attempting login for:', email);
            
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('[Admin] Login Error:', error);
                if (errorContainer) {
                    errorContainer.textContent = error.message === 'Invalid login credentials' 
                        ? 'Invalid Administrator email or Access Key.'
                        : error.message;
                    errorContainer.classList.remove('hidden');
                } else {
                    alert('Login failed: ' + error.message);
                }
                
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = loginBtn.dataset.originalHtml;
                }
            } else if (data.session) {
                console.log('[Admin] Login success!');
                // Wait briefly for persistence
                setTimeout(() => {
                    window.location.href = '/inventory.html';
                }, 100);
            }
        });
    }

    // Inventory View
    const invTable = document.getElementById('inventory-table-body');
    if (invTable) {
        loadInventory(invTable);
        setupInventoryModals();
        
        // Setup Filter Event Listeners
        const searchInput = document.getElementById('search-input');
        const catFilter = document.getElementById('category-filter');
        const statusFilter = document.getElementById('status-filter');
        
        const handleFilterChange = () => {
            currentPage = 1;
            renderInventory();
        };
        
        if (searchInput) searchInput.addEventListener('input', handleFilterChange);
        if (catFilter) catFilter.addEventListener('change', handleFilterChange);
        if (statusFilter) statusFilter.addEventListener('change', handleFilterChange);
    }

    // Orders View
    const ordersTable = document.getElementById('orders-table-body');
    if (ordersTable) {
        loadOrders(ordersTable);
    }

    // Initialize Real-time synchronization
    setupRealtime();

    // Initialize Admin Context
    if (window.supabaseClient) {
        setupAdminProfile();
        setupImageUploadHooks();
    }
});

async function setupImageUploadHooks() {
    const prodFile = document.getElementById('prod-image-file');
    if (prodFile) {
        prodFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const urlInput = document.getElementById('prod-imageurl');
            const status = document.getElementById('upload-status');
            
            await handleImageUpload(file, urlInput, status);
        });
    }
}

/**
 * Handle File Upload to Supabase Storage
 */
async function handleImageUpload(file, urlInput, statusElement) {
    if (!window.supabaseClient) return;
    
    try {
        if (statusElement) {
            statusElement.innerText = "Uploading to Supabase...";
            statusElement.classList.remove('hidden');
        }
        
        // Use a unique name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await window.supabaseClient.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('images')
            .getPublicUrl(filePath);

        if (urlInput) {
            urlInput.value = publicUrl;
            // Visual feedback
            urlInput.classList.add('ring-2', 'ring-green-500/20');
            setTimeout(() => urlInput.classList.remove('ring-2', 'ring-green-500/20'), 2000);
        }
        
        if (statusElement) {
            statusElement.innerText = "✅ Upload complete!";
            setTimeout(() => statusElement.classList.add('hidden'), 3000);
        }
    } catch (error) {
        console.error('Upload error:', error);
        if (statusElement) {
            statusElement.innerText = "❌ Upload failed: " + error.message;
            statusElement.classList.add('text-red-600');
            setTimeout(() => {
                statusElement.classList.add('hidden');
                statusElement.classList.remove('text-red-600');
            }, 5000);
        }
    }
}

let globalInventory = [];
let globalOrders = [];
let editingProductId = null; // Track if we are editing
let currentPage = 1;
const itemsPerPage = 10;

async function setupAdminProfile() {
    const profileBtn = document.getElementById('admin-profile-btn');
    if (!profileBtn) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const adminEmail = session?.user?.email || 'Administrator';

    // Create dropdown element
    const dropdown = document.createElement('div');
    dropdown.id = 'admin-profile-dropdown';
    dropdown.className = 'hidden absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 py-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200';
    dropdown.innerHTML = `
        <div class="px-4 pb-3 border-b border-slate-50">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Authenticated Admin</p>
            <p class="text-xs font-bold text-slate-900 truncate">${adminEmail}</p>
        </div>
        <div class="pt-2">
            <button onclick="logoutAdmin()" class="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                <span class="material-symbols-outlined text-sm">logout</span>
                Secure Logout
            </button>
        </div>
    `;
    profileBtn.parentElement.appendChild(dropdown);

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    dropdown.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Log out Administrative Session
 */
window.logoutAdmin = async function() {
    console.log('[Admin] Logging out...');
    if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
    }
    window.location.href = '/admin.html';
};



function setupRealtime() {
    if (!window.supabaseClient) return;
    
    const ordersSubscription = window.supabaseClient.channel('orders_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
            console.log('Realtime Order Change:', payload);
            const tbody = document.getElementById('orders-table-body');
            if (tbody) {
                await loadOrders(tbody);
            }
            
            // Also refresh inventory if it exists on current page
            const invTable = document.getElementById('inventory-table-body');
            if (invTable) loadInventory(invTable);
        })
        .subscribe();
}
async function loadInventory(tbody) {
    try {
        if (!window.supabaseClient) return;
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        globalInventory = products;
        
        // Populate Category Filter dynamically
        const catFilter = document.getElementById('category-filter');
        if (catFilter) {
            const uniqueCats = [...new Set(globalInventory.map(p => p.category))].filter(Boolean);
            const currentCat = catFilter.value;
            catFilter.innerHTML = `<option>All Categories</option>` + uniqueCats.map(c => `<option>${c}</option>`).join('');
            if (uniqueCats.includes(currentCat) || currentCat === 'All Categories') catFilter.value = currentCat;
        }
        
        renderInventory();
    } catch (e) { console.error("Load Inventory Error:", e); }
}

function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const category = document.getElementById('category-filter')?.value || 'All Categories';
    const statusFilter = document.getElementById('status-filter')?.value || 'Status: All';

    let filtered = globalInventory.filter(p => {
        // Search
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm) && !p.id.toLowerCase().includes(searchTerm) && !(p.category||'').toLowerCase().includes(searchTerm)) {
            return false;
        }
        // Category
        if (category !== 'All Categories' && p.category !== category) {
            return false;
        }

        // Status
        const expiryDate = new Date(p.expiry);
        const timeDiff = expiryDate.getTime() - new Date().getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const stock = Number(p.stock);
        let currentStatus = p.status;

        if (statusFilter === 'Available' && currentStatus !== 'Available') return false;
        if (statusFilter === 'Unavailable' && currentStatus !== 'Unavailable') return false;
        if (statusFilter === 'Low on Stock' && stock >= 10) return false;
        if (statusFilter === 'Expiring Soon') {
            if (isNaN(daysDiff) || daysDiff > 7 || daysDiff < 0) return false;
        }

        return true;
    });

    // Update Stats
    updateStatsGrid(filtered);

    // Pagination Logic
    const totalItems = filtered.length;
    let totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages === 0) totalPages = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = '';
    paginatedItems.forEach(p => {
        // Expiry logic display
        const expiryDate = new Date(p.expiry);
        const timeDiff = expiryDate.getTime() - new Date().getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let rowClass = "hover:bg-surface-container-lowest group transition-all";
        let statusMarkup = `<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-green-500"></div><span class="text-xs font-semibold text-on-surface whitespace-nowrap">${p.status}</span></div>`;
        
        if (daysDiff < 0) {
            rowClass = "hover:bg-surface-container-lowest group transition-all opacity-70";
            statusMarkup = `<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-outline"></div><span class="text-xs font-semibold text-outline whitespace-nowrap">Expired</span></div>`;
        } else if (daysDiff <= 7) {
            rowClass = "bg-tertiary-container/[0.03] hover:bg-tertiary-container/[0.06] group transition-all";
            statusMarkup = `<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-secondary-container"></div><span class="text-xs font-semibold text-secondary whitespace-nowrap">Expiring Soon</span></div>`;
        }
        if (p.status !== 'Available') {
             rowClass += " opacity-70";
        }
        
        // Toggle UI
        const isAvail = p.status === 'Available';
        const toggleBg = isAvail ? 'bg-primary' : 'bg-outline-variant';
        const toggleTransform = isAvail ? 'translate-x-full border-white' : 'translate-x-0';
        
        const toggleMarkup = `
            <div class="relative inline-flex items-center cursor-pointer ml-3 mt-1" onclick="event.stopPropagation(); toggleStatus('${p.id}')" title="Enable/Disable Availability">
                <div class="w-8 h-4 ${toggleBg} rounded-full transition-colors relative">
                    <div class="absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-3 w-3 transition-transform ${toggleTransform}"></div>
                </div>
            </div>`;

        tbody.innerHTML += `
        <tr class="${rowClass}">
            <td class="px-6 py-4 font-mono text-xs text-outline w-16">${p.id.split('_').pop()}</td>
            <td class="px-6 py-4">
                <p class="text-sm font-bold text-on-surface">${p.name}</p>
                <p class="text-[10px] text-outline">Expires: ${p.expiry}</p>
            </td>
            <td class="px-6 py-4">
                <span class="text-[10px] font-bold bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded-full uppercase tracking-tight">${p.category}</span>
            </td>
            <td class="px-6 py-4 text-center">
                <p class="text-sm font-bold text-on-surface">€${Number(p.price).toFixed(2)}</p>
            </td>
            <td class="px-6 py-4 text-center">
                <p class="text-sm font-medium text-on-surface flex flex-col items-center">
                   <span class="${p.stock < 10 ? 'text-tertiary font-bold' : ''}">${p.stock}</span>
                   ${p.stock < 10 && p.stock > 0 ? `<span class="text-[10px] text-tertiary">Low Stock</span>` : ''}
                   ${p.stock == 0 ? `<span class="text-[10px] text-tertiary">Out of Stock</span>` : ''}
                </p>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col gap-1 items-start">
                    ${statusMarkup}
                    ${toggleMarkup}
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1 group-hover:opacity-100 transition-opacity">
                    <button onclick="event.stopPropagation(); editProduct('${p.id}')" class="p-2 hover:bg-surface-container rounded-lg text-outline hover:text-primary transition-all" title="Edit / Restock">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="event.stopPropagation(); deleteProduct(event, '${p.id}')" class="p-2 hover:bg-tertiary-container/10 rounded-lg text-outline hover:text-tertiary transition-all" title="Delete">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    // Render Pagination Controls
    const infoSpan = document.getElementById('pagination-info');
    const controlsDiv = document.getElementById('pagination-controls');
    
    if (infoSpan) {
        const showingStart = totalItems === 0 ? 0 : startIndex + 1;
        const showingEnd = Math.min(startIndex + itemsPerPage, totalItems);
        infoSpan.innerHTML = `Showing <span class="text-on-surface font-bold">${showingStart}-${showingEnd}</span> of ${totalItems} items`;
    }
    
    if (controlsDiv) {
        let controlsHTML = '';
        
        // Prev button
        controlsHTML += `<button onclick="changePage(${currentPage - 1})" class="p-2 hover:bg-surface-container rounded-lg transition-all text-outline disabled:opacity-30" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-lg">chevron_left</span>
        </button>`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            controlsHTML += `<button onclick="changePage(1)" class="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center">1</button>`;
            if (startPage > 2) controlsHTML += `<span class="w-8 h-8 flex items-center justify-center text-outline">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                controlsHTML += `<button class="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center">${i}</button>`;
            } else {
                controlsHTML += `<button onclick="changePage(${i})" class="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center">${i}</button>`;
            }
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) controlsHTML += `<span class="w-8 h-8 flex items-center justify-center text-outline">...</span>`;
            controlsHTML += `<button onclick="changePage(${totalPages})" class="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center">${totalPages}</button>`;
        }
        
        // Next button
        controlsHTML += `<button onclick="changePage(${currentPage + 1})" class="p-2 hover:bg-surface-container rounded-lg transition-all text-outline disabled:opacity-30" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-lg">chevron_right</span>
        </button>`;
        
        controlsDiv.innerHTML = controlsHTML;
    }
}

window.changePage = (page) => {
    currentPage = page;
    renderInventory();
};

window.applyQuickFilter = (statusValue) => {
    const statusSelect = document.getElementById('status-filter');
    if(statusSelect) {
        statusSelect.value = statusValue;
        currentPage = 1;
        
        // If they click 'Total Items' ('Status: All'), clear search and category too
        if (statusValue === 'Status: All') {
            document.getElementById('search-input').value = '';
            document.getElementById('category-filter').value = 'All Categories';
        }
        renderInventory();
    }
};

function updateStatsGrid(filteredItems) {
    let lowStockCount = 0;
    let expiringCount = 0;
    let totalValue = 0;

    filteredItems.forEach(p => {
        const stock = Number(p.stock) || 0;
        const price = Number(p.price) || 0;
        
        totalValue += (stock * price);
        
        if (stock < 10) lowStockCount++;

        const expiryDate = new Date(p.expiry);
        const timeDiff = expiryDate.getTime() - new Date().getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (!isNaN(daysDiff)) {
            if (daysDiff <= 7 && daysDiff >= 0) expiringCount++;
            else if (daysDiff < 0) expiringCount++; // technically already expired
        }
    });

    const valTotal = document.getElementById('val-total-items');
    const valLow = document.getElementById('val-low-stock');
    const valExpiring = document.getElementById('val-expiring-soon');
    const valValue = document.getElementById('val-inventory-value');

    if (valTotal) valTotal.innerText = filteredItems.length.toLocaleString();
    if (valLow) valLow.innerText = lowStockCount.toLocaleString();
    if (valExpiring) valExpiring.innerText = expiringCount.toLocaleString();
    
    // Format euro
    if (valValue) {
        valValue.innerText = '€' + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

window.toggleStatus = async (id) => {
    const pInfo = globalInventory.find(p => p.id === id);
    if (!pInfo) return;
    
    const newStatus = pInfo.status === 'Available' ? 'Unavailable' : 'Available';
    const updatedProduct = { ...pInfo, status: newStatus };
    
    // Optimistic UI update
    pInfo.status = newStatus;
    renderInventory();
    
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
    } catch(e) {
        console.error("Failed to toggle status:", e);
        pInfo.status = newStatus === 'Available' ? 'Unavailable' : 'Available';
        renderInventory();
    }
};

window.deleteProduct = async (event, id) => {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    if(!confirm('Are you sure you want to delete this product?')) return;
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
        loadInventory(document.getElementById('inventory-table-body'));
    } catch (e) { console.error("Delete Product Error:", e); }
};

window.editProduct = (id) => {
    const pInfo = globalInventory.find(p => p.id === id);
    if (!pInfo) return;
    
    const modal = document.getElementById('add-product-modal');
    modal.querySelector('h2').innerText = "Edit Product";
    document.getElementById('save-product-btn').innerText = "Update Product";
    
    document.getElementById('prod-name').value = pInfo.name;
    document.getElementById('prod-cat').value = pInfo.category;
    document.getElementById('prod-price').value = pInfo.price;
    document.getElementById('prod-stock').value = pInfo.stock;
    document.getElementById('prod-expiry').value = pInfo.expiry || '';
    document.getElementById('prod-imageurl').value = pInfo.image_url || '';
    document.getElementById('prod-status').checked = (pInfo.status === 'Available');
    
    editingProductId = id; // Set edit tracking ID
    modal.classList.remove('hidden');
};

function setupInventoryModals() {
    const addBtn = document.getElementById('add-product-btn');
    const modal = document.getElementById('add-product-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-modal-btn');
    const saveBtn = document.getElementById('save-product-btn');
    
    if (addBtn && modal) {
        addBtn.addEventListener('click', () => {
            // Reset for Add
            editingProductId = null;
            modal.querySelector('h2').innerText = "Add New Product";
            saveBtn.innerText = "Save Product";
            
            document.getElementById('prod-name').value = '';
            document.getElementById('prod-cat').value = '';
            document.getElementById('prod-price').value = '';
            document.getElementById('prod-stock').value = '50';
            document.getElementById('prod-expiry').value = '';
            document.getElementById('prod-imageurl').value = '';
            document.getElementById('prod-status').checked = true;
            
            modal.classList.remove('hidden');
        });
        
        const closeMod = () => modal.classList.add('hidden');
        closeBtn.addEventListener('click', closeMod);
        cancelBtn.addEventListener('click', closeMod);
        
        saveBtn.addEventListener('click', async () => {
             // Basic validation
             const name = document.getElementById('prod-name').value;
             if (!name) return alert("Product name is required");

            const product = {
                name: name,
                category: document.getElementById('prod-cat').value,
                price: document.getElementById('prod-price').value,
                stock: document.getElementById('prod-stock').value,
                expiry: document.getElementById('prod-expiry').value,
                image_url: document.getElementById('prod-imageurl').value,
                status: document.getElementById('prod-status').checked ? 'Available' : 'Unavailable'
            };
            
            try {
                if (editingProductId) {
                    const { error } = await window.supabaseClient
                        .from('products')
                        .update(product)
                        .eq('id', editingProductId);
                    
                    if (!error) {
                        closeMod();
                        loadInventory(document.getElementById('inventory-table-body'));
                    } else throw error;
                } else {
                    product.id = 'prod_' + Date.now();
                    const { error } = await window.supabaseClient
                        .from('products')
                        .insert([product]);
                    
                    if (!error) {
                        closeMod();
                        loadInventory(document.getElementById('inventory-table-body'));
                    } else throw error;
                }
            } catch (e) { 
                console.error("Save Product Error:", e);
                alert("Failed to save product: " + e.message);
            }
        });
    }
}

async function loadOrders(tbody) {
    try {
        if (!window.supabaseClient) return;
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        globalOrders = orders || [];
        renderOrders();
    } catch (e) {
        console.error("Load Orders Error:", e);
    }
}

function renderOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const summary = document.getElementById('order-pagination-summary');
    const nav = document.getElementById('pagination-nav');
    
    if (summary) summary.innerText = globalOrders.length > 0 ? `1-${globalOrders.length} of ${globalOrders.length}` : `0 of 0`;
    if (nav) {
        if (globalOrders.length > 0) nav.classList.remove('hidden');
        else nav.classList.add('hidden');
    }

    if (globalOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
            <p class="text-sm">No orders found.</p>
        </td></tr>`;
        updateOrderDashboardStats(globalOrders);
        return;
    }

    tbody.innerHTML = '';
    globalOrders.forEach(o => {
        const di = o.delivery_info || {};
        const status = (o.status || '').toLowerCase().trim();
        const isDelivered = status === 'delivered' || status === 'completed';
        
        // Status badge color
        let statusClass = 'bg-slate-100 text-slate-600';
        if (status.includes('pending')) statusClass = 'bg-amber-50 text-amber-700 border border-amber-100';
        else if (isDelivered) statusClass = 'bg-green-50 text-green-700 border border-green-100';
        else if (status.includes('cancel')) statusClass = 'bg-red-50 text-red-700 border border-red-100';
        
        // Toggle UI (matching Inventory page)
        const toggleBg = isDelivered ? 'bg-green-500' : 'bg-slate-200';
        const toggleTransform = isDelivered ? 'translate-x-[18px]' : 'translate-x-0';

        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-all group border-b border-slate-50" data-order-id="${o.id}">
            <td class="px-6 py-4">
                <button onclick="viewOrder('${o.id}')" class="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                    #${o.id.split('-')[0]}
                </button>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-900">${di.customer || 'Guest User'}</span>
                    <span class="text-[10px] text-slate-400 font-medium">${di.phone || 'No phone'}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-sm font-black text-slate-900">€${Number(o.total_amount).toFixed(2)}</td>
            <td class="px-6 py-4 text-xs text-slate-500 font-medium">${new Date(o.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="relative inline-flex items-center cursor-pointer" onclick="toggleOrderStatus('${o.id}')" title="Toggle Delivery Status">
                        <div class="w-10 h-5 ${toggleBg} rounded-full transition-colors relative">
                            <div class="absolute top-[2px] left-[2px] bg-white border border-slate-300 rounded-full h-4 w-4 transition-transform ${toggleTransform}"></div>
                        </div>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusClass}">
                        ${(o.status || 'pending').replace('_', ' ')}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
               <div class="flex justify-end gap-1">
                   <button onclick="viewOrder('${o.id}')" class="p-2 hover:bg-blue-50 text-slate-400 hover:text-primary rounded-lg transition-all" title="View Detail / Invoice">
                       <span class="material-symbols-outlined text-sm">visibility</span>
                   </button>
                   <button onclick="deleteOrder('${o.id}')" class="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all" title="Delete Order">
                       <span class="material-symbols-outlined text-sm">delete</span>
                   </button>
               </div>
            </td>
        </tr>`;
    });

    updateOrderDashboardStats(globalOrders);
}

function updateOrderDashboardStats(orders) {
    const revEl = document.getElementById('stat-revenue');
    const pendEl = document.getElementById('stat-pending');
    const delivEl = document.getElementById('stat-delivered');
    
    const revGrowthEl = document.getElementById('stat-revenue-growth');
    const pendSubtextEl = document.getElementById('stat-pending-subtext');
    const delivRateEl = document.getElementById('stat-delivered-rate');

    if (!revEl) return;

    let totalRevenue = 0;
    let pendingCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;

    orders.forEach(o => {
        const amt = Number(o.total_amount) || 0;
        const status = (o.status || '').toLowerCase().trim();
        const date = new Date(o.created_at);
        
        if (status !== 'cancelled') {
            totalRevenue += amt;
            
            // Monthly calculation
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                currentMonthRevenue += amt;
            } else if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) {
                previousMonthRevenue += amt;
            }
        }

        if (status.includes('pending')) {
            pendingCount++;
        } else if (status === 'delivered' || status === 'completed') {
            deliveredCount++;
        } else if (status.includes('cancel')) {
            cancelledCount++;
        }
    });

    // Update Main Numbers
    if (revEl) revEl.innerText = '€' + totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (pendEl) pendEl.innerText = pendingCount;
    if (delivEl) delivEl.innerText = deliveredCount;

    // Update Subtexts with Dynamic Logic
    if (revGrowthEl) {
        if (previousMonthRevenue > 0) {
            const growth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100);
            const trend = growth >= 0 ? '+' : '';
            const color = growth >= 0 ? 'text-green-500' : 'text-rose-500';
            const icon = growth >= 0 ? '↑' : '↓';
            revGrowthEl.innerHTML = `<span class="${color} font-bold">${icon} ${trend}${growth.toFixed(1)}%</span> <span class="text-slate-400">vs last month</span>`;
        } else {
            revGrowthEl.innerHTML = `<span class="text-blue-500 font-bold">New</span> <span class="text-slate-400">€${currentMonthRevenue.toFixed(0)} this month</span>`;
        }
    }

    if (pendSubtextEl) {
        pendSubtextEl.innerHTML = `<span class="material-symbols-outlined text-[12px] align-middle">broadcast_on_personal</span> <span class="font-bold text-slate-600">${pendingCount}</span> active orders require attention`;
    }

    if (delivRateEl) {
        const totalProcessed = deliveredCount + cancelledCount;
        const rate = totalProcessed === 0 ? 100.0 : ((deliveredCount / totalProcessed) * 100).toFixed(1);
        delivRateEl.innerHTML = `<span class="text-primary font-bold">${rate}%</span> Success rate <span class="text-slate-400">(delivered/total)</span>`;
    }
}

// Order Management Actions
window.toggleOrderStatus = async (id) => {
    const order = globalOrders.find(o => o.id === id);
    if (!order) return;

    const oldStatus = order.status;
    const newStatus = oldStatus === 'delivered' ? 'pending_delivery' : 'delivered';
    
    // Optimistic Update
    order.status = newStatus;
    renderOrders();

    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
    } catch(e) { 
        console.error("Toggle Order Status Error:", e);
        alert('Failed to update status on server. Reverting...');
        order.status = oldStatus;
        renderOrders();
    }
};

window.viewOrder = async (id) => {
    const modal = document.getElementById('order-detail-modal');
    if (!modal) return;

    try {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        document.getElementById('modal-order-id').innerText = '#' + id.split('-')[0];
        document.getElementById('modal-order-items').innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">Loading order items...</td></tr>';

        const { data: order, error: oError } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        const { data: items, error: iError } = await window.supabaseClient
            .from('order_items')
            .select('*')
            .eq('order_id', id);

        if (oError || iError) throw (oError || iError);

        const di = order.delivery_info || {};
        document.getElementById('modal-order-date').innerText = 'Placed on ' + new Date(order.created_at).toLocaleString();
        document.getElementById('modal-customer-name').innerText = di.customer || 'Guest User';
        document.getElementById('modal-customer-phone').innerText = di.phone || 'No phone provided';
        document.getElementById('modal-customer-address').innerText = di.address || 'Address not available';
        document.getElementById('modal-order-total').innerText = '€' + Number(order.total_amount).toFixed(2);

        const itemsBody = document.getElementById('modal-order-items');
        itemsBody.innerHTML = '';
        
        if (items && items.length > 0) {
            items.forEach(item => {
                itemsBody.innerHTML += `
                    <tr class="hover:bg-slate-50/50">
                        <td class="px-6 py-4 font-medium text-slate-800">${item.product_name}</td>
                        <td class="px-6 py-4 text-center text-slate-600">${item.quantity}</td>
                        <td class="px-6 py-4 text-right text-slate-500">€${Number(item.price).toFixed(2)}</td>
                        <td class="px-6 py-4 text-right font-bold text-slate-900">€${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            itemsBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400 italic">No item details found.</td></tr>';
        }
    } catch (e) {
        console.error("View Order Error:", e);
        alert("Failed to load order details.");
        closeOrderModal();
    }
};

window.closeOrderModal = () => {
    const modal = document.getElementById('order-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.printInvoice = () => {
    window.print();
};

window.exportOrdersToCSV = async () => {
    const btn = document.getElementById('export-csv-btn');
    const originalText = btn ? btn.innerHTML : '';
    
    try {
        if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Exporting...';
        
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!orders || orders.length === 0) {
            alert("No orders to export.");
            return;
        }

        const headers = ["Order ID", "Date", "Customer", "Phone", "Address", "Total Amount", "Status"];
        const rows = orders.map(o => {
            const di = o.delivery_info || {};
            return [
                `"${o.id}"`,
                `"${new Date(o.created_at).toLocaleString()}"`,
                `"${(di.customer || 'Guest').replace(/"/g, '""')}"`,
                `"${(di.phone || '').replace(/"/g, '""')}"`,
                `"${(di.address || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                o.total_amount,
                `"${o.status}"`
            ];
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.href = url;
        link.setAttribute("download", `Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);

    } catch (e) {
        console.error("CSV Export Error:", e);
        alert("Failed to export CSV: " + e.message);
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
};

window.deleteOrder = async (id) => {
    if(!confirm('Delete this order completely? This cannot be undone.')) return;
    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await loadOrders(document.getElementById('orders-table-body'));
    } catch (e) { 
        console.error("Delete Order Error:", e);
        alert('Failed to delete order. Please try again.');
    }
};
