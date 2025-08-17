import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IRead, IModify } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { RoomType } from "@rocket.chat/apps-engine/definition/rooms"

export async function getOrCreateDirectRoom(
    read: IRead,
    modify: IModify,
    appUser: IUser,
    targetUser: IUser
): Promise<IRoom> {
    const usernames = [appUser.username, targetUser.username];
    const existingRoom = await read.getRoomReader().getDirectByUsernames(usernames);
    if (existingRoom) {
        return existingRoom;
    }

    const newRoomBuilder = modify.getCreator()
        .startRoom()
        .setType(RoomType.DIRECT_MESSAGE)
        .setCreator(appUser)
        .setMembersToBeAddedByUsernames(usernames);

    const roomId = await modify.getCreator().finish(newRoomBuilder);
    const newRoom = await read.getRoomReader().getById(roomId);
    if (!newRoom) {
        throw new Error("Failed to create or retrieve direct message room.");
    }

    return newRoom;
}
