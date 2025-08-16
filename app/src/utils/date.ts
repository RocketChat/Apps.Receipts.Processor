export function toDateString(date: string | Date): string {
    let d: Date;

    if (date instanceof Date) {
        d = date;
    } else if (typeof date === "string") {
        if (!isNaN(Date.parse(date))) {
            d = new Date(date);
        } else {
            const match = date.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
            if (match) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10);
                const year = parseInt(match[3], 10);
                d = new Date(year, month - 1, day);
            } else {
                d = new Date();
            }
        }
    } else {
        d = new Date();
    }

    if (isNaN(d.getTime())) {
        d = new Date();
    }

    return d.toISOString().slice(0, 10);
}

export function formatDateDDMMYY(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}
