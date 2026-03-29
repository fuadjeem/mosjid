import pandas as pd
import requests

inventory = [
    # Fish
    ("ফলি মাছ", "Fish", 6.0),
    ("সর পুটি", "Fish", 6.0),
    ("ইলিশ পিস আস্ত (বড়)", "Fish", 20.0),
    ("ইলিশ পিস কাটা (বড়)", "Fish", 25.0),
    ("ইলিশ পিস (ছোট)", "Fish", 7.0),
    ("ইলিশ কেজি (ছোট)", "Fish", 12.0),
    ("ইলিশের ডিম", "Fish", 9.0),
    ("পাংগাস মাছ", "Fish", 5.0),
    ("শিং মাছ", "Fish", 6.0),
    ("পাবদা", "Fish", 6.5),
    ("বাশপাতা", "Fish", 4.5),
    ("বাতাসী", "Fish", 3.5),
    ("টেংরা 500gm", "Fish", 6.5),
    ("টেংরা ছোট", "Fish", 3.5),
    ("কাচকি", "Fish", 3.0),
    ("রুই মাছ কেজি", "Fish", 6.0),
    ("চিংড়ি 26/30", "Fish", 12.0),
    ("চিংড়ি 21/25", "Fish", 12.0),
    ("চিংড়ি 16/20", "Fish", 12.0),
    ("চিংড়ি 8/12", "Fish", 12.0),
    ("চিংড়ি 800gm", "Fish", 12.0),
    ("হরিনা চিংড়ি 500gm", "Fish", 5.0),
    ("হরিনা চিংড়ি 250gm", "Fish", 3.0),
    ("রুপচাঁদা কেজি/প্যাকেট", "Fish", 10.0),
    ("পোয়া", "Fish", 5.0),
    ("পুটি কেজি", "Fish", 5.0),
    ("বাটা", "Fish", 6.0),
    ("কৈই", "Fish", 6.0),
    ("মলা", "Fish", 3.5),
    ("কাতলা কেজি", "Fish", 6.0),
    ("মেনি", "Fish", 6.0),
    ("নলা", "Fish", 5.0),
    ("গুড়া বাইল্যা", "Fish", 3.0),
    ("বাইল্যা", "Fish", 6.0),
    ("টাকি", "Fish", 6.0),
    ("পাতা বাইন", "Fish", 4.0),
    ("লইট্যা মাছ", "Fish", 6.0),
    ("চেপা শুটকি", "Fish", 3.0),
    ("তেলাপিয়া", "Fish", 4.0),
    ("চিড়িং মাছ", "Fish", 6.0),
    ("বাছা", "Fish", 5.5),
    ("মিক্স মাছ", "Fish", 3.5),
    ("ঘুতুম মাছ", "Fish", 4.0),
    ("কাচকি শুটকি", "Fish", 4.0),
    ("লইট্যা শুটকি", "Fish", 5.5),

    # Frozen
    ("শিক কাবাব", "Frozen", 12.0),
    ("পোয়া পিঠা", "Frozen", 4.0),
    ("ভাপা পিঠা", "Frozen", 4.0),
    ("হার্ড চিকেন", "Frozen", 6.0),
    ("আলুর চপ", "Frozen", 3.0),
    ("Eis (ছোট)", "Frozen", 1.0),
    ("Magnum Eis", "Frozen", 2.0),
    ("শক্ত মুরগি 1200gm", "Frozen", 6.0),
    ("শক্ত মুরগি 800gm", "Frozen", 3.5),
    ("চিতল পিঠা", "Frozen", 4.0),
    ("পরটা 20pc Mughol", "Frozen", 7.0),
    ("পরটা 20pc Hamza", "Frozen", 6.0),
    ("পরটা 30pc", "Frozen", 9.0),
    ("পরটা ছোট", "Frozen", 2.5),
    ("পরটা 5pc(আলু,ডাল,পেঁয়াজ)", "Frozen", 2.5),
    ("সিম বিচি", "Frozen", 3.0),
    ("লতি", "Frozen", 3.0),
    ("পটল", "Frozen", 3.0),
    ("জলপাই", "Frozen", 3.0),
    ("কাঁকরোল", "Frozen", 3.0),
    ("সমূচা", "Frozen", 7.0),
    ("সিঙ্গারা", "Frozen", 5.0),
    ("সিঙ্গারা (ছোট)", "Frozen", 3.0),
    ("ডাল/আলু পুরি", "Frozen", 3.0),
    ("তন্দুরি নান", "Frozen", 4.0),
    ("জাম", "Frozen", 4.0),
    ("খেজুরের গুড়", "Frozen", 6.0),
    ("খেজুরের গুড় 500gm", "Frozen", 4.0),
    ("লাউ প্যাক", "Frozen", 5.0),
    ("শাপলা", "Frozen", 2.5),

    # Masala
    ("কালাভুনা/রেজালা/মেজ্জবানি/শাহী/চটপটি/বিফ মশলা", "Masala", 2.0),
    ("হালিম মিক্স রাধুনি/BD", "Masala", 3.0),
    ("মরিচ/ হলুদ/ ধনিয়া/ গরম মসলা 100gm", "Masala", 1.5),
    ("মরিচ/হলুদ/জিড়া গুড়া 400gm", "Masala", 4.5),
    ("দারচিনি 200gm", "Masala", 4.0),
    ("দারচিনি 50gm", "Masala", 2.0),
    ("ধনিয়া গুড়া", "Masala", 3.5),
    ("ধনিয়া গুড়া 100gm", "Masala", 1.5),
    ("এলাচি", "Masala", 4.0),
    ("আদা", "Masala", 3.5),
    ("তেজপাতা", "Masala", 3.0),
    ("পাচফোড়ন", "Masala", 2.0),
    ("রাধুনি গরু মসলা", "Masala", 2.0),
    ("Tandoori Chicken", "Masala", 3.0),
    ("Biryani Chicken", "Masala", 2.5),
    ("Ginger Garlic Paste", "Masala", 7.0),
    ("লং / লবঙ্গ", "Masala", 2.5),
    ("গোল মরিচ", "Masala", 2.0),
    ("শুকনা মরিচ 100gm", "Masala", 3.0),

    # Dry Food
    ("তেতুল চাটনী(BD Food)", "Dry Food", 3.0),
    ("চালের গুড়া 1/2 Kg", "Dry Food", 3.5),
    ("ছোলা 1kg", "Dry Food", 3.0),
    ("ডাল ভাজা", "Dry Food", 1.0),
    ("মটর ভাজা", "Dry Food", 1.0),
    ("মুড়ির মোয়া", "Dry Food", 1.5),
    ("নোনতা/নারকেল বিস্কুট", "Dry Food", 4.0),
    ("খিচুরি মিক্স", "Dry Food", 4.0),
    ("মসুর ডাল (800gm)", "Dry Food", 2.5),
    ("মসুর ডাল 1 kg", "Dry Food", 3.0),
    ("মসুর ডাল 2 kg", "Dry Food", 5.5),
    ("বুটের ডাল", "Dry Food", 5.0),
    ("চা পাতা 1 kg", "Dry Food", 12.0),
    ("চা পাতা 400gm", "Dry Food", 5.0),
    ("চা পাতা(PG 300 tea bags)", "Dry Food", 14.0),
    ("চিপস", "Dry Food", 1.0),
    ("সরিষার তেল (বড়)", "Dry Food", 7.0),
    ("সরিষার তেল (ছোট)", "Dry Food", 4.0),
    ("চানাচুর 300gm", "Dry Food", 3.0),
    ("চানাচুর 140gm", "Dry Food", 1.5),
    ("মুড়ি 500gm", "Dry Food", 3.5),
    ("মুড়ি ছোট", "Dry Food", 2.0),
    ("ড্রাই কেক", "Dry Food", 4.0),
    ("মিস্টি টোস্ট", "Dry Food", 3.5),
    ("বনফুল/মুড়ি টোস্ট", "Dry Food", 3.0),
    ("টোস্ট", "Dry Food", 3.5),
    ("Nido", "Dry Food", 8.5),
    ("Tang", "Dry Food", 7.0),
    ("বেসন", "Dry Food", 4.0),
    ("ছোলা(চনাবুট) 2 kg", "Dry Food", 6.0),
    ("চটপটি মটর", "Dry Food", 3.0),
    ("চিড়া", "Dry Food", 2.0),
    ("সেমাই", "Dry Food", 2.0),
    ("মুগডাল 2 kg", "Dry Food", 6.0),
    ("চাল (কালিজিরা)", "Dry Food", 6.0),
    ("চাল (চিনি গুড়া) 1 kg", "Dry Food", 2.5),
    ("চাল 5 kg", "Dry Food", 12.0),
    ("চাল 10 kg", "Dry Food", 25.0),
    ("চাল 18 kg", "Dry Food", 48.0),
    ("চাল 20 kg", "Dry Food", 52.0),
    ("খেজুর", "Dry Food", 3.0),
    ("Mango Pulp", "Dry Food", 4.0),
    ("Rooh Afza", "Dry Food", 4.0),
    ("ইসবগুলের ভুষি", "Dry Food", 3.0),
    ("কাসুন্দি", "Dry Food", 4.0)
]

# Write to Excel
df = pd.DataFrame(inventory, columns=['Name', 'Category', 'Price'])
df.to_excel('grocereylist/grocereylist.xlsx', index=False)
print("Excel file created at grocereylist/grocereylist.xlsx")

# Delete existing via API
print("Deleting existing products...")
base_url = 'http://localhost:8788/api/products'
headers = {
    'Authorization': 'Bearer admin'
}
try:
    requests.delete(f"{base_url}?id=all", headers=headers)
    print("Deleted all older products.")
except Exception as e:
    print(f"Delete error: {e}")

# Insert new via API
import time
for i, item in enumerate(inventory):
    data = {
        "name": item[0],
        "category": item[1],
        "price": item[2],
        "stock": "50",
        "expiry": "",
        "status": "Available"
    }
    try:
        res = requests.post(base_url, json=data, headers=headers)
        if res.status_code == 200:
            print(f"Added {item[0]}")
        else:
            print(f"Failed to add {item[0]}: {res.status_code} {res.text}")
    except Exception as e:
        print(f"Add error: {e}")
    time.sleep(0.05) # rate limit a tiny bit for stability

print("Done inserting products.")
