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
    discounts: number;
    totalPrice: number;
    receiptDate: string;
}

export interface ICategory {
    category: string;
    items: IReceiptItem[];
}

export interface ISpendingReport {
    startDate: string;
    endDate: string;
    categories: ICategory[];
    summary: string;
    extraFee: number;
    discounts: number;
}
