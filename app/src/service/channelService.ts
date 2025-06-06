import { IPersistence, IPersistenceRead } from "@rocket.chat/apps-engine/definition/accessors";
import { Associations } from "../utils/associations";
import * as ChannelRepository from "../repository/channelRepository";

export class ChannelService {
    constructor(
        private readonly persistence: IPersistence,
        private readonly persistenceRead: IPersistenceRead
    ) {}

    public async addChannel(roomId: string, userId: string): Promise<void> {
        const userAssociationKey = Associations.withUser(userId)
        await ChannelRepository.addChannel(this.persistence, this.persistenceRead, roomId, userAssociationKey);
    }

    public async getChannels(userId: string) {
        const userAssociationKey = Associations.withUser(userId)
        const channels = await ChannelRepository.getChannels(this.persistenceRead, userAssociationKey)

        return channels
    }
}
