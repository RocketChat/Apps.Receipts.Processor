import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test } from "@jest/globals";
import { ReceiptValidationPrompt } from "./InitializeModel";
import { LENGTH } from "./constants";

let passCount = 0;
let total = Number(LENGTH);

describe("RECEIPT_VALIDATION_PROMPT", () => {
  let hfdata: Row[] = [];
  let prompt: string = ReceiptValidationPrompt;

  beforeAll(async () => {
    try {
      hfdata = await fetchDataHf();
      if (!hfdata || hfdata.length === 0) {
        throw new Error("No data fetched from HuggingFace API.");
      }
    } catch (error) {
      console.error("Error during setup:", error);
    }
  }, 30000 * Number(LENGTH)); // Increase timeout for setup

  test("Dataset retrieval returns valid data", () => {
    expect(hfdata).toBeDefined();
    expect(hfdata.length).toBeGreaterThan(0);
  });

  test(
    "LLM Responses validates if the given image is receipt or not",
    async () => {
      const responses = await Promise.all(
        hfdata.map((item) => llmResponse(item.image_base64, prompt))
      );
      // console.log(responses.length);
      responses.forEach((response) => {
        const messageContent = response.choices[0]?.message?.content;
        const parsedResponse = JSON.parse(messageContent);
        expect(parsedResponse).toStrictEqual({ is_receipt: true });
        passCount++;
      });
    },
    70000 * Number(LENGTH)
  ); // Increase for larger test files
  afterAll(() => {
    const percentage = (passCount / total) * 100;
    console.log(`RECEIPT_VALIDATION_PROMPT pass ${percentage}%`);
  });
});
