import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { getAPIConfig } from "../config/settings";
import { LLMClient } from "./llmHandler";

export class BotHandler {
    private llmClient: LLMClient;

    constructor(private readonly http: IHttp, private readonly read: IRead) {
        this.llmClient = new LLMClient(http);
    }

    public async processResponse(prompt: string): Promise<any> {
        const { apiKey, modelType, apiEndpoint, provider } = await getAPIConfig(
            this.read
        );

        return await this.llmClient.sendTextRequest(
            provider,
            apiEndpoint,
            apiKey,
            modelType,
            {
                systemPrompt: "You are a useful assistant",
                userPrompt: prompt,
            }
        );
    }
}
