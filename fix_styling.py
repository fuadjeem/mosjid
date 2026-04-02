import os
import re

html_files = [
    "admin-news.html", "admin.html", "cart.html", "index.html", "inventory.html",
    "login.html", "news.html", "order_dashboard.html", "orders.html",
    "privacy.html", "profile.html", "register.html", "reset-password.html"
]

tailwind_full = """<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" 
          integrity="sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb" 
          crossorigin="anonymous"></script>"""

supabase_full = """<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"
          integrity="sha384-0VpB0wAYDdhWCEv3+IjT0Z9Kgpvszkf70RFX3ro7l4QR5nywxsMaOpmvZKsfRF8I"
          crossorigin="anonymous"></script>"""

# Pattern for fragmented tailwind script
tailwind_pattern = re.compile(r'<script src="https://cdn.tailwindcss.com\?plugins=forms,container-queries"\s*[^>]*>\s*</script>', re.DOTALL)
# Pattern for supabase script without integrity or with old integrity
supabase_pattern = re.compile(r'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"[^>]*></script>')

for filename in html_files:
    if not os.path.exists(filename):
        continue
    
    with open(filename, 'r') as f:
        content = f.read()
    
    # Replace broken tailwind
    new_content = tailwind_pattern.sub(tailwind_full, content)
    
    # Replace supabase with standard full version
    new_content = supabase_pattern.sub(supabase_full, new_content)
    
    with open(filename, 'w') as f:
        f.write(new_content)
    print(f"Fixed {filename}")
