import NodeCache from "node-cache";
import { IChatHistoryHolder, IMessage } from "./api";
import { DataSource } from "typeorm";
import { ISysCallRequest, ISysCallResponse } from "../../system/sys_call";
import BaseWechatMessage, { chatroomRegex } from "../../wechat/base_wechat";

enum Command {
    CONFIG = "/config",
    CONFIG_GROUP = "/config_group",
    CLEAR = "/clear",
    CLEAR_ALL = "/clear_all",
}

interface ISetConfig {
    userId?: string,
    groupId?: string,
    configs: { [k: string]: any }
}

export function chatGptCommandFactory(message: string, serviceId: string, cache: NodeCache, datasource: DataSource, sysCallMethod: (req: ISysCallRequest) => Promise<ISysCallResponse>, requestIdGenerator: () => string) {
    if (message.startsWith(Command.CONFIG)) {
        return new ConfigCommand(serviceId, cache, datasource, sysCallMethod, requestIdGenerator);
    } else if (message.startsWith(Command.CLEAR)) {
        return new ClearCommand(serviceId, cache, datasource, sysCallMethod, requestIdGenerator);
    } else if (message.startsWith(Command.CLEAR_ALL)) {
        return new ClearAllCommand(serviceId, cache, datasource, sysCallMethod, requestIdGenerator);
    } else if  (message.startsWith(Command.CONFIG_GROUP)) {
        return new ConfigGroupCommand(serviceId, cache, datasource, sysCallMethod, requestIdGenerator);
    } else {
        return undefined;
    }
}

abstract class ChatGptCommand {
    cache: NodeCache;
    datasource: DataSource;
    sysCall: (req: ISysCallRequest) => Promise<ISysCallResponse>;
    requestIdGenerator: () => string;
    serviceId: string;
    constructor(serviceId: string, cache: NodeCache, datasource: DataSource, sysCallMethod: (req: ISysCallRequest) => Promise<ISysCallResponse>, requestIdGenerator: () => string) {
        this.cache = cache;
        this.datasource = datasource;
        this.sysCall = sysCallMethod;
        this.requestIdGenerator = requestIdGenerator;
        this.serviceId = serviceId;
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
class ConfigGroupCommand extends ChatGptCommand {
    static command: Command = Command.CONFIG_GROUP;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        message = message.substring(ConfigGroupCommand.command.length).trimStart();
        let body: ISetConfig = {
            groupId: wechatMessage.groupId === null? undefined: wechatMessage.groupId,
            configs: {
                prompt: message
            }
        }
        let result = await this.sysCall({
            body: body,
            headers: {
                moduleId: this.serviceId,
            },
            requestId: this.requestIdGenerator(),
            router: "saveConfig",
        });
        if (wechatMessage.groupId !== null) {
            this.cache.del(wechatMessage.groupId);
        } else {
            this.cache.del(this.cache.keys()
                .filter(k => chatroomRegex.test(k)));
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
class ConfigCommand extends ChatGptCommand {
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
        let result = await this.sysCall({
            body: body,
            requestId: this.requestIdGenerator(),
            headers: {
                moduleId: this.serviceId,
            },
            router: "saveConfig",
        });
        let target = "";
        if (wechatMessage.groupId !== null) {
            target += `${ wechatMessage.groupId }:`;
        }
        target += wechatMessage.senderId;
        this.cache.del(target);
    }
    match(e: Command): boolean {
        return e === ConfigCommand.command;
    }
}

class ClearCommand extends ChatGptCommand {
    static command = Command.CLEAR;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        let target = wechatMessage.groupId === null? wechatMessage.senderId: wechatMessage.groupId;
        let history = this.cache.get<IMessage[]>(target);
        history = history?.filter(item => item.role === 'system');
        if (history === undefined) {
            history = [];
        }
        this.cache.set(target, history);
    }
    match(e: Command): boolean {
        return e === ClearCommand.command;
    }
}

class ClearAllCommand extends ChatGptCommand {
    static command = Command.CLEAR_ALL;
    async execute(wechatMessage: BaseWechatMessage, message: string): Promise<void> {
        let target = wechatMessage.groupId === null? wechatMessage.senderId: wechatMessage.groupId;
        this.cache.del(target);
    }
    match(e: Command): boolean {
        return e === ClearAllCommand.command;
    }
}