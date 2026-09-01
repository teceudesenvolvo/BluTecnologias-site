"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intervalsOverlap = exports.normalizeIntervals = exports.normalizeMinutes = exports.servicePermissions = void 0;
exports.servicePermissions = {
    view: 'view', create: 'create', edit: 'edit', delete: 'delete', settings: 'manageSettings',
};
const normalizeMinutes = (value, fallback = 30) => {
    const minutes = Math.round(Number(value));
    return Number.isFinite(minutes) && minutes >= 5 && minutes <= 1440 ? minutes : fallback;
};
exports.normalizeMinutes = normalizeMinutes;
const normalizeIntervals = (value) => {
    if (!Array.isArray(value))
        return [];
    const validTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''));
    return value.map((item) => ({ start: String(item?.start || ''), end: String(item?.end || '') }))
        .filter((item) => validTime(item.start) && validTime(item.end) && item.start < item.end)
        .sort((a, b) => a.start.localeCompare(b.start));
};
exports.normalizeIntervals = normalizeIntervals;
const intervalsOverlap = (intervals) => intervals.some((item, index) => index > 0 && item.start < intervals[index - 1].end);
exports.intervalsOverlap = intervalsOverlap;
//# sourceMappingURL=serviceSchedulingPolicy.js.map