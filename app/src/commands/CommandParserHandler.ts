export class CommandParseHandler {
    static extractParams(message: string): any {
        const params: any = {};
        const dateRangeMatch = message.match(
            /from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i
        );

        if (dateRangeMatch) {
            params.startDate = dateRangeMatch[1];
            params.endDate = dateRangeMatch[2];
        } else {
            const dateMatch = message.match(
                /(?:(?:from|for|on)\s+)?(\d{4}-\d{2}-\d{2})/i
            );

            if (dateMatch && dateMatch[1]) {
                params.date = dateMatch[1];
            }
        }

        const searchMatch = message.match(
            /(?:with|for|containing|about)\s+(.+)/i
        );
        if (searchMatch) {
            params.searchTerm = searchMatch[1].trim();
        }

        return Object.keys(params).length > 0 ? params : undefined;
    }
}
