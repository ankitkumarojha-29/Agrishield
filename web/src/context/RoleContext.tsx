import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

export type UserRole = 'farmer' | 'admin';

export const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80";

interface RoleContextType {
  role: UserRole;
  userName: string;
  userPhone: string;
  avatarUrl: string;
  setRole: (newRole: UserRole) => Promise<void>;
  toggleRole: () => Promise<void>;
  setAvatarUrl: (url: string) => void;
  loadingRoleSwitch: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('user_role');
    return (saved === 'admin' || saved === 'ADMIN') ? 'admin' : 'farmer';
  });

  const [userName, setUserName] = useState<string>(() => {
    const savedRole = localStorage.getItem('user_role');
    if (savedRole === 'admin' || savedRole === 'ADMIN') return 'Administrator';
    const name = localStorage.getItem('farmer_name') || 'किसान भाई (Farmer)';
    const phone = localStorage.getItem('farmer_phone') || '';
    return phone ? `${name} (${phone})` : name;
  });

  const [userPhone, setUserPhone] = useState<string>(() => {
    return localStorage.getItem('farmer_phone') || '';
  });

  const [avatarUrl, setAvatarUrlState] = useState<string>(() => {
    const saved = localStorage.getItem('user_avatar');
    if (saved && !saved.includes('TEST_')) return saved;
    return DEFAULT_AVATAR;
  });

  const [loadingRoleSwitch] = useState(false);

  const setAvatarUrl = (url: string) => {
    const validUrl = (url && !url.includes('TEST_')) ? url : DEFAULT_AVATAR;
    setAvatarUrlState(validUrl);
    localStorage.setItem('user_avatar', validUrl);
    window.dispatchEvent(new Event('avatarChanged'));
  };

  useEffect(() => {
    const syncUser = async () => {
      const savedRole = localStorage.getItem('user_role');
      const curRole = (savedRole === 'admin' || savedRole === 'ADMIN') ? 'admin' : 'farmer';
      setRoleState(curRole);

      const savedAvatar = localStorage.getItem('user_avatar');
      if (savedAvatar && !savedAvatar.includes('TEST_')) {
        setAvatarUrlState(savedAvatar);
      } else {
        localStorage.removeItem('user_avatar');
        setAvatarUrlState(DEFAULT_AVATAR);
      }

      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const meRes = await api.getMe();
          if (meRes?.success && meRes?.data) {
            const user = meRes.data;
            if (user.avatar_url && !user.avatar_url.includes('TEST_')) {
              setAvatarUrlState(user.avatar_url);
              localStorage.setItem('user_avatar', user.avatar_url);
            } else {
              setAvatarUrlState(DEFAULT_AVATAR);
              localStorage.removeItem('user_avatar');
            }
            if (user.role === 'admin' || user.role === 'ADMIN') {
              setRoleState('admin');
              setUserName(user.name || 'Administrator');
              localStorage.setItem('user_role', 'admin');
            } else {
              setRoleState('farmer');
              const name = user.name || 'किसान (Farmer)';
              const ph = user.phone || '';
              setUserPhone(ph);
              setUserName(ph ? `${name} (${ph})` : name);
              localStorage.setItem('user_role', 'farmer');
              if (ph) localStorage.setItem('farmer_phone', ph);
              if (user.name) localStorage.setItem('farmer_name', user.name);
            }
          }
        } catch {
          if (curRole === 'admin') {
            setUserName('Administrator');
          } else {
            const n = localStorage.getItem('farmer_name') || 'किसान भाई (Farmer)';
            const p = localStorage.getItem('farmer_phone') || '';
            setUserName(p ? `${n} (${p})` : n);
          }
        }
      }
    };

    const handleAvatarChanged = () => {
      const saved = localStorage.getItem('user_avatar');
      if (saved) setAvatarUrlState(saved);
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('roleChange', syncUser);
    window.addEventListener('avatarChanged', handleAvatarChanged);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('roleChange', syncUser);
      window.removeEventListener('avatarChanged', handleAvatarChanged);
    };
  }, []);

  const switchRole = async (targetRole: UserRole) => {
    setRoleState(targetRole);
    localStorage.setItem('user_role', targetRole);
    api.invalidateCache();
    window.dispatchEvent(new Event('roleChange'));
  };

  const toggleRole = async () => {
    await switchRole(role === 'farmer' ? 'admin' : 'farmer');
  };

  return (
    <RoleContext.Provider value={{
      role,
      userName,
      userPhone,
      avatarUrl,
      setRole: switchRole,
      toggleRole,
      setAvatarUrl,
      loadingRoleSwitch
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useUserRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useUserRole must be used within a RoleProvider');
  }
  return ctx;
}
