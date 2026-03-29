import urllib.request
import json
import time

url = 'http://localhost:8788/api/products'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-validated-token'
}

print("1. Deleting all existing products...")
delete_url = url + "?id=all"
req_del = urllib.request.Request(delete_url, headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req_del) as res:
        print("Delete response:", res.read().decode('utf-8'))
except Exception as e:
    print("Error deleting products:", e)

print("2. Uploading new products from grocery_data.json...")
with open("grocery_data.json", "r", encoding="utf-8") as f:
    products = json.load(f)

for p in products:
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as res:
            print("Added", p['name'], "->", res.getcode())
    except Exception as e:
        print("Error adding", p['name'], "->", e)

print(f"Successfully uploaded {len(products)} products!")
