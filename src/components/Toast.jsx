import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext({ show: () => {} });

/* ------------------------------------------------------------
   useToast — ALWAYS returns an object with a callable .show()
   ------------------------------------------------------------ */
export function useToast() {
  return useContext(ToastContext);
}

/* ------------------------------------------------------------
   ToastProvider — mounts the toast container + provides context
   ------------------------------------------------------------ */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------
   ToastContainer — pure render, no hooks that return non-fns
   ------------------------------------------------------------ */
function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
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
  );
}

export default ToastProvider;
