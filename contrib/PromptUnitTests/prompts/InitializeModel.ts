import {
    OCR_SYSTEM_PROMPT,
    RECEIPT_SCAN_PROMPT,
    RECEIPT_VALIDATION_PROMPT,
    USER_RESPONSE_VALIDATION_PROMPT
} from "../../../app/src/const/prompt";
import {
    modelStorage,
    PromptLibrary,
} from "../../../app/src/contrib/prompt-library/npm-module";

modelStorage.initialize(
    {
        OCR_SYSTEM_PROMPT: OCR_SYSTEM_PROMPT,
        RECEIPT_SCAN_PROMPT: RECEIPT_SCAN_PROMPT,
        RECEIPT_VALIDATION_PROMPT: RECEIPT_VALIDATION_PROMPT,
        USER_RESPONSE_VALIDATION_PROMPT: USER_RESPONSE_VALIDATION_PROMPT
    },
    [
        {
            name: "meta-llama/Llama-3.2-11B-Vision-Instruct",
            parameters: "11B",
            quantization: "Vision",
            prompts: [
                "OCR_SYSTEM_PROMPT",
                "RECEIPT_SCAN_PROMPT",
                "RECEIPT_VALIDATION_PROMPT",
                "USER_RESPONSE_VALIDATION_PROMPT"
            ],
        },
    ]
);

export const OcrPrompt = PromptLibrary.getPrompt(
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "OCR_SYSTEM_PROMPT"
);
export const ReceiptScanPrompt = PromptLibrary.getPrompt(
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "RECEIPT_SCAN_PROMPT"
);
export const ReceiptValidationPrompt = PromptLibrary.getPrompt(
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "RECEIPT_VALIDATION_PROMPT"
);

