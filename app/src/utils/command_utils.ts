import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IExecutorProps } from "../types/commandExecutor";
import { ReceiptProcessorApp } from "../../ReceiptProcessorApp";
import { ReceiptHandler } from "../handler/receiptHandler";
import { sendMessage } from './message';
import { ChannelService } from '../service/channelService';

export class CommandUtility {
    sender: IUser;
    room: IRoom;
    command: string[];
    context: SlashCommandContext;
    read: IRead;
    modify: IModify;
    http: IHttp;
    persistence: IPersistence;
    app: ReceiptProcessorApp;
    receiptHandler: ReceiptHandler;
    channelService: ChannelService;

    constructor(props: IExecutorProps) {
        this.sender = props.sender;
        this.room = props.room;
        this.command = props.command;
        this.context = props.context;
        this.read = props.read;
        this.modify = props.modify;
        this.http = props.http;
        this.persistence = props.persistence;
        this.app = props.app;
        this.receiptHandler = new ReceiptHandler(this.persistence, this.read.getPersistenceReader(), this.modify)
        this.channelService = new ChannelService(this.persistence, this.read.getPersistenceReader());
    }

    private async getAppUser(): Promise<IUser | undefined> {
        const appUser = await this.read.getUserReader().getAppUser(this.app.getID());
        if (!appUser) {
            this.app.getLogger().error("App user not found for sending messages");
            return undefined;
        }
        return appUser;
    }

    private showHelp(appUser: IUser): void {
        const helpMessage = `
        📝 **Receipt Command Help** 📝

        Available commands:
        - \`/receipt list\` - Show your receipts in the current room
        - \`/receipt room\` - Show all receipts in the current room
        - \`/receipt date YYYY-MM-DD\` - Show your receipts from a specific date
        - \`/receipt add_channel\` - Add this room to your channel list
        - \`/receipt help\` - Show this help message
        `;
        sendMessage(this.modify, appUser, this.room, helpMessage);
    }

    public async execute() {
        try {
            const appUser = await this.getAppUser();
            if (!appUser) {
                this.app.getLogger().error("App user not found");
                return;
            }

            const commandLength = this.command.length;
            this.app.getLogger().info(`Executing command with args:`, this.command);

            if (commandLength === 0) {
                this.showHelp(appUser);
                return;
            }

            const mainCommand = this.command[0].toLowerCase();
            this.app.getLogger().info(`Main command: ${mainCommand}`);

            switch (mainCommand) {
                case "list":
                    await this.receiptHandler.listReceiptDataByRoomAndUser(this.sender, this.room, appUser);
                    break;

                case "room":
                    await this.receiptHandler.listReceiptDataByRoom(this.room, appUser);
                    break;

                case "date":
                    if (commandLength < 2) {
                        sendMessage(this.modify, appUser, this.room, "Please provide a date in YYYY-MM-DD format.");
                        return;
                    }
                    try {
                        const dateStr = this.command[1];
                        const date = new Date(dateStr);
                        if (isNaN(date.getTime())) {
                            sendMessage(this.modify, appUser, this.room, "Invalid date format. Please use YYYY-MM-DD format.");
                            return;
                        }

                        await this.receiptHandler.listReceiptDataByUserAndUploadDate(
                            this.sender.id,
                            date,
                            this.room,
                            appUser
                        );
                    } catch (error) {
                        this.app.getLogger().error("Error processing date command:", error);
                        sendMessage(this.modify, appUser, this.room, "Error processing date. Please use YYYY-MM-DD format.");
                    }
                    break;

                case "help":
                    this.showHelp(appUser);
                    break;
                case "add_channel":
                    try {
                        this.app.getLogger().info("Room id :", this.room.id)
                        this.app.getLogger().info("user id :", this.sender.id)
                        await this.channelService.addChannel(this.room.id, this.sender.id, this.app.getLogger());
                        sendMessage(
                            this.modify,
                            appUser,
                            this.room,
                            "✅ This channel has been added to your channel list."
                        );
                    } catch (error) {
                        this.app.getLogger().error("Error adding channel:", error);
                        sendMessage(
                            this.modify,
                            appUser,
                            this.room,
                            "❌ Failed to add this channel to your channel list."
                        );
                    }
                    break;
                default:
                    sendMessage(
                        this.modify,
                        appUser,
                        this.room,
                        `Unknown command: ${mainCommand}. Type \`/receipt help\` for available commands.`
                    );
                    break;
            }
        } catch (error) {
            this.app.getLogger().error("Error in CommandUtility.execute:", error);

            const appUser = await this.getAppUser();
            if (appUser) {
                sendMessage(
                    this.modify,
                    appUser,
                    this.room,
                    "An error occurred while processing your command. Please try again."
                );
            }
        }
    }
}
