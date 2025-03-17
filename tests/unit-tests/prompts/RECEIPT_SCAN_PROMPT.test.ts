import { PromptLibrary } from "../../../src/contrib/prompt-library/npm-module";
import { fetchDataHf, llmResponse } from "./ApiCalls";
import { RECEIPT_SCAN_PROMPT } from "../../../src/const/prompt";
import { Row } from "./interfaces";

describe("RECEIPT_SCAN_PROMPT", () => {
    let hfdata: Row[] = [];
    let prompt: string;
    let llmResponses: any[] = [];
    PromptLibrary.initializeModels([]);
    PromptLibrary.addPrompt(
        "model",
        "RECEIPT_SCAN_PROMPT",
        RECEIPT_SCAN_PROMPT
    );
    prompt = PromptLibrary.getPrompt("model", "RECEIPT_SCAN_PROMPT");

    beforeAll(async () => {
        try {
            hfdata = await fetchDataHf();
            // console.log("Fetched HuggingFace data:", hfdata);
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

    test("LLM Responses give correct metadata", async () => {
        // console.log(prompt);
        const responses = await Promise.all(
            hfdata.map((item) => llmResponse(item.image_base64, prompt))
        );

        responses.forEach((response, index) => {
            const messageContent = response.choices[0]?.message?.content;
            const parsedResponse = JSON.parse(messageContent);
            console.log(parsedResponse);
            expect(parsedResponse.items).toEqual(hfdata[index].metadata.items);
            expect(parsedResponse.extra_fees).toEqual(
                hfdata[index].metadata.extra_fees
            );
            expect(parsedResponse.total_price).toEqual(
                hfdata[index].metadata.total_price
            );
            expect(parsedResponse.receipt_date).toEqual(
                hfdata[index].metadata.receipt_date
            );
        });
    }, 1000000); // Increase for larger test files
});
