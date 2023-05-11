import { IChatHistoryHolder } from "./api";

enum Command {
    CONFIG = "/config",
    CLEAR = "/clear",
    CLEAR_ALL = "/clear_all"
}

export function getCommand(message: string): Command | undefined {
    if (message.startsWith(Command.CONFIG)) {
        return Command.CONFIG;
    } else if (message.startsWith(Command.CLEAR)) {
        return Command.CLEAR;
    } else if (message.startsWith(Command.CLEAR_ALL)) {
        return Command.CLEAR_ALL;
    } else {
        return undefined;
    }
}

type ChatGPTCommandType = {
    [k in Command]: (historyHolder: IChatHistoryHolder, target: string, message: string) => void;
}

export const commandFunctions: ChatGPTCommandType = {
    [Command.CONFIG]: (historyHolder: IChatHistoryHolder, target: string, message: string) => {
        message = message.substring(Command.CONFIG.length);
        historyHolder[target] = [{
            role: 'system',
            content: message
        }];
    },
    [Command.CLEAR]: function (historyHolder: IChatHistoryHolder, target: string, message: string): void {
        historyHolder[target] = historyHolder[target].filter(item => item.role === 'system');
    },
    [Command.CLEAR_ALL]: function (historyHolder: IChatHistoryHolder, target: string, message: string): void {
        historyHolder[target] = [];
    }
}