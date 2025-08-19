import {
    IAppAccessors,
    ILogger,
    IRead,
    IConfigurationExtend,
    IHttp,
    IModify,
    IPersistence,
    IAppInstallationContext,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import {
    IMessage,
    IPostMessageSent,
} from "@rocket.chat/apps-engine/definition/messages";
import { getAPIConfig, settings } from "./src/config/settings";
import { sendMessage, sendConfirmationButtons } from "./src/utils/message";
import {
    GENERAL_ERROR_RESPONSE,
    INVALID_IMAGE_RESPONSE,
    LLM_UNAVAILABLE_RESPONSE,
    FIRST_INSTALL_RESPONSE,
    UNREGISTERED_CHANNEL_RESPONSE
} from "./src/const/response";
import { ReceiptCommand } from "./src/commands/ReceiptCommand";
import { ImageHandler } from "./src/handler/imageHandler";
import { ReceiptHandler } from "./src/handler/receiptHandler";
import { IReceiptData, IReceiptItem } from "./src/types/receipt";
import {
    RECEIPT_PROCESSOR_INSTRUCTIONS,
    RECEIPT_CONFIRMATION_INSTRUCTIONS,
    RECEIPT_PROCESSING_INSTRUCTIONS,
} from "./src/prompts/ocr/receiptDialoguePrompt";
import { RECEIPT_SCAN_PROMPT } from "./src/prompts/ocr/receiptScanPrompt";
import {
    COMMAND_TRANSLATION_PROMPT_COMMANDS,
    COMMAND_TRANSLATION_PROMPT_EXAMPLES,
} from "./src/prompts/commands/commandTranslationPrompt";
import {
    IUIKitInteractionHandler,
    UIKitBlockInteractionContext,
    IUIKitResponse,
    UIKitViewSubmitInteractionContext,
    UIKitViewCloseInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { BotHandler } from "./src/handler/botHandler";
import { ChannelHandler } from "./src/handler/channelHandler";
import { CommandHandler } from "./src/commands/UserCommandHandler";
import {
    COMMAND_TRANSLATION_PROMPT,
    RESPONSE_PROMPT,
} from "./src/prompt_library/const/prompt";
import { createEditReceiptModal } from "./src/modals/editReceiptModal";
import { CommandParseHandler } from "./src/commands/CommandParserHandler";
import { sendDirectMessage } from "./src/utils/message";
import {
    RocketChatAssociationRecord,
    RocketChatAssociationModel,
} from "@rocket.chat/apps-engine/definition/metadata";

export class ReceiptProcessorApp
    extends App
    implements IPostMessageSent, IUIKitInteractionHandler
{
    private commandHandler: CommandHandler | undefined;
    private channelHandler: ChannelHandler | undefined;
    private botHandler: BotHandler | undefined;

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

    private async getAppUser() {
        const appUser = await this.getAccessors()
            .reader.getUserReader()
            .getAppUser(this.getID());
        if (!appUser) {
            this.getLogger().error("App user not found. Message not sent.");
        }
        return appUser;
    }

    public async onInstall(
        context: IAppInstallationContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        this.getLogger().info("Receipt Processor App installed!");
        try {
            const installer: IUser | undefined = context.user;
            if (!installer) {
                this.getLogger().error("Installer user not found in context.");
                return;
            }

            await sendDirectMessage(
                read,
                modify,
                installer,
                FIRST_INSTALL_RESPONSE
            );
        } catch (error) {
            this.getLogger().error("Error sending welcome message:", error);
        }
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
        const appUser = await this.getAppUser();
        if (!appUser) return;
        if (!this.commandHandler) {
            this.commandHandler = new CommandHandler(
                read,
                modify,
                persistence,
                http,
                this,
                appUser
            );
        }

        if (!this.channelHandler) {
            this.channelHandler = new ChannelHandler(read, persistence);
        }

        if (!this.botHandler) {
            this.botHandler = new BotHandler(http, read);
        }

        const { modelType, apiKey, apiEndpoint } = await getAPIConfig(read);
        if (modelType == "" || apiKey == "" || apiEndpoint == "") {
            await sendMessage(
                modify,
                appUser,
                message.room,
                LLM_UNAVAILABLE_RESPONSE,
                message.threadId
            );
            return;
        }

        const userChannels = await this.channelHandler.getUserChannels(userId);
        const isBotMentioned = await this.botHandler.isBotMentioned(
            message,
            appUser
        );

        if (!userChannels || !userChannels.includes(roomId)) {
            await this.channelHandler.handleUnregisteredChannel(
                isBotMentioned,
                message,
                modify,
                appUser,
                async (messageText: string, msg: IMessage) => {
                    const commandJson = await this.botHandler!.processResponse(
                        COMMAND_TRANSLATION_PROMPT(
                            COMMAND_TRANSLATION_PROMPT_COMMANDS,
                            COMMAND_TRANSLATION_PROMPT_EXAMPLES(
                                new Date().toISOString().slice(0, 10)
                            ),
                            messageText
                        )
                    );

                    this.getLogger().info("Command JSON:", commandJson);
                    try {
                        const parsedCommand = JSON.parse(commandJson);
                        if (
                            parsedCommand.command === "add_channel" ||
                            parsedCommand.command == "create_channel"
                        ) {
                            if (this.commandHandler) {
                                await this.commandHandler.executeCommand(
                                    parsedCommand.command,
                                    msg.room,
                                    msg.sender,
                                    parsedCommand.params,
                                    msg.threadId
                                );
                            }
                        } else {
                            await sendMessage(
                                modify,
                                appUser,
                                msg.room,
                                UNREGISTERED_CHANNEL_RESPONSE,
                                msg.threadId
                            );
                        }
                    } catch (error) {
                        await sendMessage(
                            modify,
                            appUser,
                            msg.room,
                            UNREGISTERED_CHANNEL_RESPONSE,
                            msg.threadId
                        );
                    }
                }
            );
            return;
        }

        const hasImageAttachment = message.attachments?.some(ImageHandler.isImageAttachment) ?? false;
        const messageText = message.text?.trim() || "";

        if (hasImageAttachment) {
            await sendMessage(
                modify,
                appUser,
                message.room,
                "Processing your image, please wait...",
                message.threadId
            );
            await this.processImageMessage(
                message,
                read,
                http,
                persistence,
                modify,
                appUser
            );
        } else if (isBotMentioned && messageText) {
            const cleanedMessage =
                this.botHandler.removeBotMention(messageText);
            await this.processTextCommand(
                cleanedMessage,
                message,
                read,
                http,
                modify
            );
        }
    }

    private async processImageMessage(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
        appUser: IUser
    ): Promise<void> {
        const imageHandler = new ImageHandler(http, read);
        const isReceipt = await imageHandler.validateImage(message);
        this.getLogger().info("Receipt:", isReceipt);

        const messageId = message.id;
        const threadId = message.threadId;
        const userId = message.sender.id;
        const { modelType, apiKey, apiEndpoint } = await getAPIConfig(read);
        if (modelType === "" || apiKey === "" || apiEndpoint === "") {
            await sendMessage(
                modify,
                appUser,
                message.room,
                LLM_UNAVAILABLE_RESPONSE,
                threadId
            );
            return;
        }

        if (isReceipt && messageId) {
            const receiptHandler = new ReceiptHandler(
                persistence,
                read.getPersistenceReader(),
                modify
            );
            const botHandler = new BotHandler(http, read);
            const context = "The user just uploaded photo of a valid receipt";
            const processResponse = await botHandler.processResponse(
                RESPONSE_PROMPT(
                    context,
                    "",
                    RECEIPT_PROCESSING_INSTRUCTIONS,
                    ""
                )
            );
            await sendMessage(
                modify,
                appUser,
                message.room,
                processResponse,
                threadId
            );

            const response = await imageHandler.processImage(
                message,
                RECEIPT_SCAN_PROMPT
            );

            const result = await receiptHandler.parseReceiptData(
                response,
                userId,
                messageId,
                message.room.id,
                threadId
            );

            this.getLogger().info("Result:", result);
            if (result === INVALID_IMAGE_RESPONSE) {
                await sendMessage(
                    modify,
                    appUser,
                    message.room,
                    INVALID_IMAGE_RESPONSE,
                    threadId
                );
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
                        discounts: parsedResult.discounts,
                        receiptDate: parsedResult.receiptDate,
                    };

                    const context = "The user just uploaded photo of a receipt";
                    const response =
                        "Ask the user if they want to save the data or not ?";
                    const question = await botHandler.processResponse(
                        RESPONSE_PROMPT(
                            context,
                            result,
                            response,
                            RECEIPT_PROCESSOR_INSTRUCTIONS
                        )
                    );

                    await sendMessage(
                        modify,
                        appUser,
                        message.room,
                        question,
                        threadId
                    );
                    await sendConfirmationButtons(
                        modify,
                        appUser,
                        message.room,
                        receiptData
                    );
                } catch (error) {
                    this.getLogger().info(
                        "Failed to parse receipt data for human-readable output:",
                        error
                    );
                    await sendMessage(
                        modify,
                        appUser,
                        message.room,
                        GENERAL_ERROR_RESPONSE,
                        threadId
                    );
                }
            }
        } else {
            await sendMessage(
                modify,
                appUser,
                message.room,
                INVALID_IMAGE_RESPONSE,
                threadId
            );
        }
    }

    private async processTextCommand(
        messageText: string,
        message: IMessage,
        read: IRead,
        http: IHttp,
        modify: IModify
    ): Promise<void> {
        try {
            this.getLogger().info(`Processing text command: "${messageText}"`);
            const botHandler = new BotHandler(http, read);
            const currentDate = new Date().toISOString().slice(0, 10);

            const commandTranslationPrompt = COMMAND_TRANSLATION_PROMPT(
                COMMAND_TRANSLATION_PROMPT_COMMANDS,
                COMMAND_TRANSLATION_PROMPT_EXAMPLES(currentDate),
                messageText
            );
            const commandJson = await botHandler.processResponse(
                commandTranslationPrompt
            );

            this.getLogger().info("Command JSON:", commandJson);
            const parsedCommand = JSON.parse(commandJson);
            let params =
                parsedCommand.params ||
                CommandParseHandler.extractParams(commandJson);
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
            this.getLogger().error("Error processing text command:", error);
            if (this.commandHandler) {
                await this.commandHandler.executeCommand(
                    "help",
                    message.room,
                    message.sender,
                    undefined,
                    message.threadId
                );
            }
        }
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
        const appUser = await this.getAppUser();
        const receiptHandler = new ReceiptHandler(
            persistence,
            read.getPersistenceReader(),
            modify
        );
        const botHandler = new BotHandler(http, read);
        const receiptData = data.value ? JSON.parse(data.value) : undefined;

        if (data.actionId === "confirm-save-receipt" && appUser) {
            this.getLogger().info("Receipt Data : ", receiptData);
            const addReceiptPromise =
                receiptHandler.addReceiptData(receiptData);
            const deleteMessagePromise =
                data.message && appUser
                    ? modify.getDeleter().deleteMessage(data.message, appUser)
                    : Promise.resolve();
            const context = "The user just saved the receipt data";
            const processResponsePromise = botHandler.processResponse(
                RESPONSE_PROMPT(
                    context,
                    data.value ? data.value : "",
                    RECEIPT_CONFIRMATION_INSTRUCTIONS,
                    ""
                )
            );

            const [_, processResponse] = await Promise.all([
                addReceiptPromise,
                processResponsePromise,
                deleteMessagePromise,
            ]);

            const builder = modify
                .getCreator()
                .startMessage()
                .setSender(appUser)
                .setRoom(data.room!)
                .setText(processResponse);

            if (receiptData.threadId) {
                builder.setThreadId(receiptData.threadId);
            }
            await modify.getCreator().finish(builder);
        } else if (data.actionId === "edit-receipt-data") {
            const blockBuilder = modify.getCreator().getBlockBuilder();
            const modal = await createEditReceiptModal(
                blockBuilder,
                receiptData,
                persistence
            );

            return context
                .getInteractionResponder()
                .openModalViewResponse(modal);
        } else if (data.actionId === "cancel-save-receipt" && appUser) {
            const builder = modify
                .getCreator()
                .startMessage()
                .setSender(appUser)
                .setRoom(data.room!)
                .setText("Receipt saving cancelled.");

            if (receiptData.threadId) {
                builder.setThreadId(receiptData.threadId);
            }
            await modify.getCreator().finish(builder);

            if (data.message && appUser) {
                await modify.getDeleter().deleteMessage(data.message, appUser);
            }
        } else if (data.actionId === "delete-receipt-data" && appUser) {
            await receiptHandler.deleteReceiptData(
                receiptData.userId,
                receiptData.threadId,
                receiptData.roomId,
                receiptData.messageId
            );

            if (data.message && appUser) {
                await modify.getDeleter().deleteMessage(data.message, appUser);
            }

            const updatedReceipts = await receiptHandler.getReceiptsForUpdate(
                receiptData.roomId,
                receiptData.threadId
            );

            if (updatedReceipts && updatedReceipts.length > 0) {
                const blockBuilder = modify.getCreator().getBlockBuilder();
                await receiptHandler.formatReceiptsSummaryWithBlocks(
                    blockBuilder,
                    updatedReceipts,
                    receiptData.roomId
                );

                const builder = modify
                    .getCreator()
                    .startMessage()
                    .setSender(appUser)
                    .setRoom(data.room!)
                    .setBlocks(blockBuilder);

                if (receiptData.threadId) {
                    builder.setThreadId(receiptData.threadId);
                }

                await modify.getCreator().finish(builder);
            } else {
                const builder = modify
                    .getCreator()
                    .startMessage()
                    .setSender(appUser)
                    .setRoom(data.room!)
                    .setText("✅ All receipts have been deleted.");

                if (receiptData.threadId) {
                    builder.setThreadId(receiptData.threadId);
                }

                await modify.getCreator().finish(builder);
            }
        } else if (data.actionId.startsWith("removeItem-")) {
            if (!data.value) {
                return context.getInteractionResponder().errorResponse();
            }

            const { modalId, itemId } = JSON.parse(data.value) as {
                modalId: string;
                itemId: string;
            };

            const stored = await receiptHandler.getModals(modalId);
            if (stored) {
                const receiptData = stored as IReceiptData;
                receiptData.items = receiptData.items.filter(
                    (i) => i.id !== itemId
                );

                await persistence.updateByAssociation(
                    new RocketChatAssociationRecord(
                        RocketChatAssociationModel.MISC,
                        modalId
                    ),
                    receiptData,
                    true
                );

                const blockBuilder = modify.getCreator().getBlockBuilder();
                const updatedModal = await createEditReceiptModal(
                    blockBuilder,
                    receiptData,
                    persistence,
                    modalId
                );

                return context
                    .getInteractionResponder()
                    .updateModalViewResponse(updatedModal);
            }
        }

        return context.getInteractionResponder().successResponse();
    }

    public async checkPostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp
    ): Promise<boolean> {
        const appUser = await this.getAppUser();
        if (!appUser) return false;
        if (message.sender.id === appUser.id) {
            return false;
        }
        if (!this.botHandler) {
            this.botHandler = new BotHandler(http, read);
        }

        const hasImageAttachment =
            message.attachments?.some(ImageHandler.isImageAttachment) ?? false;
        const isBotMentioned = await this.botHandler.isBotMentioned(
            message,
            appUser
        );

        return hasImageAttachment || isBotMentioned;
    }

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        this.getLogger().info("View submit handler called!");
        const { view } = context.getInteractionData();
        const modalId = view.id;

        const receiptHandler = new ReceiptHandler(
            persistence,
            read.getPersistenceReader(),
            modify
        );

        try {
            const state = view.state as any;
            const receiptDate = state["receipt-edit-form"]?.receiptDate;
            const extraFee = Number(state["extra-fee"]?.extraFee || 0);
            const discounts = Number(state["discounts"]?.discounts || 0);
            const totalPrice = Number(state["total-price"]?.totalPrice || 0);

            const stored = await receiptHandler.getModals(modalId);
            const originalData = stored as IReceiptData;
            const roomId = originalData.roomId;

            const items: IReceiptItem[] = originalData.items.map((item) => {
                const name =
                    state[`item-name-${item.id}`]?.[`itemName-${item.id}`] ||
                    item.name;
                const quantity = Number(
                    state[`item-quantity-${item.id}`]?.[
                        `itemQuantity-${item.id}`
                    ] || item.quantity
                );
                const price = Number(
                    state[`item-price-${item.id}`]?.[`itemPrice-${item.id}`] ||
                        item.price
                );

                return {
                    id: item.id,
                    name,
                    quantity,
                    price,
                };
            });

            const room = await read.getRoomReader().getById(roomId);
            if (!room) {
                this.getLogger().error(`Room not found for id: ${roomId}`);
                return context.getInteractionResponder().errorResponse();
            }

            const updatedData: IReceiptData = {
                userId: originalData.userId,
                messageId: originalData.messageId,
                threadId: originalData.threadId,
                roomId: originalData.roomId,
                receiptDate: receiptDate || originalData.receiptDate,
                extraFee,
                discounts,
                totalPrice,
                items,
            };

            if (!receiptDate || items.length === 0) {
                return context.getInteractionResponder().errorResponse();
            }

            const appUser = await this.getAppUser();
            if (!appUser) {
                this.getLogger().error("App user not found.");
                return context.getInteractionResponder().errorResponse();
            }

            await receiptHandler.updateReceiptData(updatedData, room, appUser);
            await receiptHandler.deleteModal(modalId);

            return context.getInteractionResponder().successResponse();
        } catch (error) {
            this.getLogger().error("Error in executeViewSubmitHandler:", error);
            return context.getInteractionResponder().errorResponse();
        }
    }

    public async executeViewClosedHandler(
        context: UIKitViewCloseInteractionContext
    ): Promise<IUIKitResponse> {
        this.getLogger().info("Modal was closed (not submitted).");
        return context.getInteractionResponder().successResponse();
    }
}
