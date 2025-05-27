import { PromptLibrary } from "../domain/promptLibrary"
import { Model } from "../domain/model"
import { IModelStorage } from "../index"

export class ModelStorage implements IModelStorage {
    private globalTemplates: Record<string, string> = {};

    /**
     * Initializes the model storage with templates and models
     * @param templates - Record of template keys and their corresponding template strings
     * @param models - Optional array of model configurations to initialize
     */
    public initialize(
        templates: Record<string, string>,
        models?: Array<{
            name: string,
            parameters: string,
            quantization: string,
            prompts?: string[]
        }>
    ): void {
        this.globalTemplates = templates;

        if (models?.length) {
            const modelObjects = models.map(model =>
                new Model(model.name, model.parameters, model.quantization)
            );

            PromptLibrary.initializeModels(modelObjects);

            models.forEach(model => {
                model.prompts?.forEach(promptKey => {
                    if (this.globalTemplates[promptKey]) {
                        PromptLibrary.addPrompt(
                            model.name,
                            promptKey,
                            this.globalTemplates[promptKey]
                        );
                    }
                });
            });
        }
    }

    /**
     * Registers a new model with the library
     * @param name - The name of the model
     * @param parameters - The parameters of the model
     * @param quantization - The quantization level of the model
     * @param promptKeys - Optional array of prompt keys to assign to this model
     */
    public registerModel(
        name: string,
        parameters: string,
        quantization: string,
        promptKeys?: string[]
    ): void {
        const model = new Model(name, parameters, quantization);
        const currentModels = PromptLibrary.listModels();

        PromptLibrary.initializeModels(
            currentModels.length ? [...currentModels, model] : [model]
        );

        promptKeys?.forEach(promptKey => {
            if (this.globalTemplates[promptKey]) {
                PromptLibrary.addPrompt(name, promptKey, this.globalTemplates[promptKey]);
            }
        });
    }

    /**
     * Adds a template to the global templates and optionally assigns it to specific models
     * @param templateKey - The key identifier for the template
     * @param templateValue - The template string
     * @param assignToModels - Optional array of model names to assign this template to
     */
    public addTemplate(
        templateKey: string,
        templateValue: string,
        assignToModels?: string[]
    ): void {
        this.globalTemplates[templateKey] = templateValue;

        assignToModels?.forEach(modelName => {
            PromptLibrary.addPrompt(modelName, templateKey, templateValue);
        });
    }

    /**
     * Adds a custom prompt to a specific model
     * @param modelName - The name of the model
     * @param promptKey - The key identifier for the prompt
     * @param promptValue - The prompt template text
     */
    public addCustomPrompt(modelName: string, promptKey: string, promptValue: string): void {
        PromptLibrary.addPrompt(modelName, promptKey, promptValue);
    }

    /**
     * Gets all global templates
     * @returns A copy of the global templates record
     */
    public getTemplates(): Record<string, string> {
        return { ...this.globalTemplates };
    }

    /**
     * Fills a prompt template with provided values
     * @param modelName - The name of the model
     * @param promptKey - The key of the prompt template
     * @param replacements - An object containing key-value pairs for replacements
     * @returns The filled prompt with all placeholders replaced with their values
     */
    public fillPromptTemplate(
        modelName: string,
        promptKey: string,
        replacements: Record<string, string>
    ): string {
        return PromptLibrary.fillPromptTemplate(modelName, promptKey, replacements);
    }
}

export const modelStorage = new ModelStorage();
