import os

# Update index.html
with open('index.html', 'r') as f:
    content = f.read()
    
content = content.replace('<a href="/login.html"><span class="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary transition-colors">account_circle</span></a>', '<a href="/login.html" id="user-nav-icon"><span class="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary transition-colors">account_circle</span></a>')

with open('index.html', 'w') as f:
    f.write(content)

# Update cart.html
with open('cart.html', 'r') as f:
    content = f.read()

nav_replace = """<a class="text-slate-500 hover:text-slate-900 transition-all duration-200" href="/index.html">Home</a>
<a class="text-blue-700 font-semibold border-b-2 border-blue-700 pb-1" href="/cart.html">Cart</a>
<a class="text-slate-500 hover:text-slate-900 transition-all duration-200" href="/login.html">My Orders</a>"""

nav_original = """<a class="text-slate-500 hover:text-slate-900 transition-all duration-200" href="/index.html">Home</a>
<a class="text-blue-700 font-semibold border-b-2 border-blue-700 pb-1" href="/cart.html">Cart</a>
<a class="text-slate-500 hover:text-slate-900 transition-all duration-200" href="/admin.html">Admin</a>
<a class="text-slate-500 hover:text-slate-900 transition-all duration-200" href="/index.html">Products</a>
<a class="text-slate-500 hover:text-slate-900 transition-all duration-200" href="/orders.html">Orders</a>"""

content = content.replace(nav_original, nav_replace)

profile_original = """<button class="active:scale-95 cursor-pointer p-2 hover:bg-slate-100/50 rounded-full">
<span class="material-symbols-outlined text-slate-700">account_circle</span>
</button>"""

idx_last = content.rfind(profile_original)
if idx_last != -1:
    content = content[:idx_last] + """<a href="/login.html" id="user-nav-icon" class="active:scale-95 cursor-pointer p-2 hover:bg-slate-100/50 rounded-full flex items-center">
<span class="material-symbols-outlined text-slate-700">account_circle</span>
</a>""" + content[idx_last+len(profile_original):]

with open('cart.html', 'w') as f:
    f.write(content)

print('Done')
