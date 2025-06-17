import { IPersistence, IPersistenceRead } from "@rocket.chat/apps-engine/definition/accessors";
import { IReceiptData } from "../types/receipt";
import { Associations } from "../utils/associations";
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

    public async getReceiptsByUserAndUploadedDate(roomId: string, uploadedDate: string) {
        const roomAssociationKey = Associations.withRoom(roomId)
        const dateAssociationKey = Associations.withDate(uploadedDate)

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
}
