import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../constants';
import * as storage from '../lib/storage';
import type { AIProvider, AISettings, ChildProfile, WeeklyMenu } from '../types';

interface AppState {
  ready: boolean;
  profile: ChildProfile;
  settings: AISettings;
  menus: WeeklyMenu[];
  apiKeys: Record<AIProvider, string>;
  updateProfile: (profile: ChildProfile) => Promise<void>;
  updateSettings: (settings: AISettings) => Promise<void>;
  updateApiKey: (provider: AIProvider, key: string) => Promise<void>;
  addMenu: (menu: WeeklyMenu) => Promise<void>;
  deleteMenu: (id: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<ChildProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const menusRef = useRef<WeeklyMenu[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({ claude: '', openai: '' });

  useEffect(() => {
    (async () => {
      const [p, s, m, claude, openai] = await Promise.all([
        storage.loadProfile(),
        storage.loadSettings(),
        storage.loadMenus(),
        storage.loadApiKey('claude'),
        storage.loadApiKey('openai'),
      ]);
      setProfile(p);
      setSettings(s);
      menusRef.current = m;
      setMenus(m);
      setApiKeys({ claude, openai });
      setReady(true);
    })();
  }, []);

  const updateProfile = useCallback(async (next: ChildProfile) => {
    setProfile(next);
    await storage.saveProfile(next);
  }, []);

  const updateSettings = useCallback(async (next: AISettings) => {
    setSettings(next);
    await storage.saveSettings(next);
  }, []);

  const updateApiKey = useCallback(async (provider: AIProvider, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key.trim() }));
    await storage.saveApiKey(provider, key);
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
    () => ({
      ready,
      profile,
      settings,
      menus,
      apiKeys,
      updateProfile,
      updateSettings,
      updateApiKey,
      addMenu,
      deleteMenu,
    }),
    [ready, profile, settings, menus, apiKeys, updateProfile, updateSettings, updateApiKey, addMenu, deleteMenu],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
