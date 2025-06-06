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
        const userAssociationKey = Associations.withUser(userId)
        const roomAssociationKey = Associations.withRoom(roomId)

        const receipts = await ReceiptRepository.getReceipts(this.persistenceRead, [userAssociationKey, roomAssociationKey])
        return receipts
    }

    public async getReceiptsByRoom(roomId: string) {
        const roomAssociationKey = Associations.withRoom(roomId)

        const receipts = await ReceiptRepository.getReceipts(this.persistenceRead, [roomAssociationKey])
        return receipts
    }

    public async getReceiptsByUserAndUploadedDate(userId: string, uploadedDate: Date) {
        const roomAssociationKey = Associations.withRoom(userId)
        const dateAssociationKey = Associations.withDate(uploadedDate)

        const receipts = await ReceiptRepository.getReceipts(this.persistenceRead, [roomAssociationKey, dateAssociationKey])
        return receipts
    }
}
