document.addEventListener('DOMContentLoaded', () => {
    // 1. If on index page
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        loadProducts(productGrid);
    }

    // 2. If on cart page
    const cartContainer = document.getElementById('cart-items-container');
    if (cartContainer) {
        renderCart(cartContainer);
        setupCheckout();
    }
    
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        const toggleMenu = () => {
            const isHidden = sidebar.classList.toggle('-translate-x-full');
            if (overlay) {
                if(isHidden) overlay.classList.add('hidden');
                else overlay.classList.remove('hidden');
            }
        };
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
        if (mobileFilterBtn) mobileFilterBtn.addEventListener('click', toggleMenu);
        if (overlay) overlay.addEventListener('click', toggleMenu);
    }
    
    updateCartIcon();
});

let cart = JSON.parse(localStorage.getItem('cart') || '[]');

window.allProducts = [];

async function loadProducts(grid) {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        window.allProducts = products;
        
        setupStorefrontFilters();
        applyFilters();
    } catch (e) {
        console.error("Failed to load products", e);
        grid.innerHTML = '<p class="text-on-surface-variant">Failed to load product catalog.</p>';
    }
}

function setupStorefrontFilters() {
    // 1. Categories
    const categoriesContainer = document.getElementById('sidebar-categories');
    if (categoriesContainer) {
        const uniqueCategories = [...new Set(window.allProducts.map(p => p.category))].filter(Boolean).sort();
        
        let html = `
            <label class="flex items-center gap-2 cursor-pointer group mb-1">
                <input type="checkbox" id="all-items-cb" class="rounded-sm border-outline text-primary focus:ring-primary-container" checked>
                <span class="text-xs font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">All Items</span>
            </label>
            <div class="h-px bg-slate-200 my-2 w-full"></div>
        `;
        
        html += uniqueCategories.map(cat => `
            <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" value="${cat}" class="category-cb rounded-sm border-outline text-primary focus:ring-primary-container" checked>
                <span class="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">${cat}</span>
            </label>
        `).join('');
        
        categoriesContainer.innerHTML = html;
        
        const allCb = document.getElementById('all-items-cb');
        const catCbs = document.querySelectorAll('.category-cb');
        
        if (allCb) {
            allCb.addEventListener('change', (e) => {
                catCbs.forEach(cb => cb.checked = e.target.checked);
                applyFilters();
            });
        }
        
        catCbs.forEach(cb => {
            cb.addEventListener('change', () => {
                if (allCb) {
                   const allChecked = Array.from(catCbs).every(c => c.checked);
                   allCb.checked = allChecked;
                }
                applyFilters();
            });
        });
    }

    // 2. Max Price setup
    const priceSlider = document.getElementById('price-slider');
    const priceValNode = document.getElementById('price-slider-val');
    if (priceSlider) {
        let maxPrice = 0;
        window.allProducts.forEach(p => {
             const price = Number(p.price) || 0;
             if (price > maxPrice) maxPrice = price;
        });
        maxPrice = Math.ceil(maxPrice);
        if(maxPrice < 100) maxPrice = 100; // sensible default
        priceSlider.max = maxPrice;
        priceSlider.value = maxPrice;
        
        priceSlider.addEventListener('input', (e) => {
             if (priceValNode) priceValNode.innerText = '€' + e.target.value;
        });
        priceSlider.addEventListener('change', applyFilters);
    }
    
    // 3. Search & Sort
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
}

