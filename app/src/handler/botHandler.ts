import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";
import { LLMClient } from "../prompt_library/client";
import { TextRequest } from "../prompt_library/const/types";
import { getAPIConfig } from "../config/settings";
import { getLLMConfigFromValues } from "../prompt_library/config";
import { IUser } from "@rocket.chat/apps-engine/definition/users";

export class BotHandler {
    private llmClient: LLMClient;
    private appUsername: string | undefined;

    constructor(private readonly http: IHttp, private readonly read: IRead) {
        this.llmClient = new LLMClient(http);
    }

    public async processResponse(prompt: string): Promise<string> {
        const { apiKey, modelType, apiEndpoint, provider } = await getAPIConfig(
            this.read
        );
        const config = await getLLMConfigFromValues({
            provider,
            apiKey,
            modelType,
            apiEndpoint,
        });

        const request: TextRequest = {
            systemPrompt: "You are a helpful assistant.",
            userPrompt: prompt,
        };

        return await this.llmClient.sendTextRequest(config, request);
    }

    public async isBotMentioned(
        message: IMessage,
        appUser: IUser,
    ): Promise<boolean> {
        try {
            const messageText = message.text?.toLowerCase() || "";
            if (!messageText) return false;
            const botUsername = appUser.username.toLowerCase();
            this.appUsername = botUsername;

            const mentionPatterns = [
                new RegExp(`@${this.escapeRegex(botUsername)}(?:[,\\s]|$)`, "i"),
                new RegExp(`^@${this.escapeRegex(botUsername)}\\b`, "i"),
                new RegExp(`\\b@${this.escapeRegex(botUsername)}\\b`, "i"),
            ];

            const isMentioned = mentionPatterns.some((pattern) =>
                pattern.test(messageText)
            );

            if (isMentioned) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    public removeBotMention(messageText: string, appUsername?: string): string {
        if (!appUsername && !this.appUsername) return messageText;
        const username = appUsername || this.appUsername!;
        const mentionPatterns = [
            new RegExp(`@${this.escapeRegex(username)}[,\\s]*`, "gi"),
            new RegExp(`^@${this.escapeRegex(username)}\\s*`, "gi"),
            new RegExp(`\\s*@${this.escapeRegex(username)}\\s*`, "gi"),
        ];

        let cleanedText = messageText;
        mentionPatterns.forEach((pattern) => {
            cleanedText = cleanedText.replace(pattern, " ");
        });

        return cleanedText.trim();
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
