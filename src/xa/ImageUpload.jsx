import React from 'react';
import useUpload from './useUpload.js';
import UploadQueue from './UploadQueue.jsx';

// Single-image uploader: shows progress, speed, cancel and retry, then hands back the URL.
export default function ImageUpload({ preset, onUrl, label = 'Drop an image here or click to choose', maxMB = 8 }) {
  const up = useUpload({ preset, maxMB, concurrency: 1 });
  const single = { ...up, add: (list) => { up.clear(); up.add(Array.from(list || []).slice(0, 1)); } };
  return <UploadQueue upload={single} multiple={false} label={label} onDone={(urls) => onUrl(urls[urls.length - 1])} />;
}
