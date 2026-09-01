export const servicePermissions = {
  view: 'view', create: 'create', edit: 'edit', delete: 'delete', settings: 'manageSettings',
} as const;

export const normalizeMinutes = (value: unknown, fallback = 30) => {
  const minutes = Math.round(Number(value));
  return Number.isFinite(minutes) && minutes >= 5 && minutes <= 1440 ? minutes : fallback;
};

export const normalizeIntervals = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const validTime = (time: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''));
  return value.map((item: any) => ({start:String(item?.start || ''),end:String(item?.end || '')}))
    .filter((item) => validTime(item.start) && validTime(item.end) && item.start < item.end)
    .sort((a, b) => a.start.localeCompare(b.start));
};

export const intervalsOverlap = (intervals: Array<{start:string;end:string}>) =>
  intervals.some((item, index) => index > 0 && item.start < intervals[index - 1].end);

