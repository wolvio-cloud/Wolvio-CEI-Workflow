'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, UserProfile, USERS } from '@/lib/config/roles';

interface RoleContextType {
  activeUser: UserProfile;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<UserProfile>(USERS.FINANCE_CONTROLLER);

  useEffect(() => {
    const savedRole = localStorage.getItem('wolvio_demo_role') as Role;
    if (savedRole && USERS[savedRole]) {
      setActiveUser(USERS[savedRole]);
    }
  }, []);

  const setRole = (role: Role) => {
    setActiveUser(USERS[role]);
    localStorage.setItem('wolvio_demo_role', role);
  };

  return (
    <RoleContext.Provider value={{ activeUser, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
