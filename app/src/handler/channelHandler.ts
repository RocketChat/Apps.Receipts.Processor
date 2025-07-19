import {
    IRead,
    IHttp,
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";
import { ChannelService } from "../service/channelService";
import { sendMessage } from "../utils/message";

export class ChannelHandler {
    constructor(
        private readonly read: IRead,
        private readonly persistence: IPersistence
    ) {}

    public async getUserChannels(userId: string): Promise<string[] | undefined> {
        const channelService = new ChannelService(
            this.persistence,
            this.read.getPersistenceReader()
        );
        return channelService.getChannels(userId);
    }

    public async handleUnregisteredChannel(
        isBotMentioned: boolean,
        isAddChannel: boolean,
        message: IMessage,
        modify: any,
        appUser: any,
        processTextCommand: (cleanedMessage: string, message: IMessage) => Promise<void>
    ): Promise<void> {
        if (!isBotMentioned) return;

        if (isAddChannel) {
            const cleanedMessage = this.removeBotMention(message.text || "", appUser.username);
            await processTextCommand(cleanedMessage, message);
        } else {
            await sendMessage(
                modify,
                appUser,
                message.room,
                "This channel is not registered. Please use `add channel` command to register it.",
                message.threadId
            );
        }
    }

    private removeBotMention(messageText: string, botUsername: string): string {
        const mentionPatterns = [
            new RegExp(`@${this.escapeRegex(botUsername)}[,\\s]*`, "gi"),
            new RegExp(`^@${this.escapeRegex(botUsername)}\\s*`, "gi"),
            new RegExp(`\\s*@${this.escapeRegex(botUsername)}\\s*`, "gi"),
        ];

        let cleanedText = messageText;
        mentionPatterns.forEach((pattern) => {
            cleanedText = cleanedText.replace(pattern, " ");
        });

        return cleanedText.trim();
    }

    private escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
