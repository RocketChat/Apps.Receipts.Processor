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

  test("LLM Responses give correct metadata", async () => {
    const { nockDone } = await nock.back("receipt-scan-llm-responses.json");
    try {
        const responses = await Promise.all(
          hfdata.map((item) => llmResponse(item.image_base64, prompt))
        );

        responses.forEach((response, index) => {
          const messageContent = response.choices[0]?.message?.content;
          let parsedResponse;
          try {
            parsedResponse = JSON.parse(messageContent);
          } catch (e) {
            throw new Error(`Failed to parse JSON. The extracted string was: ${messageContent}`);
          }

          expect(parsedResponse.items).toEqual(hfdata[index].metadata.items);
          expect(parsedResponse.total_price).toEqual(hfdata[index].metadata.total_price);
          expect(parsedResponse.receipt_date).toEqual(hfdata[index].metadata.receipt_date);
          expect(parsedResponse.extra_fees).toEqual(hfdata[index].metadata.extra_fees);
          
          passCount++;
        });
    } finally {
        // This ensures nockDone() is always called, saving the fixture even if tests fail.
        nockDone();
    }
  }, 100000 * Number(LENGTH));

  afterAll(() => {
    const percentage = (passCount / total) * 100;
    console.log(`RECEIPT_SCAN_PROMPT passed ${percentage}% of the time.`);
  });
});
