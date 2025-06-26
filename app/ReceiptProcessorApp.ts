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
import { GENERAL_ERROR_RESPONSE, INVALID_IMAGE_RESPONSE, SUCCESSFUL_IMAGE_DETECTION_RESPONSE, PROCESSING_IMAGE_RESPONSE, INVALID_SETTINGS_RESPONSE } from './src/const/response';
import { ReceiptCommand } from './src/commands/ReceiptCommand';
import { ImageHandler } from "./src/handler/imageHandler";
import { ReceiptHandler } from './src/handler/receiptHandler';
import { IReceiptData, IReceiptItem } from './src/types/receipt';
import { RECEIPT_PROCESSOR_RESPONSE_PROMPT, COMMAND_TRANSLATION_PROMPT, RECEIPT_SCAN_PROMPT } from "./src/const/prompt";
import {
    IUIKitInteractionHandler,
    UIKitBlockInteractionContext,
    IUIKitResponse
} from '@rocket.chat/apps-engine/definition/uikit';
import { BotHandler } from './src/handler/botHandler';
import { ChannelService } from './src/service/channelService';
import { CommandHandler } from './src/commands/UserCommandHandler';

export class ReceiptProcessorApp extends App implements IPostMessageSent, IUIKitInteractionHandler {
    private commandHandler: CommandHandler | undefined;
    private appUsername: string | undefined;

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
        this.getLogger().info("Thread ID:", message.threadId);
        this.getLogger().info("Message text:", message.text);

        const roomId = message.room.id;
        const userId = message.sender.id;
        const channelService = new ChannelService(persistence, read.getPersistenceReader());

        const userChannels = await channelService.getChannels(userId, this.getLogger());
        this.getLogger().info(`User channels for ${userId}:`, userChannels);
        this.getLogger().info(`Current roomId: ${roomId}`);

        if (!userChannels || !userChannels.includes(roomId)) {
            this.getLogger().info(`Room ${roomId} is not in user ${userId}'s channel list. Ignoring message.`);
            return;
        }

        const appUser = await this.getAccessors().reader.getUserReader().getAppUser(this.getID());
        if (!appUser) {
            this.getLogger().error("App user not found. Message not sent.");
            return;
        }

        if (!this.appUsername) {
            this.appUsername = appUser.username;
        }

        if (!this.commandHandler) {
            this.commandHandler = new CommandHandler(read, modify, persistence, this, appUser);
        }

        const hasImageAttachment = message.attachments?.some(ImageHandler.isImageAttachment) ?? false;
        const messageText = message.text?.trim() || '';
        const isBotMentioned = await this.isBotMentioned(message, read);
        const isTextCommand = this.isReceiptCommand(messageText) && isBotMentioned;

