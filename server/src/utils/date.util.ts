const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getLastWeekMonday = (): string => {
    const now = new Date();
    const daysSinceMonday = (now.getUTCDay() + 6) % DAYS_PER_WEEK;
    const thisMonday = new Date(now.getTime() - daysSinceMonday * MS_PER_DAY);
    const lastMonday = new Date(thisMonday.getTime() - DAYS_PER_WEEK * MS_PER_DAY);
    return lastMonday.toISOString().slice(0, 10);
};