function applyFilters() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    const searchInput = document.getElementById('search-input');
    const term = searchInput ? searchInput.value.toLowerCase() : '';
    
    const cbs = Array.from(document.querySelectorAll('.category-cb'));
    const activeCats = cbs.filter(cb => cb.checked).map(cb => cb.value);
    
    const priceSlider = document.getElementById('price-slider');
    const maxPriceLimit = priceSlider ? Number(priceSlider.value) : Infinity;
    
    let filtered = window.allProducts.filter(p => {
        // Search
        if (term && !p.name.toLowerCase().includes(term) && !(p.category||'').toLowerCase().includes(term)) return false;
        
        // Category
        if (activeCats.length > 0 && !activeCats.includes(p.category)) return false;
        
        // Price
        const price = Number(p.price) || 0;
        if (price > maxPriceLimit) return false;
        
        return true;
    });
    
    // Sort
    const sortSelect = document.getElementById('sort-select');
    const sortVal = sortSelect ? sortSelect.value : 'default';
    if (sortVal === 'price-asc') filtered.sort((a,b) => (Number(a.price)||0) - (Number(b.price)||0));
    else if (sortVal === 'price-desc') filtered.sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0));
    else if (sortVal === 'name-asc') filtered.sort((a,b) => a.name.localeCompare(b.name));
    
    // Breadcrumbs
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        let path = "Home";
        if (activeCats.length === 1) path += ` <span class="mx-1 text-outline-variant">/</span> ${activeCats[0]}`;
        else if (activeCats.length > 1 && activeCats.length < cbs.length) path += ` <span class="mx-1 text-outline-variant">/</span> Mixed Categories`;
        else path += ` <span class="mx-1 text-outline-variant">/</span> All Categories`;
        
        if (term) path += ` <span class="mx-1 text-outline-variant">/</span> Search: "${term}"`;
        breadcrumb.innerHTML = path;
    }
    
    renderProductGrid(grid, filtered);
}

function renderProductGrid(grid, products) {
    grid.innerHTML = '';
    if(products.length === 0) {
        grid.innerHTML = '<p class="text-on-surface-variant col-span-full text-center py-8">No products found matching your active filters.</p>';
        return;
    }
    products.forEach(p => {
        // Expiry logic: <= 7 days yellow, expired red
        const expiryDate = new Date(p.expiry);
        const today = new Date();
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let statusTag = '';
        let cardClass = 'bg-surface-container-lowest';
        let btnClass = 'bg-gradient-to-br from-primary to-primary-container active:scale-95 transition-transform';
        let btnText = 'Add to Cart';
        let btnDisabled = '';
        
        if (p.status !== 'Available' || (!isNaN(daysDiff) && daysDiff < 0) || Number(p.stock) === 0) {
            // Out of stock or Expired
            statusTag = `<span class="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">${p.status !== 'Available' || Number(p.stock) === 0 ? 'Out of Stock' : 'Expired'}</span>`;
            cardClass = 'bg-surface-container-low opacity-60 grayscale';
            btnClass = 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70';
            btnText = 'Available Soon';
            btnDisabled = 'disabled';
        } else if (!isNaN(daysDiff) && daysDiff <= 7) {
            // Warning
            statusTag = `<span class="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Warning</span>`;
        }
        
        const imgBlock = p.imageUrl ? 
            `<img src="${p.imageUrl}" alt="${p.name}" class="w-full h-full object-cover">` : 
            `<span class="material-symbols-outlined text-4xl text-outline border border-dashed border-outline-variant/50 p-6 rounded-lg bg-surface">image</span>`;

        grid.innerHTML += `
        <div class="${cardClass} rounded-xl p-6 flex flex-col transition-all shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-transparent hover:border-outline-variant/20">
            <div class="w-full h-40 bg-surface-container-high rounded-md mb-4 flex items-center justify-center overflow-hidden">
                ${imgBlock}
            </div>
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-on-surface title-md">${p.name}</h3>
                ${statusTag}
            </div>
            <p class="text-xs text-on-surface-variant mb-4 font-medium italic">${p.category}</p>
            <div class="mt-auto flex items-center justify-between">
                <span class="text-lg font-extrabold text-on-surface">€${Number(p.price).toFixed(2)}</span>
                <div class="flex items-center gap-2">
                    <div class="flex items-center border border-outline-variant/30 rounded-md bg-surface-container-lowest h-8">
                        <button class="px-2 text-outline hover:text-primary transition-colors focus:outline-none" onclick="document.getElementById('qty-${p.id}').stepDown()" ${btnDisabled}>
                            <span class="material-symbols-outlined text-sm font-bold">remove</span>
                        </button>
                        <input type="number" id="qty-${p.id}" value="1" min="1" class="w-8 text-center text-xs font-bold bg-transparent border-none p-0 focus:ring-0" ${btnDisabled}>
                        <button class="px-2 text-outline hover:text-primary transition-colors focus:outline-none" onclick="document.getElementById('qty-${p.id}').stepUp()" ${btnDisabled}>
                            <span class="material-symbols-outlined text-sm font-bold">add</span>
                        </button>
                    </div>
                    <button class="${btnClass} px-4 py-2 text-white rounded-md text-xs font-bold border-none" ${btnDisabled} onclick="addToCart('${p.id}', '${p.name.replace("'", "\\'")}', ${p.price})">${btnText}</button>
                </div>
            </div>
        </div>`;
    });
}

