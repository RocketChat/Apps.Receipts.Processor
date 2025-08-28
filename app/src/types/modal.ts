export type ReceiptModalState = {
    "receipt-edit-form"?: {
        receiptDate?: string;
    };
    "extra-fee"?: {
        extraFee?: string;
    };
    "discounts"?: {
        discounts?: string;
    };
    "total-price"?: {
        totalPrice?: string;
    };
    [dynamicBlockId: string]: {
        [dynamicActionId: string]: string | undefined;
    } | undefined;
};
