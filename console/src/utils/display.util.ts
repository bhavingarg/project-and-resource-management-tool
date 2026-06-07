const BORDER_TOP = '╔══════════════════════════════════════════════╗';
const BORDER_BOTTOM = '╚══════════════════════════════════════════════╝';
const SIDE = '║';
const DIVIDER = '──────────────────────────────────────────────';

const LEFT_PADDING = '    ';
const PANEL_INNER_WIDTH = 46;
const CONTENT_WIDTH = PANEL_INNER_WIDTH - LEFT_PADDING.length;

const SECTION_TITLE_PREFIX = '── ';

const padLine = (text: string): string => {
    const content = text.padEnd(CONTENT_WIDTH).slice(0, CONTENT_WIDTH);
    return `${SIDE}${LEFT_PADDING}${content}${SIDE}`;
};

export const display = {
    header(...lines: string[]): void {
        console.log(BORDER_TOP);
        for (const line of lines) {
            console.log(padLine(line));
        }
        console.log(BORDER_BOTTOM);
    },

    divider(): void {
        console.log(DIVIDER);
    },

    sectionTitle(title: string): void {
        const trailingDashes = '─'.repeat(
            Math.max(0, PANEL_INNER_WIDTH - SECTION_TITLE_PREFIX.length - title.length - 1),
        );
        console.log(`\n${SECTION_TITLE_PREFIX}${title} ${trailingDashes}`);
    },
};

export const formatDateTime = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year}  ${hours}:${minutes}`;
};
