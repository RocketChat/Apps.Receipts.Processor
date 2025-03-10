import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import { IReceiptData } from "../domain/receipt";
import { Associations } from "../utils/associations";

export const addReceipt = async (
    persistence: IPersistence,
    data: IReceiptData
): Promise<void> => {
    const roomAssociationKey = Associations.withRoom(data.roomId)
    const messageAssociationKey = Associations.withMessage(data.messageId)
    const userAssociationKey = Associations.withUser(data.userId)
    const dayAssociationKey = Associations.withDate(data.uploadedDate)

    await persistence.createWithAssociations(data, [roomAssociationKey, messageAssociationKey, userAssociationKey, dayAssociationKey]);
};

export const getReceipts = async (
    persistance: IPersistenceRead,
    assocations: RocketChatAssociationRecord[]
) => {
    const records = await persistance.readByAssociations(assocations)
    return records as IReceiptData[]
}
