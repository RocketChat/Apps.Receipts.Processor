import {
    ILogger,
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { RocketChatAssociationRecord } from "@rocket.chat/apps-engine/definition/metadata";

export const addChannel = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    roomId: string,
    userChannelAssoc: RocketChatAssociationRecord
): Promise<void> => {
    const result = await persistenceRead.readByAssociation(userChannelAssoc);
    let roomIds: string[] = [];

    if (result.length > 0 && Array.isArray(result[0])) {
        roomIds = result[0] as string[];
    }

    if (!roomIds.includes(roomId)) {
        roomIds.push(roomId);
        await persistence.updateByAssociation(userChannelAssoc, roomIds, true);
    }
};

export const getChannels = async (
    persistenceRead: IPersistenceRead,
    userChannelAssoc: RocketChatAssociationRecord
): Promise<string[]> => {
    const result = await persistenceRead.readByAssociation(userChannelAssoc);

    if (result.length > 0 && Array.isArray(result[0])) {
        return result[0] as string[];
    }
    return [];
};
