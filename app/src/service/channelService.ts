import { ILogger, IPersistence, IPersistenceRead } from "@rocket.chat/apps-engine/definition/accessors";
import { Associations } from "../utils/associations";
import * as ChannelRepository from "../repository/channelRepository";

export class ChannelService {
    constructor(
        private readonly persistence: IPersistence,
        private readonly persistenceRead: IPersistenceRead
    ) {}

    public async addChannel(roomId: string, userId: string, logger: ILogger): Promise<void> {
        const userAssociationKey = Associations.withUserChannels(userId)
        await ChannelRepository.addChannel(this.persistence, this.persistenceRead, roomId, userAssociationKey);
    }

    public async getChannels(userId: string, logger: ILogger) {
        const userAssociationKey = Associations.withUserChannels(userId)
        const channels = await ChannelRepository.getChannels(this.persistenceRead, userAssociationKey)

        return channels
    }
}
