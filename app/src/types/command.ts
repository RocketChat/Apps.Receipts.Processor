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

export interface CommandParamsBase {
    searchTerm?: string;
    currency?: string;
    name?: string;
    category?: string;
}

export interface CommandParamsSingleDate extends CommandParamsBase {
    date: string;
    startDate?: never;
    endDate?: never;
}

export interface CommandParamsDateRange extends CommandParamsBase {
    startDate: string;
    endDate: string;
    date?: never;
}

export type CommandParams =
    | CommandParamsSingleDate
    | CommandParamsDateRange
    | CommandParamsBase;

// Builder type: all keys optional (for parsing convenience)
export type CommandParamsBuilder = {
    date?: string;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
    currency?: string;
    name?: string;
    category?: string;
};
