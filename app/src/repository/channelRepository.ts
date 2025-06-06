import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { RocketChatAssociationRecord } from "@rocket.chat/apps-engine/definition/metadata";

export const addChannel = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    roomId: string,
    userAssoc: RocketChatAssociationRecord
): Promise<void> => {
    const result = await persistenceRead.readByAssociation(userAssoc);
    let roomIds: string[] = [];
    if (result.length > 0 && Array.isArray(result[0])) {
        roomIds = result[0] as string[];
    }

    if (!roomIds.includes(roomId)) {
        roomIds.push(roomId);
        await persistence.updateByAssociation(userAssoc, roomIds, true);
    }
};

export const getChannels = async (
    persistenceRead: IPersistenceRead,
    userAssoc: RocketChatAssociationRecord
): Promise<string[]> => {
    const result = await persistenceRead.readByAssociation(userAssoc);

    if (result.length > 0 && Array.isArray(result[0])) {
        return result[0] as string[];
    }
    return [];
};
