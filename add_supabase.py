import os

files = ['index.html', 'cart.html', 'login.html', 'register.html', 'reset-password.html']

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Inject Supabase CDN
    if '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>' not in content:
        content = content.replace('</head>', '    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>')
    
    # Inject auth.js if missing
    if '<script src="/js/auth.js"></script>' not in content:
        content = content.replace('</body>', '    <script src="/js/auth.js"></script>\n</body>')
    
    with open(f, 'w') as file:
        file.write(content)
    print(f"Updated {f}")
