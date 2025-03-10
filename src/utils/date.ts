export function convertDateFormat(date: Date) {
    const formattedDate = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    return formattedDate
}
