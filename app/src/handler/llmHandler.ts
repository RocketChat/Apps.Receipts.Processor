import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { LLMProvider } from "../config/settings";

export interface TextRequest {
    systemPrompt: string;
    userPrompt: string;
}

export interface ImageRequest extends TextRequest {
    base64Image: string;
}

export class LLMClient {
    constructor(private readonly http: IHttp) {}

    public async sendTextRequest(
        provider: LLMProvider,
        apiEndpoint: string,
        apiKey: string,
        modelType: string,
        request: TextRequest
    ): Promise<string> {
        const requestBody = this.createTextRequest(
            provider,
            modelType,
            request.systemPrompt,
            request.userPrompt
        );
        return await this.sendRequest(
            provider,
            apiEndpoint,
            apiKey,
            requestBody,
            modelType
        );
    }

    public async sendImageRequest(
        provider: LLMProvider,
        apiEndpoint: string,
        apiKey: string,
        modelType: string,
        request: ImageRequest
    ): Promise<string> {
        const requestBody = this.createImageRequest(
            provider,
            modelType,
            request.systemPrompt,
            request.userPrompt,
            request.base64Image
        );
        return await this.sendRequest(
            provider,
            apiEndpoint,
            apiKey,
            requestBody,
            modelType
        );
    }

    private createTextRequest(
        provider: LLMProvider,
        modelType: string,
        systemPrompt: string,
        userPrompt: string
    ) {
        switch (provider) {
            case LLMProvider.GEMINI:
                return this.createGeminiTextRequest(systemPrompt, userPrompt);
            case LLMProvider.CLAUDE:
                return this.createClaudeTextRequest(
                    modelType,
                    systemPrompt,
                    userPrompt
                );
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return this.createOpenAICompatibleTextRequest(
                    modelType,
                    systemPrompt,
                    userPrompt
                );
        }
    }

    private createImageRequest(
        provider: LLMProvider,
        modelType: string,
        systemPrompt: string,
        userPrompt: string,
        base64Image: string
    ) {
        switch (provider) {
            case LLMProvider.GEMINI:
                return this.createGeminiImageRequest(
                    systemPrompt,
                    userPrompt,
                    base64Image
                );
            case LLMProvider.CLAUDE:
                return this.createClaudeImageRequest(
                    modelType,
                    systemPrompt,
                    userPrompt,
                    base64Image
                );
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return this.createOpenAICompatibleImageRequest(
                    modelType,
                    systemPrompt,
                    userPrompt,
                    base64Image
                );
        }
    }

    private createOpenAICompatibleTextRequest(
        modelType: string,
        systemPrompt: string,
        userPrompt: string
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
                    content: userPrompt,
                },
            ],
            temperature: 0.1,
        };
    }

    private createOpenAICompatibleImageRequest(
        modelType: string,
        systemPrompt: string,
        userPrompt: string,
        base64Image: string
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
                            text: userPrompt,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.1,
        };
    }

    private createGeminiTextRequest(systemPrompt: string, userPrompt: string) {
        return {
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                {
                    parts: [
                        {
                            text: userPrompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.1,
            },
        };
    }

    private createGeminiImageRequest(
        systemPrompt: string,
        userPrompt: string,
        base64Image: string
    ) {
        return {
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                {
                    parts: [
                        {
                            text: userPrompt,
                        },
                        {
                            inline_data: {
                                data: base64Image,
                                mime_type: "image/jpeg",
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.5,
            },
        };
    }

    private createClaudeTextRequest(
        modelType: string,
        systemPrompt: string,
        userPrompt: string
    ) {
        return {
            model: modelType,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
            temperature: 0.1,
        };
    }

    private createClaudeImageRequest(
        modelType: string,
        systemPrompt: string,
        userPrompt: string,
        base64Image: string
    ) {
        return {
            model: modelType,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userPrompt,
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.1,
        };
    }

    private async sendRequest(
        provider: LLMProvider,
        apiEndpoint: string,
        apiKey: string,
        requestBody: any,
        modelType: string
    ): Promise<string> {
        const headers = this.getRequestHeaders(provider, apiKey);
        const url = this.getRequestUrl(provider, apiEndpoint, modelType, apiKey);

        const response = await this.http.post(url, {
            headers,
            data: requestBody,
        });

        if (response.statusCode !== 200) {
            throw new Error(
                `API error: ${response.statusCode} - ${
                    response.data?.error?.message || "Unknown error"
                }`
            );
        }

        return this.extractResponse(provider, response.data);
    }

    private getRequestHeaders(provider: LLMProvider, apiKey: string) {
        const baseHeaders = {
            "Content-Type": "application/json",
        };

        switch (provider) {
            case LLMProvider.GEMINI:
                return baseHeaders;
            case LLMProvider.CLAUDE:
                return {
                    ...baseHeaders,
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                };
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return {
                    ...baseHeaders,
                    Authorization: `Bearer ${apiKey}`,
                };
        }
    }

    private getRequestUrl(
        provider: LLMProvider,
        apiEndpoint: string,
        modelType: string,
        apiKey: string
    ): string {
        switch (provider) {
            case LLMProvider.GEMINI:
                return `${apiEndpoint}/${modelType}:generateContent?key=${apiKey}`;
            case LLMProvider.CLAUDE:
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return apiEndpoint;
        }
    }

    private extractResponse(provider: LLMProvider, responseData: any): string {
        switch (provider) {
            case LLMProvider.GEMINI:
                return (
                    responseData.candidates?.[0]?.content?.parts?.[0]?.text || ""
                );
            case LLMProvider.CLAUDE:
                return responseData.content?.[0]?.text || "";
            case LLMProvider.OPENAI:
            case LLMProvider.OTHER:
            default:
                return responseData.choices?.[0]?.message?.content || "";
        }
    }
}
