/**
 * Shared Supabase Storage Upload Helper
 * Handles file validation, unique naming, and uploading to 'product-images' bucket.
 */

async function handleImageUpload(file, urlInput, statusElement) {
    if (!file) return null;
    if (!statusElement) console.warn("[Upload] No status element provided.");
    if (!urlInput) console.warn("[Upload] No URL input field provided.");

    // 1. Validation
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        alert("❌ File too large. Max size is 2MB.");
        return null;
    }

    if (!file.type.startsWith('image/')) {
        alert("❌ Only image files are allowed.");
        return null;
    }

    // 2. Prepare UI
    if (statusElement) {
        statusElement.innerText = "Uploading...";
        statusElement.classList.remove('hidden', 'text-error');
        statusElement.classList.add('text-primary');
    }

    try {
        // 3. Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // 4. Upload to Supabase Storage
        const { data, error } = await window.supabaseClient.storage
            .from('product-images')
            .upload(filePath, file);

        if (error) throw error;

        // 5. Get Public URL
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // 6. Update UI
        if (urlInput) {
            urlInput.value = publicUrl;
            // Trigger input event if any listeners exist
            urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (statusElement) {
            statusElement.innerText = "✅ Upload complete!";
            setTimeout(() => statusElement.classList.add('hidden'), 3000);
        }

        console.log("[Upload] Success:", publicUrl);
        return publicUrl;

    } catch (err) {
        console.error("[Upload] Failed:", err);
        if (statusElement) {
            statusElement.innerText = "❌ Upload failed: " + err.message;
            statusElement.classList.remove('text-primary');
            statusElement.classList.add('text-error');
        }
        alert("❌ Upload failed: " + err.message);
        return null;
    }
}

// Attach to window for global access
window.handleImageUpload = handleImageUpload;
