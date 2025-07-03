export enum LLMProvider {
    OPENAI = "openai",
    GEMINI = "gemini",
    CLAUDE = "claude",
    OTHER = "other",
}

export interface LLMConfig {
    provider: LLMProvider;
    apiKey: string;
    modelType: string;
    apiEndpoint: string;
}

export const PROVIDER_ENDPOINTS: Record<LLMProvider, string> = {
    [LLMProvider.OPENAI]: "https://api.openai.com/v1/chat/completions",
    [LLMProvider.GEMINI]: "https://generativelanguage.googleapis.com/v1beta/models",
    [LLMProvider.CLAUDE]: "https://api.anthropic.com/v1/messages",
    [LLMProvider.OTHER]: "",
};

export function getLLMConfigFromValues({
    provider,
    apiKey,
    modelType,
    apiEndpoint,
}: {
    provider: LLMProvider;
    apiKey: string;
    modelType: string;
    apiEndpoint?: string;
}): LLMConfig {
    return {
        provider,
        apiKey,
        modelType,
        apiEndpoint: apiEndpoint || PROVIDER_ENDPOINTS[provider] || "",
    };
}
