import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationRecord,
    RocketChatAssociationModel
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
        Associations.withDate(data.receiptDate),
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

export const deleteReceipt = async(
    persistence: IPersistence,
    associations: RocketChatAssociationRecord[]
): Promise<void> => {
    await persistence.removeByAssociations(associations)
}

export const updateReceipt = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    data: IReceiptData
): Promise<void> => {
    const lookupAssociations: RocketChatAssociationRecord[] = [
        Associations.withRoom(data.roomId),
        Associations.withMessage(data.messageId),
        Associations.withUserReceipts(data.userId),
    ];

    if (data.threadId) {
        lookupAssociations.push(Associations.withThread(data.threadId));
    }

    await persistence.removeByAssociations(lookupAssociations);

    const newAssociations: RocketChatAssociationRecord[] = [
        ...lookupAssociations,
        Associations.withDate(data.receiptDate),
    ];

    await persistence.createWithAssociations(data, newAssociations);


};

export const getModals = async(
    persistenceRead: IPersistenceRead,
    modalId: string
) => {
    const associations: RocketChatAssociationRecord[] = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, modalId)
    ]
    const [record] = await persistenceRead.readByAssociations(associations);
    return record
}

export const deleteModal = async(
    persistence: IPersistence,
    modalId: string
) => {
    const associations: RocketChatAssociationRecord[] = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, modalId)
    ]
    await persistence.removeByAssociations(associations)
}
