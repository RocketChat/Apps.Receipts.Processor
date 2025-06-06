export interface IReceiptItem {
    name: string;
    price: number;
    quantity: number;
}

export interface IReceiptData {
    userId: string;
    messageId: string;
    roomId : string;
    items: IReceiptItem[];
    extraFee: number;
    totalPrice: number;
    uploadedDate: Date;
    receiptDate: string;
}
