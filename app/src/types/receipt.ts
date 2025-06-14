export interface IReceiptItem {
    name: string;
    price: number;
    quantity: number;
}

export interface IReceiptData {
    userId: string;
    messageId: string;
    threadId?: string | null
    roomId : string;
    items: IReceiptItem[];
    extraFee: number;
    totalPrice: number;
    uploadedDate: string;
    receiptDate: string;
}