window.addToCart = (id, name, price) => {
    const qtyInput = document.getElementById(`qty-${id}`);
    const qtyToAdd = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    
    if (isNaN(qtyToAdd) || qtyToAdd < 1) return;

    const existing = cart.find(i => i.id === id);
    if(existing) existing.qty += qtyToAdd;
    else cart.push({id, name, price, qty: qtyToAdd});
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
    alert(`${qtyToAdd}x ${name} added to cart`);
};

function updateCartIcon() {
    // A more advanced app would update the UI here
}

function renderCart(container) {
    if(cart.length === 0) {
        container.innerHTML = '<p class="text-on-surface-variant p-4">Your cart is empty.</p>';
        document.getElementById('checkout-btn').disabled = true;
        document.getElementById('checkout-btn').innerText = 'Cart Empty';
        document.getElementById('checkout-btn').classList.add('bg-outline', 'cursor-not-allowed', 'opacity-50');
        document.getElementById('checkout-btn').classList.remove('bg-primary');
        document.getElementById('subtotal-val').innerText = '€0.00';
        document.getElementById('total-val').innerText = '€0.00';
        return;
    }
    
    let total = 0;
    container.innerHTML = '';
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        container.innerHTML += `
        <div class="bg-surface-container-lowest p-5 rounded-xl flex gap-6 items-center hover:bg-surface-bright transition-colors mb-4 border border-outline-variant/10">
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-bold text-on-surface leading-none">${item.name}</h3>
                    </div>
                    <span class="text-lg font-bold text-on-surface">€${itemTotal.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-4 mt-4">
                    <div class="flex items-center bg-surface-container rounded-full px-2 py-1 gap-2 border border-outline-variant/20">
                        <span class="pl-2 text-xs font-bold">Qty:</span>
                        <input type="number" min="1" value="${item.qty}" onchange="updateCartQty('${item.id}', this.value)" class="w-12 h-6 text-center text-xs font-bold bg-transparent border-none focus:ring-0 outline-none p-0 inline-block">
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="text-xs font-medium text-error hover:underline flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">delete</span> Remove
                    </button>
                </div>
            </div>
        </div>`;
    });
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const warningBlock = document.getElementById('min-order-warning');
    const warningTextBlock = document.getElementById('min-order-warning-text');
    const logisticsText = document.getElementById('logistics-text');
    const logisticsVal = document.getElementById('logistics-val');
    const deliveryFields = document.getElementById('delivery-fields');
    
    const modePickupLabel = document.getElementById('mode-pickup-label');
    const modeDeliveryLabel = document.getElementById('mode-delivery-label');
    const modePickupRadio = document.getElementById('mode-pickup');
    const modeDeliveryRadio = document.getElementById('mode-delivery');
    const deliveryEligibilityText = document.getElementById('delivery-eligibility-text');
    
    document.getElementById('subtotal-val').innerText = '€' + total.toFixed(2);
    
    if (modePickupRadio && modeDeliveryRadio) {
        if (total < 30) {
            modeDeliveryRadio.disabled = true;
            modeDeliveryRadio.classList.add('cursor-not-allowed');
            modeDeliveryLabel.classList.add('opacity-50');
            modeDeliveryLabel.classList.remove('hover:bg-surface');
            modePickupRadio.checked = true;
            
            if(deliveryEligibilityText) {
                deliveryEligibilityText.innerHTML = `Requires €30.00 minimum`;
                deliveryEligibilityText.classList.add('text-error');
                deliveryEligibilityText.classList.remove('text-on-surface-variant');
            }
        } else {
            modeDeliveryRadio.disabled = false;
            modeDeliveryRadio.classList.remove('cursor-not-allowed');
            modeDeliveryLabel.classList.remove('opacity-50');
            modeDeliveryLabel.classList.add('hover:bg-surface');
            
            if(deliveryEligibilityText) {
                deliveryEligibilityText.innerHTML = `Unlocked. Ships immediately.`;
                deliveryEligibilityText.classList.remove('text-error');
                deliveryEligibilityText.classList.add('text-on-surface-variant');
            }
        }
    
        function updateCheckoutUI() {
            const isDelivery = modeDeliveryRadio.checked;
            
            if (!isDelivery) {
                if (logisticsText) logisticsText.innerText = 'Local Pickup';
                if (logisticsVal) logisticsVal.innerText = '€0.00';
                
                if (warningBlock) {
                    warningBlock.style.display = 'flex';
                    warningBlock.classList.remove('bg-primary-container/20', 'border-primary-container/30');
                    warningBlock.classList.add('bg-secondary-container/20', 'border-secondary-container/30');
                    const icon = warningBlock.querySelector('span');
                    if(icon) {
                        icon.innerText = 'info';
                        icon.className = 'material-symbols-outlined text-secondary';
                    }
                }
                
                if (warningTextBlock) {
                    if (total < 30) {
                        const diff = (30 - total).toFixed(2);
                        warningTextBlock.innerHTML = `
                            <p class="text-xs font-bold text-on-secondary-fixed-variant">Local Pickup Selected</p>
                            <p class="text-[11px] text-on-secondary-fixed-variant/80">Add €${diff} more to your cart to unlock Free Home Delivery.</p>
                        `;
                    } else {
                        warningTextBlock.innerHTML = `
                            <p class="text-xs font-bold text-on-secondary-fixed-variant">Local Pickup Selected</p>
                            <p class="text-[11px] text-on-secondary-fixed-variant/80">You have opted to pick up your order in-store.</p>
                        `;
                    }
                }
                
                if (deliveryFields) deliveryFields.style.display = 'none';
                checkoutBtn.disabled = false;
                checkoutBtn.classList.remove('cursor-not-allowed', 'opacity-50', 'bg-outline');
                checkoutBtn.classList.add('bg-primary');
                checkoutBtn.innerText = 'অর্ডার কনফার্ম করুন (পিকআপ)';
                
                const fDateLabel = document.getElementById('fulfillment-date-label');
                if (fDateLabel) fDateLabel.innerText = "পিকআপের তারিখ";
            } else {
                if (logisticsText) logisticsText.innerText = 'Home Delivery';
                if (logisticsVal) logisticsVal.innerText = 'Free';
                
                if (warningBlock) {
                     warningBlock.style.display = 'flex';
                     warningBlock.classList.remove('bg-secondary-container/20', 'border-secondary-container/30');
                     warningBlock.classList.add('bg-primary-container/20', 'border-primary-container/30');
                     const icon = warningBlock.querySelector('span');
                     if(icon) {
                        icon.innerText = 'local_shipping';
                        icon.className = 'material-symbols-outlined text-primary';
                     }
                }
                
                if (warningTextBlock) {
                    warningTextBlock.innerHTML = `
                        <p class="text-xs font-bold text-on-primary-fixed-variant">Free Home Delivery Selected</p>
                        <p class="text-[11px] text-on-primary-fixed-variant/80">Your order qualifies for fast, free courier dispatch.</p>
                    `;
                }
                
                if (deliveryFields) deliveryFields.style.display = 'block';
                checkoutBtn.disabled = false;
                checkoutBtn.classList.remove('cursor-not-allowed', 'opacity-50', 'bg-outline');
                checkoutBtn.classList.add('bg-primary');
                checkoutBtn.innerText = 'অর্ডার কনফার্ম করুন (ডেলিভারি)';
                
                const fDateLabel = document.getElementById('fulfillment-date-label');
                if (fDateLabel) fDateLabel.innerText = "ডেলিভারির তারিখ";
            }
            
            document.getElementById('total-val').innerText = '€' + total.toFixed(2);
        }
        
        modePickupRadio.onchange = updateCheckoutUI;
        modeDeliveryRadio.onchange = updateCheckoutUI;
        updateCheckoutUI();
    }
}

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart(document.getElementById('cart-items-container'));
};

