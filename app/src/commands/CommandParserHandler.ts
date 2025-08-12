export class CommandParseHandler {
    static isAddChannelCommand(messageText: string): boolean {
        if (!messageText) return false;
        const lower = messageText.toLowerCase();
        const addChannelPhrases = [
            "add channel",
            "register channel",
            "add this channel",
            "register this channel",
            "add current channel",
            "register current channel",
            "add this room",
            "register this room",
            "add room",
            "register room",
        ];
        return addChannelPhrases.some((phrase) => lower.includes(phrase));
    }

    static isReceiptCommand(messageText: string): boolean {
        if (!messageText) return false;

        const lowerText = messageText.toLowerCase();
        const keywords = [
            "receipt",
            "receipts",
            "show",
            "list",
            "display",
            "my receipts",
            "room receipts",
            "thread receipts",
            "add channel",
            "help",
            "date",
            "yesterday",
            "today",
            "spending",
            "total",
            "export",
            "search",
            "find",
        ];

        return keywords.some((keyword) => lowerText.includes(keyword));
    }

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
