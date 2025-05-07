import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test } from "@jest/globals";
import { ReceiptScanPrompt } from "./InitializeModel";
import { LENGTH } from "./constants";

let passCount = 0;
let total = Number(LENGTH);

describe("RECEIPT_SCAN_PROMPT", () => {
  let hfdata: Row[] = [];
  let prompt: string = ReceiptScanPrompt;
  beforeAll(async () => {
    try {
      hfdata = await fetchDataHf();
      if (!hfdata || hfdata.length === 0) {
        throw new Error("No data fetched from HuggingFace API.");
      }
    } catch (error) {
      console.error("Error during setup:", error);
    }
  }, 100000 * Number(LENGTH)); // Increase timeout for setup

  test("Dataset retrieval returns valid data", () => {
    expect(hfdata).toBeDefined();
    expect(hfdata.length).toBeGreaterThan(0);
  });

  test("LLM Responses give correct metadata", async () => {
    const responses = await Promise.all(
      hfdata.map((item) => llmResponse(item.image_base64, prompt))
    );

    responses.forEach((response, index) => {
      const messageContent = response.choices[0]?.message?.content;
      const parsedResponse = JSON.parse(messageContent);
      // console.log(parsedResponse)
      expect(parsedResponse.items).toEqual(hfdata[index].metadata.items);
      expect(parsedResponse.total_price).toEqual(
        hfdata[index].metadata.total_price
      );
      expect(parsedResponse.receipt_date).toEqual(
        hfdata[index].metadata.receipt_date
      );
      expect(parsedResponse.extra_fees).toEqual(
        hfdata[index].metadata.extra_fees
      );
      passCount++;
    });
  }, 100000*Number(LENGTH)); // Increase for larger test files

  afterAll(() => {
    console.log(passCount);
    const percentage = (passCount / total) * 100;
    console.log(`RECEIPT_VALIDATION_PROMPT pass ${percentage}%`);
  });
});
