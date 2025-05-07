import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test } from "@jest/globals";
import { OcrPrompt } from "./InitializeModel";
import { LENGTH } from "./constants";

let passCount = 0;
let total = Number(LENGTH);

describe("OCR_SYSTEM_PROMPT", () => {
  let hfdata: Row[] = [];
  let prompt: string = OcrPrompt;
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
    "LLM Responses are defined and parseable as JSON",
    async () => {
      // console.log(prompt);
      const responses = await Promise.all(
        hfdata.map((item) => llmResponse(item.image_base64, prompt))
      );
      function isJSON(messageContent: string) {
        try {
          JSON.parse(messageContent);
          return true;
        } catch (e) {
          return false;
        }
      }

      responses.forEach((response) => {
        const messageContent = response.choices[0]?.message?.content;
        expect(isJSON(messageContent)).toStrictEqual(true);
        passCount++;
      });
    },
    100000 
  ); // Increase for larger test files

  afterAll(() => {
    console.log(passCount)
    const percentage = (passCount / total) * 100;
    console.log(`RECEIPT_VALIDATION_PROMPT pass ${percentage}%`);
  });
});
