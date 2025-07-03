import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { TextRequest, ImageRequest } from "./const/types";
import { LLMProvider, LLMConfig } from "./config";

export class LLMClient {
    constructor(private readonly http: IHttp) {}

    public async sendTextRequest(
        config: LLMConfig,
        request: TextRequest
    ): Promise<string> {
        const body = this.createTextRequest(config, request);
        return await this.sendRequest(config, body);
    }

    public async sendImageRequest(
        config: LLMConfig,
        request: ImageRequest
    ): Promise<string> {
        const body = this.createImageRequest(config, request);
        return await this.sendRequest(config, body);
    }

    private createTextRequest(config: LLMConfig, request: TextRequest) {
        switch (config.provider) {
            case LLMProvider.GEMINI:
                return {
                    systemInstruction: { parts: [{ text: request.systemPrompt }] },
                    contents: [{ parts: [{ text: request.userPrompt }] }],
                    generationConfig: { temperature: 0.1 },
                };
            case LLMProvider.CLAUDE:
                return {
                    model: config.modelType,
                    system: request.systemPrompt,
                    messages: [{ role: "user", content: request.userPrompt }],
                    temperature: 0.1,
                };
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return {
                    model: config.modelType,
                    messages: [
                        { role: "system", content: request.systemPrompt },
                        { role: "user", content: request.userPrompt },
                    ],
                    temperature: 0.1,
                };
        }
    }

    private createImageRequest(config: LLMConfig, request: ImageRequest) {
        switch (config.provider) {
            case LLMProvider.GEMINI:
                return {
                    systemInstruction: { parts: [{ text: request.systemPrompt }] },
                    contents: [
                        {
                            parts: [
                                { text: request.userPrompt },
                                {
                                    inline_data: {
                                        data: request.base64Image,
                                        mime_type: "image/jpeg",
                                    },
                                },
                            ],
                        },
                    ],
                    generationConfig: { temperature: 0.5 },
                };
            case LLMProvider.CLAUDE:
                return {
                    model: config.modelType,
                    system: request.systemPrompt,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: request.userPrompt },
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: "image/jpeg",
                                        data: request.base64Image,
                                    },
                                },
                            ],
                        },
                    ],
                    temperature: 0.1,
                };
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return {
                    model: config.modelType,
                    messages: [
                        { role: "system", content: request.systemPrompt },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: request.userPrompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/jpeg;base64,${request.base64Image}`,
                                    },
                                },
                            ],
                        },
                    ],
                    temperature: 0.1,
                };
        }
    }

    private getHeaders(config: LLMConfig) {
        const base = { "Content-Type": "application/json" };
        switch (config.provider) {
            case LLMProvider.GEMINI:
                return base;
            case LLMProvider.CLAUDE:
                return {
                    ...base,
                    "x-api-key": config.apiKey,
                    "anthropic-version": "2023-06-01",
                };
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return {
                    ...base,
                    Authorization: `Bearer ${config.apiKey}`,
                };
        }
    }

    private getUrl(config: LLMConfig) {
        switch (config.provider) {
            case LLMProvider.GEMINI:
                return `${config.apiEndpoint}/${config.modelType}:generateContent?key=${config.apiKey}`;
            default:
                return config.apiEndpoint;
        }
    }

    private extractResponse(config: LLMConfig, data: any): string {
        switch (config.provider) {
            case LLMProvider.GEMINI:
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            case LLMProvider.CLAUDE:
                return data.content?.[0]?.text || "";
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return data.choices?.[0]?.message?.content || "";
        }
    }

    private async sendRequest(
        config: LLMConfig,
        body: any
    ): Promise<string> {
        const headers = this.getHeaders(config);
        const url = this.getUrl(config);

        const response = await this.http.post(url, {
            headers,
            data: body,
        });

        if (response.statusCode !== 200) {
            throw new Error(
                `API error: ${response.statusCode} - ${
                    response.data?.error?.message || "Unknown error"
                }`
            );
        }

        return this.extractResponse(config, response.data);
    }
}
