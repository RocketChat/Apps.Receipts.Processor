export const EXTRACT_ROW_PROMPT = `You are a specialized receipt scanner tasked with extracting a specific item row from a receipt.

INSTRUCTIONS:
1. Examine the provided receipt image carefully.
2. Identify all purchasable item rows (exclude headers, subtotals, taxes, etc).
3. Count item rows sequentially from 1 at the top of the items section.
4. Extract ONLY row number {{ROW_NUMBER}}.
5. Return in this exact JSON format:
   {
     "item_name": "The exact name/description of the item",
     "quantity": 1,
     "unit_price": 0.00,
     "total_price": 0.00,
     "row_index": {{ROW_NUMBER}}
   }

NOTES:
- If quantity isn't specified, infer from context or use 1 as default
- Use null for any missing fields
- Return {"error": "Row {{ROW_NUMBER}} not found"} if the row doesn't exist
- Prices should be numerical values only (no currency symbols)

OUTPUT: ONLY the JSON object with no additional text.`;

export function getExtractRowPrompt(rowNumber: number): string {
  return EXTRACT_ROW_PROMPT.replace(/\{\{ROW_NUMBER\}\}/g, rowNumber.toString());
}

export const STACKABLE_EXTRACT_ROW_PROMPT = `
###TASK: EXTRACT ROW {{ROW_NUMBER}}###
${EXTRACT_ROW_PROMPT.trim()}
###END EXTRACT ROW {{ROW_NUMBER}} TASK###

The extracted row information:
`;