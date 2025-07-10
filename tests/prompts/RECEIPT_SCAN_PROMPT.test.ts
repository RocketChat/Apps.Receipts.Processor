import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test, afterAll } from "@jest/globals";
import { RECEIPT_SCAN_PROMPT } from "../../app/src/const/prompt";
import { LENGTH } from "./constants";
import nock from "nock";

let passCount = 0;
const total = Number(LENGTH);

describe("RECEIPT_SCAN_PROMPT", () => {
  let hfdata: Row[] = [];
  const prompt: string = RECEIPT_SCAN_PROMPT;

  beforeAll(async () => {
    const { nockDone } = await nock.back("receipt-scan-hf-data.json");
    try {
      hfdata = await fetchDataHf();
      if (!hfdata || hfdata.length === 0) {
        throw new Error("No data fetched from HuggingFace API.");
      }
    } catch (error) {
      console.error("Error during setup:", error);
    }
    nockDone();
  }, 100000 * Number(LENGTH));

  test("Dataset retrieval returns valid data", () => {
    expect(hfdata).toBeDefined();
    expect(hfdata.length).toBeGreaterThan(0);
  });

  test(
    "LLM Responses give correct metadata (one cassette per image)",
    async () => {
      for (let idx = 0; idx < hfdata.length; idx++) {
        const item = hfdata[idx];
        const { nockDone } = await nock.back(
          `receipt-scan-llm-response-${idx}.json`
        );
        try {
          const response = await llmResponse(item.image_base64, prompt);
          const messageContent = response.choices[0]?.message?.content;
          let parsedResponse;
          try {
            parsedResponse = JSON.parse(messageContent);
          } catch (e) {
            throw new Error(
              `Failed to parse JSON for image #${idx}. The extracted string was: ${messageContent}`
            );
          }

          expect(parsedResponse.items).toEqual(item.metadata.items);
          expect(parsedResponse.total_price).toEqual(item.metadata.total_price);
          expect(parsedResponse.extra_fees).toEqual(item.metadata.extra_fees);

          passCount++;
        } finally {
          nockDone();
        }
      }
    },
    100000 * Number(LENGTH)
  );

  afterAll(() => {
    const percentage = (passCount / total) * 100;
    console.log(`RECEIPT_SCAN_PROMPT passed ${percentage}% of the time.`);
  });
});