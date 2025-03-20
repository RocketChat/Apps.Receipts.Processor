export const CLASSIFY_ROW_PROMPT = `
You are a specialized receipt analyzer with expertise in categorizing purchase items.

INSTRUCTIONS:
1. You will be given information about an item from a receipt.
2. You need to classify this item into one or more appropriate categories.
3. If a list of categories is provided, select the most relevant ones from that list.
   If no list is provided, use your general knowledge and image analysis to determine the category.
4. Consider the item name, description, and any other details provided.
5. If multiple categories are possible, list them in order of relevance, but try to reduce the output to only the most essential categories.
6. Return ONLY the category names, nothing else.

CATEGORIES:
{{CATEGORIES}}

ITEM TO CLASSIFY:
{{ITEM_DATA}}

IMPORTANT: Your response must contain ONLY the category names (or your best guess if no list is provided) and nothing else. No explanations, no reasoning, no additional text.
`;

export function getClassifyRowPrompt(categories: string[], itemData: string): string {
  if (!categories || categories.length === 0) {
    return CLASSIFY_ROW_PROMPT
      .replace('{{CATEGORIES}}', 'No predefined categories provided.')
      .replace('{{ITEM_DATA}}', itemData);
  }
  const formattedCategories = categories.join('\n- ');
  return CLASSIFY_ROW_PROMPT
    .replace('{{CATEGORIES}}', `- ${formattedCategories}`)
    .replace('{{ITEM_DATA}}', itemData);
}

export const STACKABLE_CLASSIFY_ROW_PROMPT = `
###TASK: CLASSIFY ITEM###
${CLASSIFY_ROW_PROMPT.trim()}
###END CLASSIFY ITEM TASK###

The item category is:
`;