        this.getLogger().info(`Bot mentioned: ${isBotMentioned}`);
        this.getLogger().info(`Is text command: ${isTextCommand}`);
        if (hasImageAttachment) {
            await this.processImageMessage(message, read, http, persistence, modify, appUser);
        }
        else if (isTextCommand && messageText) {
            const cleanedMessage = this.removeBotMention(messageText);
            this.getLogger().info(`Cleaned message: "${cleanedMessage}"`);
            await this.processTextCommand(cleanedMessage, message, read, http, persistence, modify);
        }
    }

    private async isBotMentioned(message: IMessage, read: IRead): Promise<boolean> {
        try {
            const messageText = message.text?.toLowerCase() || '';

            if (!messageText) {
                return false;
            }

            const appUser = await read.getUserReader().getAppUser(this.getID());
            if (!appUser || !appUser.username) {
                this.getLogger().error("Could not get app user or username for mention detection");
                return false;
            }

            const botUsername = appUser.username.toLowerCase();
            const mentionPatterns = [
                new RegExp(`@${this.escapeRegex(botUsername)}(?:[,\\s]|$)`, 'i'),
                new RegExp(`^@${this.escapeRegex(botUsername)}\\b`, 'i'),
                new RegExp(`\\b@${this.escapeRegex(botUsername)}\\b`, 'i')
            ];

            const isMentioned = mentionPatterns.some(pattern => pattern.test(messageText));

            if (isMentioned) {
                this.getLogger().info(`Bot mentioned in message: "${message.text}"`);
                return true;
            }

            this.getLogger().info(`Bot not mentioned in message: "${message.text}"`);
            return false;
        } catch (error) {
            this.getLogger().error("Error checking bot mention:", error);
            return false;
        }
    }

    private escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private removeBotMention(messageText: string): string {
        if (!this.appUsername) return messageText;

        const mentionPatterns = [
            new RegExp(`@${this.escapeRegex(this.appUsername)}[,\\s]*`, 'gi'),
            new RegExp(`^@${this.escapeRegex(this.appUsername)}\\s*`, 'gi'),
            new RegExp(`\\s*@${this.escapeRegex(this.appUsername)}\\s*`, 'gi')
        ];

        let cleanedText = messageText;
        mentionPatterns.forEach(pattern => {
            cleanedText = cleanedText.replace(pattern, ' ');
        });

        return cleanedText.trim();
    }

    private async processImageMessage(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
        appUser: any
    ): Promise<void> {
        const imageProcessor = new ImageHandler(http, read);
        const isReceipt = await imageProcessor.validateImage(message);
        this.getLogger().info("Receipt:", isReceipt);

        const messageId = message.id;
        const threadId = message.threadId;
        const userId = message.sender.id;
        const { modelType, apiKey, apiEndpoint } = await getAPIConfig(read);
        if(modelType == "" || apiKey == "" || apiEndpoint == "") {
            await sendMessage(modify, appUser, message.room, INVALID_SETTINGS_RESPONSE, threadId);
        }
        if (isReceipt && messageId) {
            const receiptHandler = new ReceiptHandler(persistence, read.getPersistenceReader(), modify);
            const botHandler = new BotHandler(http, read);
            await sendMessage(modify, appUser, message.room, PROCESSING_IMAGE_RESPONSE, threadId);
            const response = await imageProcessor.processImage(message, RECEIPT_SCAN_PROMPT);
            const result = await receiptHandler.parseReceiptData(response, userId, messageId, message.room.id, threadId);

            this.getLogger().info("Result:", result);
            if (result === INVALID_IMAGE_RESPONSE) {
                await sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE, threadId);
            } else {
                try {
                    const parsedResult = JSON.parse(result);
                    const receiptData: IReceiptData = {
                        userId,
                        messageId,
                        threadId,
                        roomId: message.room.id,
                        items: parsedResult.items as IReceiptItem[],
                        extraFee: parsedResult.extraFee,
                        totalPrice: parsedResult.totalPrice,
                        uploadedDate: parsedResult.uploadedDate,
                        receiptDate: parsedResult.receiptDate
                    };

                    const question = await botHandler.processResponse(
                        RECEIPT_PROCESSOR_RESPONSE_PROMPT(
                            "The user just uploaded photo of a receipt",
                            result,
                            "Ask the user if they want to save the data or not ?"
                        )
                    );

                    await sendMessage(modify, appUser, message.room, question, threadId);
                    await sendConfirmationButtons(modify, appUser, message.room, receiptData);
                } catch (error) {
                    this.getLogger().info("Failed to parse receipt data for human-readable output:", error);
                    await sendMessage(modify, appUser, message.room, GENERAL_ERROR_RESPONSE, threadId);
                }
            }
        } else {
            await sendMessage(modify, appUser, message.room, INVALID_IMAGE_RESPONSE, threadId);
        }
    }

    private async processTextCommand(
        messageText: string,
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        try {
            this.getLogger().info(`Processing text command: "${messageText}"`);
            const botHandler = new BotHandler(http, read);
            const commandJson = await botHandler.processResponse(
                `${COMMAND_TRANSLATION_PROMPT}\n\nUser message: "${messageText}"`
            );

            this.getLogger().info('Command JSON:', commandJson);
            const parsedCommand = JSON.parse(commandJson);
            const params = parsedCommand.params || this.extractParams(messageText);
            if (this.commandHandler) {
                await this.commandHandler.executeCommand(
                    parsedCommand.command,
                    message.room,
                    message.sender,
                    params,
                    message.threadId
                );
            }
        } catch (error) {
            this.getLogger().error('Error processing text command:', error);
            if (this.commandHandler) {
                await this.commandHandler.executeCommand(
                    'help',
                    message.room,
                    message.sender,
                    undefined,
                    message.threadId
                );
            }
        }
    }

    private isReceiptCommand(messageText: string): boolean {
        if (!messageText) return false;

        const lowerText = messageText.toLowerCase();
        const keywords = [
            'receipt', 'receipts', 'show', 'list', 'display',
            'my receipts', 'room receipts', 'thread receipts',
            'add channel', 'help', 'date', 'yesterday', 'today',
            'spending', 'total', 'export', 'search', 'find'
        ];

        return keywords.some(keyword => lowerText.includes(keyword));
    }

    private extractParams(message: string): any {
        const params: any = {};
        const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})|today|yesterday|tomorrow/i);
        if (dateMatch) {
            if (dateMatch[0].match(/\d{4}-\d{2}-\d{2}/)) {
                params.date = dateMatch[0];
            } else {
                const today = new Date();
                switch (dateMatch[0].toLowerCase()) {
                    case 'today':
                        params.date = today.toISOString().split('T')[0];
                        break;
                    case 'yesterday':
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        params.date = yesterday.toISOString().split('T')[0];
                        break;
                    case 'tomorrow':
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        params.date = tomorrow.toISOString().split('T')[0];
                        break;
                }
            }
        }

        const searchMatch = message.match(/(?:with|for|containing|about)\s+(.+)/i);
        if (searchMatch) {
            params.searchTerm = searchMatch[1].trim();
        }

        return Object.keys(params).length > 0 ? params : undefined;
    }

    public async executeBlockActionHandler(
    context: UIKitBlockInteractionContext,
    read: IRead,
    http: IHttp,
    persistence: IPersistence,
    modify: IModify
): Promise<IUIKitResponse> {
    this.getLogger().info("Block action handler called!");
    const data = context.getInteractionData();
    const appUser = await read.getUserReader().getAppUser();
    const receiptHandler = new ReceiptHandler(persistence, read.getPersistenceReader(), modify);
    const receiptData = data.value ? JSON.parse(data.value) : undefined;

    if (data.actionId === "confirm-save-receipt" && appUser) {
        this.getLogger().info("Receipt Data : ", receiptData)
        await receiptHandler.addReceiptData(receiptData);
        const builder = modify.getCreator().startMessage()
            .setSender(appUser)
            .setRoom(data.room!)
            .setText(SUCCESSFUL_IMAGE_DETECTION_RESPONSE);

        if (receiptData.threadId) {
            builder.setThreadId(receiptData.threadId);
        }
        await modify.getCreator().finish(builder);

        if (data.message && appUser) {
            await modify.getDeleter().deleteMessage(data.message, appUser);
        }
    } else if (data.actionId === "cancel-save-receipt" && appUser) {
        const builder = modify.getCreator().startMessage()
            .setSender(appUser)
            .setRoom(data.room!)
            .setText('Receipt saving cancelled.');

        if (receiptData.threadId) {
            builder.setThreadId(receiptData.threadId);
        }
        await modify.getCreator().finish(builder);

        if (data.message && appUser) {
            await modify.getDeleter().deleteMessage(data.message, appUser);
        }
    } else if (data.actionId === "delete-receipt-data" && appUser) {
        await receiptHandler.deleteReceiptData(receiptData.userId, receiptData.threadId, receiptData.roomId, receiptData.messageId);
        try {
            const updatedReceipts = await receiptHandler.getReceiptsForUpdate(receiptData.roomId, receiptData.threadId);

            if (data.message && data.message.id) {
                if (updatedReceipts && updatedReceipts.length > 0) {
                    const blockBuilder = modify.getCreator().getBlockBuilder();
                    receiptHandler.formatReceiptsSummaryWithBlocks(blockBuilder, updatedReceipts);

                    const updater = await modify.getUpdater().message(data.message.id, appUser);
                    updater.setEditor(appUser).setBlocks(blockBuilder);
                    await modify.getUpdater().finish(updater);
                } else {
                    const updater = await modify.getUpdater().message(data.message.id, appUser);
                    updater.setEditor(appUser).setText("All receipts have been deleted.");
                    await modify.getUpdater().finish(updater);
                }
            }
            const builder = modify.getCreator().startMessage()
                .setSender(appUser)
                .setRoom(data.room!)
                .setText('Receipt deleted successfully.');

            if (receiptData.threadId) {
                builder.setThreadId(receiptData.threadId);
            }
            await modify.getCreator().finish(builder);

        } catch (error) {
            this.getLogger().info("Error updating receipt list after deletion:", error);
            const builder = modify.getCreator().startMessage()
                .setSender(appUser)
                .setRoom(data.room!)
                .setText('Receipt deleted, but failed to update the list. Please refresh the list manually.');

            if (receiptData.threadId) {
                builder.setThreadId(receiptData.threadId);
            }
            await modify.getCreator().finish(builder);
        }
    }

    return context.getInteractionResponder().successResponse();
}

    public async checkPostMessageSent(message: IMessage): Promise<boolean> {
        this.getLogger().info("Message Attachments:", message.attachments);
        this.getLogger().info("Message ID:", message.id);
        this.getLogger().info("Thread ID:", message.threadId);
        this.getLogger().info("Message text:", message.text);

        const hasImageAttachment = message.attachments?.some(ImageHandler.isImageAttachment) ?? false;

        const isBotMentioned = await this.isBotMentioned(message, this.getAccessors().reader);
        const hasReceiptCommand = this.isReceiptCommand(message.text || '') && isBotMentioned;

        this.getLogger().info(`Has image: ${hasImageAttachment}, Bot mentioned: ${isBotMentioned}, Has command: ${hasReceiptCommand}`);
        return hasImageAttachment || hasReceiptCommand;
    }
}
