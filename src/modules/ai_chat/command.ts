import BaseWechatMessage, {ISetConfig} from "#wechat/base_wechat";
import {BaseAiChatService} from "#modules/ai_chat/lib";
import {BaseConfigService} from "#wechat/config_service/base_config";

enum Command {
    CONFIG = "/config",
    CONFIG_GROUP = "/config_group",
    CLEAR = "/clear",
    CLEAR_ALL = "/clear_all",
}

interface IChatCommandFactoryParam {
    clientId: string;
    serviceId: string;
    configService: BaseConfigService;
}

interface IChatCommandParam extends IChatCommandFactoryParam {
    chatService: BaseAiChatService;
}

export function aiChatCommandFactory(param: IChatCommandFactoryParam) {
    return (message: string, chatService: BaseAiChatService) => {
        let p = param as IChatCommandParam;
        p.chatService = chatService;
        if (message.startsWith(Command.CONFIG)) {
            return new ConfigCommand(p);
        } else if (message.startsWith(Command.CLEAR)) {
            return new ClearCommand(p);
        } else if (message.startsWith(Command.CLEAR_ALL)) {
            return new ClearAllCommand(p);
        } else if  (message.startsWith(Command.CONFIG_GROUP)) {
            return new ConfigGroupCommand(p);
        } else {
            return undefined;
        }
    }
}

abstract class AiChatCommand {
    chatService: BaseAiChatService;
    serviceId: string;
    configService: BaseConfigService;
    clientId: string;
    constructor(param: IChatCommandParam) {
        this.chatService = param.chatService;
        this.clientId = param.clientId;
        this.serviceId = param.serviceId;
        this.configService = param.configService;
    }
    abstract execute(wechatMessage: BaseWechatMessage, message: string): Promise<void>;
    abstract match(e: Command): boolean;
}

/**
 * 配置群组 Command 实体类
 * 配置 prompt
 * 用户、群、群中用户
 * 1. 群: null; 为所有群配置 prompt; 从缓存中删除所有群配置
 * 2. 群: id => 为群配置 prompt; 从缓存中删除 群ID:用户ID
 */
class ConfigGroupCommand extends AiChatCommand {
    static command: Command = Command.CONFIG_GROUP;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        message = message.substring(ConfigGroupCommand.command.length).trimStart();
        let body: ISetConfig = {
            groupId: wechatMessage.groupId === null? undefined: wechatMessage.groupId,
            configs: {
                prompt: message
            }
        }
        this.configService.saveServiceConfig(body);
        if (wechatMessage.groupId !== null) {
            this.chatService.clearAll(wechatMessage.groupId);
        } else {
            // FIXME: 删除掉所有前缀为该群 ID 的 key
            // this.cache.del(this.cache.keys()
            //     .filter(k => chatroomRegex.test(k)));
        }
    }
    match(e: Command): boolean {
        return e === ConfigGroupCommand.command;
    }
}

/**
 * 配置 Command 实体类
 * 配置 prompt
 * 用户、群、群中用户
 * 1. 群: null, 用户: id => 为用户配置 prompt; 从缓存中删除 用户ID
 * 2. 群: id, 用户: id => 为群中用户配置 prompt; 从缓存中删除 群ID:用户ID
 */
class ConfigCommand extends AiChatCommand {
    static command: Command = Command.CONFIG;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        message = message.substring(ConfigCommand.command.length).trimStart();
        let body: ISetConfig = {
            configs: {
                prompt: message,
            }
        }
        body.userId = wechatMessage.senderId;
        body.groupId = wechatMessage.groupId === null? undefined: wechatMessage.groupId;
        this.configService.saveServiceConfig(body);
        let target = "";
        if (wechatMessage.groupId !== null) {
            target += `${ wechatMessage.groupId }:`;
        }
        target += wechatMessage.senderId;
        this.chatService.clearAll(target);
    }
    match(e: Command): boolean {
        return e === ConfigCommand.command;
    }
}

class ClearCommand extends AiChatCommand {
    static command = Command.CLEAR;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        let target = wechatMessage.groupId === null? wechatMessage.senderId: wechatMessage.groupId;
        this.chatService.clearHistory(target);
    }
    match(e: Command): boolean {
        return e === ClearCommand.command;
    }
}

class ClearAllCommand extends AiChatCommand {
    static command = Command.CLEAR_ALL;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        let target = wechatMessage.groupId === null? wechatMessage.senderId: wechatMessage.groupId;
        this.chatService.clearAll(target);
    }
    match(e: Command): boolean {
        return e === ClearAllCommand.command;
    }
}
