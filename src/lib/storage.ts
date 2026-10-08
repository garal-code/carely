import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../constants';
import type { AIProvider, AISettings, ChildProfile, WeeklyMenu } from '../types';

const KEYS = {
  profile: 'carely.profile',
  settings: 'carely.settings',
  menus: 'carely.menus',
};

const API_KEY_NAMES: Record<AIProvider, string> = {
  claude: 'carely.apiKey.claude',
  openai: 'carely.apiKey.openai',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export const loadProfile = () => readJson<ChildProfile>(KEYS.profile, DEFAULT_PROFILE);
export const saveProfile = (profile: ChildProfile) =>
  AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));

export const loadSettings = () => readJson<AISettings>(KEYS.settings, DEFAULT_SETTINGS);
export const saveSettings = (settings: AISettings) =>
  AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));

export async function loadMenus(): Promise<WeeklyMenu[]> {
  const raw = await AsyncStorage.getItem(KEYS.menus);
  if (!raw) return [];
  try {
    const menus = JSON.parse(raw);
    return Array.isArray(menus) ? menus : [];
  } catch {
    return [];
  }
}
export const saveMenus = (menus: WeeklyMenu[]) =>
  AsyncStorage.setItem(KEYS.menus, JSON.stringify(menus));

// Las claves de API se guardan cifradas en el dispositivo. SecureStore no
// existe en web, así que en la vista previa web se usa AsyncStorage.
const useSecureStore = Platform.OS !== 'web';

export async function loadApiKey(provider: AIProvider): Promise<string> {
  const name = API_KEY_NAMES[provider];
  const value = useSecureStore
    ? await SecureStore.getItemAsync(name)
    : await AsyncStorage.getItem(name);
  return value ?? '';
}

export async function saveApiKey(provider: AIProvider, value: string): Promise<void> {
  const name = API_KEY_NAMES[provider];
  const trimmed = value.trim();
  if (useSecureStore) {
    if (trimmed) await SecureStore.setItemAsync(name, trimmed);
    else await SecureStore.deleteItemAsync(name);
  } else if (trimmed) {
    await AsyncStorage.setItem(name, trimmed);
  } else {
    await AsyncStorage.removeItem(name);
  }
}
