import re
import os

files = ['index.html', 'cart.html', 'admin.html', 'inventory.html', 'orders.html']

for f in files:
    if not os.path.exists(f):
        continue
        
    with open(f, 'r') as file:
        content = file.read()
        
    # Standard <a>Text</a> links (like TopNavBar)
    content = re.sub(r'<a([^>]+)href="#"([^>]*>\s*Admin\s*</a>)', r'<a\1href="/admin.html"\2', content, flags=re.IGNORECASE)
    
    if f in ['admin.html', 'inventory.html', 'orders.html']:
        content = re.sub(r'<a([^>]+)href="#"([^>]*>\s*Products\s*</a>)', r'<a\1href="/inventory.html"\2', content, flags=re.IGNORECASE)
    else:
        content = re.sub(r'<a([^>]+)href="#"([^>]*>\s*Products\s*</a>)', r'<a\1href="/index.html"\2', content, flags=re.IGNORECASE)
        
    content = re.sub(r'<a([^>]+)href="#"([^>]*>\s*Orders\s*</a>)', r'<a\1href="/orders.html"\2', content, flags=re.IGNORECASE)
    content = re.sub(r'<a([^>]+)href="#"([^>]*>\s*Dashboard\s*</a>)', r'<a\1href="/inventory.html"\2', content, flags=re.IGNORECASE)

    # Sidebar links that have <span> inside <a>
    content = re.sub(r'<a([^>]+)href="#"((?:(?!</a>).)*?>\s*Inventory\s*</span>\s*</a>)', r'<a\1href="/inventory.html"\2', content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'<a([^>]+)href="#"((?:(?!</a>).)*?>\s*Orders\s*</span>\s*</a>)', r'<a\1href="/orders.html"\2', content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'<a([^>]+)href="#"((?:(?!</a>).)*?>\s*Products\s*</span>\s*</a>)', r'<a\1href="/inventory.html"\2', content, flags=re.IGNORECASE | re.DOTALL)
    
    # Optional: Analytics
    content = re.sub(r'<a([^>]+)href="#"((?:(?!</a>).)*?>\s*Analytics\s*</span>\s*</a>)', r'<a\1href="/inventory.html"\2', content, flags=re.IGNORECASE | re.DOTALL)

    with open(f, 'w') as file:
        file.write(content)
    print(f"Updated {f}")
