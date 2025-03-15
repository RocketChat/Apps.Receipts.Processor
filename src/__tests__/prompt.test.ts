import { OCR_SYSTEM_PROMPT, RECEIPT_SCAN_PROMPT, RECEIPT_VALIDATION_PROMPT } from '../const/prompt';

describe('Prompt Constants', () => {
  test('OCR_SYSTEM_PROMPT should be defined', () => {
    expect(OCR_SYSTEM_PROMPT).toBeDefined();
  });

  test('RECEIPT_SCAN_PROMPT should be defined', () => {
    expect(RECEIPT_SCAN_PROMPT).toBeDefined();
  });

  test('RECEIPT_VALIDATION_PROMPT should be defined', () => {
    expect(RECEIPT_VALIDATION_PROMPT).toBeDefined();
  });

  test('OCR_SYSTEM_PROMPT should match the expected string', () => {
    const expected = "You are a precision-focused OCR system specialized in extracting receipt data. Your only output format is JSON without any other text or messages.";
    expect(OCR_SYSTEM_PROMPT).toBe(expected);
  });

  test('RECEIPT_SCAN_PROMPT should contain specific rules', () => {
    expect(RECEIPT_SCAN_PROMPT).toContain('**Strict Rules:**');
    expect(RECEIPT_SCAN_PROMPT).toContain('**DO NOT** include any commentary, explanation, or additional text outside of the JSON response.');
  });

  test('RECEIPT_VALIDATION_PROMPT should contain specific rules', () => {
    expect(RECEIPT_VALIDATION_PROMPT).toContain('⚠️ **Strict Rules:**');
    expect(RECEIPT_VALIDATION_PROMPT).toContain('**ONLY** return a JSON response with a boolean value.');
  });
});