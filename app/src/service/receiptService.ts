import { IPersistence, IPersistenceRead } from "@rocket.chat/apps-engine/definition/accessors";
import { IReceiptData } from "../types/receipt";
import { Associations } from "../utils/associations";
import {
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import * as ReceiptRepository from "../repository/receiptRepository";

export class ReceiptService {
    constructor(
        private readonly persistence: IPersistence,
        private readonly persistenceRead: IPersistenceRead
    ) {}

    public async addReceipt(data: IReceiptData): Promise<void> {
        await ReceiptRepository.addReceipt(this.persistence, data);
    }

    public async getReceiptsByUserAndRoom(userId : string, roomId: string) {
        const userAssociationKey = Associations.withUserReceipts(userId)
        const roomAssociationKey = Associations.withRoom(roomId)

        const receipts = await ReceiptRepository.getReceipts(this.persistenceRead, [userAssociationKey, roomAssociationKey])
        return receipts
    }

    public async getReceiptsByRoom(roomId: string) {
        const roomAssociationKey = Associations.withRoom(roomId)

        const receipts = await ReceiptRepository.getReceipts(this.persistenceRead, [roomAssociationKey])
        return receipts
    }

    public async getReceiptsByUserAndReceiptDate(roomId: string, receiptDate: string) {
        const roomAssociationKey = Associations.withRoom(roomId)
        const dateAssociationKey = Associations.withDate(receiptDate)

        const receipts = await ReceiptRepository.getReceipts(this.persistenceRead, [roomAssociationKey, dateAssociationKey])
        return receipts
    }

    public async getReceiptsByThread(roomId: string, threadId: string) {
        const roomAssociationKey = Associations.withRoom(roomId);
        const threadAssociationKey = Associations.withThread(threadId);

        const records = await ReceiptRepository.getReceipts(this.persistenceRead, [roomAssociationKey, threadAssociationKey])
        return records as IReceiptData[];
    }

    public async getReceiptsByThreadAndUser(roomId: string, threadId: string, userId: string) {
        const roomAssociationKey = Associations.withRoom(roomId);
        const threadAssociationKey = Associations.withThread(threadId);
        const userAssociationKey = Associations.withUserReceipts(userId);

        const records =  await ReceiptRepository.getReceipts(this.persistenceRead, [roomAssociationKey, threadAssociationKey, userAssociationKey])
        return records as IReceiptData[];
    }

    public async getReceiptsByUserAndRoomAndDateRange(
        userId: string,
        roomId: string,
        startDate: string,
        endDate: string
    ): Promise<IReceiptData[]> {
        const userAssociationKey = Associations.withUserReceipts(userId);
        const roomAssociationKey = Associations.withRoom(roomId);

        const allUserRoomReceipts = await ReceiptRepository.getReceipts(
            this.persistenceRead,
            [userAssociationKey, roomAssociationKey]
        );

        const filteredReceipts = allUserRoomReceipts.filter(receipt => {
            if (!receipt.receiptDate) {
                return false;
            }
            return receipt.receiptDate >= startDate && receipt.receiptDate <= endDate;
        });

        return filteredReceipts;
    }

    public async deleteReceipt(roomId, threadId, messageId, userId: string) {
        const associations: RocketChatAssociationRecord[] = [
            Associations.withRoom(roomId),
            Associations.withMessage(messageId),
            Associations.withUserReceipts(userId)
        ]

        if (threadId) {
            associations.push(Associations.withThread(threadId));
        }

        await ReceiptRepository.deleteReceipt(this.persistence, associations)
    }

    public async updateReceipt(data: IReceiptData): Promise<void> {
        await ReceiptRepository.updateReceipt(this.persistence, this.persistenceRead, data);
    }

    public async getModals(modalId: string) {
        return  ReceiptRepository.getModals(this.persistenceRead, modalId)
    }

    public async deleteModal(modalId: string) {
        return ReceiptRepository.deleteModal(this.persistence, modalId)
    }
}
