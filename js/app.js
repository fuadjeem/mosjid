document.addEventListener('DOMContentLoaded', () => {
    // 1. If on index page
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        loadProducts(productGrid);
        loadLatestNews(); // Fetch latest announcement for homepage
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
    
    // 3. Load More setup
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            window.visibleCount += 20;
            renderProductGrid(productGrid, window.filteredProducts || window.allProducts);
        });
    }
});


let cart = JSON.parse(localStorage.getItem('cart') || '[]');

window.allProducts = [];
window.filteredProducts = [];
window.visibleCount = 20;

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

async function loadLatestNews() {
    const container = document.getElementById('latest-news-container');
    if (!container || !window.supabaseClient) return;

    try {
        const { data: news, error } = await window.supabaseClient
            .from('news')
            .select('*')
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (error || !news) {
            container.classList.add('hidden');
            return;
        }

        const safeTitle = escapeHTML(news.title);
        container.innerHTML = `
            <div class="group relative bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden max-w-full" onclick="window.location.href='news.html'">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                    <div class="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0"></span>
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">সর্বশেষ সংবাদ</span>
                        </div>
                        <h2 class="text-base sm:text-lg font-black text-slate-900 group-hover:text-primary transition-colors truncate">${safeTitle}</h2>
                    </div>
                    <a href="news.html" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-primary transition-all shrink-0 sm:w-auto w-full">
                        আরও পড়ুন
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    } catch (e) {
        console.warn("No latest news found or error fetching:", e);
        container.classList.add('hidden');
    }
}

function renderSkeletons(grid) {
    const skeleton = `
        <div class="bg-surface-container-lowest rounded-xl p-6 flex flex-col shadow-sm border border-transparent animate-pulse">
            <div class="w-full h-40 bg-surface-container-high rounded-md mb-4"></div>
            <div class="h-4 bg-surface-container-high rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-surface-container-low rounded w-1/2 mb-4"></div>
            <div class="mt-auto h-10 bg-surface-container-high rounded-lg"></div>
        </div>
    `;
    grid.innerHTML = Array(8).fill(skeleton).join('');
}

async function loadProducts(grid) {
    try {
        if (!window.supabaseClient) {
            console.error("Supabase client not initialized.");
            return;
        }
        
        renderSkeletons(grid);

        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        window.allProducts = products;
        
        setupStorefrontFilters();
        applyFilters();
    } catch (e) {
        console.error("Failed to load products from Supabase", e);
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
        
        html += uniqueCategories.map(cat => {
            const safeCat = escapeHTML(cat);
            return `
            <label class="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" value="${safeCat}" class="category-cb rounded-sm border-outline text-primary focus:ring-primary-container" checked>
                <span class="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">${safeCat}</span>
            </label>
            `;
        }).join('');
        
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

    if (breadcrumb) {
        let path = "Home";
        if (activeCats.length === 1) path += ` <span class="mx-1 text-outline-variant">/</span> ${escapeHTML(activeCats[0])}`;
        else if (activeCats.length > 1 && activeCats.length < cbs.length) path += ` <span class="mx-1 text-outline-variant">/</span> Mixed Categories`;
        else path += ` <span class="mx-1 text-outline-variant">/</span> All Categories`;
        
        if (term) path += ` <span class="mx-1 text-outline-variant">/</span> Search: "${escapeHTML(term)}"`;
        breadcrumb.innerHTML = path;
    }
    
    window.filteredProducts = filtered;
    window.visibleCount = 20; // Reset pagination on data change
    renderProductGrid(grid, filtered);
}

function renderProductGrid(grid, products) {
    if(products.length === 0) {
        grid.innerHTML = '<p class="text-on-surface-variant col-span-full text-center py-8">No products found matching your active filters.</p>';
        const lmContainer = document.getElementById('load-more-container');
        if (lmContainer) lmContainer.classList.add('hidden');
        return;
    }

    const showItems = products.slice(0, window.visibleCount);
    
    const html = showItems.map(p => {
        const safeName = escapeHTML(p.name);
        const safeCat = escapeHTML(p.category);
        const safeId = escapeHTML(p.id);
        const safeImgUrl = escapeHTML(p.image_url);
        
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
            statusTag = `<span class="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">${p.status !== 'Available' || Number(p.stock) === 0 ? 'Out of Stock' : 'Expired'}</span>`;
            cardClass = 'bg-surface-container-low opacity-60 grayscale';
            btnClass = 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70';
            btnText = 'Available Soon';
            btnDisabled = 'disabled';
        } else if (!isNaN(daysDiff) && daysDiff <= 7) {
            statusTag = `<span class="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Warning</span>`;
        }
        
        const imgBlock = safeImgUrl ? 
            `<img src="${safeImgUrl}" alt="${safeName}" class="w-full h-full object-cover" loading="lazy">` : 
            `<span class="material-symbols-outlined text-4xl text-outline border border-dashed border-outline-variant/50 p-6 rounded-lg bg-surface">image</span>`;

        return `
        <div class="${cardClass} rounded-xl p-6 flex flex-col transition-all shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-transparent hover:border-outline-variant/20">
            <div class="w-full h-40 bg-surface-container-high rounded-md mb-4 flex items-center justify-center overflow-hidden">
                ${imgBlock}
            </div>
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-on-surface title-md">${safeName}</h3>
                ${statusTag}
            </div>
            <p class="text-xs text-on-surface-variant mb-4 font-medium italic">${safeCat}</p>
            <div class="mt-auto space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-lg font-extrabold text-on-surface">€${Number(p.price).toFixed(2)}</span>
                    <div class="flex items-center border border-outline-variant/30 rounded-md bg-surface-container-lowest h-8">
                        <button class="px-2 text-outline hover:text-primary transition-colors focus:outline-none" onclick="document.getElementById('qty-${safeId}').stepDown()" ${btnDisabled}>
                            <span class="material-symbols-outlined text-sm font-bold">remove</span>
                        </button>
                        <input type="number" id="qty-${safeId}" value="1" min="1" class="w-8 text-center text-xs font-bold bg-transparent border-none p-0 focus:ring-0" ${btnDisabled}>
                        <button class="px-2 text-outline hover:text-primary transition-colors focus:outline-none" onclick="document.getElementById('qty-${safeId}').stepUp()" ${btnDisabled}>
                            <span class="material-symbols-outlined text-sm font-bold">add</span>
                        </button>
                    </div>
                </div>
                <div>
                    <button class="${btnClass} w-full py-3 text-white rounded-lg text-sm font-bold border-none block" ${btnDisabled} onclick="addToCart('${safeId}', '${safeName.replace(/'/g, "\\'")}', ${p.price})">${btnText}</button>
                </div>
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Toggle Load More button
    const lmContainer = document.getElementById('load-more-container');
    if (lmContainer) {
        if (products.length > window.visibleCount) {
            lmContainer.classList.remove('hidden');
        } else {
            lmContainer.classList.add('hidden');
        }
    }
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
        const safeName = escapeHTML(item.name);
        const safeId = escapeHTML(item.id);
        
        container.innerHTML += `
        <div class="bg-surface-container-lowest p-5 rounded-xl flex gap-6 items-center hover:bg-surface-bright transition-colors mb-4 border border-outline-variant/10">
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-bold text-on-surface leading-none">${safeName}</h3>
                    </div>
                    <span class="text-lg font-bold text-on-surface">€${itemTotal.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-4 mt-4">
                    <div class="flex items-center bg-surface-container rounded-full px-2 py-1 gap-2 border border-outline-variant/20">
                        <span class="pl-2 text-xs font-bold">Qty:</span>
                        <input type="number" min="1" value="${item.qty}" onchange="updateCartQty('${safeId}', this.value)" class="w-12 h-6 text-center text-xs font-bold bg-transparent border-none focus:ring-0 outline-none p-0 inline-block">
                    </div>
                    <button onclick="removeFromCart('${safeId}')" class="text-xs font-medium text-error hover:underline flex items-center gap-1">
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
        
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                const fname = document.getElementById('fname')?.value || '';
                const email = document.getElementById('email')?.value || '';
                alert("You must be logged in to place an order. Redirecting to login side...");
                const params = new URLSearchParams({
                    redirect: 'cart',
                    email: email,
                    name: fname
                });
                window.location.href = `/login.html?${params.toString()}`;
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
            // Validate session (Optional for Guest)
            let user_id = null;
            if (window.supabaseClient) {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    user_id = session.user.id;
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

            // --- DECREMENT STOCK ---
            for (const item of cart) {
                // Fetch current stock to be safe, or just atomic decrement if we had RPC
                // For now, simple update based on loaded data
                const prod = window.allProducts.find(p => p.id === item.id);
                if (prod) {
                    const newStock = Math.max(0, prod.stock - item.qty);
                    await window.supabaseClient
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', item.id);
                }
            }

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
