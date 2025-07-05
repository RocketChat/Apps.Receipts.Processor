import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test, afterAll } from "@jest/globals";
import { RECEIPT_VALIDATION_PROMPT } from "../../app/src/const/prompt";
import { LENGTH } from "./constants";
import nock from "nock";

let passCount = 0;
const total = Number(LENGTH);

function extractJson(text: string): string | null {
  if (!text) return null;
  const jsonMatch = text.match(/```json([\s\S]*?)```|({[\s\S]*})/);
  if (!jsonMatch) {
    return null;
  }
  return (jsonMatch[1] || jsonMatch[2]).trim();
}

describe("RECEIPT_VALIDATION_PROMPT", () => {
  let hfdata: Row[] = [];
  const prompt: string = RECEIPT_VALIDATION_PROMPT;

  beforeAll(async () => {
    const { nockDone } = await nock.back("receipt-validation-hf-data.json");
    try {
      hfdata = await fetchDataHf();
      if (!hfdata || hfdata.length === 0) {
        throw new Error("No data fetched from HuggingFace API.");
      }
    } catch (error) {
      console.error("Error during setup:", error);
    }
    nockDone();
  }, 30000 * Number(LENGTH));

  test("Dataset retrieval returns valid data", () => {
    expect(hfdata).toBeDefined();
    expect(hfdata.length).toBeGreaterThan(0);
  });

  test("LLM validates if the given image is a receipt", async () => {
    const { nockDone } = await nock.back("receipt-validation-llm-responses.json");
    const responses = await Promise.all(
      hfdata.map((item) => llmResponse(item.image_base64, prompt))
    );

    responses.forEach((response) => {
      const messageContent = response.choices[0]?.message?.content;
      const jsonString = extractJson(messageContent);

      expect(jsonString).not.toBeNull();

      try {
        const parsedResponse = JSON.parse(jsonString!);
        expect(parsedResponse).toStrictEqual({ is_receipt: true });
        passCount++;
      } catch(e) {
        throw new Error(`Failed to parse or validate JSON: ${jsonString}`);
      }
    });
    
    nockDone();
  }, 70000 * Number(LENGTH));

  afterAll(() => {
    const percentage = (passCount / total) * 100;
    console.log(`RECEIPT_VALIDATION_PROMPT passed ${percentage}% of the time.`);
  });
});