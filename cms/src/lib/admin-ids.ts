function slugPart(value: string, max = 24): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
}

export function buildScheduleId(
  stageId: string,
  date: string,
  startTime: string,
  artist: string,
): string {
  return `${stageId}-${date}-${startTime}-${slugPart(artist)}`;
}

export function buildAutographId(
  stageId: string,
  date: string,
  startTime: string,
  artist: string,
): string {
  return `auto-${stageId}-${date}-${startTime}-${slugPart(artist)}`;
}

export function buildFoodcourtId(): string {
  return `fc-${Date.now()}`;
}

export function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) {
    return base;
  }
  let i = 2;
  while (existing.has(`${base}-${i}`)) {
    i += 1;
  }
  return `${base}-${i}`;
}
