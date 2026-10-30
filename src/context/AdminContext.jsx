import React from "react";
import { createContext, useContext, useState } from 'react';

const AdminContext = createContext();

export function AdminProvider({ children }) {
  // Default to XMARKET, but allows switching to YUELIN
  const [activeSystem, setActiveSystem] = useState('XMARKET'); 

  return (
    <AdminContext.Provider value={{ activeSystem, setActiveSystem }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  return useContext(AdminContext);
}
