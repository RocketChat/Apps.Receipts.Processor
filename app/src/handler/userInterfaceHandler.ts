import {
    UIKitBlockInteractionContext,
    UIKitViewSubmitInteractionContext,
    UIKitViewCloseInteractionContext,
    IUIKitResponse,
} from "@rocket.chat/apps-engine/definition/uikit";
import {
    IRead,
    IHttp,
    IPersistence,
    IModify,
} from "@rocket.chat/apps-engine/definition/accessors";
import { ILogger } from "@rocket.chat/apps-engine/definition/accessors";
import { ReceiptHandler } from "./receiptHandler";
import { BotHandler } from "./botHandler";
import { createEditReceiptModal } from "../modals/editReceiptModal";
import { IReceiptData, IReceiptItem } from "../types/receipt";
import { ReceiptModalState } from "../types/modal";
import { RESPONSE_PROMPT } from "../prompt_library/const/prompt";
import { RECEIPT_CONFIRMATION_INSTRUCTIONS } from "../prompts/ocr/receiptDialoguePrompt";
import {
    RocketChatAssociationRecord,
    RocketChatAssociationModel,
} from "@rocket.chat/apps-engine/definition/metadata";
import { toDateString } from "../utils/date";

export class UserInterfaceHandler {
    constructor(private logger: ILogger, private appId: string) {}

    private async getAppUser(read: IRead) {
        return read.getUserReader().getAppUser(this.appId);
    }

