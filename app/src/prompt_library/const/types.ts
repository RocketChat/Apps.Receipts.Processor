export interface TextRequest {
    systemPrompt: string;
    userPrompt: string;
}

export interface ImageRequest extends TextRequest {
    base64Image: string;
}
