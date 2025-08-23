import {
    IAppAccessors,
    ILogger,
    IRead,
    IConfigurationExtend,
    IHttp,
    IModify,
    IPersistence,
    IAppInstallationContext,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import {
    IMessage,
    IPostMessageSent,
} from "@rocket.chat/apps-engine/definition/messages";
import { settings } from "./src/config/settings";
import { sendDirectMessage, sendMessage } from "./src/utils/message";
import {
    FIRST_INSTALL_RESPONSE,
} from "./src/const/response";
import { ReceiptCommand } from "./src/commands/ReceiptCommand";
import { BotHandler } from "./src/handler/botHandler";
import { ChannelHandler } from "./src/handler/channelHandler";
import { CommandHandler } from "./src/commands/UserCommandHandler";
import { UserInterfaceHandler } from "./src/handler/userInterfaceHandler";
import {
    IUIKitInteractionHandler,
    UIKitBlockInteractionContext,
    IUIKitResponse,
    UIKitViewSubmitInteractionContext,
    UIKitViewCloseInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { ImageHandler } from "./src/handler/imageHandler";

export class ReceiptProcessorApp extends App implements IPostMessageSent, IUIKitInteractionHandler {
    private commandHandler!: CommandHandler;
    private channelHandler!: ChannelHandler;
    private botHandler!: BotHandler;
    private uiHandler!: UserInterfaceHandler;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend
    ): Promise<void> {
        await Promise.all([
            ...settings.map((setting) =>
                configuration.settings.provideSetting(setting)
            ),
            configuration.slashCommands.provideSlashCommand(
                new ReceiptCommand(this)
            ),
        ]);
    }

    public async onInstall(
        context: IAppInstallationContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        this.getLogger().info("Receipt Processor App installed!");
        const installer: IUser | undefined = context.user;
        if (installer) {
            await sendDirectMessage(
                read,
                modify,
                installer,
                FIRST_INSTALL_RESPONSE
            );
        }
    }

    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        this.getLogger().info("Execute post message sent", message.text);

        const appUser = await this.getAppUser();
        if (!appUser) return;

        if (!this.commandHandler) {
            this.commandHandler = new CommandHandler(
                read,
                modify,
                persistence,
                http,
                this,
                appUser
            );
        }
        if (!this.channelHandler) {
            this.channelHandler = new ChannelHandler(read, persistence);
        }
        if (!this.botHandler) {
            this.botHandler = new BotHandler(http, read);
        }
        if (!this.uiHandler) {
            this.uiHandler = new UserInterfaceHandler(
                this.getLogger(),
                this.getID()
            );
        }

        const hasImageAttachment = message.attachments?.some((a) => a.imageUrl) ?? false;
        const isBotMentioned = await this.botHandler.isBotMentioned(
            message,
            appUser
        );

        if (hasImageAttachment) {
            const imageHandler = new ImageHandler(http, read);
            if (!message.id) {
                await sendMessage(
                    modify,
                    appUser,
                    message.room,
                    "❌ Cannot process receipt: missing message ID.",
                    message.threadId
                );
                return;
            }

            await imageHandler.handleReceiptImage(
                message,
                persistence,
                modify,
                appUser
            );
            return;
        }

        if (isBotMentioned && message.text) {
            await this.commandHandler.handleMessage(
                message,
                read,
                http,
                persistence,
                modify
            );
            return;
        }

        return;
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        return this.uiHandler.handleBlockAction(
            context,
            read,
            http,
            persistence,
            modify
        );
    }

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        return this.uiHandler.handleViewSubmit(
            context,
            read,
            http,
            persistence,
            modify
        );
    }

    public async executeViewClosedHandler(
        context: UIKitViewCloseInteractionContext
    ): Promise<IUIKitResponse> {
        return this.uiHandler.handleViewClosed(context);
    }

    private async getAppUser() {
        return this.getAccessors().reader.getUserReader().getAppUser(this.getID());
    }
}
