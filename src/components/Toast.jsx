import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

// Default fallback — used if no provider is mounted
const FALLBACK = {
  show: (msg, type = 'info') => console.log(`[Toast ${type}]`, msg),
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx || typeof ctx.show !== 'function') {
    console.warn('[useToast] No ToastProvider found — using fallback');
    return FALLBACK;
  }
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, toasts }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            style={{
              pointerEvents: 'auto',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
              background:
                t.type === 'error'   ? '#EF4444' :
                t.type === 'success' ? '#10B981' :
                t.type === 'warn'    ? '#F59E0B' :
                                       '#2563EB',
              cursor: 'pointer',
              maxWidth: '80vw',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Default export so both `import Toast from` and `import { useToast } from` work
export default ToastProvider;
