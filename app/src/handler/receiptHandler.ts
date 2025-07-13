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
    INVALID_IMAGE_RESPONSE,
} from "../const/response";
import { sendMessage } from "../utils/message";
import { ReceiptService } from "../service/receiptService";
import { toDateString } from "../utils/date";
import { ButtonStyle, BlockBuilder } from "@rocket.chat/apps-engine/definition/uikit";

export class ReceiptHandler {
    constructor(
        private readonly persistence: IPersistence,
        private readonly persistenceRead: IPersistenceRead,
        private readonly modify: IModify
    ) {
        this.receiptService = new ReceiptService(persistence, persistenceRead);
    }

    private readonly receiptService: ReceiptService;

    public async addReceiptData(parsedData: IReceiptData): Promise<void> {
        const uploadedDate = parsedData.uploadedDate
            ? toDateString(parsedData.uploadedDate)
            : new Date().toISOString().slice(0, 10);
        const receiptData: IReceiptData = {
            userId: parsedData.userId,
            messageId: parsedData.messageId,
            threadId: parsedData.threadId,
            roomId: parsedData.roomId,
            items: parsedData.items.map(
                (item: any): IReceiptItem => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                })
            ),
            extraFee: parsedData.extraFee,
            totalPrice: parsedData.totalPrice,
            uploadedDate: uploadedDate,
            receiptDate: parsedData.receiptDate || "",
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
                return INVALID_IMAGE_RESPONSE;
            }

            const receiptData: IReceiptData = {
                userId,
                messageId,
                roomId,
                threadId,
                items: parsedData.items.map(
                    (item: any): IReceiptItem => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    })
                ),
                extraFee: parsedData.extra_fees,
                totalPrice: parsedData.total_price,
                uploadedDate: toDateString(new Date()),
                receiptDate: "",
            };

            if (parsedData.receipt_date) {
                receiptData.receiptDate = parsedData.receipt_date;
            }

            return JSON.stringify(receiptData);
        } catch (error) {
            return INVALID_IMAGE_RESPONSE;
        }
    }

    public formatReceiptsSummaryWithBlocks(
        blockBuilder: BlockBuilder,
        receipts: IReceiptData[]
    ): void {
        let receiptTotalPrice = 0;

        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(
                `📋 *Your Receipts (${receipts.length})* 📋`
            ),
        });

        receipts.forEach((receipt, index) => {
            const date = receipt.uploadedDate;
            const totalPrice = receipt.totalPrice.toFixed(2);
            receiptTotalPrice += receipt.totalPrice;
            let summary = `*${index + 1}. Receipt from ${date}*\n*Items:*\n`;
            receipt.items.forEach((item) => {
                const itemTotal = (item.price * item.quantity).toFixed(2);
                if (item.quantity > 1) {
                    summary += `• ${item.name} (${item.quantity} x $${(
                        item.price
                    ).toFixed(2)}) - $${itemTotal}\n`;
                } else {
                    summary += `• ${item.name} - $${itemTotal}\n`;
                }
            });
            summary += `*Extra Fees:* $${receipt.extraFee.toFixed(2)}\n`;
            summary += `*Total:* $${totalPrice}`;

            blockBuilder.addSectionBlock({
                text: blockBuilder.newMarkdownTextObject(summary),
            });

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
                            userId: receipt.userId
                        }),
                        style: ButtonStyle.DANGER,
                    }),
                ],
            });

            if (index < receipts.length - 1) {
                blockBuilder.addDividerBlock();
            }
        });

        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(
                `*Total Amount Across All Receipts:* $${receiptTotalPrice.toFixed(
                    2
                )}`
            ),
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
        this.formatReceiptsSummaryWithBlocks(blockBuilder, receipts);

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
            console.error("Error listing receipts:", error);
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
            console.error("Error listing room receipts:", error);
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
                await this.receiptService.getReceiptsByUserAndUploadedDate(
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
            console.error("Error listing user date receipts:", error);
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
            const receipts = await this.receiptService.getReceiptsByUserAndRoomAndDateRange(
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
            console.error("Error listing user date receipts:", error);
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
            console.error("Error listing user date receipts:", error);
            await sendMessage(
                this.modify,
                appUser,
                room,
                FAILED_GET_RECEIPTS_RESPONSE,
                threadId
            );
        }
    }

    public async getReceiptsForUpdate(roomId: string, threadId: string | undefined): Promise<IReceiptData[] | null> {
        try {
            if (threadId) {
                return await this.receiptService.getReceiptsByThread(roomId, threadId);
            } else {
                return await this.receiptService.getReceiptsByRoom(roomId);
            }
        } catch (error) {
            console.error("Error getting receipts for update:", error);
            return null;
        }
    }

    public async deleteReceiptData(
        userId: string,
        threadId: string,
        roomId: string,
        messageId: string
    ): Promise<void> {
        await this.receiptService.deleteReceipt(roomId, threadId, messageId, userId)
    }

    public async updateReceiptData(
        updatedData: IReceiptData,
        room: IRoom,
        appUser: IUser
    ): Promise<void> {
        try {
            await this.receiptService.updateReceipt(updatedData);
            const message = this.modify
                .getCreator()
                .startMessage()
                .setSender(appUser)
                .setRoom(room)
                .setText("✅ Your receipt has been successfully updated.");

            if (updatedData.threadId) {
                message.setThreadId(updatedData.threadId);
            }

            await this.modify.getCreator().finish(message);
        } catch (error) {
            console.error("Error updating receipt:", error);
            await sendMessage(
                this.modify,
                appUser,
                room,
                "❌ Failed to update the receipt. Please try again.",
                updatedData.threadId ?? undefined
            );
        }
    }

    public async getModals(modalId : string) {
        return this.receiptService.getModals(modalId);
    }

    public async deleteModal(modalId : string) {
        return this.receiptService.deleteModal(modalId);
    }
}
