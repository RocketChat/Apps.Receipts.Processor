import { IRead, IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IMessage, IMessageAttachment } from "@rocket.chat/apps-engine/definition/messages";
import { OCR_SYSTEM_PROMPT } from "../const/prompt";
import { getAPIConfig } from "../config/settings";
import { RECEIPT_VALIDATION_PROMPT } from "../const/prompt";

export async function processImage (
    http: IHttp,
    message: IMessage,
    read: IRead,
    prompt: string
): Promise<any> {
    const { apiKey, modelType, apiEndpoint } = await getAPIConfig(read);
    const base64Image = await convertImageToBase64(message, read);
    const requestBody = createOCRRequest(modelType, prompt, base64Image);

    return await sendRequest(http, apiEndpoint, apiKey, requestBody);
}

async function sendRequest(http: IHttp, apiEndpoint: string, apiKey: string, requestBody: any) {
    const response = await http.post(apiEndpoint, {
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

function createOCRRequest(modelType: string, prompt: string, base64Image: string) {
    return {
        model: modelType,
        messages: [
            {
                role: "system",
                content: OCR_SYSTEM_PROMPT,
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

export async function convertImageToBase64(
    message: IMessage,
    read: IRead
): Promise<string> {
    try {
        const image = await read.getUploadReader().getBufferById(message.file?._id!);
        return image.toString("base64");
    } catch (error) {
        throw error;
    }
}

export function isImageAttachment(attachment: IMessageAttachment): boolean {
    return attachment.imageUrl != undefined
}

export async function validateImage(http: IHttp, message: IMessage, read: IRead): Promise<boolean> {
    try {
        const response = await processImage(http, message, read, RECEIPT_VALIDATION_PROMPT);
        const jsonResponse = JSON.parse(response);
        return jsonResponse.is_receipt === true;
    } catch (error) {
        console.error("Error validating image:", error);
        return false;
    }
}
