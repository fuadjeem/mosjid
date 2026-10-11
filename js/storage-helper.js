/**
 * Shared Supabase Storage Upload Helper
 * Handles file validation, client-side resizing, unique naming, and uploading
 * to the 'product-images' bucket.
 */

const MAX_UPLOAD_DIMENSION = 1000; // px, longest side
const UPLOAD_JPEG_QUALITY = 0.8;

// Resize/compress an image file in the browser via <canvas> before upload,
// so camera photos (often several MB) end up as small JPEGs.
function resizeImageFile(file, maxDimension, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.onload = (e) => { img.src = e.target.result; };

        img.onerror = () => reject(new Error("Could not decode the selected image."));
        img.onload = () => {
            let { width, height } = img;
            if (width > height && width > maxDimension) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
            } else if (height > maxDimension) {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error("Image compression failed.")); return; }
                const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'photo';
                resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
            }, 'image/jpeg', quality);
        };

        reader.readAsDataURL(file);
    });
}

async function handleImageUpload(file, urlInput, statusElement) {
    if (!file) return null;
    if (!statusElement) console.warn("[Upload] No status element provided.");
    if (!urlInput) console.warn("[Upload] No URL input field provided.");

    // 1. Validation (generous cap — resizing below handles the real size reduction)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
        alert("❌ File too large. Max size is 20MB.");
        return null;
    }

    if (!file.type.startsWith('image/')) {
        alert("❌ Only image files are allowed.");
        return null;
    }

    // 2. Prepare UI
    if (statusElement) {
        statusElement.innerText = "Compressing...";
        statusElement.classList.remove('hidden', 'text-error');
        statusElement.classList.add('text-primary');
    }

    try {
        // 3. Resize/compress client-side before upload
        const uploadFile = await resizeImageFile(file, MAX_UPLOAD_DIMENSION, UPLOAD_JPEG_QUALITY);

        if (statusElement) statusElement.innerText = "Uploading...";

        // 4. Generate unique filename
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
        const filePath = `uploads/${fileName}`;

        // 5. Upload to Supabase Storage
        const { data, error } = await window.supabaseClient.storage
            .from('product-images')
            .upload(filePath, uploadFile);

        if (error) throw error;

        // 6. Get Public URL
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // 7. Update UI
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
