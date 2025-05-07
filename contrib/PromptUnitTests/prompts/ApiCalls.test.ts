import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { sample_base64 } from "./constants";
import { describe, expect, beforeAll, test } from "@jest/globals";


describe("Huggingface api call", () => {
    let hfdata: Row[] = [];
    let prompt: string;

    beforeAll(async () => {
        try {
            hfdata = await fetchDataHf();
        } catch (error) {
            console.error("Error during setup:", error);
        }
    });
    describe("Testing HuggingFace data", () => {
        test("Dataset retrieval returns valid data", () => {
            expect(hfdata).toBeDefined();
            expect(hfdata.length).toBeGreaterThan(0);
        });
    });
});
// If this test fails check if you have configured API correctly
// export API_KEY = "Your Api Key"
// Check your LLM service provider has tokens left for use
describe("LLM api call", () => {
    let llmdata: any;

    beforeAll(async () => {
        try {
            llmdata = await llmResponse(sample_base64, "Hi");
            // console.log("Fetched LLM data:", llmdata);
        } catch (error) {
            console.error("Error during setup:", error);
        }
    }, 30000);

    describe("Testing LLM data", () => {
        test("Dataset retrieval returns valid data", () => {
            expect(llmdata).toBeDefined();
        });
    });
});
