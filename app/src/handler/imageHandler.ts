import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import {
    IMessage,
    IMessageAttachment,
} from "@rocket.chat/apps-engine/definition/messages";
import { getAPIConfig } from "../config/settings";
import { OCR_SYSTEM_PROMPT } from "../prompts/ocr/ocrSystemPrompt";
import { RECEIPT_VALIDATION_PROMPT } from "../prompts/ocr/receiptValidationPrompt"
import { LLMClient } from "../prompt_library/client";
import { ImageRequest } from "../prompt_library/const/types";
import { getLLMConfigFromValues } from "../prompt_library/config";

export class ImageHandler {
    private llmClient: LLMClient;
    constructor(private readonly http: IHttp, private readonly read: IRead) {
        this.llmClient = new LLMClient(http);
    }

    public async processImage(message: IMessage, prompt: string): Promise<any> {
        const { apiKey, modelType, apiEndpoint, provider } = await getAPIConfig(
            this.read
        );
        const base64Image = await this.convertImageToBase64(message);
        const config = await getLLMConfigFromValues({
            provider,
            apiKey,
            modelType,
            apiEndpoint,
        });
        const request: ImageRequest = {
            systemPrompt: OCR_SYSTEM_PROMPT,
            userPrompt: prompt,
            base64Image,
        };

        return await this.llmClient.sendImageRequest(config, request);
    }

    public async validateImage(message: IMessage): Promise<boolean> {
        try {
            const response = await this.processImage(
                message,
                RECEIPT_VALIDATION_PROMPT
            );
            const jsonResponse = JSON.parse(response);
            return jsonResponse.is_receipt === true;
        } catch (error) {
            console.error("Error validating image:", error);
            return false;
        }
    }

    public static isImageAttachment(attachment: IMessageAttachment): boolean {
        return attachment.imageUrl !== undefined;
    }

    private async convertImageToBase64(message: IMessage): Promise<string> {
        try {
            const image = await this.read
                .getUploadReader()
                .getBufferById(message.file?._id!);
            return image.toString("base64");
        } catch (error) {
            throw error;
        }
    }
}
