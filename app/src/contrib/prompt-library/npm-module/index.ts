export { Model } from './domain/model';
export { PromptLibrary } from './domain/promptLibrary';
import { modelStorage } from './service/modelStorage';

export interface IModel {
    readonly name: string;
    readonly parameters: string;
    readonly quantization: string;
}

export interface IModelStorage {
    initialize(
        templates: Record<string, string>,
        models?: Array<{
            name: string,
            parameters: string,
            quantization: string,
            prompts?: string[]
        }>
    ): void;
    registerModel(
        name: string,
        parameters: string,
        quantization: string,
        promptKeys?: string[]
    ): void;
    addTemplate(
        templateKey: string,
        templateValue: string,
        assignToModels?: string[]
    ): void;
    addCustomPrompt(modelName: string, promptKey: string, promptValue: string): void;
    getTemplates(): Record<string, string>;
    fillPromptTemplate(
        modelName: string,
        promptKey: string,
        replacements: Record<string, string>
    ): string;
}

export { modelStorage };
