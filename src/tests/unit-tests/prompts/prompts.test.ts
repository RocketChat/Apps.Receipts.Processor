import { PromptLibrary } from "../../../contrib/prompt-library/npm-module";
import { Model } from "../../../contrib/prompt-library/npm-module/domain/model";
import { describe, it, expect, beforeEach } from '@jest/globals';


describe('PromptLibrary', () => {
    beforeEach(() => {
        PromptLibrary.initializeModels([]);
    });

    it('should initialize models correctly', () => {
        const models = [new Model('model1', 'params1', 'quant1'), new Model('model2', 'params2', 'quant2')];
        PromptLibrary.initializeModels(models);

        expect(PromptLibrary.listModels()).toMatchObject(models.map(model => ({ ...model })));
    });

    it('should add and retrieve prompts correctly', () => {
        const modelName = 'model1';
        const promptKey = 'prompt1';
        const promptValue = 'This is a test prompt';

        PromptLibrary.addPrompt(modelName, promptKey, promptValue);
        const retrievedPrompt = PromptLibrary.getPrompt(modelName, promptKey);

        expect(retrievedPrompt).toBe(promptValue);
    });

    it('should return empty string for non-existent prompt', () => {
        const retrievedPrompt = PromptLibrary.getPrompt('nonExistentModel', 'nonExistentPrompt');
        expect(retrievedPrompt).toBe('');
    });

    it('should fill prompt template with provided values', () => {
        const modelName = 'model1';
        const promptKey = 'prompt1';
        const promptTemplate = 'Hello, {name}!';
        const replacements = { name: 'Piyush' };

        PromptLibrary.addPrompt(modelName, promptKey, promptTemplate);
        const filledPrompt = PromptLibrary.fillPromptTemplate(modelName, promptKey, replacements);

        expect(filledPrompt.trim()).toBe('Hello, Piyush!');
    });

    it('should return empty string when filling non-existent prompt template', () => {
        const filledPrompt = PromptLibrary.fillPromptTemplate('nonExistentModel', 'nonExistentPrompt', { name: 'Piyush' });
        expect(filledPrompt).toBe('');
    });
});