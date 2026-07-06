import AsyncStorage from '@react-native-async-storage/async-storage';
import { autographSessions } from '../data/autographs';
import { foodCourtVendors } from '../data/foodcourt';
import { festivalRules } from '../data/festivalRules';
import { getDefaultMapData } from '../data/festivalMap';
import { festivalInfo, schedulePerformances, stages } from '../data/schedule';
import { AppData } from '../types';
import { normalizeAppData, withDefaultStages } from '../utils/appDataNormalize';

const STORAGE_KEY = '@uletay_app_data_v1';

export const defaultAppData: AppData = normalizeAppData({
  festival: festivalInfo,
  stages: withDefaultStages(stages),
  schedule: schedulePerformances,
  autographs: autographSessions,
  foodcourt: foodCourtVendors,
  rules: festivalRules,
  ...getDefaultMapData(),
});

export function mergeStoredAppData(parsed: Partial<AppData>): AppData {
  return normalizeAppData({
    ...defaultAppData,
    ...parsed,
    festival: { ...defaultAppData.festival, ...parsed.festival },
    stages: parsed.stages?.length ? parsed.stages : defaultAppData.stages,
    schedule: parsed.schedule?.length ? parsed.schedule : defaultAppData.schedule,
    autographs: parsed.autographs?.length ? parsed.autographs : defaultAppData.autographs,
    foodcourt:
      parsed.foodcourt?.length && parsed.foodcourt.every((item) => 'priceFrom' in item)
        ? parsed.foodcourt
        : defaultAppData.foodcourt,
    rules: parsed.rules?.length ? parsed.rules : defaultAppData.rules,
  });
}

export async function loadAppData(): Promise<AppData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultAppData;
    }
    return mergeStoredAppData(JSON.parse(stored) as Partial<AppData>);
  } catch {
    return defaultAppData;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function resetAppData(): Promise<AppData> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return defaultAppData;
}
