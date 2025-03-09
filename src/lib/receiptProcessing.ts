import {
    IModify,
    IPersistence,
    IPersistenceRead
} from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IReceiptData, IReceiptItem } from "../domain/receipt";
import { addReceipt, getReceiptByUserAndRoom } from "../repository/receiptRepository";
import { EMPTY_ROOM_RECEIPTS_RESPONSE, FAILED_GET_RECEIPTS_RESPONSE, INVALID_IMAGE_RESPONSE } from '../const/response';
import { sendMessage } from '../utils/message';

export async function parseReceiptData(
  data: string,
  userId: string,
  messageId: string,
  roomId: string,
  persistence: IPersistence
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
        receiptData.receiptDate = parsedData.receipt_date
    }
    await addReceipt(persistence, receiptData);

    return data;
  } catch(error) {
    return INVALID_IMAGE_RESPONSE;
  }
}

export function convertReceiptDataToResponse(receiptData: IReceiptData): string {
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

export async function listReceiptData(
    read: IPersistenceRead,
    modify: IModify,
    sender: IUser,
    room: IRoom,
    appUser: IUser
): Promise<void> {
    try {
      const receipts = await getReceiptByUserAndRoom(read, sender.id, room.id);
      if (!receipts || receipts.length === 0) {
        await sendMessage(
          modify,
          appUser,
          room,
          EMPTY_ROOM_RECEIPTS_RESPONSE
        );
        return;
      }

      let summary = `📋 *Your Receipts (${receipts.length})* 📋\n\n`;
      receipts.forEach((receipt, index) => {
        const date = new Date(receipt.uploadedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        const totalPrice = receipt.totalPrice.toFixed(2);

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

      await sendMessage(modify, appUser, room, summary);
    } catch (error) {
      console.error('Error listing receipts:', error);
      await sendMessage(
        modify,
        appUser,
        room,
        FAILED_GET_RECEIPTS_RESPONSE
      );
    }
  }
