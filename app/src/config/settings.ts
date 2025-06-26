import {
    ISetting,
    SettingType,
} from "@rocket.chat/apps-engine/definition/settings";
import { IRead } from "@rocket.chat/apps-engine/definition/accessors";

export enum Settings {
    PROVIDER = "provider",
    MODEL_TYPE = "model_type",
    API_KEY = "api_key",
    API_ENDPOINT = "api_endpoint",
}

export enum LLMProvider {
    OPENAI = "openai",
    GEMINI = "gemini",
    CLAUDE = "claude",
    OTHER = "other",
}

export const PROVIDER_MODELS = {
    [LLMProvider.OPENAI]: [
        { key: "gpt-4.1", i18nLabel: "GPT-4.1" },
        { key: "o4-mini", i18nLabel: "o4 Mini" },
    ],
    [LLMProvider.GEMINI]: [
        { key: "gemini-2.5-pro", i18nLabel: "Gemini 2.5 Pro" },
        { key: "gemini-2.5-flash", i18nLabel: "Gemini 2.5 Flash" },
        { key: "gemini-2.0-flash", i18nLabel: "Gemini 2.0 Flash" },
    ],
    [LLMProvider.CLAUDE]: [
        { key: "claude-sonnet-4-20250514", i18nLabel: "Claude 4 Sonnet" },
        { key: "claude-3-5-haiku-20241022", i18nLabel: "Claude 3.5 Haiku" },
        { key: "claude-opus-4-20250514", i18nLabel: "Claude 4 Opus" },
    ],
    [LLMProvider.OTHER]: [
        { key: "custom-model", i18nLabel: "Custom Model (Enter manually)" },
    ],
};

export const PROVIDER_ENDPOINTS = {
    [LLMProvider.OPENAI]: "https://api.openai.com/v1/chat/completions",
    [LLMProvider.GEMINI]:
        "https://generativelanguage.googleapis.com/v1beta/models",
    [LLMProvider.CLAUDE]: "https://api.anthropic.com/v1/messages",
    [LLMProvider.OTHER]: "",
};

export const settings: ISetting[] = [
    {
        id: Settings.PROVIDER,
        type: SettingType.SELECT,
        i18nLabel: "LLM Provider",
        i18nDescription: "Select the AI provider to use for inference.",
        values: [
            { key: LLMProvider.OPENAI, i18nLabel: "OpenAI" },
            { key: LLMProvider.GEMINI, i18nLabel: "Google Gemini" },
            { key: LLMProvider.CLAUDE, i18nLabel: "Anthropic Claude" },
            { key: LLMProvider.OTHER, i18nLabel: "Other/Custom" },
        ],
        required: true,
        public: true,
        packageValue: LLMProvider.OPENAI,
    },
    {
        id: Settings.MODEL_TYPE,
        type: SettingType.STRING,
        i18nLabel: "Model Name",
        i18nDescription:
            "AI model to use for inference. Common models: gpt-4.1, gemini-2.5-flash, claude-sonnet-4-20250514, meta-llama/llama-3.2-11b-vision-instruct",
        required: true,
        public: true,
        packageValue: "gpt-4.1",
    },
    {
        id: Settings.API_KEY,
        type: SettingType.PASSWORD,
        i18nLabel: "API Key",
        i18nDescription: "API Key to access the LLM Model",
        i18nPlaceholder: "",
        required: true,
        public: false,
        packageValue: "",
    },
    {
        id: Settings.API_ENDPOINT,
        type: SettingType.STRING,
        i18nLabel: "API Endpoint",
        i18nDescription: "API endpoint URL. Leave empty to use provider default.",
        required: false,
        public: true,
        packageValue: "",
    },
];

export async function getAPIConfig(read: IRead) {
    const envReader = read.getEnvironmentReader().getSettings();
    const provider = (await envReader.getValueById(
        Settings.PROVIDER
    )) as LLMProvider;
    const customEndpoint = await envReader.getValueById(Settings.API_ENDPOINT);

    return {
        provider,
        apiKey: await envReader.getValueById(Settings.API_KEY),
        modelType: await envReader.getValueById(Settings.MODEL_TYPE),
        apiEndpoint: customEndpoint || PROVIDER_ENDPOINTS[provider] || "",
    };
}

export function getProviderModels(provider: LLMProvider) {
    return PROVIDER_MODELS[provider] || [];
}
