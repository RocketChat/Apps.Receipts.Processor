export const COMMAND_TRANSLATION_PROMPT_COMMANDS = `
**Available Commands:**
- "room" - Show all receipts data in current room
- "date" - Show user's receipts from specific date (requires date parameter)
- "date_range" - Show user's receipts within a date range (requires startDate and endDate parameters)
- "thread" - Show all receipts in current thread (must be in thread)
- "thread_user" - Show user's receipts in current thread (must be in thread)
- "add_channel" - Add current room to user's channel list
- "set_room_currency" - Set the currency for the current room (requires currency code, e.g., USD, EUR, JPY)
- "spending_report" - Create a report in PDF Format about the user spending.
    - Optional parameters:
        - startDate, endDate (for date range)
        - category (for filtering by category, e.g., Food, Electronics, etc.)
- "create_channel" - Create a new channel in Rocket.Chat
    - Required parameters:
        - name (the channel name, e.g., "receipt-processing")
- "help" - Show available commands
- "unknown" - When request doesn't match any available command
`;

export const COMMAND_TRANSLATION_PROMPT_EXAMPLES = (current_date: string) => `
Today's Date is ${current_date}
**Examples:**
User: "show me my receipts" → { "command": "room" }
User: "show me receipt data" → { "command": "room" }
User: "show all receipts in this room" → { "command": "room" }
User: "show receipts from 2024-01-15" → { "command": "date", "params": { "date": "2024-01-15" } }
User: "show receipts on 2024-01-15" → { "command": "date", "params": { "date": "2024-01-15" } }
User: "show receipts for 2024-01-15" → { "command": "date", "params": { "date": "2024-01-15" } }
User: "show receipts for today" → { "command": "date", "params": { "date": "2024-07-19" } }
User: "show receipts for yesterday" → { "command": "date", "params": { "date": "2024-07-18" } }
User: "show receipts for tomorrow" → { "command": "date", "params": { "date": "2024-07-20" } }
User: "show receipts for last week" → { "command": "date_range", "params": { "startDate": "2024-07-08", "endDate": "2024-07-14" } }
User: "show receipts for last month" → { "command": "date_range", "params": { "startDate": "2024-06-01", "endDate": "2024-06-30" } }
User: "show receipts for 3 days ago" → { "command": "date", "params": { "date": "2024-07-16" } }
User: "show receipts for 2 weeks ago" → { "command": "date_range", "params": { "startDate": "2024-07-01", "endDate": "2024-07-14" } }
User: "show receipts for 10 days ago" → { "command": "date_range", "params": { "startDate": "2024-07-01", "endDate": "2024-07-10" } }
User: "show receipts from 2024-07-01 to 2024-07-31" → { "command": "date_range", "params": { "startDate": "2024-07-01", "endDate": "2024-07-31" } }
User: "show receipts in this thread" → { "command": "thread" }
User: "show my receipts in this thread" → { "command": "thread_user" }
User: "add this channel" → { "command": "add_channel" }
User: "set room currency USD" → { "command": "set_room_currency", "params": { "currency": "USD" } }
User: "change currency to EUR for this room" → { "command": "set_room_currency", "params": { "currency": "EUR" } }
User: "set currency JPY" → { "command": "set_room_currency", "params": { "currency": "JPY" } }
User: "help me" → { "command": "help" }
User: "what's the weather?" → { "command": "unknown" }
User: "create a spending report" → { "command": "spending_report" }
User: "generate spending report for last month" → { "command": "spending_report", "params": { "startDate": "2024-06-01", "endDate": "2024-06-30" } }
User: "spending report from 2024-07-01 to 2024-07-31" → { "command": "spending_report", "params": { "startDate": "2024-07-01", "endDate": "2024-07-31" } }
User: "show my spending summary" → { "command": "spending_report" }
User: "show my food spending" → { "command": "spending_report", "params": { "category": "Food" } }
User: "generate electronics spending report for last month" → { "command": "spending_report", "params": { "startDate": "2024-06-01", "endDate": "2024-06-30", "category": "Electronics" } }
User: "generate report for my food spending in 2025" → { "command": "spending_report", "params": { "startDate": "2025-01-01", "endDate": "2025-12-31", "category": "Food" } }
User: "spending report for household items" → { "command": "spending_report", "params": { "category": "Household" } }
User: "create channel project-alpha" → { "command": "create_channel", "params": { "name": "project-alpha" } }
User: "make a new channel called finance-team" → { "command": "create_channel", "params": { "name": "finance-team" } }
User: "create channel marketing" → { "command": "create_channel", "params": { "name": "marketing" } }
User: "tell me a joke" → { "command": "unknown" }
User: "what time is it in Tokyo?" → { "command": "unknown" }
`;
