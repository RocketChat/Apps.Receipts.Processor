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
import { isImageAttachment, processImage, validateImage } from "./src/lib/imageProcessing"
import { settings } from './src/config/settings';
import { sendMessage } from "./src/utils/message";
import { RECEIPT_SCAN_PROMPT } from './src/const/prompt';
import { GENERAL_ERROR_RESPONSE, INVALID_IMAGE_RESPONSE, SUCCESSFUL_IMAGE_DETECTION_RESPONSE } from './src/const/response';
import { parseReceiptData, convertReceiptDataToResponse } from './src/lib/receiptProcessing';
import { IReceiptData, IReceiptItem } from './src/domain/receipt';
import { ReceiptCommand } from './src/commands/ReceiptCommand';

export class ReceiptProcessorApp extends App implements IPostMessageSent {
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
            )
        ]);
    }

    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        this.getLogger().info("Execute post message sent");
        const appUser = await this.getAccessors().reader.getUserReader().getAppUser(this.getID())
        const isReceipt = await validateImage(http, message, read)
        const userId = message.sender.id
        const messageId = message.id

        if (appUser) {
            if(isReceipt && messageId) {
                const response = await processImage(http, message, read, RECEIPT_SCAN_PROMPT)
                const result = await parseReceiptData(response, userId, messageId, message.room.id, persistence);

                if (result === INVALID_IMAGE_RESPONSE) {
                    sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE);
                } else {
                    try {
                        const parsedResult = JSON.parse(result);
                        const receiptData: IReceiptData = {
                            userId,
                            messageId,
                            roomId: message.room.id,
                            items: parsedResult.items as IReceiptItem[],
                            extraFee: parsedResult.extra_fees,
                            totalPrice: parsedResult.total_price,
                            uploadedDate: new Date(),
                            receiptDate: parsedResult.receipt_date
                        };
                        const botResponse = convertReceiptDataToResponse(receiptData);
                        sendMessage(modify, appUser, message.room, botResponse);
                        sendMessage(modify, appUser, message.room, SUCCESSFUL_IMAGE_DETECTION_RESPONSE)
                    } catch (error) {
                        this.getLogger().error("Failed to parse receipt data for human-readable output:", error);
                        sendMessage(modify, appUser, message.room, GENERAL_ERROR_RESPONSE);
                    }
                }
            } else {
                sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE)
            }
        } else {
            this.getLogger().error("App user not found. Message not sent.");
        }
    }

    public async checkPostMessageSent(message: IMessage): Promise<boolean> {
        this.getLogger().info("Message Attachments:", message.attachments);
        return message.attachments?.some(isImageAttachment) ?? false;
    }
}
