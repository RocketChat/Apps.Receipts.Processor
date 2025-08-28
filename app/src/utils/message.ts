import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IRead, IModify } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { ButtonStyle } from "@rocket.chat/apps-engine/definition/uikit";
import { IReceiptData } from "../types/receipt";
import { IUploadDescriptor } from "@rocket.chat/apps-engine/definition/uploads/IUploadDescriptor";
import {
    IMessageFile,
    IMessageAttachment,
} from "@rocket.chat/apps-engine/definition/messages";
import { getOrCreateDirectRoom } from "./rooms"

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
        .setRoom(room);

    if (message) {
        messageBuilder.setText(message);
    }

    if (threadId) {
        messageBuilder.setThreadId(threadId);
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
    const builder = modify
        .getCreator()
        .startMessage()
        .setSender(user)
        .setRoom(room)
        .setText("Are you sure you want to save this receipt data?");

    if (receiptData.threadId) {
        builder.setThreadId(receiptData.threadId);
    }

    const block = modify.getCreator().getBlockBuilder();

    block.addActionsBlock({
        elements: [
            block.newButtonElement({
                text: block.newPlainTextObject("✅ Yes"),
                actionId: "confirm-save-receipt",
                value: JSON.stringify(receiptData),
                style: ButtonStyle.PRIMARY,
            }),
            block.newButtonElement({
                text: block.newPlainTextObject("✏️ Edit"),
                actionId: "edit-receipt-data",
                value: JSON.stringify(receiptData),
                style: ButtonStyle.PRIMARY,
            }),
            block.newButtonElement({
                text: block.newPlainTextObject("❌ No"),
                actionId: "cancel-save-receipt",
                value: JSON.stringify(receiptData),
                style: ButtonStyle.DANGER,
            }),
        ],
    });

    builder.setBlocks(block);

    await modify.getCreator().finish(builder);
}

export async function sendDirectMessage(
    read: IRead,
    modify: IModify,
    targetUser: IUser,
    text: string
): Promise<void> {
    const appUser = await read.getUserReader().getAppUser();
    if (!appUser) {
        throw new Error("App user not found.");
    }
    const directRoom = await getOrCreateDirectRoom(
        read,
        modify,
        appUser,
        targetUser
    );

    const messageBuilder = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(directRoom)
        .setText(text);

    await modify.getCreator().finish(messageBuilder);
}

export async function sendDownloadableFile(
    modify: IModify,
    user: IUser,
    room: IRoom,
    fileName: string,
    fileContent: string,
    fileType: "txt" | "csv" | "pdf",
    message?: string,
    threadId?: string
): Promise<void> {
    try {
        if (message) {
            const messageBuilder = modify
                .getCreator()
                .startMessage()
                .setSender(user)
                .setRoom(room)
                .setText(message);

            if (threadId) {
                messageBuilder.setThreadId(threadId);
            }

            await modify.getCreator().finish(messageBuilder);
        }

        const buffer =
            fileType === "pdf"
                ? Buffer.from(fileContent, "base64")
                : Buffer.from(fileContent, "utf8");
        const fileNameWithExtension = fileName.endsWith(`.${fileType}`)
            ? fileName
            : `${fileName}.${fileType}`;

        const uploadDescriptor: IUploadDescriptor = {
            filename: fileNameWithExtension,
            room: room,
            user: user,
        };

        const uploadCreator = modify.getCreator().getUploadCreator();
        const uploadResult = await uploadCreator.uploadBuffer(
            buffer,
            uploadDescriptor
        );

        const fileMessageBuilder = modify
            .getCreator()
            .startMessage()
            .setSender(user)
            .setRoom(room);

        const type = fileType === "csv" ? "text/csv" : fileType === "pdf" ? "application/pdf" : "text/plain"

        if (threadId) {
            fileMessageBuilder.setThreadId(threadId);
            const attachment: IMessageAttachment = {
                title: {
                    value: fileNameWithExtension,
                    link: uploadResult.url,
                },
                type: type,
                description: fileNameWithExtension,
            };

            fileMessageBuilder.setAttachments([attachment]);
            await modify.getCreator().finish(fileMessageBuilder);
        } else {
            const messageFile: IMessageFile = {
                _id: uploadResult.id,
                name: fileNameWithExtension,
                type: type,
            };
            const messageData = fileMessageBuilder.getMessage();
            fileMessageBuilder.setData(messageData);
            messageData.file = messageFile;

            await modify.getCreator().finish(fileMessageBuilder);
        }
    } catch (error) {
        const errorBuilder = modify
            .getCreator()
            .startMessage()
            .setSender(user)
            .setRoom(room)
            .setText(
                `❌ Failed to upload file: ${error instanceof Error ? error.message : String(error)}`
            );

        if (threadId) {
            errorBuilder.setThreadId(threadId);
        }

        await modify.getCreator().finish(errorBuilder);
    }
}
