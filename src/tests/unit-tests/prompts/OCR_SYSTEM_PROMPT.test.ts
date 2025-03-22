import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { describe, expect, beforeAll, test } from "@jest/globals";
import { OcrPrompt } from "./InitializeModel";

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
    }, 30000); // Increase timeout for setup

    test("Dataset retrieval returns valid data", () => {
        expect(hfdata).toBeDefined();
        expect(hfdata.length).toBeGreaterThan(0);
    });

    test("LLM Responses are defined and parseable as JSON", async () => {
        const responses = await Promise.all(
            hfdata.map((item) => llmResponse(item.image_base64, prompt))
        );
        function isJSON(messageContent: string): boolean {
            try {
                JSON.parse(messageContent);
                return true;
            } catch (e) {
                return false;
            }
        }
        let validPromptCount = 0;
        const contents = responses[0].choices[0].message.content;
        for (const key in contents) {
            const content = contents[key];
            if (isJSON(content)) {
                validPromptCount++;
            }
        }
        expect(validPromptCount).toBeGreaterThanOrEqual(7);
    }, 70000); // Increase for larger test files
});
