import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { LLMClient } from "../prompt_library/client";
import { TextRequest } from "../prompt_library/const/types";
import { getAPIConfig } from "../config/settings";
import { getLLMConfigFromValues } from "../prompt_library/config";

export class BotHandler {
    private llmClient: LLMClient;
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
}
