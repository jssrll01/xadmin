const CLOUD = 'bvw3okdf';

export async function uploadToCloudinary(file, preset = 'xmarket_reviews') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json();
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

// Backward compatibility helper for any old components
export async function uploadImage(file) {
  return uploadToCloudinary(file, 'xmarket_products');
}

// Upload with real progress (browser upload events). Same preset as uploadImage().
export function uploadImageWithProgress(file, onProgress, preset = 'xmarket_products') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch (err) { /* non-JSON reply */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url);
      else reject(new Error((data.error && data.error.message) || 'Upload failed (' + xhr.status + ')'));
    };
    xhr.onerror = () => reject(new Error('Network error. Check your connection and retry.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Retry.'));
    xhr.send(fd);
  });
}
