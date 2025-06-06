import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { getAPIConfig } from "../config/settings";

export class BotHandler {
    constructor(private readonly http: IHttp, private readonly read: IRead) {}

       public async processResponse(prompt: string): Promise<any> {
        const { apiKey, modelType, apiEndpoint } = await getAPIConfig(
            this.read
        );
        const requestBody = this.createRequest(
            modelType,
            "You are an useful assistant",
            prompt,
        );

        return await this.sendRequest(apiEndpoint, apiKey, requestBody);
    }

    private createRequest(
        modelType: string,
        systemPrompt: string,
        prompt: string,
    ) {
        return {
            model: modelType,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt,
                        },
                    ],
                },
            ],
        };
    }

    private async sendRequest(
        apiEndpoint: string,
        apiKey: string,
        requestBody: any
    ) {
        const response = await this.http.post(apiEndpoint, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            data: requestBody,
        });

        if (response.statusCode !== 200) {
            throw new Error(`API error: ${response.statusCode}`);
        }

        return response.data.choices[0].message.content;
    }
}
