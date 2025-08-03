import {
    IRead,
    IModify,
    IPersistence,
    IHttp,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { ReceiptProcessorApp } from "../../ReceiptProcessorApp";
import { ReceiptHandler } from "../handler/receiptHandler";
import { ChannelService } from "../service/channelService";
import { sendMessage } from "../utils/message";
import { CommandParams, CommandResult } from "../types/command";
import { BotHandler } from "../handler/botHandler";
import { RESPONSE_PROMPT } from "../../src/prompt_library/const/prompt";
import {
    CREATE_REPORT_INSTRUCTIONS,
    CREATE_CATEGORY_REPORT_INSTRUCTIONS,
} from "../const/prompt";
import { ReceiptService } from "../service/receiptService";
import { ISpendingReport, IReceiptData } from "../types/receipt";
import { sendDownloadablePDF } from "../utils/pdfGenerator";

function parseDateString(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    const normalized = dateStr.replace(/\//g, "-");
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        const dateParts = normalized.split("-");
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const date = new Date(year, month, day);

        if (
            date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day
        ) {
            return normalized;
        }
    }
    return undefined;
}

export class CommandHandler {
    private receiptHandler: ReceiptHandler;
    private receiptService: ReceiptService;
    private channelService: ChannelService;
    private botHandler: BotHandler;
    private app: ReceiptProcessorApp;
    private appUser: IUser;

    constructor(
        private readonly read: IRead,
        private readonly modify: IModify,
        private readonly persistence: IPersistence,
        private readonly http: IHttp,
        app: ReceiptProcessorApp,
        appUser: IUser
    ) {
        this.app = app;
        this.receiptHandler = new ReceiptHandler(
            this.persistence,
            this.read.getPersistenceReader(),
            this.modify
        );
        this.receiptService = new ReceiptService(
            persistence,
            this.read.getPersistenceReader()
        );
        this.channelService = new ChannelService(
            this.persistence,
            this.read.getPersistenceReader()
        );
        this.botHandler = new BotHandler(this.http, this.read);
        this.appUser = appUser;
    }

    static isAddChannelCommand(messageText: string): boolean {
        if (!messageText) return false;
        const lower = messageText.toLowerCase();
        const addChannelPhrases = [
            "add channel",
            "register channel",
            "add this channel",
            "register this channel",
            "add current channel",
            "register current channel",
            "add this room",
            "register this room",
            "add room",
            "register room",
        ];
        return addChannelPhrases.some((phrase) => lower.includes(phrase));
    }

    static isReceiptCommand(messageText: string): boolean {
        if (!messageText) return false;

        const lowerText = messageText.toLowerCase();
        const keywords = [
            "receipt",
            "receipts",
            "show",
            "list",
            "display",
            "my receipts",
            "room receipts",
            "thread receipts",
            "add channel",
            "help",
            "date",
            "yesterday",
            "today",
            "spending",
            "total",
            "export",
            "search",
            "find",
            "summary",
        ];

        return keywords.some((keyword) => lowerText.includes(keyword));
    }

    static extractParams(message: string): any {
        const params: any = {};
        const dateRangeMatch = message.match(
            /from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i
        );

        if (dateRangeMatch) {
            params.startDate = dateRangeMatch[1];
            params.endDate = dateRangeMatch[2];
        } else {
            const dateMatch = message.match(
                /(?:(?:from|for|on)\s+)?(\d{4}-\d{2}-\d{2})/i
            );

            if (dateMatch && dateMatch[1]) {
                params.date = dateMatch[1];
            }
        }

        const searchMatch = message.match(
            /(?:with|for|containing|about)\s+(.+)/i
        );
        if (searchMatch) {
            params.searchTerm = searchMatch[1].trim();
        }

        return Object.keys(params).length > 0 ? params : undefined;
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
                    message: "App user not found for sending messages",
                };
            }

            const startDate = params?.startDate
                ? parseDateString(params.startDate)
                : undefined;
            const endDate = params?.endDate
                ? parseDateString(params.endDate)
                : undefined;

            this.app.getLogger().info(`Executing command: ${command}`, params);

            switch (command) {
                case "list":
                    return await this.listReceiptsByUser(
                        user,
                        room,
                        appUser,
                        this.modify,
                        threadId
                    );

                case "room":
                    return await this.listReceiptsByRoom(
                        room,
                        appUser,
                        this.modify,
                        threadId
                    );

                case "date":
                    const parsedDateParam = params?.date
                        ? parseDateString(params.date)
                        : undefined;
                    return await this.listReceiptsByDate(
                        user,
                        room,
                        appUser,
                        this.modify,
                        parsedDateParam,
                        threadId
                    );

                case "date_range":
                    if (startDate && endDate) {
                        return await this.listReceiptsByDateRange(
                            user,
                            room,
                            appUser,
                            this.modify,
                            startDate,
                            endDate,
                            threadId
                        );
                    } else {
                        sendMessage(
                            this.modify,
                            appUser,
                            room,
                            "Please provide a valid start and end date in YYYY-MM-DD format (e.g., 'from 2024-07-01 to 2024-07-31').",
                            threadId
                        );
                        return {
                            success: false,
                            message: "Invalid date range parameters.",
                        };
                    }

                case "thread":
                    return await this.listReceiptsInThread(
                        room,
                        appUser,
                        this.modify,
                        threadId
                    );

                case "thread_user":
                    return await this.listReceiptsInThreadByUser(
                        user,
                        room,
                        appUser,
                        this.modify,
                        threadId
                    );

                case "add_channel":
                    return await this.addChannel(room, user, appUser, threadId);

                case "help":
                    return await this.showHelp(appUser, room, threadId);

                case "spending_report":
                    const category = params?.category;
                    return await this.showReport(
                        room,
                        user,
                        appUser,
                        threadId,
                        category,
                        startDate,
                        endDate
                    );

                case "unknown":
                default:
                    return await this.handleUnknownCommand(
                        appUser,
                        room,
                        threadId
                    );
            }
        } catch (error) {
            this.app.getLogger().error("Error executing command:", error);
            return {
                success: false,
                message:
                    "An error occurred while processing your command. Please try again.",
            };
        }
    }

    private async getAppUser(): Promise<IUser | undefined> {
        const appUser = await this.read
            .getUserReader()
            .getAppUser(this.app.getID());
        if (!appUser) {
            this.app
                .getLogger()
                .error("App user not found for sending messages");
            return undefined;
        }
        return appUser;
    }

    private async listReceiptsByUser(
        user: IUser,
        room: IRoom,
        appUser: IUser,
        modify: IModify,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            await this.receiptHandler.listReceiptDataByRoomAndUser(
                user,
                room,
                appUser,
                threadId
            );
            return { success: true };
        } catch (error) {
            this.app
                .getLogger()
                .error("Error listing receipts by user:", error);
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
        modify: IModify,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            await this.receiptHandler.listReceiptDataByRoom(
                room,
                appUser,
                threadId
            );
            return { success: true };
        } catch (error) {
            this.app
                .getLogger()
                .error("Error listing receipts by room:", error);
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
        modify: IModify,
        parsedDateStr?: string,
        threadId?: string
    ): Promise<CommandResult> {
        if (!parsedDateStr) {
            sendMessage(
                this.modify,
                appUser,
                room,
                "Invalid date. Please use YYYY-MM-DD, 'today', or 'yesterday'.",
                threadId
            );
            return { success: false };
        }

        try {
            await this.receiptHandler.listReceiptDataByUserAndUploadDate(
                parsedDateStr,
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

    private async listReceiptsByDateRange(
        user: IUser,
        room: IRoom,
        appUser: IUser,
        modify: IModify,
        startDateStr: string,
        endDateStr: string,
        threadId?: string
    ): Promise<CommandResult> {
        try {
            await this.receiptHandler.listReceiptDataByRoomUserAndDateRange(
                user,
                room,
                appUser,
                startDateStr,
                endDateStr,
                threadId
            );
            return { success: true };
        } catch (error) {
            this.app
                .getLogger()
                .error("Error processing date range command:", error);
            sendMessage(
                this.modify,
                appUser,
                room,
                "Error processing date range. Please ensure dates are in YYYY-MM-DD format.",
                threadId
            );
            return { success: false };
        }
    }

    private async listReceiptsInThread(
        room: IRoom,
        appUser: IUser,
        modify: IModify,
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
            this.app
                .getLogger()
                .error("Error listing receipts in thread:", error);
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
        modify: IModify,
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
                user.id,
                threadId,
                room,
                appUser
            );
            return { success: true };
        } catch (error) {
            this.app
                .getLogger()
                .error("Error listing user receipts in thread:", error);
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
            const context =
                "The user just added the channel to the list of channels that the receipt processor bot will listen to.";
            const response =
                "✅ You have successfully added this channel! Now, I can store your receipt data and show it to you whenever you need. If you have more channels, feel free to add them too!";
            const instructions =
                "Respond in a friendly, concise, and encouraging way. Let the user know the channel was added and what the bot can do next.";

            const processResponse = await this.botHandler.processResponse(
                RESPONSE_PROMPT(context, "", response, instructions)
            );
            await this.channelService.addChannel(room.id, user.id);
            sendMessage(this.modify, appUser, room, processResponse, threadId);
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

    private async showReport(
        room: IRoom,
        user: IUser,
        appUser: IUser,
        threadId?: string,
        category?: string,
        startDate?: string,
        endDate?: string
    ): Promise<CommandResult> {
        sendMessage(
            this.modify,
            appUser,
            room,
            "Generating your PDF",
            threadId
        );

        let receiptDatas: IReceiptData[];
        if (startDate && endDate) {
            receiptDatas =
                await this.receiptService.getReceiptsByUserAndRoomAndDateRange(
                    user.id,
                    room.id,
                    startDate,
                    endDate
                );
        } else {
            receiptDatas = await this.receiptService.getReceiptsByUserAndRoom(
                user.id,
                room.id
            );
        }

        const receiptJSON = JSON.stringify(receiptDatas, null, 2);

        const prompt =
            category && category.trim()
                ? CREATE_CATEGORY_REPORT_INSTRUCTIONS(receiptJSON, category)
                : CREATE_REPORT_INSTRUCTIONS(receiptJSON);

        const processResponse = await this.botHandler.processResponse(prompt);

        if (category && category.trim() && !processResponse.trim()) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                `No data found for category "${category}".`,
                threadId
            );
            return {
                success: false,
                message: `No data for category "${category}"`,
            };
        }

        const cleanJSON = processResponse
            .replace(/```json\s*([\s\S]*?)```/i, "$1")
            .replace(/```([\s\S]*?)```/g, "$1")
            .trim();

        if (!cleanJSON) {
            await sendMessage(
                this.modify,
                appUser,
                room,
                `No data found for category "${category}".`,
                threadId
            );
            return {
                success: false,
                message: `No data for category "${category}"`,
            };
        }

        const extraFee = this.receiptHandler.calculateTotalExtraFee(receiptDatas)
        const report: ISpendingReport = JSON.parse(cleanJSON);
        report.extraFee = extraFee

        await sendDownloadablePDF(
            this.modify,
            appUser,
            room,
            "spending_report.pdf",
            report,
            "Here is your spending report.",
            threadId
        );

        return { success: true };
    }

    private async showHelp(
        appUser: IUser,
        room: IRoom,
        threadId?: string
    ): Promise<CommandResult> {
        const helpMessage = `
            👋 **Hi there! I'm here to help you manage your receipts.**

            Here are some things you can ask me to do:

            - **See your receipts:**
            Just say something like "@${this.appUser.name} show me my receipts" or "@bot list my receipts".

            - **View all receipts in this room:**
            Try "@bot show all receipts in this room" or "@bot room receipts".

            - **Find receipts by date:**
            For example, "@bot show receipts from 2024-01-15" or "@bot receipts from yesterday".

            - **Look up receipts for a date range:**
            You can ask "@bot show receipts from 2024-07-01 to 2024-07-31", or try "from last week" or "from last month".

            - **See receipts in a thread:**
            If you're in a thread, just say "@bot show receipts in this thread".

            - **See your own receipts in a thread:**
            In a thread, you can also ask "@bot show my receipts in this thread".

            - **Add this channel:**
            Say "@bot add this channel to my list" or "@bot subscribe to this room" to start tracking receipts here.

            - **Need help?**
            Just ask "@bot help" or "@bot what can you do?".

            **Tip:** You can also upload receipt images directly—no need to mention me! I’ll process them automatically.

            If you ever get stuck or have a question, just let me know. I’m always here to help!`;

        sendMessage(this.modify, appUser, room, helpMessage.trim(), threadId);
        return { success: true };
    }

    private async handleUnknownCommand(
        appUser: IUser,
        room: IRoom,
        threadId?: string
    ): Promise<CommandResult> {
        const context =
            "The user entered a command or message that the bot does not recognize or support. The user may be trying to interact with the receipt processor bot, but the intent is unclear.";
        const response =
            "I'm not sure I understood that. If you need help with your receipts or want to know what I can do, just let me know by asking for help!";
        const instructions =
            "Respond in a friendly, concise, and encouraging way. Let the user know their message wasn't understood, and suggest they ask for help or try rephrasing. Do not use the exact words from the example; vary the wording and keep it open-ended.";

        const processResponse = await this.botHandler.processResponse(
            RESPONSE_PROMPT(context, "", response, instructions)
        );

        sendMessage(this.modify, appUser, room, processResponse, threadId);
        return { success: false };
    }
}
