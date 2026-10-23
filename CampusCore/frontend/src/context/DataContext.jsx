import React, { createContext, useContext } from 'react';
import { useData } from '../hooks/useData';

const DataContext = createContext();

export const DataProvider = ({ children, onLogout, role }) => {
  const data = useData(onLogout, role);
  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => useContext(DataContext);
