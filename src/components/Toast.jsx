import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = (msg, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  };
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div key={t.id} className="page-enter" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 14,
            background: 'var(--surface)', boxShadow: 'var(--neu-float)',
            fontSize: 13.5, fontWeight: 700, minWidth: 260,
          }}>
            {t.kind === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
            {t.kind === 'error'   && <AlertCircle size={18} color="var(--danger)" />}
            {t.kind === 'info'    && <Info size={18} color="var(--primary)" />}
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
