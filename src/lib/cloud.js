const CLOUD = 'bvw3okdf';
const PRESET = 'xmarket_unsigned';
const FOLDER = 'Xmarket/Products';

function shrink(file, max = 1200) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', await shrink(file));
  fd.append('upload_preset', PRESET);
  fd.append('folder', FOLDER);
  const r = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD + '/image/upload', { method: 'POST', body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'Upload failed');
  return j.secure_url;
}
