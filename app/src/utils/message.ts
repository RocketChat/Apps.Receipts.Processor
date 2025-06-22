import { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IReceiptData } from '../types/receipt';

export async function sendMessage(
	modify: IModify,
	user: IUser,
	room: IRoom,
	message: string,
    threadId: string | undefined
): Promise<void> {
	const messageBuilder = modify
		.getCreator()
		.startMessage()
		.setSender(user)
		.setRoom(room)

	if (message) {
		messageBuilder.setText(message);
	}

    if (threadId) {
        messageBuilder.setThreadId(threadId)
    }

	await modify.getCreator().finish(messageBuilder);
	return;
}

export async function sendConfirmationButtons(
    modify: IModify,
    user: IUser,
    room: IRoom,
    receiptData: IReceiptData
) {
    const builder = modify.getCreator().startMessage()
        .setSender(user)
        .setRoom(room)
        .setText('Are you sure you want to save this receipt data?');

    if (receiptData.threadId) {
        builder.setThreadId(receiptData.threadId)
    }

    const block = modify.getCreator().getBlockBuilder();

    block.addActionsBlock({
        elements: [
            block.newButtonElement({
                text: block.newPlainTextObject('Yes'),
                actionId: 'confirm-save-receipt',
                value: JSON.stringify(receiptData),
                style: ButtonStyle.PRIMARY,
            }),
            block.newButtonElement({
                text: block.newPlainTextObject('No'),
                actionId: 'cancel-save-receipt',
                value: 'cancel',
                style: ButtonStyle.DANGER,
            }),
        ],
    });

    builder.setBlocks(block);

    await modify.getCreator().finish(builder);
}



