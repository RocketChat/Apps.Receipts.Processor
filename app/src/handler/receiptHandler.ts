import {
    IModify,
    IPersistence,
    IPersistenceRead,
    ILogger,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IReceiptData, IReceiptItem } from "../types/receipt";
import {
    EMPTY_ROOM_RECEIPTS_RESPONSE,
    FAILED_GET_RECEIPTS_RESPONSE,
    GENERAL_ERROR_RESPONSE,
} from "../const/response";
import { sendMessage } from "../utils/message";
import { ReceiptService } from "../service/receiptService";
import { toDateString } from "../utils/date";
import {
    ButtonStyle,
    BlockBuilder,
} from "@rocket.chat/apps-engine/definition/uikit";
import { ChannelService } from "../service/channelService";
import { v4 as uuidv4 } from "uuid";

export class ReceiptHandler {
    constructor(
        private readonly persistence: IPersistence,
        private readonly persistenceRead: IPersistenceRead,
        private readonly modify: IModify
    ) {
        this.receiptService = new ReceiptService(persistence, persistenceRead);
        this.channelService = new ChannelService(persistence, persistenceRead);
    }

    private readonly receiptService: ReceiptService;
    private readonly channelService: ChannelService;

    public async getCurrencySymbol(roomId: string): Promise<string> {
        const currency = await this.channelService.getCurrencyForChannel(
            roomId
        );
        return currency || "USD";
    }

    public async addReceiptData(parsedData: IReceiptData): Promise<void> {
        const formatNumber = (value: number) =>
            Number(parseFloat(String(value)).toFixed(2));

        const receiptData: IReceiptData = {
            userId: parsedData.userId,
            messageId: parsedData.messageId,
            threadId: parsedData.threadId,
            roomId: parsedData.roomId,
            items: parsedData.items.map(
                (item: IReceiptItem) => ({
                    id: item.id,
                    name: item.name,
                    price: formatNumber(item.price),
                    quantity: item.quantity,
                })
            ),
            extraFee: formatNumber(parsedData.extraFee),
            totalPrice: parsedData.totalPrice,
            discounts: formatNumber(parsedData.discounts),
            receiptDate: parsedData.receiptDate
                ? toDateString(parsedData.receiptDate)
                : toDateString(new Date()),
        };

        await this.receiptService.addReceipt(receiptData);
    }

    public async parseReceiptData(
        data: string,
        userId: string,
        messageId: string,
        roomId: string,
        threadId: string | undefined
    ): Promise<string> {
        try {
            const parsedData = JSON.parse(data);
            if (
                !parsedData.items ||
                !Array.isArray(parsedData.items) ||
                typeof parsedData.extra_fees !== "number" ||
                typeof parsedData.total_price !== "number"
            ) {
                return GENERAL_ERROR_RESPONSE;
            }

            const receiptData: IReceiptData = {
                userId,
                messageId,
                roomId,
                threadId,
                items: parsedData.items.map(
                    (item: IReceiptItem) => ({
                        id: uuidv4(),
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    })
                ),
                extraFee: parsedData.extra_fees,
                totalPrice: parsedData.total_price,
                discounts: parsedData.discounts,
                receiptDate: toDateString(new Date()),
            };

            if (parsedData.receipt_date) {
                receiptData.receiptDate = parsedData.receipt_date;
            }

            return JSON.stringify(receiptData);
        } catch (error) {
            return GENERAL_ERROR_RESPONSE;
        }
    }

