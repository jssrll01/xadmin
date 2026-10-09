import React, { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const show = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setList((p) => [...p, { id, message, type }]);
    setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {list.length > 0 && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
          zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
          {list.map((t) => (
            <div key={t.id} style={{ padding:'10px 16px', borderRadius:12, fontSize:13,
              fontWeight:700, color:'#fff',
              background: t.type==='error' ? '#EF4444' : t.type==='success' ? '#10B981' : '#2563EB' }}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}
export default ToastProvider;
