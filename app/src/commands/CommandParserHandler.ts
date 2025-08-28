import { CommandParams, CommandParamsBuilder } from "../types/command";

export class CommandParseHandler {
    static extractParams(message: string): CommandParams | undefined {
        const params: CommandParamsBuilder = {};

        const dateRangeMatch = message.match(/from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
        if (dateRangeMatch) {
            params.startDate = dateRangeMatch[1];
            params.endDate = dateRangeMatch[2];
        } else {
            const dateMatch = message.match(/(?:(?:from|for|on)\s+)?(\d{4}-\d{2}-\d{2})/i);
            if (dateMatch && dateMatch[1]) {
                params.date = dateMatch[1];
            }
        }

        const searchMatch = message.match(/(?:with|for|containing|about)\s+(.+)/i);
        if (searchMatch) {
            params.searchTerm = searchMatch[1].trim();
        }

        const currencyMatch = message.match(/currency\s+([A-Za-z]{3})/i);
        if (currencyMatch) {
            params.currency = currencyMatch[1].toUpperCase();
        }

        const createChannelMatch = message.match(/create\s+channel\s+([A-Za-z0-9-_]+)/i);
        if (createChannelMatch) {
            params.name = createChannelMatch[1];
        }

        return Object.keys(params).length > 0 ? (params as CommandParams) : undefined;
    }
}
