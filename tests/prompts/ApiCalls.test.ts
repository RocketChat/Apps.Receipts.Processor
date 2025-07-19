import { fetchDataHf, llmResponse } from "./ApiCalls";
import { Row } from "./interfaces";
import { sample_base64 } from "./constants";
import { describe, expect, beforeAll, test } from "@jest/globals";
import nock from "nock"; // Import nock

describe("Huggingface api call", () => {
    let hfdata: Row[] = [];

    beforeAll(async () => {
        // Wrap the API call with nock.back
        const { nockDone } = await nock.back('api-calls-hf.json');
        try {
            hfdata = await fetchDataHf();
        } catch (error) {
            console.error("Error during setup:", error);
        }
        nockDone(); // End the nock recording/replaying
    });

    describe("Testing HuggingFace data", () => {
        test("Dataset retrieval returns valid data", () => {
            expect(hfdata).toBeDefined();
            expect(hfdata.length).toBeGreaterThan(0);
        });
    });
});

describe("LLM api call", () => {
    let llmdata: any;

    beforeAll(async () => {
        // Wrap the API call with nock.back
        const { nockDone } = await nock.back('api-calls-llm.json');
        try {
            llmdata = await llmResponse(sample_base64, "Hi");
        } catch (error) {
            console.error("Error during setup:", error);
        }
        nockDone(); // End the nock recording/replaying
    }, 30000);

    describe("Testing LLM data", () => {
        test("Dataset retrieval returns valid data", () => {
            expect(llmdata).toBeDefined();
        });
    });
});