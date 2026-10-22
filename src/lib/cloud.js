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
