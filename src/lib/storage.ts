import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PROFILE } from '../constants';
import type { ChildProfile, WeeklyMenu } from '../types';

const KEYS = {
  profile: 'carely.profile',
  menus: 'carely.menus',
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
