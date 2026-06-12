const MONTH_ABBREVIATIONS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const INPUT_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isRealDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

export const parseInputDate = (input: string): string | null => {
    const match = input.trim().match(INPUT_DATE_PATTERN);
    if (!match) return null;

    const [, dd, mm, yyyy] = match;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);

    if (!isRealDate(year, month, day)) return null;
    return `${yyyy}-${mm}-${dd}`;
};

export const formatDisplayDate = (isoDate: string): string => {
    const match = isoDate.match(ISO_DATE_PATTERN);
    if (!match) return isoDate;

    const [, yyyy, mm, dd] = match;
    const monthLabel = MONTH_ABBREVIATIONS[Number(mm) - 1] ?? mm;
    return `${dd}-${monthLabel}-${yyyy.slice(2)}`;
};

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toIsoString = (date: Date): string => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const getCurrentWeekMonday = (): string => {
    const now = new Date();
    const daysSinceMonday = (now.getUTCDay() + 6) % DAYS_PER_WEEK;
    return toIsoString(new Date(now.getTime() - daysSinceMonday * MS_PER_DAY));
};

export const getLastWeekMonday = (): string => {
    const now = new Date();
    const daysSinceMonday = (now.getUTCDay() + 6) % DAYS_PER_WEEK;
    const thisMonday = new Date(now.getTime() - daysSinceMonday * MS_PER_DAY);
    return toIsoString(new Date(thisMonday.getTime() - DAYS_PER_WEEK * MS_PER_DAY));
};
