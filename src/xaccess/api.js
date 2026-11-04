const raw = import.meta.env.VITE_API_URL || '';
export const API_BASE = (raw || 'http://localhost:5000').replace(/\/+$/, '');
export const API_MISSING = !raw && typeof window !== 'undefined' && !/^(localhost|127\.)/.test(window.location.hostname);
