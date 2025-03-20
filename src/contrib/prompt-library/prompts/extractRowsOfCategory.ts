export const EXTRACT_ROWS_OF_CATEGORY_PROMPT = `
You are a specialized receipt analyzer with expertise in identifying and extracting items by category.

INSTRUCTIONS:
1. Carefully examine the provided receipt image.
2. Identify all items that belong to the category: {{CATEGORY}}
3. For each matching item, extract:
   - Item name/description
   - Quantity (if available)
   - Unit price (if available)
   - Total price (if available)
   - Any other fields present in the item row
4. Return the results as a JSON array of objects with this structure:
   [
     {
       "item_name": "Item description",
       "quantity": 1,
       "unit_price": 0.00,
       "total_price": 0.00,
       "other_fields_1": data,
       "other_fields_2": data,
       ... (more other fields)
     },
     {},
     ... (more items)
   ]
5. If no items match the category, return an empty array: []
6. If any field is not available for an item, use null for that field.

CATEGORY DESCRIPTION: {{CATEGORY_DESCRIPTION}}

IMPORTANT: Return ONLY the JSON array with no additional text or explanations.
`;

export function getExtractRowsOfCategoryPrompt(category: string, description?: string): string {
  return EXTRACT_ROWS_OF_CATEGORY_PROMPT
    .replace('{{CATEGORY}}', category)
    .replace('{{CATEGORY_DESCRIPTION}}', description || `Items that belong to the "${category}" category`);
}

export const STACKABLE_EXTRACT_BY_CATEGORY_PROMPT = `
###TASK: EXTRACT ITEMS BY CATEGORY###
${EXTRACT_ROWS_OF_CATEGORY_PROMPT.trim()}
###END EXTRACT BY CATEGORY TASK###

The items in category {{CATEGORY}} are:
`;
