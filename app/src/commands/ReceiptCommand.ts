import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    ISlashCommand,
    SlashCommandContext,
    ISlashCommandPreview,
    ISlashCommandPreviewItem,
    SlashCommandPreviewItemType,
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
        persistence: IPersistence
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

    public async previewer(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<ISlashCommandPreview> {
        const args = context.getArguments();
        const items: Array<ISlashCommandPreviewItem> = [];
        if (args.length === 0 || args.length === 1) {
            const currentArg = args[0]?.toLowerCase() || "";

            const commands = [
                {
                    id: "list",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: "list",
                    i18nTitle: "receipt_list_command",
                },
                {
                    id: "room",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: "room",
                    i18nTitle: "receipt_room_command",
                },
                {
                    id: "date",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: "date",
                    i18nTitle: "receipt_date_command",
                },
                {
                    id: "help",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: "help",
                    i18nTitle: "receipt_help_command",
                },
                {
                    id: "add_channel",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: "add_channel",
                    i18nTitle: "receipt_add_channel_command",
                }
            ];
            const filteredCommands = commands.filter((cmd) =>
                cmd.value.startsWith(currentArg)
            );

            items.push(...filteredCommands);
        }

        if (args.length === 1 && args[0].toLowerCase() === "date") {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            const dateExamples = [
                {
                    id: "date-today",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: `date ${today.toISOString().split("T")[0]}`,
                    i18nTitle: "receipt_date_today",
                },
                {
                    id: "date-yesterday",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: `date ${yesterday.toISOString().split("T")[0]}`,
                    i18nTitle: "receipt_date_yesterday",
                },
                {
                    id: "date-last-week",
                    type: SlashCommandPreviewItemType.TEXT,
                    value: `date ${lastWeek.toISOString().split("T")[0]}`,
                    i18nTitle: "receipt_date_last_week",
                },
            ];

            items.push(...dateExamples);
        }

        return {
            i18nTitle: "receipt_commands",
            items,
        };
    }

    public async executePreviewItem(
        item: ISlashCommandPreviewItem,
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        try {
            const sender = context.getSender();
            const room = context.getRoom();
            const commandArgs = item.value.split(" ");

            this.app
                .getLogger()
                .info("Executing preview item with args:", commandArgs);
            const commandUtility = new CommandUtility({
                persistence: persistence,
                app: this.app,
                sender: sender,
                room: room,
                command: commandArgs,
                context: context,
                read: read,
                modify: modify,
                http: http,
            });

            await commandUtility.execute();
            this.app
                .getLogger()
                .info("Preview item execution completed successfully");
        } catch (error) {
            this.app.getLogger().error("Error in executePreviewItem:", error);
            const appUser = await read
                .getUserReader()
                .getAppUser(this.app.getID());
            if (appUser) {
                const builder = modify
                    .getCreator()
                    .startMessage()
                    .setSender(appUser)
                    .setRoom(context.getRoom())
                    .setText(
                        "Sorry, there was an error executing the command. Please try again."
                    );
                await modify.getCreator().finish(builder);
            }
        }
    }
}
