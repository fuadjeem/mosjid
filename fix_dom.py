import re

# Fix admin.html
with open('admin.html', 'r') as f:
    text = f.read()

if 'id="login-btn"' not in text:
    text = re.sub(r'(<button[^>]*class="[^"]*from-primary[^>]*)(>)', r'\1 id="login-btn"\2', text)
    with open('admin.html', 'w') as f:
        f.write(text)

# Fix inventory.html
with open('inventory.html', 'r') as f:
    text = f.read()

if 'id="add-product-btn"' not in text:
    text = re.sub(r'(<button[^>]*class="[^"]*from-primary[^>]*)(>.*?Add New Product)', r'\1 id="add-product-btn"\2', text, flags=re.DOTALL)

text = re.sub(r'<tbody class="divide-y divide-surface-container-low">.*?</tbody>', r'<tbody id="inventory-table-body" class="divide-y divide-surface-container-low"></tbody>', text, flags=re.DOTALL)

with open('inventory.html', 'w') as f:
    f.write(text)

# Fix orders.html
with open('orders.html', 'r') as f:
    text = f.read()

text = re.sub(r'<tbody class="divide-y divide-surface-container-low">.*?</tbody>', r'<tbody id="orders-table-body" class="divide-y divide-surface-container-low"></tbody>', text, flags=re.DOTALL)

with open('orders.html', 'w') as f:
    f.write(text)
