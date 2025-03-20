export const CLASSIFY_RECEIPT_TYPE_PROMPT = `
You are a specialized receipt analyzer with expertise in identifying receipt sources and types.

INSTRUCTIONS:
1. Carefully examine the provided receipt image.
2. Look for logos, store names, headers, footers, and formatting patterns.
3. Identify which type of establishment or service issued this receipt.
4. If a list of receipt types is provided, select the most appropriate type from the list.
   If no list is provided, use your general knowledge and image analysis to determine the receipt type.
5. Return ONLY the receipt type name. If the receipt type is not identifiable, return "unknown".

RECEIPT TYPES:
{{RECEIPT_TYPES}}

THINGS TO LOOK FOR:
- Store/company logo and branding
- Address and contact information
- Formatting patterns specific to certain vendors
- Types of items sold
- Tax information format
- Currency and payment methods
- Special offers or loyalty programs

IMPORTANT: Your response must contain ONLY the receipt type from the list above (or your best guess if no list is provided) and nothing else. No explanations, no reasoning, no additional text.
`;

export function getClassifyReceiptTypePrompt(receiptTypes: string[]): string {
  if (!receiptTypes || receiptTypes.length === 0) {
    return CLASSIFY_RECEIPT_TYPE_PROMPT.replace('{{RECEIPT_TYPES}}', '');
  }
  const formattedTypes = receiptTypes.join('\n- ');
  return CLASSIFY_RECEIPT_TYPE_PROMPT.replace('{{RECEIPT_TYPES}}', `- ${formattedTypes}`);
}

export const STACKABLE_CLASSIFY_RECEIPT_TYPE_PROMPT = `
###TASK: CLASSIFY RECEIPT TYPE###
${CLASSIFY_RECEIPT_TYPE_PROMPT.trim()}
###END CLASSIFY RECEIPT TYPE TASK###

The receipt type is:
`;
