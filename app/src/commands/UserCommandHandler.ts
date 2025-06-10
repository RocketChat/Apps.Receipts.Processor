import {
    IRead,
    IModify,
    IPersistence
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { ReceiptProcessorApp } from "../../ReceiptProcessorApp";
import { ReceiptHandler } from "../handler/receiptHandler";
import { ChannelService } from '../service/channelService';
import { sendMessage } from '../utils/message';
import { CommandParams, CommandResult } from "../types/command";

export class CommandHandler {
    private receiptHandler: ReceiptHandler;
    private channelService: ChannelService;
    private app: ReceiptProcessorApp;
    private appUser: IUser

    constructor(
        private readonly read: IRead,
        private readonly modify: IModify,
        private readonly persistence: IPersistence,
        app: ReceiptProcessorApp,
        appUser: IUser
    ) {
        this.app = app;
        this.receiptHandler = new ReceiptHandler(
            this.persistence,
            this.read.getPersistenceReader(),
            this.modify
        );
        this.channelService = new ChannelService(
            this.persistence,
            this.read.getPersistenceReader()
        );
        this.appUser = appUser
    }

    public async executeCommand(
        command: string,
        room: IRoom,
        user: IUser,
        params?: CommandParams,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            const appUser = await this.getAppUser();
            if (!appUser) {
                return {
                    success: false,
                    message: "App user not found for sending messages"
                };
            }

            this.app.getLogger().info(`Executing command: ${command}`, params);

            switch (command) {
                case 'list':
                    return await this.listReceiptsByUser(user, room, appUser, threadId);

                case 'room':
                    return await this.listReceiptsByRoom(room, appUser, threadId);

                case 'date':
                    return await this.listReceiptsByDate(user, room, appUser, params?.date, threadId);

                case 'thread':
                    return await this.listReceiptsInThread(room, appUser, threadId);

                case 'thread_user':
                    return await this.listReceiptsInThreadByUser(user, room, appUser, threadId);

                case 'add_channel':
                    return await this.addChannel(room, user, appUser, threadId);

                case 'help':
                    return await this.showHelp(appUser, room, threadId);

                case 'unknown':
                    return await this.handleUnknownCommand(appUser, room, threadId);

                default:
                    return await this.handleUnknownCommand(appUser, room, threadId);
            }
        } catch (error) {
            this.app.getLogger().error('Error executing command:', error);
            return {
                success: false,
                message: "An error occurred while processing your command. Please try again."
            };
        }
    }

    private async getAppUser(): Promise<IUser | undefined> {
        const appUser = await this.read.getUserReader().getAppUser(this.app.getID());
        if (!appUser) {
            this.app.getLogger().error("App user not found for sending messages");
            return undefined;
        }
        return appUser;
    }

    private async listReceiptsByUser(
        user: IUser,
        room: IRoom,
        appUser: IUser,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            await this.receiptHandler.listReceiptDataByRoomAndUser(user, room, appUser, threadId);
            return { success: true };
        } catch (error) {
            this.app.getLogger().error('Error listing receipts by user:', error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "Failed to retrieve your receipts.",
                threadId
            );
            return { success: false };
        }
    }

    private async listReceiptsByRoom(
        room: IRoom,
        appUser: IUser,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            await this.receiptHandler.listReceiptDataByRoom(room, appUser, threadId);
            return { success: true };
        } catch (error) {
            this.app.getLogger().error('Error listing receipts by room:', error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "Failed to retrieve room receipts.",
                threadId
            );
            return { success: false };
        }
    }

    private async listReceiptsByDate(
        user: IUser,
        room: IRoom,
        appUser: IUser,
        dateStr?: string,
        threadId?: string
    ): Promise<CommandResult> {
        if (!dateStr) {
            sendMessage(
                this.modify,
                appUser,
                room,
                "Please provide a date in YYYY-MM-DD format.",
                threadId
            );
            return { success: false };
        }

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                sendMessage(
                    this.modify,
                    appUser,
                    room,
                    "Invalid date format. Please use YYYY-MM-DD format.",
                    threadId
                );
                return { success: false };
            }

            await this.receiptHandler.listReceiptDataByUserAndUploadDate(
                user.id,
                date,
                room,
                appUser,
                threadId
            );
            return { success: true };
        } catch (error) {
            this.app.getLogger().error("Error processing date command:", error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "Error processing date. Please use YYYY-MM-DD format.",
                threadId
            );
            return { success: false };
        }
    }

    private async listReceiptsInThread(
        room: IRoom,
        appUser: IUser,
        threadId?: string
    ): Promise<CommandResult> {
        if (!threadId) {
            sendMessage(
                this.modify,
                appUser,
                room,
                "❗ This command can only be used inside a thread.",
                threadId
            );
            return { success: false };
        }

        try {
            await this.receiptHandler.listReceiptDataByThread(
                threadId,
                room,
                appUser,
                this.app.getLogger()
            );
            return { success: true };
        } catch (error) {
            this.app.getLogger().error('Error listing receipts in thread:', error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "Failed to retrieve thread receipts.",
                threadId
            );
            return { success: false };
        }
    }

    private async listReceiptsInThreadByUser(
        user: IUser,
        room: IRoom,
        appUser: IUser,
        threadId?: string
    ): Promise<CommandResult> {
        if (!threadId) {
            sendMessage(
                this.modify,
                appUser,
                room,
                "❗ This command can only be used inside a thread.",
                threadId
            );
            return { success: false };
        }

        try {
            await this.receiptHandler.listReceiptDataByThreadAndUser(
                threadId,
                user.id,
                room,
                appUser
            );
            return { success: true };
        } catch (error) {
            this.app.getLogger().error('Error listing user receipts in thread:', error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "Failed to retrieve your thread receipts.",
                threadId
            );
            return { success: false };
        }
    }

    private async addChannel(
        room: IRoom,
        user: IUser,
        appUser: IUser,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            this.app.getLogger().info("Room id:", room.id);
            this.app.getLogger().info("User id:", user.id);

            await this.channelService.addChannel(room.id, user.id, this.app.getLogger());
            sendMessage(
                this.modify,
                appUser,
                room,
                "✅ This channel has been added to your channel list.",
                threadId
            );
            return { success: true };
        } catch (error) {
            this.app.getLogger().error("Error adding channel:", error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "❌ Failed to add this channel to your channel list.",
                threadId
            );
            return { success: false };
        }
    }

    private async showHelp(appUser: IUser, room: IRoom, threadId?: string): Promise<CommandResult> {
        const helpMessage = `
        📝 **Receipt Command Help** 📝

        **How to use:** Mention me with your request like \`@${this.appUser.name} help\`

        Available commands:
        - **Show my receipts** - "@bot show me my receipts" / "@bot list my receipts"
        - **Show room receipts** - "@bot show all receipts in this room" / "@bot room receipts"
        - **Show receipts by date** - "@bot show receipts from 2024-01-15" / "@bot receipts from yesterday"
        - **Show thread receipts** - "@bot show receipts in this thread" (must be in thread)
        - **Show my thread receipts** - "@bot show my receipts in this thread" (must be in thread)
        - **Add channel** - "@bot add this channel to my list" / "@bot subscribe to this room"
        - **Help** - "@bot help" / "@bot what can you do?"

        **Note:** You can upload receipt images without mentioning me - I'll process them automatically!
        `;

        sendMessage(this.modify, appUser, room, helpMessage.trim(), threadId);
        return { success: true };
    }

    private async handleUnknownCommand(appUser: IUser, room: IRoom, threadId?: string): Promise<CommandResult> {
        sendMessage(
            this.modify,
            appUser,
            room,
            "I didn't understand that command. Just ask me naturally what you want to do with your receipts, or say 'help' to see what I can do!",
            threadId
        );
        return { success: false };
    }
}
