import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    IMessage,
    IMessageAttachment,
} from "@rocket.chat/apps-engine/definition/messages";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { getAPIConfig } from "../config/settings";
import { OCR_SYSTEM_PROMPT } from "../prompts/ocr/ocrSystemPrompt";
import { RECEIPT_VALIDATION_PROMPT } from "../prompts/ocr/receiptValidationPrompt";
import { RECEIPT_SCAN_PROMPT } from "../prompts/ocr/receiptScanPrompt";
import { LLMClient } from "../prompt_library/client";
import { ImageRequest } from "../prompt_library/const/types";
import { getLLMConfigFromValues } from "../prompt_library/config";
import { IReceiptData } from "../types/receipt";
import { sendMessage, sendConfirmationButtons } from "../utils/message";
import { RESPONSE_PROMPT } from "../prompt_library/const/prompt";
import {
    RECEIPT_PROCESSOR_INSTRUCTIONS,
    RECEIPT_PROCESSING_INSTRUCTIONS,
} from "../prompts/ocr/receiptDialoguePrompt";
import {
    INVALID_IMAGE_RESPONSE,
    GENERAL_ERROR_RESPONSE,
} from "../const/response";
import { ReceiptHandler } from "./receiptHandler";
import { BotHandler } from "./botHandler";

export class ImageHandler {
    private llmClient: LLMClient;

    constructor(private readonly http: IHttp, private readonly read: IRead) {
        this.llmClient = new LLMClient(http);
    }

    public async validateImage(message: IMessage): Promise<boolean> {
        try {
            const response = await this.processImage(message, RECEIPT_VALIDATION_PROMPT);
            const jsonResponse = JSON.parse(response);
            return jsonResponse.is_receipt === true;
        } catch (error) {
            console.error("Error validating image:", error);
            return false;
        }
    }

    public async processImage(message: IMessage, prompt: string): Promise<any> {
        const { apiKey, modelType, apiEndpoint, provider } = await getAPIConfig(this.read);
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

    public async handleReceiptImage(
        message: IMessage,
        persistence: IPersistence,
        modify: IModify,
        appUser: IUser
    ): Promise<void> {
        const isReceipt = await this.validateImage(message);
        if (!isReceipt) {
            await sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE, message.threadId);
            return;
        }

        await sendMessage(modify, appUser, message.room, "Processing your receipt, please wait...", message.threadId);
        const receiptHandler = new ReceiptHandler(persistence, this.read.getPersistenceReader(), modify);
        const botHandler = new BotHandler(this.http, this.read);

        try {
            const response = await this.processImage(message, RECEIPT_SCAN_PROMPT);
            if (!message.id) {
                await sendMessage(modify, appUser, message.room, "❌ Message ID missing, cannot process receipt.", message.threadId);
                return;
            }
            const parsed = await receiptHandler.parseReceiptData(
                response,
                message.sender.id,
                message.id,
                message.room.id,
                message.threadId
            );

            if (parsed === GENERAL_ERROR_RESPONSE) {
                await sendMessage(modify, appUser, message.room, GENERAL_ERROR_RESPONSE, message.threadId);
                return;
            }

            const receiptData: IReceiptData = JSON.parse(parsed);
            await receiptHandler.addReceiptData(receiptData);
            const currency = await receiptHandler.getCurrencySymbol(message.room.id);
            const question = await botHandler.processResponse(
                RESPONSE_PROMPT(
                    "The user just uploaded a receipt",
                    response,
                    "Ask the user if they want to save the data or not?",
                    RECEIPT_PROCESSOR_INSTRUCTIONS(currency)
                )
            );

            await sendMessage(modify, appUser, message.room, question, message.threadId);
            await sendConfirmationButtons(modify, appUser, message.room, receiptData);
        } catch (error) {
            console.error("Error processing receipt image:", error);
            await sendMessage(modify, appUser, message.room, GENERAL_ERROR_RESPONSE, message.threadId);
        }
    }

    private async convertImageToBase64(message: IMessage): Promise<string> {
        const image = await this.read.getUploadReader().getBufferById(message.file?._id!);
        return image.toString("base64");
    }
}
