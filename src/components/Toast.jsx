import React, { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const show = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setList((p) => [...p.slice(-3), { id, message, type }]);
    setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {list.length > 0 && (
        <div className="xa-toasts" role="status" aria-live="polite">
          {list.map((t) => (
            <div key={t.id} className={'xa-toast ' + t.type}>
              <span>{t.message}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setList((p) => p.filter((x) => x.id !== t.id))}>✕</button>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}
export default ToastProvider;
