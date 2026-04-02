let allNews = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    // Wait for auth.js to finish admin check if it hasn't already
    let isAdmin = window.userIsAdmin;
    if (session && !isAdmin) {
        // Re-verify if auth.js hasn't set it yet
        const { data } = await window.supabaseClient
            .from('admin_users')
            .select('email')
            .eq('email', session.user.email.toLowerCase().trim())
            .maybeSingle();
        isAdmin = !!data;
    }
    
    if (!isAdmin) {
        window.location.href = 'admin.html';
        return;
    }
    
    setupNewsImageUpload();
    loadNews();
    
    document.getElementById('add-news-btn').addEventListener('click', () => {
        document.getElementById('news-id').value = '';
        document.getElementById('news-title').value = '';
        document.getElementById('news-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('news-imageurl').value = '';
        document.getElementById('news-content').value = '';
        updateModalPreview(null); // Clear preview for new post
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

async function setupNewsImageUpload() {
    const newsFileInput = document.getElementById('news-image-file');
    if (newsFileInput) {
        newsFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const urlInput = document.getElementById('news-imageurl');
            const status = document.getElementById('news-upload-status');
            const saveBtn = document.getElementById('save-news-btn');
            
            if (typeof handleImageUpload === 'function') {
                if(saveBtn) { 
                    saveBtn.disabled = true;
                    saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
                
                const publicUrl = await handleImageUpload(file, urlInput, status);
                
                if (publicUrl) {
                    updateModalPreview(publicUrl);
                }
                
                if(saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            } else {
                console.error("handleImageUpload helper not found");
            }
        });
    }

    // Add manual entry support for preview
    document.getElementById('news-imageurl')?.addEventListener('input', (e) => {
        updateModalPreview(e.target.value);
    });
}

async function loadNews() {
    try {
        const { data, error } = await window.supabaseClient
            .from('news')
            .select('*')
            .order('date', { ascending: false });
            
        if (error) throw error;
        
        allNews = data || [];
        renderNews(allNews);
    } catch (e) {
        console.error("Failed to load news", e);
        document.getElementById('news-grid').innerHTML = '<p class="col-span-full text-center text-error py-12">Failed to load news from Supabase.</p>';
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
        card.className = "bg-surface-container-lowest overflow-hidden rounded-2xl border border-surface-container shadow-sm flex flex-col hover:shadow-md transition-all group";
        
        const imageHtml = news.image_url ? `
            <div class="w-full h-32 overflow-hidden bg-slate-100">
                <img src="${news.image_url}" class="w-full h-full object-cover transition-transform group-hover:scale-105" alt="${escapeHTML(news.title)}">
            </div>
        ` : `
            <div class="w-full h-24 bg-slate-50 flex items-center justify-center text-slate-300">
                <span class="material-symbols-outlined text-3xl">image</span>
            </div>
        `;
        
        card.innerHTML = `
            ${imageHtml}
            <div class="p-6 flex flex-col gap-3">
                <div class="flex justify-between items-start gap-4">
                    <h3 class="font-bold text-sm text-on-surface tracking-tight line-clamp-1">${escapeHTML(news.title)}</h3>
                    <span class="text-[9px] font-bold px-2 py-1 rounded bg-surface-container-high text-on-surface-variant whitespace-nowrap">${new Date(news.date).toLocaleDateString()}</span>
                </div>
                <p class="text-xs text-on-surface-variant flex-grow line-clamp-2 leading-relaxed">${escapeHTML(news.content)}</p>
                <div class="flex gap-2 pt-3 border-t border-surface-container-high mt-1">
                    <button class="text-[10px] font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors border border-primary/10" onclick="editNews('${news.id}')">Edit</button>
                    <button class="text-[10px] font-bold text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors border border-error/10" onclick="deleteNews('${news.id}')">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateModalPreview(url) {
    const previewContainer = document.getElementById('news-image-preview-container');
    const previewImg = document.getElementById('news-image-preview');
    if (!previewContainer || !previewImg) return;
    
    if (url) {
        previewImg.src = url;
        previewContainer.classList.remove('hidden');
    } else {
        previewImg.src = '';
        previewContainer.classList.add('hidden');
    }
}

function editNews(id) {
    const news = allNews.find(n => n.id === id);
    if (!news) return;
    
    document.getElementById('news-id').value = news.id;
    document.getElementById('news-title').value = news.title;
    document.getElementById('news-date').value = news.date;
    document.getElementById('news-imageurl').value = news.image_url || '';
    document.getElementById('news-content').value = news.content;
    
    updateModalPreview(news.image_url);
    
    document.getElementById('modal-title').innerText = 'Edit Announcement';
    document.getElementById('add-news-modal').classList.remove('hidden');
}

async function saveNews() {
    const id = document.getElementById('news-id').value;
    const title = document.getElementById('news-title').value;
    const date = document.getElementById('news-date').value;
    const imageUrl = document.getElementById('news-imageurl').value;
    const content = document.getElementById('news-content').value;
    
    if (!title || !date || !content) {
        alert("Please fill in all fields.");
        return;
    }
    
    const payload = { 
        title, 
        date, 
        content, 
        image_url: imageUrl || null 
    };

    if (id) {
        payload.id = id;
    }
    
    try {
        const { data, error } = await window.supabaseClient
            .from('news')
            .upsert(payload);
            
        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
        
        document.getElementById('add-news-modal').classList.add('hidden');
        loadNews();
        alert(id ? "Announcement updated!" : "Announcement added!");
    } catch(e) {
        console.error(e);
        alert("Failed to save announcement: " + (e.message || "Unknown error"));
    }
}

async function deleteNews(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('news')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        loadNews();
    } catch(e) {
        console.error(e);
        alert('Failed to delete: ' + (e.message || "Unknown error"));
    }
}
