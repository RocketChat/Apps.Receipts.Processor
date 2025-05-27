import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import { CommandUtility } from "../utils/command_utils";
import { ReceiptProcessorApp } from "../../ReceiptProcessorApp";

export class ReceiptCommand implements ISlashCommand {
    public constructor(private readonly app: ReceiptProcessorApp) {}
    public command = "receipt";
    public i18nDescription = "receipt_command_description";
    public providesPreview = true;
    public i18nParamsExample = "list | room | date YYYY-MM-DD | help";

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence,
    ): Promise<void> {
        const command = context.getArguments();
        const sender = context.getSender();
        const room = context.getRoom();

        if (!Array.isArray(command)) {
            return;
        }

        const commandUtility = new CommandUtility({
            persistence: persistence,
            app: this.app,
            sender: sender,
            room: room,
            command: command,
            context: context,
            read: read,
            modify: modify,
            http: http,
        });

        await commandUtility.execute();
    }
}
