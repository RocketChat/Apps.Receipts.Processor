import {
    IModify,
    IPersistence,
    IPersistenceRead
} from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IReceiptData, IReceiptItem } from "../types/receipt";
import { EMPTY_ROOM_RECEIPTS_RESPONSE, FAILED_GET_RECEIPTS_RESPONSE, INVALID_IMAGE_RESPONSE } from '../const/response';
import { sendMessage } from '../utils/message';
import { ReceiptService } from '../service/receiptService';

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
    const receiptData: IReceiptData = {
        userId: parsedData.userId,
        messageId: parsedData.messageId,
        roomId: parsedData.roomId,
        items: parsedData.items.map((item: any): IReceiptItem => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        extraFee: parsedData.extraFee,
        totalPrice: parsedData.totalPrice,
        uploadedDate: new Date(),
        receiptDate: parsedData.receiptDate || ""
    };

    await this.receiptService.addReceipt(receiptData);
  }


  public async parseReceiptData(
    data: string,
    userId: string,
    messageId: string,
    roomId: string
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
        items: parsedData.items.map((item: any): IReceiptItem => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        extraFee: parsedData.extra_fees,
        totalPrice: parsedData.total_price,
        uploadedDate: new Date(),
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

  public convertReceiptDataToResponse(receiptData: IReceiptData): string {
    let response = `📝 *Your Receipt Summary*\n\n`;
    response += "*Date:* " + receiptData.receiptDate + "\n"
    response += "*Items:*\n";
    receiptData.items.forEach((item) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      if (item.quantity > 1) {
        response += `• ${item.name} (${item.quantity} x $${(item.price / item.quantity).toFixed(2)}) - $${itemTotal}\n`;
      } else {
        response += `• ${item.name} - $${itemTotal}\n`;
      }
    });
    response += `\n*Extra Fees:* $${receiptData.extraFee.toFixed(2)}\n`;
    response += `*Total:* $${receiptData.totalPrice.toFixed(2)}`;

    return response;
  }

  private formatReceiptsSummary(receipts: IReceiptData[]): string {
    let receiptTotalPrice = 0;
    let summary = `📋 *Your Receipts (${receipts.length})* 📋\n\n`;

    receipts.forEach((receipt, index) => {
      const date = new Date(receipt.uploadedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

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
    emptyMessage: string
  ): Promise<void> {
    if (!receipts || receipts.length === 0) {
      await sendMessage(
        this.modify,
        appUser,
        room,
        emptyMessage
      );
      return;
    }

    const summary = this.formatReceiptsSummary(receipts);
    await sendMessage(this.modify, appUser, room, summary);
  }

  public async listReceiptDataByRoomAndUser(
    sender: IUser,
    room: IRoom,
    appUser: IUser
  ): Promise<void> {
    try {
      const receipts = await this.receiptService.getReceiptsByUserAndRoom(sender.id, room.id);
      await this.displayReceipts(receipts, room, appUser, EMPTY_ROOM_RECEIPTS_RESPONSE);
    } catch (error) {
      console.error('Error listing receipts:', error);
      await sendMessage(
        this.modify,
        appUser,
        room,
        FAILED_GET_RECEIPTS_RESPONSE
      );
    }
  }

  public async listReceiptDataByRoom(
    room: IRoom,
    appUser: IUser
  ): Promise<void> {
    try {
      const receipts = await this.receiptService.getReceiptsByRoom(room.id);
      await this.displayReceipts(receipts, room, appUser, "No receipts found in this room.");
    } catch (error) {
      console.error('Error listing room receipts:', error);
      await sendMessage(
        this.modify,
        appUser,
        room,
        FAILED_GET_RECEIPTS_RESPONSE
      );
    }
  }

  public async listReceiptDataByUserAndUploadDate(
    userId: string,
    date: Date,
    room: IRoom,
    appUser: IUser
  ): Promise<void> {
    try {
      const receipts = await this.receiptService.getReceiptsByUserAndUploadedDate(userId, date);
      await this.displayReceipts(receipts, room, appUser, "No receipts found for this date.");
    } catch (error) {
      console.error('Error listing user date receipts:', error);
      await sendMessage(
        this.modify,
        appUser,
        room,
        FAILED_GET_RECEIPTS_RESPONSE
      );
    }
  }
}
