import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_PROFILE } from '../constants';
import * as storage from '../lib/storage';
import type { ChildProfile, WeeklyMenu } from '../types';

interface AppState {
  ready: boolean;
  profile: ChildProfile;
  menus: WeeklyMenu[];
  updateProfile: (profile: ChildProfile) => Promise<void>;
  addMenu: (menu: WeeklyMenu) => Promise<void>;
  deleteMenu: (id: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<ChildProfile>(DEFAULT_PROFILE);
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const menusRef = useRef<WeeklyMenu[]>([]);

  useEffect(() => {
    (async () => {
      const [p, m] = await Promise.all([storage.loadProfile(), storage.loadMenus()]);
      setProfile(p);
      menusRef.current = m;
      setMenus(m);
      setReady(true);
    })();
  }, []);

  const updateProfile = useCallback(async (next: ChildProfile) => {
    setProfile(next);
    await storage.saveProfile(next);
  }, []);

  const commitMenus = useCallback(async (next: WeeklyMenu[]) => {
    menusRef.current = next;
    setMenus(next);
    await storage.saveMenus(next);
  }, []);

  const addMenu = useCallback(
    (menu: WeeklyMenu) => commitMenus([menu, ...menusRef.current]),
    [commitMenus],
  );

  const deleteMenu = useCallback(
    (id: string) => commitMenus(menusRef.current.filter((m) => m.id !== id)),
    [commitMenus],
  );

  const value = useMemo(
    () => ({ ready, profile, menus, updateProfile, addMenu, deleteMenu }),
    [ready, profile, menus, updateProfile, addMenu, deleteMenu],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
