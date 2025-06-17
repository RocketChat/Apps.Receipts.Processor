export function toDateString(date: string | Date): string {
    if (typeof date === 'string') {
        return date.slice(0, 10);
    } else if (date instanceof Date) {
        return date.toISOString().slice(0, 10);
    }
    throw new Error('Invalid date type');
}
