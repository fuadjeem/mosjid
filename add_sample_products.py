import urllib.request
import json

products = [
    {
        "name": "Premium Basmati Rice",
        "category": "Grocery",
        "price": "15.99",
        "stock": "50",
        "expiry": "2026-12-31",
        "status": "Available"
    },
    {
        "name": "Fresh Alphonso Mangoes (1kg)",
        "category": "Produce",
        "price": "8.50",
        "stock": "20",
        "expiry": "2026-04-03", # Expiring in 5 days
        "status": "Available"
    },
    {
        "name": "Organic Coconut Milk",
        "category": "Dairy",
        "price": "3.20",
        "stock": "100",
        "expiry": "2025-01-15", # Already expired
        "status": "Unavailable"
    },
    {
        "name": "Authentic Garam Masala Blend",
        "category": "Spices",
        "price": "5.49",
        "stock": "0",
        "expiry": "2028-05-20",
        "status": "Unavailable"
    }
]

url = 'http://localhost:8788/api/products'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-validated-token'
}

for p in products:
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as res:
            print("Added", p['name'], res.getcode())
    except Exception as e:
        print("Error adding", p['name'], e)