    private async buildReceiptBlocks(
        blockBuilder: BlockBuilder,
        receipt: IReceiptData,
        currency: string,
        options?: {
            index?: number;
            showActions?: boolean;
            showSuccess?: boolean;
        }
    ): Promise<void> {
        const {
            index,
            showActions = true,
            showSuccess = false,
        } = options || {};
        const header =
            index !== undefined
                ? `*${index + 1}. Receipt from ${receipt.receiptDate}*`
                : `📄 *Receipt from ${receipt.receiptDate}*`;

        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(header),
        });

        let summary = `*Items:*\n`;
        receipt.items.forEach((item) => {
            const itemTotal = item.price * item.quantity;
            if (item.quantity > 1) {
                summary += `• ${item.name} (${item.quantity} × ${currency}${item.price}) — ${currency}${itemTotal}\n`;
            } else {
                summary += `• ${item.name} — ${currency}${itemTotal}\n`;
            }
        });
        summary += `*Extra Fees:* ${currency}${receipt.extraFee}\n`;
        summary += `*Discounts:* ${currency}${receipt.discounts}\n`;
        summary += `*Total:* ${currency}${receipt.totalPrice}`;
        if (showSuccess) {
            summary += `\n\n✅ Your receipt has been successfully updated.`;
        }

        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(summary),
        });

        if (showActions) {
            blockBuilder.addActionsBlock({
                elements: [
                    blockBuilder.newButtonElement({
                        text: blockBuilder.newPlainTextObject("✏️ Edit"),
                        actionId: "edit-receipt-data",
                        value: JSON.stringify(receipt),
                        style: ButtonStyle.PRIMARY,
                    }),
                    blockBuilder.newButtonElement({
                        text: blockBuilder.newPlainTextObject("🗑️ Delete"),
                        actionId: "delete-receipt-data",
                        value: JSON.stringify({
                            messageId: receipt.messageId,
                            roomId: receipt.roomId,
                            threadId: receipt.threadId,
                            userId: receipt.userId,
                        }),
                        style: ButtonStyle.DANGER,
                    }),
                ],
            });
        }
    }

    public async formatReceiptsSummaryWithBlocks(
        blockBuilder: BlockBuilder,
        receipts: IReceiptData[],
        roomId: string
    ): Promise<void> {
        let receiptTotalPrice = 0;
        const currency = await this.getCurrencySymbol(roomId);

        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(
                `📋 *Your Receipts (${receipts.length})* 📋`
            ),
        });

        for (let index = 0; index < receipts.length; index++) {
            const receipt = receipts[index];
            receiptTotalPrice += receipt.totalPrice;
            await this.buildReceiptBlocks(blockBuilder, receipt, currency, {
                index,
                showActions: true,
            });
            if (index < receipts.length - 1) {
                blockBuilder.addDividerBlock();
            }
        }

        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(
                `*Total Amount Across All Receipts:* ${currency}${receiptTotalPrice}`
            ),
        });
    }

    public async formatSingleReceiptBlocks(
        blockBuilder: BlockBuilder,
        receipt: IReceiptData
    ): Promise<void> {
        const currency = await this.getCurrencySymbol(receipt.roomId);
        await this.buildReceiptBlocks(blockBuilder, receipt, currency, {
            showActions: false,
            showSuccess: true,
        });
    }

    private async displayReceipts(
        receipts: IReceiptData[] | null,
        room: IRoom,
        appUser: IUser,
        emptyMessage: string,
        modify: IModify,
        threadId: string | undefined
    ): Promise<void> {
        if (!receipts || receipts.length === 0) {
            await sendMessage(modify, appUser, room, emptyMessage, threadId);
            return;
        }

        const blockBuilder = modify.getCreator().getBlockBuilder();
        await this.formatReceiptsSummaryWithBlocks(
            blockBuilder,
            receipts,
            room.id
        );

        const builder = modify
            .getCreator()
            .startMessage()
            .setSender(appUser)
            .setRoom(room)
            .setBlocks(blockBuilder);

        if (threadId) {
            builder.setThreadId(threadId);
        }

        await modify.getCreator().finish(builder);
    }

    public async listReceiptDataByRoomAndUser(
        sender: IUser,
        room: IRoom,
        appUser: IUser,
        threadId: string | undefined
    ): Promise<void> {
        try {
            const receipts = await this.receiptService.getReceiptsByUserAndRoom(
                sender.id,
                room.id
            );
            await this.displayReceipts(
                receipts,
                room,
                appUser,
                EMPTY_ROOM_RECEIPTS_RESPONSE,
                this.modify,
                threadId
            );
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async listReceiptDataByRoom(
        room: IRoom,
        appUser: IUser,
        threadId: string | undefined
    ): Promise<void> {
        try {
            const receipts = await this.receiptService.getReceiptsByRoom(
                room.id
            );
            await this.displayReceipts(
                receipts,
                room,
                appUser,
                "No receipts found in this room.",
                this.modify,
                threadId
            );
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async listReceiptDataByUserAndUploadDate(
        date: string,
        room: IRoom,
        appUser: IUser,
        threadId: string | undefined
    ): Promise<void> {
        try {
            const receipts =
                await this.receiptService.getReceiptsByUserAndReceiptDate(
                    room.id,
                    date
                );
            await this.displayReceipts(
                receipts,
                room,
                appUser,
                "No receipts found for this date.",
                this.modify,
                threadId
            );
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async listReceiptDataByRoomUserAndDateRange(
        sender: IUser,
        room: IRoom,
        appUser: IUser,
        startDate: string,
        endDate: string,
        threadId: string | undefined
    ): Promise<void> {
        try {
            const receipts =
                await this.receiptService.getReceiptsByUserAndRoomAndDateRange(
                    sender.id,
                    room.id,
                    startDate,
                    endDate
                );
            await this.displayReceipts(
                receipts,
                room,
                appUser,
                `No receipts found from ${startDate} to ${endDate}.`,
                this.modify,
                threadId
            );
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async listReceiptDataByThread(
        threadId: string,
        room: IRoom,
        appUser: IUser,
        logger: ILogger
    ): Promise<void> {
        try {
            const receipts = await this.receiptService.getReceiptsByThread(
                room.id,
                threadId
            );
            logger.info("Receipts : ", receipts);
            await this.displayReceipts(
                receipts,
                room,
                appUser,
                "No receipts found for this thread.",
                this.modify,
                threadId
            );
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async listReceiptDataByThreadAndUser(
        userId: string,
        threadId: string,
        room: IRoom,
        appUser: IUser
    ): Promise<void> {
        try {
            const receipts =
                await this.receiptService.getReceiptsByThreadAndUser(
                    room.id,
                    threadId,
                    userId
                );
            await this.displayReceipts(
                receipts,
                room,
                appUser,
                "No receipts found for this thread.",
                this.modify,
                threadId
            );
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async getReceiptsForUpdate(
        roomId: string,
        threadId: string | undefined
    ): Promise<IReceiptData[] | null> {
        try {
            if (threadId) {
                return await this.receiptService.getReceiptsByThread(
                    roomId,
                    threadId
                );
            } else {
                return await this.receiptService.getReceiptsByRoom(roomId);
            }
        } catch (error) {
            return null;
        }
    }

    public async deleteReceiptData(
        userId: string,
        threadId: string,
        roomId: string,
        messageId: string
    ): Promise<void> {
        await this.receiptService.deleteReceipt(
            roomId,
            threadId,
            messageId,
            userId
        );
    }

    public async updateReceiptData(
        updatedData: IReceiptData,
        room: IRoom,
        appUser: IUser
    ): Promise<void> {
        try {
            updatedData.totalPrice = this.calculateReceiptTotal(updatedData);
            await this.receiptService.updateReceipt(updatedData);
            const blockBuilder = this.modify.getCreator().getBlockBuilder();
            await this.formatSingleReceiptBlocks(blockBuilder, updatedData);
            const message = this.modify
                .getCreator()
                .startMessage()
                .setSender(appUser)
                .setRoom(room)
                .setBlocks(blockBuilder);

            if (updatedData.threadId) {
                message.setThreadId(updatedData.threadId);
            }

            await this.modify.getCreator().finish(message);
        } catch (error) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                "❌ Failed to update the receipt. Please try again.",
                updatedData.threadId ?? undefined
            );
        }
    }

    public async getModals(modalId: string) {
        return this.receiptService.getModals(modalId);
    }

    public async deleteModal(modalId: string) {
        return this.receiptService.deleteModal(modalId);
    }

    public async getReceiptByUniqueID(
        roomId: string,
        messageId?: string | null,
        userId?: string | null,
        threadId?: string | null
    ) {
        if (!roomId || !messageId || !userId) {
            return null;
        }

        return this.receiptService.getReceiptByUniqueID(
            roomId,
            messageId,
            userId,
            threadId || undefined
        );
    }

    private calculateReceiptTotal(receipt: IReceiptData): number {
        const itemsTotal = receipt.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        const finalTotal = itemsTotal + receipt.extraFee - receipt.discounts;
        return Number(finalTotal);
    }

    public calculateTotalExtraFee(receipts: IReceiptData[]): number {
        return receipts.reduce(
            (sum, receipt) => sum + (receipt.extraFee || 0),
            0
        );
    }

    public calculateTotalDiscounts(receipts: IReceiptData[]): number {
        return receipts.reduce(
            (sum, receipt) => sum + (receipt.discounts || 0),
            0
        );
    }
}
