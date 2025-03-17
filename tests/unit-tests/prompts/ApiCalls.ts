import { HFResponse, Row, ReceiptMetaData } from "./interfaces";
import { API_KEY, modelType, API_END_POINT, LENGTH } from "./constants";

export async function fetchDataHf() {
    const params = new URLSearchParams({
        dataset: "moyrsd/rocketchat_receipts_dataset",
        config: "default",
        split: "train",
        offset: "0",
        length: LENGTH,
    });

    try {
        const response = await fetch(
            `https://datasets-server.huggingface.co/rows?${params}`,
            {
                headers: {
                    Accept: "application/json",
                },
            }
        );

        if (!response.ok) {
            console.log(`HF failed - HTTP ${response.status}`);
            return [];
        }

        const data: HFResponse = await response.json();

        const results: Row[] = data.rows.map((item) => ({
            filename: item.row.filename,
            image_base64: item.row.image_base64,
            metadata: item.row.metadata,
        }));

        return results;

        return results;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error("Unknown error occurred");
    }
}
export async function llmResponse(image_base64: String, promt: String) {
    try {
        const response = await fetch(API_END_POINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
                Accept: "application/json",
            },
            body: JSON.stringify({
                model: modelType,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${image_base64}`,
                                },
                            },
                            { type: "text", text: promt },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            console.log(`HF failed - HTTP ${response.status}`);
            return;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error("Unknown error occurred");
    }
}
