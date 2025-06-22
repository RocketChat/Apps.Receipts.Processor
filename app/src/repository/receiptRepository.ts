import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import { IReceiptData } from "../types/receipt";
import { Associations } from "../utils/associations";

export const addReceipt = async (
    persistence: IPersistence,
    data: IReceiptData
): Promise<void> => {
    const associations: RocketChatAssociationRecord[] = [
        Associations.withRoom(data.roomId),
        Associations.withMessage(data.messageId),
        Associations.withUserReceipts(data.userId),
        Associations.withDate(data.uploadedDate),
    ];

    if (data.threadId) {
        associations.push(Associations.withThread(data.threadId));
    }

    await persistence.createWithAssociations(data, associations);
};

export const getReceipts = async (
    persistance: IPersistenceRead,
    associations: RocketChatAssociationRecord[]
) => {
    const records = await persistance.readByAssociations(associations)
    return records as IReceiptData[]
}
