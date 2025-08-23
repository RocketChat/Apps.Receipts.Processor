import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test, afterAll } from "@jest/globals";
import { OCR_SYSTEM_PROMPT } from "../../app/src/prompts/ocr/ocrSystemPrompt";
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

describe("OCR_SYSTEM_PROMPT", () => {
  let hfdata: Row[] = [];
  const prompt: string = OCR_SYSTEM_PROMPT;

  beforeAll(async () => {
    const { nockDone } = await nock.back("ocr-system-hf-data.json");
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

  test("LLM Responses are defined and parseable as JSON", async () => {
    const { nockDone } = await nock.back("ocr-system-llm-responses.json");
    const responses = await Promise.all(
      hfdata.map((item) => llmResponse(item.image_base64, prompt))
    );

    responses.forEach((response) => {
      const messageContent = response.choices[0]?.message?.content;
      const jsonString = extractJson(messageContent);
      
      expect(jsonString).not.toBeNull();
      try {
        JSON.parse(jsonString!);
        passCount++;
      } catch (e) {
        throw new Error(`Failed to parse JSON from response: ${jsonString}`);
      }
    });

    nockDone();
  }, 100000); 

  afterAll(() => {
    const percentage = (passCount / total) * 100;
    console.log(`OCR_SYSTEM_PROMPT passed ${percentage}% of the time.`);
  });
});