import re

# Update admin.html (Login)
with open('admin.html', 'r') as f:
    admin = f.read()

# Make sure it uses admin.js and the inputs have correct IDs
admin = admin.replace('name="email"', 'id="admin-email" name="email"')
admin = admin.replace('name="password"', 'id="password" name="password"')
admin = admin.replace('type="submit"', 'id="login-btn" type="button"')
admin = admin.replace('</form>', '</form>\n<script src="/js/admin.js"></script>')

with open('admin.html', 'w') as f:
    f.write(admin)


# Update inventory.html
with open('inventory.html', 'r') as f:
    inv = f.read()

tbody_start = inv.find('<tbody class="divide-y divide-surface-container-high/50">')
if tbody_start != -1:
    tbody_start += len('<tbody class="divide-y divide-surface-container-high/50">')
    tbody_end = inv.find('</tbody>', tbody_start)
    inv = inv[:tbody_start] + '\n<!-- Dynamic content injected here -->\n' + inv[tbody_end:]

# Replace the tbody with id parameter
inv = inv.replace('<tbody class="divide-y divide-surface-container-high/50">', '<tbody id="inventory-table-body" class="divide-y divide-surface-container-high/50">')

# Modify Add Product Button
inv = inv.replace('<button class="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(37,99,235,0.5)] active:scale-95 transition-all title-sm font-bold">', '<button id="add-product-btn" class="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(37,99,235,0.5)] active:scale-95 transition-all title-sm font-bold">')

# Add the Add Product Modal at the end and the script tag
modal_html = """
<div id="add-product-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-surface-container-lowest rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-outline-variant/20">
        <div class="px-6 py-4 border-b border-surface-container-high flex justify-between items-center">
            <h2 class="text-xl font-bold text-on-surface">Add New Product</h2>
            <button id="close-modal-btn" class="text-on-surface-variant hover:text-on-surface transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="p-6 space-y-4">
            <div><label class="block text-xs font-bold text-on-surface-variant mb-1">Product Name</label><input type="text" id="prod-name" class="w-full bg-surface-container p-3 rounded-xl border border-transparent focus:border-primary/30 outline-none text-sm font-semibold transition-all"></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-on-surface-variant mb-1">Category</label><input type="text" id="prod-cat" class="w-full bg-surface-container p-3 rounded-xl border border-transparent focus:border-primary/30 outline-none text-sm font-semibold transition-all"></div>
                <div><label class="block text-xs font-bold text-on-surface-variant mb-1">Price (€)</label><input type="number" id="prod-price" step="0.01" class="w-full bg-surface-container p-3 rounded-xl border border-transparent focus:border-primary/30 outline-none text-sm font-semibold transition-all"></div>
            </div>
             <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-on-surface-variant mb-1">Stock</label><input type="number" id="prod-stock" class="w-full bg-surface-container p-3 rounded-xl border border-transparent focus:border-primary/30 outline-none text-sm font-semibold transition-all"></div>
                <div><label class="block text-xs font-bold text-on-surface-variant mb-1">Expiry Date</label><input type="date" id="prod-expiry" class="w-full bg-surface-container p-3 rounded-xl border border-transparent focus:border-primary/30 outline-none text-sm font-semibold transition-all"></div>
            </div>
            <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" id="prod-status" checked class="w-4 h-4 rounded text-primary focus:ring-primary">
                <label class="text-sm font-bold text-on-surface">Available for Sale</label>
            </div>
        </div>
        <div class="px-6 py-4 bg-surface-container border-t border-surface-container-high flex justify-end gap-3">
            <button id="cancel-modal-btn" class="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface hover:bg-surface-container-high transition-colors">Cancel</button>
            <button id="save-product-btn" class="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm">Save Product</button>
        </div>
    </div>
</div>
"""

inv = inv.replace('</body>', f'{modal_html}\n<script src="/js/admin.js"></script>\n</body>')
with open('inventory.html', 'w') as f:
    f.write(inv)


# Update orders.html
with open('orders.html', 'r') as f:
    ord_str = f.read()

# Find tbody and replace
tbody_start = ord_str.find('<tbody class="divide-y divide-surface-container-high/50">')
if tbody_start != -1:
    tbody_start += len('<tbody class="divide-y divide-surface-container-high/50">')
    tbody_end = ord_str.find('</tbody>', tbody_start)
    ord_str = ord_str[:tbody_start] + '\n<!-- Dynamic content injected here -->\n' + ord_str[tbody_end:]

ord_str = ord_str.replace('<tbody class="divide-y divide-surface-container-high/50">', '<tbody id="orders-table-body" class="divide-y divide-surface-container-high/50">')

# Replace Complete button for visual parity
# Actually we stripped it out and it will be re-injected by JS.

ord_str = ord_str.replace('</body>', '<script src="/js/admin.js"></script>\n</body>')
with open('orders.html', 'w') as f:
    f.write(ord_str)