window.updateCartQty = (id, newQty) => {
    let qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty = qty;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart(document.getElementById('cart-items-container'));
    }
};

function setupCheckout() {
    const fulfillmentDate = document.getElementById('fulfillment-date');
    if (fulfillmentDate) {
        const today = new Date().toISOString().split('T')[0];
        fulfillmentDate.setAttribute('min', today);
    }

    const btn = document.getElementById('checkout-btn');
    if (!btn) return;
    
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Frontend Auth Verification
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                alert("You must be logged in to place an order. Redirecting to login side...");
                window.location.href = '/login.html';
                return;
            }
        }
        
        const modeDeliveryRadio = document.getElementById('mode-delivery');
        const isDelivery = modeDeliveryRadio ? modeDeliveryRadio.checked : false;
        
        const payload = {
            customer: document.getElementById('fname').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            date: document.getElementById('fulfillment-date').value,
            address: isDelivery ? document.getElementById('address').value : 'Pickup in Store',
            items: cart,
            total: document.getElementById('total-val').innerText.replace('€', ''),
            deliveryMode: isDelivery ? 'Home Delivery' : 'Local Pickup'
        };
        
        if (!payload.date || !payload.customer || !payload.email || (isDelivery && !payload.address)) {
            alert("Please fill all required details, including Fulfillment Date.");
            return;
        }
        
        btn.innerText = "Processing...";
        btn.disabled = true;
        
        try {
            // Validate session
            let user_id = null;
            if (window.supabaseClient) {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    user_id = session.user.id;
                } else {
                    alert("Please log in to complete your checkout.");
                    window.location.href = '/login.html';
                    return;
                }
            } else {
                console.error("Supabase client is not loaded.");
                alert("Critical error: Database connection unavailable.");
                btn.innerText = "Proceed to Checkout";
                btn.disabled = false;
                return;
            }

            const { data: orderData, error: orderError } = await window.supabaseClient
                .from('orders')
                .insert([
                    {
                        user_id: user_id,
                        total_amount: parseFloat(payload.total),
                        status: 'pending_delivery',
                        delivery_info: {
                            customer: payload.customer,
                            email: payload.email,
                            phone: payload.phone,
                            date: payload.date,
                            address: payload.address,
                            delivery_mode: payload.deliveryMode
                        }
                    }
                ])
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert Order Items
            const itemsToInsert = payload.items.map(item => ({
                order_id: orderData.id,
                product_id: item.id.toString(),
                product_name: item.name,
                quantity: parseInt(item.qty, 10),
                price: parseFloat(item.price)
            }));

            const { error: itemsError } = await window.supabaseClient
                .from('order_items')
                .insert(itemsToInsert);
                
            if (itemsError) throw itemsError;

            cart = [];
            localStorage.setItem('cart', '[]');
            
            // Show modal then print automatically
            const modal = document.querySelector('.fixed.inset-0.z-\\[100\\]');
            if (modal) {
                modal.classList.remove('hidden');
                const orderText = modal.querySelector('p');
                if (orderText) orderText.innerText = `Your requisition is being processed. Order ID: ${orderData.id.split('-')[0]}.`;
            }
            setTimeout(() => {
                window.print();
                window.location.href = '/index.html';
            }, 2000);

        } catch(e) { 
            console.error(e); 
            alert("Checkout failed: " + (e.message || "Please try again."));
            btn.innerText = "Proceed to Checkout";
            btn.disabled = false;
        }
    });
}
