import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import {
    IMessage,
    IMessageAttachment,
} from "@rocket.chat/apps-engine/definition/messages";
import { getAPIConfig } from "../config/settings";
import { PromptLibrary } from "../contrib/prompt-library/npm-module";

export class ImageHandler {
    constructor(private readonly http: IHttp, private readonly read: IRead) {}

    public async processImage(message: IMessage, prompt: string): Promise<any> {
        const { apiKey, modelType, apiEndpoint } = await getAPIConfig(
            this.read
        );
        const base64Image = await this.convertImageToBase64(message);
        const requestBody = this.createOCRRequest(
            modelType,
            prompt,
            base64Image
        );

        return await this.sendRequest(apiEndpoint, apiKey, requestBody);
    }

    public async validateImage(message: IMessage): Promise<boolean> {
        try {
            const { modelType } = await getAPIConfig(this.read);
            const response = await this.processImage(
                message,
                PromptLibrary.getPrompt(modelType, "RECEIPT_VALIDATION_PROMPT")
            );
            const jsonResponse = JSON.parse(response);
            return jsonResponse.is_receipt === true;
        } catch (error) {
            console.error("Error validating image:", error);
            return false;
        }
    }

    public static isImageAttachment(attachment: IMessageAttachment): boolean {
        return attachment.imageUrl !== undefined;
    }

    private async convertImageToBase64(message: IMessage): Promise<string> {
        try {
            const image = await this.read
                .getUploadReader()
                .getBufferById(message.file?._id!);
            return image.toString("base64");
        } catch (error) {
            throw error;
        }
    }

    private createOCRRequest(
        modelType: string,
        prompt: string,
        base64Image: string
    ) {
        return {
            model: modelType,
            messages: [
                {
                    role: "system",
                    content: PromptLibrary.getPrompt(
                        modelType,
                        "OCR_SYSTEM_PROMPT"
                    ),
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt,
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
        };
    }

    private async sendRequest(
        apiEndpoint: string,
        apiKey: string,
        requestBody: any
    ) {
        const response = await this.http.post(apiEndpoint, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            data: requestBody,
        });

        if (response.statusCode !== 200) {
            throw new Error(`API error: ${response.statusCode}`);
        }

        return response.data.choices[0].message.content;
    }
}
