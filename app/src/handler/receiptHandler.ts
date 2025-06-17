import {
    IModify,
    IPersistence,
    IPersistenceRead,
    ILogger
} from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IReceiptData, IReceiptItem } from "../types/receipt";
import { EMPTY_ROOM_RECEIPTS_RESPONSE, FAILED_GET_RECEIPTS_RESPONSE, INVALID_IMAGE_RESPONSE } from '../const/response';
import { sendMessage } from '../utils/message';
import { ReceiptService } from '../service/receiptService';
import { toDateString } from "../utils/date"

export class ReceiptHandler {
  constructor(
    private readonly persistence: IPersistence,
    private readonly persistenceRead: IPersistenceRead,
    private readonly modify: IModify
  ) {
    this.receiptService = new ReceiptService(persistence, persistenceRead);
  }

  private readonly receiptService: ReceiptService;

  public async addReceiptData(
    parsedData: IReceiptData,
  ) : Promise<void> {
   const uploadedDate = parsedData.uploadedDate
    ? toDateString(parsedData.uploadedDate)
    : new Date().toISOString().slice(0, 10);
    const receiptData: IReceiptData = {
        userId: parsedData.userId,
        messageId: parsedData.messageId,
        threadId: parsedData.threadId,
        roomId: parsedData.roomId,
        items: parsedData.items.map((item: any): IReceiptItem => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        extraFee: parsedData.extraFee,
        totalPrice: parsedData.totalPrice,
        uploadedDate: uploadedDate,
        receiptDate: parsedData.receiptDate || ""
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
      if (!parsedData.items || !Array.isArray(parsedData.items) ||
          typeof parsedData.extra_fees !== 'number' ||
          typeof parsedData.total_price !== 'number') {
        return INVALID_IMAGE_RESPONSE;
      }

      const receiptData: IReceiptData = {
        userId,
        messageId,
        roomId,
        threadId,
        items: parsedData.items.map((item: any): IReceiptItem => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        extraFee: parsedData.extra_fees,
        totalPrice: parsedData.total_price,
        uploadedDate: toDateString(new Date()),
        receiptDate: ""
      };

      if(parsedData.receipt_date) {
          receiptData.receiptDate = parsedData.receipt_date;
      }

      return JSON.stringify(receiptData);
    } catch(error) {
      return INVALID_IMAGE_RESPONSE;
    }
  }

  private formatReceiptsSummary(receipts: IReceiptData[]): string {
    let receiptTotalPrice = 0;
    let summary = `📋 *Your Receipts (${receipts.length})* 📋\n\n`;

    receipts.forEach((receipt, index) => {
      const date = receipt.uploadedDate;

      const totalPrice = receipt.totalPrice.toFixed(2);
      receiptTotalPrice += receipt.totalPrice;
      summary += `*${index + 1}. Receipt from ${date}*\n`;
      summary += `*Items:*\n`;
      receipt.items.forEach(item => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        if (item.quantity > 1) {
          summary += `• ${item.name} (${item.quantity} x $${(item.price / item.quantity).toFixed(2)}) - $${itemTotal}\n`;
        } else {
          summary += `• ${item.name} - $${itemTotal}\n`;
        }
      });

      summary += `*Extra Fees:* $${receipt.extraFee.toFixed(2)}\n`;
      summary += `*Total:* $${totalPrice}`;

      if (index < receipts.length - 1) {
        summary += `\n\n---\n\n`;
      }
    });

    summary += `\n\n*Total Amount Across All Receipts:* $${receiptTotalPrice.toFixed(2)}`;
    return summary;
  }

  private async displayReceipts(
    receipts: IReceiptData[] | null,
    room: IRoom,
    appUser: IUser,
    emptyMessage: string,
    threadId: string | undefined
  ): Promise<void> {
    if (!receipts || receipts.length === 0) {
      await sendMessage(
        this.modify,
        appUser,
        room,
        emptyMessage,
        threadId
      );
      return;
    }

    const summary = this.formatReceiptsSummary(receipts);
    await sendMessage(this.modify, appUser, room, summary, threadId);
  }

  public async listReceiptDataByRoomAndUser(
    sender: IUser,
    room: IRoom,
    appUser: IUser,
    threadId: string | undefined
  ): Promise<void> {
    try {
      const receipts = await this.receiptService.getReceiptsByUserAndRoom(sender.id, room.id);
      await this.displayReceipts(receipts, room, appUser, EMPTY_ROOM_RECEIPTS_RESPONSE, threadId);
    } catch (error) {
      console.error('Error listing receipts:', error);
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
      const receipts = await this.receiptService.getReceiptsByRoom(room.id);
      await this.displayReceipts(receipts, room, appUser, "No receipts found in this room.", threadId);
    } catch (error) {
      console.error('Error listing room receipts:', error);
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
      const receipts = await this.receiptService.getReceiptsByUserAndUploadedDate(room.id, date);
      await this.displayReceipts(receipts, room, appUser, "No receipts found for this date.", threadId);
    } catch (error) {
      console.error('Error listing user date receipts:', error);
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
  ) : Promise<void> {
    try {
      const receipts = await this.receiptService.getReceiptsByThread(room.id, threadId);
      logger.info("Receipts : ", receipts)
      await this.displayReceipts(receipts, room, appUser, "No receipts found for this thread.", threadId);
    } catch (error) {
      console.error('Error listing user date receipts:', error);
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
  ) : Promise<void> {
    try {
      const receipts = await this.receiptService.getReceiptsByThreadAndUser(room.id, threadId, userId);
      await this.displayReceipts(receipts, room, appUser, "No receipts found for this thread.", threadId);
    } catch (error) {
      console.error('Error listing user date receipts:', error);
      await sendMessage(
        this.modify,
        appUser,
        room,
        FAILED_GET_RECEIPTS_RESPONSE,
        threadId
      );
    }
  }
}
