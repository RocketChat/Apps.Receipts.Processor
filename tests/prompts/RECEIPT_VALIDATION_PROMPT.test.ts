import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test } from "@jest/globals";
import { RECEIPT_VALIDATION_PROMPT } from "../../app/src/const/prompt";
import { LENGTH } from "./constants";
import nock from "nock";

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

  test(
    "LLM validates if images are receipts (80% threshold, generates cassettes)",
    async () => {
      let passCount = 0;
      for (let idx = 0; idx < hfdata.length; idx++) {
        const item = hfdata[idx];
        const { nockDone } = await nock.back(
          `receipt-validation-llm-response-${idx}.json`
        );
        const response = await llmResponse(item.image_base64, prompt);
        const messageContent = response.choices[0]?.message?.content;

        try {
          const parsedResponse = JSON.parse(messageContent);
          expect(parsedResponse).toStrictEqual({ is_receipt: true });
          passCount++;
        } catch (e) {
          // Do not throw, just log the error so all tests run
          console.error(
            `Failed to parse or validate JSON for image #${idx}: ${messageContent}`
          );
        }
        nockDone();
      }
      const percentage = (passCount / hfdata.length) * 100;
      console.log(
        `RECEIPT_VALIDATION_PROMPT passed ${percentage}% of the time.`
      );
      expect(percentage).toBeGreaterThanOrEqual(80);
    },
    70000 * Number(LENGTH)
  );
});