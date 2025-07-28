export function toDateString(date: string | Date): string {
    if (typeof date === 'string') {
        return date.slice(0, 10);
    } else if (date instanceof Date) {
        return date.toISOString().slice(0, 10);
    }
    throw new Error('Invalid date type');
}

export function formatDateDDMMYY(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}
