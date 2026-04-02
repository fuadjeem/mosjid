import os
import re

html_files = [
    "admin-news.html", "admin.html", "cart.html", "index.html", "inventory.html",
    "login.html", "news.html", "order_dashboard.html", "orders.html",
    "privacy.html", "profile.html", "register.html", "reset-password.html"
]

# Pattern for tailwind script with SRI (integrity and crossorigin)
# We want to keep the src but remove integrity and crossorigin.
tailwind_pattern = re.compile(
    r'(<script src="https://cdn.tailwindcss.com\?plugins=forms,container-queries")\s*integrity="[^"]*"\s*crossorigin="[^"]*"',
    re.MULTILINE
)

# Pattern for secrets.js to config.js
secrets_pattern = re.compile(r'js/secrets.js')

for filename in html_files:
    if not os.path.exists(filename):
        continue
    
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove SRI from tailwind
    new_content = tailwind_pattern.sub(r'\1', content)
    
    # Fix script reference
    new_content = secrets_pattern.sub('js/config.js', new_content)
    
    # Also clean up any extra spaces or broken tags from previous attempts
    new_content = re.sub(r'<script src="https://cdn.tailwindcss.com\?plugins=forms,container-queries"\s*>\s*</script>', 
                         r'<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>', 
                         new_content)

    with open(filename, 'w') as f:
        f.write(new_content)
    print(f"Fixed {filename}")
