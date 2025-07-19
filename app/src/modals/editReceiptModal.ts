import {
    BlockBuilder,
} from "@rocket.chat/apps-engine/definition/uikit";
import { IUIKitModalViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";
import { IReceiptData } from "../types/receipt";
import { IPersistence } from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

export async function createEditReceiptModal(
    blockBuilder: BlockBuilder,
    receiptData: IReceiptData,
    persistence: IPersistence
): Promise<IUIKitModalViewParam> {
    const modalId = `edit-receipt-modal-${receiptData.userId}-${Date.now()}`;
    blockBuilder
        .addInputBlock({
            blockId: "receipt-edit-form",
            label: blockBuilder.newPlainTextObject("Receipt Date (YYYY-MM-DD)"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: "receiptDate",
                initialValue: receiptData.receiptDate,
            }),
        })
        .addDividerBlock();

    receiptData.items.forEach((item, index) => {
        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(`*Item ${index + 1}*`),
        });
        blockBuilder.addInputBlock({
            blockId: `item-name-${index}`,
            label: blockBuilder.newPlainTextObject("Item Name"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: `itemName-${index}`,
                initialValue: item.name,
            }),
        });
        blockBuilder.addInputBlock({
            blockId: `item-quantity-${index}`,
            label: blockBuilder.newPlainTextObject("Quantity"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: `itemQuantity-${index}`,
                initialValue: String(item.quantity),
            }),
        });
        blockBuilder.addInputBlock({
            blockId: `item-price-${index}`,
            label: blockBuilder.newPlainTextObject("Total Price for Item(s)"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: `itemPrice-${index}`,
                initialValue: String(item.price),
            }),
        });
        blockBuilder.addDividerBlock();
    });

    blockBuilder
        .addInputBlock({
            blockId: "extra-fee",
            label: blockBuilder.newPlainTextObject("Extra Fees"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: "extraFee",
                initialValue: String(receiptData.extraFee),
            }),
        })

    await persistence.createWithAssociation(
        receiptData,
        new RocketChatAssociationRecord(
            RocketChatAssociationModel.MISC,
            modalId
        )
    );

    return {
        id: modalId,
        title: blockBuilder.newPlainTextObject("Edit Receipt"),
        submit: blockBuilder.newButtonElement({
            text: blockBuilder.newPlainTextObject("Save Changes"),
        }),
        close: blockBuilder.newButtonElement({
            text: blockBuilder.newPlainTextObject("Cancel"),
        }),
        blocks: blockBuilder.getBlocks(),
    };
}
