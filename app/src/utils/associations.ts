import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import { convertDateFormat } from "./date";

export class Associations {
    public static withUserChannels(
        userId: string
    ): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.USER,
            `${userId}:channels`
        );
    }

    public static withUserReceipts(userId: string): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.USER,
            `${userId}:receipts`
        );
    }

    public static withRoom(roomId: string): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.ROOM,
            roomId
        );
    }

    public static withMessage(messageId: string): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.MESSAGE,
            messageId
        );
    }

    public static withDate(date: Date): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.MISC,
            convertDateFormat(date)
        );
    }

    public static withCustomKey(key: string): RocketChatAssociationRecord {
        return new RocketChatAssociationRecord(
            RocketChatAssociationModel.MISC,
            key
        );
    }
}
