import re

# Update index.html
with open('index.html', 'r') as f:
    idx = f.read()

# Replace the static grid with an empty dynamic grid
grid_start = idx.find('<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">')
if grid_start != -1:
    grid_end = idx.find('</main>')
    # We replace from grid_start to grid_end-1 with our container
    new_idx = idx[:grid_start] + '<div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"></div>\n' + idx[grid_end:]
    # Add script
    new_idx = new_idx.replace('</body>', '<script src="/js/app.js"></script>\n</body>')
    with open('index.html', 'w') as f:
        f.write(new_idx)


# Update cart.html
with open('cart.html', 'r') as f:
    cart = f.read()

# Add IDs to form inputs
cart = cart.replace('placeholder="Johnathan Curator"', 'id="fname" placeholder="Johnathan Curator"')
cart = cart.replace('placeholder="+31 6 12345678"', 'id="phone" placeholder="+31 6 12345678"')
cart = cart.replace('placeholder="curator@precision.com"', 'id="email" placeholder="curator@precision.com"')
cart = cart.replace('placeholder="Suite 404', 'id="address" placeholder="Suite 404')

cart = cart.replace('<span class="text-on-surface font-semibold">€187.00</span>', '<span id="subtotal-val" class="text-on-surface font-semibold">€0.00</span>')
cart = cart.replace('<span class="font-extrabold text-primary">€199.50</span>', '<span id="total-val" class="font-extrabold text-primary">€0.00</span>')

# Modify the cart items container
# It starts at: <div class="space-y-4"> just above Product Row 1
old_cart_items_start = cart.find('<div class="space-y-4">')
if old_cart_items_start != -1:
    end_of_cart_items = cart.find('<!-- Total Warning Logic -->')
    new_cart = cart[:old_cart_items_start] + '<div id="cart-items-container" class="space-y-4"></div>\n' + cart[end_of_cart_items:]
    
    # Modify checkout button
    btn_str = '<button class="w-full mt-6 py-4 rounded-xl bg-outline text-surface-container-lowest font-bold text-sm uppercase tracking-widest cursor-not-allowed opacity-50 flex items-center justify-center gap-2" disabled="">'
    new_cart = new_cart.replace(btn_str, '<button id="checkout-btn" class="w-full mt-6 py-4 rounded-xl bg-primary text-white font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2">')
    
    # Warning block ID
    new_cart = new_cart.replace('<!-- Warning Block: Minimum Order -->\n<div class="bg-secondary-container/20', '<!-- Warning Block: Minimum Order -->\n<div id="min-order-warning" class="bg-secondary-container/20')
    
    new_cart = new_cart.replace('</head>', '<link rel="stylesheet" href="/css/print.css" />\n</head>')
    new_cart = new_cart.replace('</body>', '<script src="/js/app.js"></script>\n</body>')
    with open('cart.html', 'w') as f:
        f.write(new_cart)
