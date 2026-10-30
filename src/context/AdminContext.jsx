import { setDbSystem } from '../supabase';
import React from "react";
import { createContext, useContext, useState } from 'react';

const AdminContext = createContext();

export function AdminProvider({ children }) {
  // Default to XMARKET, but allows switching to YUELIN
  const [activeSystem, setSys] = useState('XMARKET');
  const setActiveSystem = (v) => { try { localStorage.setItem('xadmin_system', v); } catch (e) { /* ignore */ } setSys(v); };
  setDbSystem(activeSystem); 

  return (
    <AdminContext.Provider value={{ activeSystem, setActiveSystem }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  return useContext(AdminContext);
}
