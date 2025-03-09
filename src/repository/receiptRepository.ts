import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import { IReceiptData } from "../domain/receipt";
import { convertDateFormat } from "../utils/date"

export const addReceipt = async (
    persistence: IPersistence,
    data: IReceiptData
): Promise<void> => {
    const roomAssociationKey = new RocketChatAssociationRecord(
        RocketChatAssociationModel.ROOM,
        data.roomId
    )
    const messageAssociationKey = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        data.messageId
    )
    const userAssociationKey = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        data.userId
    );
    const dayAssociationKey = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MISC,
        convertDateFormat(data.uploadedDate)
    );

    await persistence.createWithAssociations(data, [roomAssociationKey, messageAssociationKey, userAssociationKey, dayAssociationKey]);
};

export const getReceiptByUserAndRoom = async (
    persistance: IPersistenceRead,
    userId: string,
    roomId: string
) => {
    const userAssociationKey = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        userId
    );
    const roomAssociationKey = new RocketChatAssociationRecord(
        RocketChatAssociationModel.ROOM,
        roomId
    )
    const records = await persistance.readByAssociations([userAssociationKey, roomAssociationKey])
    return records as IReceiptData[]
}
