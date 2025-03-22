export interface HFResponse {
    rows: Array<{ row: Row }>;
}

export interface Row {
    filename: string; // Changed from String to string
    image_base64: string; // Fixed type casing
    metadata: ReceiptMetaData;
}

export interface ReceiptMetaData {
    items: Array<{
        quantity: number;
        name: string;
        price: number;
    }>;
    extra_fees: number;
    total_price: number;
    receipt_date: string; // Keep as string if API returns ISO format
}