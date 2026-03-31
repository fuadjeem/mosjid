document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Check
    const token = sessionStorage.getItem('adminToken');
    const isLoginPage = window.location.pathname.includes('admin');
    
    if (!token && !isLoginPage) {
        window.location.href = '/admin';
        return;
    }
    
    // Login Submission
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const password = document.getElementById('password').value;
            const email = document.getElementById('admin-email').value;
            
            // 1. Check default credentials (User Request)
            if (email === 'admin@bakl.org' && password === 'admin') {
                sessionStorage.setItem('adminToken', 'default_admin_stable_token');
                window.location.href = '/inventory.html';
                return;
            }

            // 2. Fallback to Supabase Auth
            try {
                if (window.supabaseClient) {
                    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password,
                    });
                    if (error) throw error;
                    sessionStorage.setItem('adminToken', data.session.access_token);
                    window.location.href = '/inventory.html';
                } else {
                    alert("Supabase not loaded.");
                }
            } catch (e) {
                console.error(e);
                alert("Authentication failed: " + (e.message || "Invalid credentials"));
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
});

let globalInventory = [];
let editingProductId = null; // Track if we are editing
let currentPage = 1;
const itemsPerPage = 10;



function setupRealtime() {
    if (!window.supabaseClient) return;
    
    const ordersSubscription = window.supabaseClient.channel('orders_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            console.log('Realtime Order Change:', payload);
            const tbody = document.getElementById('orders-table-body');
            if (tbody) loadOrders(tbody);
            
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
            <div class="relative inline-flex items-center cursor-pointer ml-3 mt-1" onclick="toggleStatus('${p.id}')" title="Enable/Disable Availability">
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
                    <button onclick="editProduct('${p.id}')" class="p-2 hover:bg-surface-container rounded-lg text-outline hover:text-primary transition-all" title="Edit / Restock">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="p-2 hover:bg-tertiary-container/10 rounded-lg text-outline hover:text-tertiary transition-all" title="Delete">
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

window.deleteProduct = async (id) => {
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
    document.getElementById('prod-imageurl').value = pInfo.imageUrl || '';
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
                imageUrl: document.getElementById('prod-imageurl').value,
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
        
        tbody.innerHTML = '';
        orders.forEach(o => {
            const di = o.delivery_info || {};
            tbody.innerHTML += `
            <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="px-6 py-4">
                    <span class="font-mono text-xs font-semibold text-primary">${o.id.split('-')[0]}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm font-medium">${di.customer || 'Unknown'}</span>
                </td>
                <td class="px-6 py-4 text-sm font-bold">€${Number(o.total_amount).toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-on-surface-variant">${new Date(o.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${o.status.includes('pending') ? 'bg-secondary-container text-on-secondary-container' : 'bg-blue-50 text-blue-700'}">${o.status.replace('_', ' ')}</span>
                </td>
                <td class="px-6 py-4 text-right">
                   <div class="flex justify-end gap-2">
                       <button onclick="markDelivered('${o.id}')" class="p-2 hover:bg-green-50 rounded-lg text-outline hover:text-green-600 transition-all" title="Mark as Delivered">
                           <span class="material-symbols-outlined text-sm">check_circle</span>
                       </button>
                       <button onclick="deleteOrder('${o.id}')" class="p-2 hover:bg-tertiary-container/10 rounded-lg text-outline hover:text-tertiary transition-all" title="Delete Order">
                           <span class="material-symbols-outlined text-sm">delete</span>
                       </button>
                   </div>
                </td>
            </tr>`;
        });

        // Update Dashboard Stats Card
        updateOrderDashboardStats(orders);

    } catch (e) { console.error("Load Orders Error:", e); }
}

function updateOrderDashboardStats(orders) {
    const revEl = document.getElementById('stat-revenue');
    const pendEl = document.getElementById('stat-pending');
    const delivEl = document.getElementById('stat-delivered');

    if (!revEl) return;

    let revenue = 0;
    let pending = 0;
    let delivered = 0;

    orders.forEach(o => {
        revenue += Number(o.total_amount) || 0;
        // Normalize status to lowercase trimmed string
        const status = (o.status || '').toLowerCase().trim();
        
        if (status.includes('pending')) {
            pending++;
        } else if (status === 'delivered' || status === 'completed') {
            delivered++;
        }
    });

    if (revEl) revEl.innerText = '€' + revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (pendEl) pendEl.innerText = pending;
    if (delivEl) delivEl.innerText = delivered;

    // Optional: Update sub-labels if they exist
    const pendSub = pendEl.nextElementSibling;
    if (pendSub && pendSub.classList.contains('text-xs')) {
        pendSub.innerHTML = `<span class="material-symbols-outlined text-[14px]">schedule</span> ${pending} active orders`;
    }
}



window.markDelivered = async (id) => {
    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ status: 'delivered' })
            .eq('id', id);
        if (error) throw error;
        loadOrders(document.getElementById('orders-table-body'));
    } catch(e) { console.error("Mark Delivered Error:", e); }
};

window.deleteOrder = async (id) => {
    if(!confirm('Delete this order completely?')) return;
    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .delete()
            .eq('id', id);
        if (error) throw error;
        loadOrders(document.getElementById('orders-table-body'));
    } catch (e) { console.error("Delete Order Error:", e); }
};