    public async handleBlockAction(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        this.logger.info("Block action handler called!");
        const data = context.getInteractionData();
        const appUser = await this.getAppUser(read);
        const receiptHandler = new ReceiptHandler(
            persistence,
            read.getPersistenceReader(),
            modify
        );
        const botHandler = new BotHandler(http, read);
        const receiptData = data.value ? JSON.parse(data.value) : undefined;

        switch (data.actionId) {
            case "confirm-save-receipt":
                if (appUser && receiptData) {
                    await receiptHandler.addReceiptData(receiptData);
                    if (data.message) {
                        await modify.getDeleter().deleteMessage(data.message, appUser);
                    }
                    const processResponse = await botHandler.processResponse(
                        RESPONSE_PROMPT(
                            "The user just saved the receipt data",
                            data.value || "",
                            RECEIPT_CONFIRMATION_INSTRUCTIONS,
                            ""
                        )
                    );
                    const builder = modify
                        .getCreator()
                        .startMessage()
                        .setSender(appUser)
                        .setRoom(data.room!)
                        .setText(processResponse);
                    if (receiptData.threadId) builder.setThreadId(receiptData.threadId);
                    await modify.getCreator().finish(builder);
                }
                break;

            case "edit-receipt-data":
                if (!data.message || !data.message.id) {
                    return context.getInteractionResponder().errorResponse();
                }
                const blockBuilder = modify.getCreator().getBlockBuilder();
                const modal = await createEditReceiptModal(
                    blockBuilder,
                    { ...receiptData, confirmationMessageId: data.message.id },
                    persistence
                );
                return context.getInteractionResponder().openModalViewResponse(modal);

            case "cancel-save-receipt":
                if (appUser && receiptData) {
                    const builder = modify
                        .getCreator()
                        .startMessage()
                        .setSender(appUser)
                        .setRoom(data.room!)
                        .setText("Receipt saving cancelled.");
                    if (receiptData.threadId) builder.setThreadId(receiptData.threadId);
                    await modify.getCreator().finish(builder);
                    if (data.message) {
                        await modify.getDeleter().deleteMessage(data.message, appUser);
                    }
                }
                break;

            case "delete-receipt-data":
                if (appUser && receiptData) {
                    await receiptHandler.deleteReceiptData(
                        receiptData.userId,
                        receiptData.threadId,
                        receiptData.roomId,
                        receiptData.messageId
                    );
                    if (data.message) {
                        await modify.getDeleter().deleteMessage(data.message, appUser);
                    }
                    // update summary
                    const updatedReceipts = await receiptHandler.getReceiptsForUpdate(
                        receiptData.roomId,
                        receiptData.threadId
                    );
                    if (updatedReceipts?.length) {
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
                        if (receiptData.threadId) builder.setThreadId(receiptData.threadId);
                        await modify.getCreator().finish(builder);
                    } else {
                        const builder = modify
                            .getCreator()
                            .startMessage()
                            .setSender(appUser)
                            .setRoom(data.room!)
                            .setText("✅ All receipts have been deleted.");
                        if (receiptData.threadId) builder.setThreadId(receiptData.threadId);
                        await modify.getCreator().finish(builder);
                    }
                }
                break;

            default:
                if (data.actionId.startsWith("removeItem-") && data.value) {
                    const { modalId, itemId } = JSON.parse(data.value) as {
                        modalId: string;
                        itemId: string;
                    };
                    const stored = await receiptHandler.getModals(modalId);
                    if (stored) {
                        const receiptData = stored as IReceiptData;
                        receiptData.items = receiptData.items.filter((i) => i.id !== itemId);
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
        }

        return context.getInteractionResponder().successResponse();
    }

    public async handleViewSubmit(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        this.logger.info("View submit handler called!");
        const { view } = context.getInteractionData();
        const modalId = view.id;
        const receiptHandler = new ReceiptHandler(
            persistence,
            read.getPersistenceReader(),
            modify
        );

        try {
            const state = view.state as ReceiptModalState;
            const receiptDate = state["receipt-edit-form"]?.receiptDate;
            const extraFee = Number(state["extra-fee"]?.extraFee || 0);
            const discounts = Number(state["discounts"]?.discounts || 0);
            const totalPrice = Number(state["total-price"]?.totalPrice || 0);

            const stored = await receiptHandler.getModals(modalId);
            const originalData = stored as IReceiptData & { confirmationMessageId?: string };
            const roomId = originalData.roomId;

            const items: IReceiptItem[] = originalData.items.map((item) => ({
                id: item.id,
                name: state[`item-name-${item.id}`]?.[`itemName-${item.id}`] || item.name,
                quantity: Number(
                    state[`item-quantity-${item.id}`]?.[`itemQuantity-${item.id}`] || item.quantity
                ),
                price: Number(
                    state[`item-price-${item.id}`]?.[`itemPrice-${item.id}`] || item.price
                ),
            }));

            const room = await read.getRoomReader().getById(roomId);
            if (!room) return context.getInteractionResponder().errorResponse();

            const updatedData: IReceiptData = {
                ...originalData,
                receiptDate: receiptDate
                    ? toDateString(receiptDate)
                    : toDateString(originalData.receiptDate),
                extraFee,
                discounts,
                totalPrice,
                items,
            };

            if (!receiptDate || items.length === 0) {
                return context.getInteractionResponder().errorResponse();
            }

            const appUser = await this.getAppUser(read);
            if (!appUser) return context.getInteractionResponder().errorResponse();

            const existingReceipt = await receiptHandler.getReceiptByUniqueID(
                originalData.userId,
                originalData.messageId,
                originalData.threadId,
                originalData.roomId
            );

            await receiptHandler.updateReceiptData(updatedData, room, appUser);
            if (originalData.confirmationMessageId && !existingReceipt) {
                const confirmationMessage = await read
                    .getMessageReader()
                    .getById(originalData.confirmationMessageId);
                if (confirmationMessage) {
                    await modify.getDeleter().deleteMessage(confirmationMessage, appUser);
                }
            }
            await receiptHandler.deleteModal(modalId);

            return context.getInteractionResponder().successResponse();
        } catch (error) {
            this.logger.error("Error in executeViewSubmitHandler:", error);
            return context.getInteractionResponder().errorResponse();
        }
    }

    public async handleViewClosed(
        context: UIKitViewCloseInteractionContext
    ): Promise<IUIKitResponse> {
        this.logger.info("Modal was closed (not submitted).");
        return context.getInteractionResponder().successResponse();
    }
}
