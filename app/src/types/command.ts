import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { ReceiptProcessorApp } from "../../ReceiptProcessorApp";

export interface IExecutorProps {
    app: ReceiptProcessorApp;
    read: IRead;
    modify: IModify;
    http: IHttp;
    sender: IUser;
    room: IRoom;
    persistence: IPersistence;
    command: string[];
    context: SlashCommandContext;
}

export interface CommandResult {
    success: boolean;
    message?: string;
    data?: any;
}

export interface CommandParams {
    date?: string;
    searchTerm?: string;
    [key: string]: any;
}
