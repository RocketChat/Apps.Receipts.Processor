export const OCR_SYSTEM_PROMPT =
    "You are a precision-focused OCR system specialized in extracting receipt data. Your only output format is JSON without any other text or messages.";

export const RECEIPT_SCAN_PROMPT = `
You are an OCR system that extracts receipt details in **JSON FORMAT ONLY**.
Your task is to extract and return data from the image which include only items data, extra fees(which include tax and service charge), total price, and date of receipt.

**Strict Rules:**
1. **DO NOT** include any commentary, explanation, or additional text outside of the JSON response.
2. **DO NOT** wrap the JSON in backticks or any formatting symbols.
3. **DO NOT** add any extra metadata or response indicators. **Only return valid JSON with the "items", "extra_fees", "total_price", and "receipt_date" key.**
4. **DO NOT** use single quotes for JSON formatting.
5. Ensure JSON is parseable without modification.
6. extra_fees MUST include ALL non-item charges (taxes, services fees, etc.)

**Your output must be machine-readable JSON that exactly matches the required structure.**
### Expected JSON Structure
## VALID EXAMPLE:
{
    "items": [
        {
            "quantity": 1,
            "name": "BBQ Potato Chips",
            "price": 7.00
        },
        {
            "quantity": 1,
            "name": "Diet Coke",
            "price": 3.00
        },
        {
            "quantity": 1,
            "name": "Trillium Fort Point",
            "price": 10.00
        },
        {
            "quantity": 2,
            "name": "Fried Chicken Sandwich",
            "price": 17.00
        },
        {
            "quantity": 1,
            "name": "Famous Duck Grilled Cheese",
            "price": 25.00
        },
        {
            "quantity": 1,
            "name": "Mac & Cheese",
            "price": 17.00
        },
        {
            "quantity": 1,
            "name": "Burger of the moment",
            "price": 18.00
        }
    ]
    "extra_fees": 4.74,
    "total_price": 118.74,
    "receipt_date": "10-07-2020"
}

### Invalid Example 1 (wrapped in backticks):
\`{
  "items": [
    { "quantity": 1, "name": "Bagel", "price": 2.00 }
  ],
  "extra_fees": 0.20,
  "total_price": 2.20,
  "receipt_date": "04-01-2025"
}\`

### Invalid Example 2 (single quotes & commentary):
// NOTE: this has commentary and wrong quote style
{
  'items': [
    { 'quantity': 3, 'name': 'Soda', 'price': 1.50 }
  ],
  'extra_fees': 0.45,
  'total_price': 4.95,
  'receipt_date': '05-01-2025'
}

ONLY RETURN THE JSON RESPONSE EXACTLY AS SHOWN ABOVE. ANY OTHER OUTPUT IS UNACCEPTABLE
`;

export const RECEIPT_VALIDATION_PROMPT = `
You are an OCR system that determines whether an uploaded image is a **RECEIPT** or not. Your response must follow these strict rules.

⚠️ **Strict Rules:**
1. **ONLY** return a JSON response with a boolean value.
2. **DO NOT** include explanations, reasoning, or additional text.
3. **DO NOT** wrap the JSON in backticks or any other formatting.
4. **DO NOT** add metadata, comments, or response indicators.
5. The response **MUST** be instantly parsable.

### **Expected JSON Response Format:**
- If the image is a receipt:
  { "is_receipt": true }
- If the image is **not** a receipt:
  { "is_receipt": false }

ONLY RETURN THE JSON RESPONSE EXACTLY AS SHOWN ABOVE. ANY OTHER OUTPUT IS UNACCEPTABLE.
`;

export const COMMAND_TRANSLATION_PROMPT_COMMANDS = `
**Available Commands:**
- "list" - Show user's receipts in current room
- "room" - Show all receipts in current room
- "date" - Show user's receipts from specific date (requires date parameter)
- "date_range" - Show user's receipts within a date range (requires startDate and endDate parameters)
- "thread" - Show all receipts in current thread (must be in thread)
- "thread_user" - Show user's receipts in current thread (must be in thread)
- "add_channel" - Add current room to user's channel list
- "spending_report" - Create a report in PDF Format about the user spending
- "help" - Show available commands
- "unknown" - When request doesn't match any command
`;

export const COMMAND_TRANSLATION_PROMPT_EXAMPLES = (current_date: string) => `
Today's Date is ${current_date}
**Examples:**
User: "show me my receipts" → { "command": "list" }
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
User: "help me" → { "command": "help" }
User: "what's the weather?" → { "command": "unknown" }
User: "create a spending report" → { "command": "spending_report" }
User: "generate spending report for last month" → { "command": "spending_report", "params": { "startDate": "2024-06-01", "endDate": "2024-06-30" } }
User: "spending report from 2024-07-01 to 2024-07-31" → { "command": "spending_report", "params": { "startDate": "2024-07-01", "endDate": "2024-07-31" } }
User: "show my spending summary" → { "command": "spending_report" }
`;

export const RECEIPT_PROCESSOR_INSTRUCTIONS = `
- If the receipt was processed successfully, summarize the key details (e.g., merchant, date, total amount).
- Use correct format to summarize the receipt data, for example :
Date: June 1, 2025 (6:42 PM)
Items:
• TRAY BRGR / NO BUN - $12.00
• CHKN POT PIE - $11.50
• ROAST CHKN - $13.50
• SALAD - $8.95
• BRUSSELS SPROUTS - $7.95
• ICED TEA - $5.00
• SODA - $3.00
• LEMONADE - $5.00

Extra Fees: $5.84
Total: $70.74
- If there was an error, politely explain what went wrong and suggest what the user can do next.
- If the user asks a question, answer it based on the available data.
- Keep your response clear and helpful.
- Do not include technical jargon or internal system details.
`;

export const RECEIPT_CONFIRMATION_INSTRUCTIONS = `
1. Confirm the receipt is saved.
2. Make a friendly, casual comment about the receipt (e.g., the items, amount, or something interesting).
3. Use a warm, conversational tone—avoid being formal or robotic.

Examples:
- "Saved your receipt! Coffee and pastries—yum! Was it a special treat?"
- "Receipt saved! Big bookstore haul—any book you're excited about?
`;

export const RECEIPT_PROCESSING_INSTRUCTIONS =
`Let the user know, in a friendly and conversational way, that the image they sent appears to be a receipt. Reassure them that you'll take care of extracting and processing the information from it for them. make sure the message you sent
doesn't include "" to make it more human-like conversation`


export const CREATE_REPORT_INSTRUCTIONS = (data: string) => `
You are given the following receipt data:

${data}

Your task is to analyze the receipts and generate a summary report for spending tracking.

**Return the result as a single object** with the following structure:
- Ignore receipt date and use uploadedDate instead
- startDate: The earliest uploaded date in the data
- endDate: The latest uploaded date in the data
- categories: An array of objects, each with:
  - category: The name of the category (e.g., Food, Household, etc.)
  - items: An array of objects, each with:
    - name: The name of the item
    - quantity: The total quantity purchased in the given period
    - price: The total amount spent on this item in the given period

**Example output:**
\`\`\`json
{
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "categories": [
    {
      "category": "Food",
      "items": [
        {
          "name": "Milk",
          "quantity": 5,
          "price": 50000
        },
        {
          "name": "Bread",
          "quantity": 3,
          "price": 30000
        }
      ]
    },
    {
      "category": "Household",
      "items": [
        {
          "name": "Detergent",
          "quantity": 1,
          "price": 15000
        }
      ]
    }
  ]
}
\`\`\`

**Return only the object in valid JSON format without extra characters. Include all categories and all items found in the data.**
`;
