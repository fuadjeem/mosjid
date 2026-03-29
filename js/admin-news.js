let allNews = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin.html';
        return;
    }
    
    loadNews();
    
    document.getElementById('add-news-btn').addEventListener('click', () => {
        document.getElementById('news-id').value = '';
        document.getElementById('news-title').value = '';
        document.getElementById('news-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('news-content').value = '';
        document.getElementById('modal-title').innerText = 'Add Announcement';
        document.getElementById('add-news-modal').classList.remove('hidden');
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('add-news-modal').classList.add('hidden');
    });
    
    document.getElementById('cancel-modal-btn').addEventListener('click', () => {
        document.getElementById('add-news-modal').classList.add('hidden');
    });
    
    document.getElementById('save-news-btn').addEventListener('click', saveNews);
});

async function loadNews() {
    try {
        const res = await fetch('/api/news');
        allNews = await res.json();
        renderNews(allNews);
    } catch (e) {
        console.error("Failed to load news", e);
        document.getElementById('news-grid').innerHTML = '<p class="col-span-full">Failed to load news</p>';
    }
}

function renderNews(newsList) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    
    if (newsList.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-outline">No announcements found. Add one to see it here.</div>';
        return;
    }
    
    newsList.forEach(news => {
        const card = document.createElement('div');
        card.className = "bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm flex flex-col gap-3";
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <h3 class="font-bold text-lg text-on-surface tracking-tight">${news.title}</h3>
                <span class="text-xs font-semibold px-2 py-1 rounded bg-surface-container-high text-on-surface-variant">${new Date(news.date).toLocaleDateString()}</span>
            </div>
            <p class="text-sm text-on-surface-variant flex-grow line-clamp-3">${news.content}</p>
            <div class="flex gap-2 pt-2 border-t border-surface-container-high mt-2">
                <button class="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors" onclick="editNews('${news.id}')">Edit</button>
                <button class="text-xs font-bold text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors" onclick="deleteNews('${news.id}')">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function editNews(id) {
    const news = allNews.find(n => n.id === id);
    if (!news) return;
    
    document.getElementById('news-id').value = news.id;
    document.getElementById('news-title').value = news.title;
    document.getElementById('news-date').value = news.date;
    document.getElementById('news-content').value = news.content;
    document.getElementById('modal-title').innerText = 'Edit Announcement';
    document.getElementById('add-news-modal').classList.remove('hidden');
}

async function saveNews() {
    const id = document.getElementById('news-id').value;
    const title = document.getElementById('news-title').value;
    const date = document.getElementById('news-date').value;
    const content = document.getElementById('news-content').value;
    
    if (!title || !date || !content) {
        alert("Please fill in all fields.");
        return;
    }
    
    const token = sessionStorage.getItem('adminToken');
    const payload = { title, date, content };
    let method = 'POST';
    if (id) {
        payload.id = id;
        method = 'PUT';
    }
    
    try {
        const res = await fetch('/api/news', {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            document.getElementById('add-news-modal').classList.add('hidden');
            loadNews();
        } else {
            console.error("Save failed");
            alert("Failed to save announcement.");
        }
    } catch(e) {
        console.error(e);
    }
}

async function deleteNews(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    const token = sessionStorage.getItem('adminToken');
    try {
        const res = await fetch('/api/news?id=' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (res.ok) {
            loadNews();
        } else {
            alert('Failed to delete.');
        }
    } catch(e) {
        console.error(e);
    }
}
