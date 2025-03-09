import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IExecutorProps } from "../domain/commandExecutor";
import { ReceiptProcessorApp } from "../../ReceiptProcessorApp";
import { listReceiptData } from "../lib/receiptProcessing";

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
    }

    public async execute() {
        const commandLength = this.command.length;
        if (commandLength === 1) {
            const command = this.command[0];
            if (command === "list") {
                const appUser = await this.read.getUserReader().getAppUser(this.app.getID());
                if (!appUser) {
                    this.app.getLogger().error("App user not found for sending messages");
                    return;
                }

                await listReceiptData(this.read.getPersistenceReader(), this.modify, this.sender, this.room, appUser);
            }
        }
    }
}
