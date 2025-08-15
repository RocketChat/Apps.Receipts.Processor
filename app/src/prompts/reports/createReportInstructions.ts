export const CREATE_REPORT_INSTRUCTIONS = (data: string) => `
You are given the following receipt data:

${data}

Your task is to analyze the receipts and generate a summary report for spending tracking.

**Return the result as a single object** with the following structure:
- Ignore receipt date and use uploadedDate instead
- startDate: The earliest uploaded date in the data
- endDate: The latest uploaded date in the data
- summary: A brief summary of the user's purchases and a comment on their purchase habits. For example, mention which categories they spend the most on, any noticeable trends, or suggestions for improvement.
- categories: An array of objects, each with:
  - category: The name of the category (e.g., Food, Household, etc.)
  - items: An array of objects, each with:
    - name: The name of the item
    - quantity: The **total quantity purchased** in the given period
    - price: The **unit price** of the item (taken directly from the receipt data, not multiplied by quantity)

**Important:**
- If the same item appears multiple times, sum the quantities but keep the same unit price (if prices differ, use the most recent one in the data).
- Do **not** calculate total spending for the price field — it must remain the unit price.

**Example output:**
\`\`\`json
{
  "startDate": "2025-08-14",
  "endDate": "2025-08-14",
  "summary": "Most of your spending was on beverages, especially coffee-based drinks. You also spent on entertainment such as weekend games.",
  "categories": [
    {
      "category": "Entertainment",
      "items": [
        {
          "name": "Weekend Game Rate",
          "quantity": 5,
          "price": 60000
        }
      ]
    },
    {
      "category": "Beverages",
      "items": [
        {
          "name": "BEANSTAR GOLDEN LATTE",
          "quantity": 1,
          "price": 38000
        },
        {
          "name": "CAFFE LATTE",
          "quantity": 1,
          "price": 25000
        },
        {
          "name": "TIRAMISU CREAM COLD BREW",
          "quantity": 1,
          "price": 30000
        },
        {
          "name": "SEA SALT CARAMEL LATTE",
          "quantity": 1,
          "price": 30000
        }
      ]
    }
  ]
}
\`\`\`

**Return only the object in valid JSON format without extra characters. Include all categories and all items found in the data.**
`;

export const CREATE_CATEGORY_REPORT_INSTRUCTIONS = (
  data: string,
  category: string
) => `
You are given the following receipt data:

${data}

Your task is to analyze the receipts and generate a summary report for spending tracking.

**Return the result as a single object** with the following structure:
- Ignore receipt date and use uploadedDate instead
- startDate: The earliest uploaded date in the data
- endDate: The latest uploaded date in the data
- summary: A brief summary of the user's purchases in the "${category}" category and a comment on their purchase habits in this category. For example, mention the most purchased items, spending trends, or suggestions.
- categories: An array of objects, each with:
  - category: The name of the category (e.g., Food, Household, etc.)
  - items: An array of objects, each with:
    - name: The name of the item
    - quantity: The **total quantity purchased** in the given period
    - price: The **unit price** of the item (taken directly from the receipt data, not multiplied by quantity)

**Important:**
- If the same item appears multiple times, sum the quantities but keep the same unit price (if prices differ, use the most recent one in the data).
- Do **not** calculate total spending for the price field — it must remain the unit price.

**Only include the category: "${category}" in the output. Ignore all other categories.**

**If there are no items in the "${category}" category, return nothing (an empty string).**

**Example output:**
\`\`\`json
{
  "startDate": "2025-08-14",
  "endDate": "2025-08-14",
  "summary": "You purchased several coffee drinks, with a focus on specialty lattes.",
  "categories": [
    {
      "category": "${category}",
      "items": [
        {
          "name": "CAFFE LATTE",
          "quantity": 1,
          "price": 25000
        }
      ]
    }
  ]
}
\`\`\`

**Return only the object in valid JSON format without extra characters. If the "${category}" category is not found, return nothing (an empty string).**
`;
