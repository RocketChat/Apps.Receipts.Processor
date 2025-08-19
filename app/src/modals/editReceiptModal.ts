import {
    BlockBuilder,
    ButtonStyle,
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
    persistence: IPersistence,
    modalId?: string
): Promise<IUIKitModalViewParam> {
    const id =  modalId || `edit-receipt-modal-${receiptData.userId}-${Date.now()}`;
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

    receiptData.items.forEach((item) => {
        blockBuilder.addSectionBlock({
            text: blockBuilder.newMarkdownTextObject(
                `*Item: ${item.name || "Unnamed"}*`
            ),
        });

        blockBuilder.addInputBlock({
            blockId: `item-name-${item.id}`,
            label: blockBuilder.newPlainTextObject("Item Name"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: `itemName-${item.id}`,
                initialValue: item.name,
            }),
        });

        blockBuilder.addInputBlock({
            blockId: `item-quantity-${item.id}`,
            label: blockBuilder.newPlainTextObject("Quantity"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: `itemQuantity-${item.id}`,
                initialValue: String(item.quantity),
            }),
        });

        blockBuilder.addInputBlock({
            blockId: `item-price-${item.id}`,
            label: blockBuilder.newPlainTextObject("Price for Each Item"),
            element: blockBuilder.newPlainTextInputElement({
                actionId: `itemPrice-${item.id}`,
                initialValue: String(item.price),
            }),
        });

        blockBuilder.addActionsBlock({
            blockId: `remove-item-${item.id}`,
            elements: [
                blockBuilder.newButtonElement({
                    actionId: `removeItem-${item.id}`,
                    text: blockBuilder.newPlainTextObject("🗑 Remove Item"),
                    value: JSON.stringify({
                        modalId: id,
                        itemId: item.id,
                    }),
                    style: ButtonStyle.DANGER,
                }),
            ],
        });

        blockBuilder.addDividerBlock();
    });

    blockBuilder.addInputBlock({
        blockId: "extra-fee",
        label: blockBuilder.newPlainTextObject("Extra Fees"),
        element: blockBuilder.newPlainTextInputElement({
            actionId: "extraFee",
            initialValue: String(receiptData.extraFee),
        }),
    });

    blockBuilder.addInputBlock({
        blockId: "discounts",
        label: blockBuilder.newPlainTextObject("Discounts"),
        element: blockBuilder.newPlainTextInputElement({
            actionId: "discounts",
            initialValue: String(receiptData.discounts),
        }),
    });

    const assoc = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MISC,
        id
    );

    await persistence.updateByAssociation(assoc, receiptData, true);

    return {
        id,
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
