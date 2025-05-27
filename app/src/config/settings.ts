import {
    ISetting,
    SettingType,
} from "@rocket.chat/apps-engine/definition/settings";
import { IRead } from '@rocket.chat/apps-engine/definition/accessors';

export enum Settings {
    MODEL_TYPE = 'model_type',
	API_KEY = 'api_key',
    API_ENDPOINT = 'api_endpoint',
}

export const settings: ISetting[] = [
    {
        id: Settings.MODEL_TYPE,
        type: SettingType.SELECT,
        i18nLabel: "Model selection",
        i18nDescription: "AI model to use for inference.",
        values: [
            { key: "meta-llama/Llama-3.2-11B-Vision-Instruct", i18nLabel: "Llama 3.2 Vision 11B" }
        ],
        required: true,
        public: true,
        packageValue: "meta-llama/Llama-3.2-11B-Vision-Instruct",
    },
    {
		id: Settings.API_KEY,
		type: SettingType.PASSWORD,
        i18nLabel: 'API Key',
        i18nDescription: "API Key to access the LLM Model",
		i18nPlaceholder: '',
		required: true,
		public: false,
        packageValue: '',
	},
    {
        id: Settings.API_ENDPOINT,
        type: SettingType.STRING,
        i18nLabel: "API Endpoint",
        i18nDescription: "API endpoint to use for inference.",
        required: true,
        public: true,
        packageValue: '',
    },
];

export async function getAPIConfig(read: IRead) {
    const envReader = read.getEnvironmentReader().getSettings();
    return {
        apiKey: await envReader.getValueById("api_key"),
        modelType: await envReader.getValueById("model_type"),
        apiEndpoint: await envReader.getValueById("api_endpoint"),
    };
}
