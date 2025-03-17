import { PromptLibrary } from "../../../src/contrib/prompt-library/npm-module";
import { fetchDataHf, llmResponse } from "./ApiCalls";
import { OCR_SYSTEM_PROMPT } from "../../../src/const/prompt";
import { Row } from "./interfaces";

describe("OCR_SYSTEM_PROMPT", () => {
    let hfdata: Row[] = [];
    let prompt: string;
    let llmResponses: any[] = [];
    PromptLibrary.initializeModels([]);
    PromptLibrary.addPrompt("model", "OCR_SYSTEM_PROMPT", OCR_SYSTEM_PROMPT);
    prompt = PromptLibrary.getPrompt("model", "OCR_SYSTEM_PROMPT");

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

    test("LLM Responses are defined and parseable as JSON", async () => {
        // console.log(prompt);
        const responses = await Promise.all(
            hfdata.map((item) => llmResponse(item.image_base64, prompt))
        );

        responses.forEach((response) => {
            const messageContent = response.choices[0]?.message?.content;
            function isJSON(messageContent) {
                try {
                    JSON.parse(messageContent); 
                    return true; 
                } catch (e) {
                    return false; 
                }
            }
            expect(isJSON(messageContent)).toStrictEqual(true);
        });
    }, 70000); // Increase for larger test files
});
