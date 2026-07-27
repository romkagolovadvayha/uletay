import { useState } from 'react';
import { getDefaultFestivalDate } from '../utils/scheduleHelpers';

/**
 * Выбранный день фестиваля, который сбрасывается при смене окна дат
 * (например при включении демо-режима).
 */
export function useFestivalSelectedDate(
  startDate: string,
  endDate: string,
  now: Date,
  initialDate?: string,
): [string, (date: string) => void] {
  const windowKey = `${startDate}:${endDate}`;
  const [selectedDate, setSelectedDate] = useState(
    () => initialDate ?? getDefaultFestivalDate(startDate, endDate, now),
  );
  const [boundWindowKey, setBoundWindowKey] = useState(windowKey);

  if (boundWindowKey !== windowKey) {
    setBoundWindowKey(windowKey);
    setSelectedDate(initialDate ?? getDefaultFestivalDate(startDate, endDate, now));
  }

  return [selectedDate, setSelectedDate];
}
