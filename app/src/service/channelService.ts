import {
    ILogger,
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { Associations } from "../utils/associations";
import * as ChannelRepository from "../repository/channelRepository";

export class ChannelService {
    constructor(
        private readonly persistence: IPersistence,
        private readonly persistenceRead: IPersistenceRead
    ) {}

    public async addChannel(roomId: string, userId: string): Promise<void> {
        const userAssociationKey = Associations.withUserChannels(userId);
        await ChannelRepository.addChannel(
            this.persistence,
            this.persistenceRead,
            roomId,
            userAssociationKey
        );
    }

    public async getChannels(userId: string) {
        const userAssociationKey = Associations.withUserChannels(userId);
        const channels = await ChannelRepository.getChannels(
            this.persistenceRead,
            userAssociationKey
        );

        return channels;
    }

    public async setCurrencyForChannel(
        roomId: string,
        currency: string
    ): Promise<void> {
        const assoc = Associations.withChannelCurrency(roomId);
        await ChannelRepository.setCurrencyForChannel(
            this.persistence,
            assoc,
            currency
        );
    }

    public async getCurrencyForChannel(roomId: string): Promise<string | null> {
        const assoc = Associations.withChannelCurrency(roomId);
        return await ChannelRepository.getCurrencyForChannel(
            this.persistenceRead,
            assoc
        );
    }
}
