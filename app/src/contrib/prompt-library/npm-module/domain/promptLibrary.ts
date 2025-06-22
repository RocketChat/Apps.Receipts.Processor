import { Model } from './model';

export class PromptLibrary {
    private static models: Model[] = [];
    private static prompts: Map<string, Map<string, string>> = new Map();

    /**
     * Initializes the library with a list of models
     * @param models - Array of Model objects to initialize the library with
     */
    static initializeModels(models: Model[]): void {
        this.models = models;
        models.forEach(model => {
            if (!this.prompts.has(model.name)) {
                this.prompts.set(model.name, new Map());
            }
        });
    }

    /**
     * Adds a prompt template to a specific model
     * @param modelName - The name of the model to add the prompt to
     * @param promptKey - The key identifier for the prompt
     * @param promptValue - The prompt template text
     */
    static addPrompt(modelName: string, promptKey: string, promptValue: string): void {
        if (!this.prompts.has(modelName)) {
            this.prompts.set(modelName, new Map());
        }
        this.prompts.get(modelName)?.set(promptKey, promptValue);
    }

    /**
     * Retrieves a prompt template for a specific model
     * @param modelName - The name of the model
     * @param promptKey - The key identifier for the prompt
     * @returns The prompt template text, or empty string if not found
     */
    static getPrompt(modelName: string, promptKey: string): string {
        return this.prompts.get(modelName)?.get(promptKey) || '';
    }

    /**
     * Lists all models registered in the library
     * @returns Array of Model objects
     */
    static listModels(): Model[] {
        return [...this.models];
    }

    /**
     * Fills a prompt template with provided values
     * @param modelName - The name of the model
     * @param promptKey - The key of the prompt template
     * @param replacements - An object containing key-value pairs for replacements
     * @returns The filled prompt with all placeholders replaced with their values
     */
    static fillPromptTemplate(
        modelName: string,
        promptKey: string,
        replacements: Record<string, string>
    ): string {
        const template = this.getPrompt(modelName, promptKey);
        if (!template) {
            return '';
        }

        let filledPrompt = template;
        Object.entries(replacements).forEach(([key, value]) => {
            const bracketPattern = new RegExp(`\\{${key}\\}`, 'g');
            filledPrompt = filledPrompt.replace(bracketPattern, value)
        });

        return filledPrompt;
    }
}