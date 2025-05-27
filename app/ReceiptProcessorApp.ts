import {
    IAppAccessors,
    ILogger,
    IRead,
    IConfigurationExtend,
    IHttp,
    IModify,
    IPersistence
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IMessage, IPostMessageSent } from "@rocket.chat/apps-engine/definition/messages";
import { getAPIConfig, settings } from './src/config/settings';
import { sendMessage, sendConfirmationButtons } from "./src/utils/message";
import { GENERAL_ERROR_RESPONSE, INVALID_IMAGE_RESPONSE, SUCCESSFUL_IMAGE_DETECTION_RESPONSE } from './src/const/response';
import { ReceiptCommand } from './src/commands/ReceiptCommand';
import { ImageHandler } from "./src/handler/imageHandler";
import { ReceiptHandler } from './src/handler/receiptHandler';
import { IReceiptData, IReceiptItem } from './src/domain/receipt';
import { OCR_SYSTEM_PROMPT, RECEIPT_SCAN_PROMPT, RECEIPT_VALIDATION_PROMPT } from "./src/const/prompt";
import { modelStorage, PromptLibrary } from "./src/contrib/prompt-library/npm-module"
import {
    IUIKitInteractionHandler,
    UIKitBlockInteractionContext,
    IUIKitResponse
} from '@rocket.chat/apps-engine/definition/uikit';

export class ReceiptProcessorApp extends App implements IPostMessageSent, IUIKitInteractionHandler {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend
    ): Promise<void> {
        await Promise.all([
            ...settings.map((setting) =>
                configuration.settings.provideSetting(setting)
            ),
            configuration.slashCommands.provideSlashCommand(
                new ReceiptCommand(this)
            ),
            this.initializePromptLibrary()
        ]);
    }

    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        this.getLogger().info("Execute post message sent")
        const appUser = await this.getAccessors().reader.getUserReader().getAppUser(this.getID())
        const imageProcessor = new ImageHandler(http, read)
        const isReceipt = await imageProcessor.validateImage(message)
        const userId = message.sender.id
        const messageId = message.id
        const { modelType } = await getAPIConfig(read);

        if (appUser) {
            if(isReceipt && messageId) {
                const receiptHandler = new ReceiptHandler(persistence, read.getPersistenceReader(), modify)

                const response = await imageProcessor.processImage(message, PromptLibrary.getPrompt(modelType, "RECEIPT_SCAN_PROMPT"))
                const result = await receiptHandler.parseReceiptData(response, userId, messageId, message.room.id)

                if (result === INVALID_IMAGE_RESPONSE) {
                    sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE);
                } else {
                    try {
                        this.getLogger().info(result)
                        const parsedResult = JSON.parse(result);
                        this.getLogger().info(parsedResult)
                        const receiptData: IReceiptData = {
                            userId,
                            messageId,
                            roomId: message.room.id,
                            items: parsedResult.items as IReceiptItem[],
                            extraFee: parsedResult.extraFee,         // <-- CORRECT
                            totalPrice: parsedResult.totalPrice,     // <-- CORRECT
                            uploadedDate: new Date(),
                            receiptDate: parsedResult.receiptDate    // <-- CORRECT
                        };

                        const botResponse = receiptHandler.convertReceiptDataToResponse(receiptData);
                        let question = "Are you sure to save this receipt data ? (yes / no)"
                        sendMessage(modify, appUser, message.room, botResponse);
                        sendMessage(modify, appUser, message.room, question);
                        await sendConfirmationButtons(modify, appUser, message.room, receiptData);
                    } catch (error) {
                        this.getLogger().error("Failed to parse receipt data for human-readable output:", error);
                        sendMessage(modify, appUser, message.room, GENERAL_ERROR_RESPONSE)
                    }
                }
            } else {
                sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE);
            }
        } else {
            this.getLogger().error("App user not found. Message not sent.")
        }
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();
        const appUser = await read.getUserReader().getAppUser();
        const receiptHandler = new ReceiptHandler(persistence, read.getPersistenceReader(), modify)

        if (data.actionId === 'confirm-save-receipt' && appUser) {
            const receiptData = data.value ? JSON.parse(data.value) : undefined;
            await receiptHandler.addReceiptData(receiptData)
            const builder = modify.getCreator().startMessage()
                .setSender(appUser)
                .setRoom(data.room!)
                .setText(SUCCESSFUL_IMAGE_DETECTION_RESPONSE);
            await modify.getCreator().finish(builder);
        } else if (data.actionId === 'cancel-save-receipt' && appUser) {
            const builder = modify.getCreator().startMessage()
                .setSender(appUser)
                .setRoom(data.room!)
                .setText('Receipt saving cancelled.');
            await modify.getCreator().finish(builder);
        }

        if (data.message && appUser) {
            await modify.getDeleter().deleteMessage(data.message, appUser);
        }

        return context.getInteractionResponder().successResponse();
    }

    public async checkPostMessageSent(message: IMessage): Promise<boolean> {
        this.getLogger().info("Message Attachments:", message.attachments);
        return message.attachments?.some(ImageHandler.isImageAttachment) ?? false;
    }

    private initializePromptLibrary() {
        modelStorage.initialize(
            {
                "OCR_SYSTEM_PROMPT": OCR_SYSTEM_PROMPT,
                "RECEIPT_SCAN_PROMPT": RECEIPT_SCAN_PROMPT,
                "RECEIPT_VALIDATION_PROMPT": RECEIPT_VALIDATION_PROMPT
            },
            [
                {
                    name: "meta-llama/Llama-3.2-11B-Vision-Instruct",
                    parameters: "11B",
                    quantization: "Vision",
                    prompts: ["OCR_SYSTEM_PROMPT", "RECEIPT_SCAN_PROMPT", "RECEIPT_VALIDATION_PROMPT"]
                }
            ]
        );
    }
}
