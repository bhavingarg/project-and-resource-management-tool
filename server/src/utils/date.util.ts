const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getLastWeekMonday = (): string => {
    const now = new Date();
    const daysSinceMonday = (now.getUTCDay() + 6) % DAYS_PER_WEEK;
    const thisMonday = new Date(now.getTime() - daysSinceMonday * MS_PER_DAY);
    const lastMonday = new Date(thisMonday.getTime() - DAYS_PER_WEEK * MS_PER_DAY);
    return lastMonday.toISOString().slice(0, 10);
};

/** Returns how many full UTC days have elapsed since `isoDate` (YYYY-MM-DD). */
export const getDaysSinceDate = (isoDate: string): number => {
    const target = new Date(`${isoDate}T00:00:00Z`);
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Math.floor((todayUtc.getTime() - target.getTime()) / MS_PER_DAY);
};
