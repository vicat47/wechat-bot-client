import Ajv, { JSONSchemaType, str } from "ajv";
import { asEnum } from "../utils/tool";
import { BaseWechatClient } from "../wechat/wechat_client";
import { ISysCallRequest } from "./sys_call";
import { getModuleConfig, saveModuleConfig } from "./sys_config";
import { getNickById, syncGroupUser, syncUserList } from "./sys_contact";
import { chatroomRegex } from "../wechat/base_wechat";

export enum SysCallMethodEnum {
    syncUserList = "syncUserList",
    syncGroupUser = "syncGroupUser",
    getConfig = "getConfig",
    saveConfig = "saveConfig",
    getNameById = "getNameById",
}

interface Command {
    execute(client: BaseWechatClient, request: ISysCallRequest): Promise<any>;
    match(e: SysCallMethodEnum): boolean;
}

class SyncUserListCommand implements Command {
    match(e: SysCallMethodEnum): boolean {
        return e === SysCallMethodEnum.syncUserList;
    }
    async execute(client: BaseWechatClient, request: ISysCallRequest): Promise<any> {
        return await syncUserList(client);
    }
}

class SyncGroupUserCommand implements Command {
    async execute(client: BaseWechatClient, request: ISysCallRequest): Promise<any> {
        return await syncGroupUser(client);
    }
    match(e: SysCallMethodEnum): boolean {
        return e === SysCallMethodEnum.syncGroupUser;
    }
}

class GetConfigCommand implements Command {
    static ajv = new Ajv();
    static moduleConfigSchema = this.ajv.compile({
        type: "object",
        properties: {
            body: { 
                type: "object",
                properties: {
                    userId: { type: "string" },
                    groupId: { type: "string" },
                    keys: {
                        type: "array",
                        items: {
                            type: "string",
                        }
                    },
                },
                additionalProperties: false,
            },
            headers: {
                type: "object",
                properties: {
                    moduleId: { type: "string" }
                },
                required: ["moduleId"],
                additionalProperties: true,
            },
            requestId: { type: "string" },
            router: { type: "string" },
        },
        required: ["router", "requestId", "headers"],
        additionalProperties: true,
    });
    async execute(client: BaseWechatClient, request: ISysCallRequest): Promise<any> {
        if (!GetConfigCommand.moduleConfigSchema(request)) {
            let errorMessage = GetConfigCommand.moduleConfigSchema.errors?.map(item => item.message).join('\n');
            throw new Error(`request validate not pass...${errorMessage}`);
        }
        return await getModuleConfig(request.headers!.moduleId, request.body);
    }
    match(e: SysCallMethodEnum): boolean {
        return e === SysCallMethodEnum.getConfig;
    }
}

class SaveConfigCommand implements Command {
    static ajv = new Ajv();
    static schema = this.ajv.compile({
        type: "object",
        properties: {
            body: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                    groupId: { type: "string" },
                    configs: {
                        type: "object",
                    },
                },
                additionalProperties: false,
            },
            headers: {
                type: "object",
                properties: {
                    moduleId: { type: "string" }
                },
                required: ["moduleId"],
                additionalProperties: true,
            },
            requestId: { type: "string" },
            router: { type: "string" },
        },
        required: ["router", "requestId", "headers", "body"],
        additionalProperties: true,
    });
    async execute(client: BaseWechatClient, request: ISysCallRequest): Promise<any> {
        if (!SaveConfigCommand.schema(request)) {
            let errorMessage = SaveConfigCommand.schema.errors?.map(item => item.message).join('\n');
            throw new Error(`request validate not pass...${errorMessage}`);
        }
        return await saveModuleConfig(request.headers!.moduleId, request.body);
    }
    match(e: SysCallMethodEnum): boolean {
        return e === SysCallMethodEnum.saveConfig;
    }
}

class getNameByIdCommand implements Command {
    static ajv = new Ajv();
    static schema = this.ajv.compile({
        type: "object",
        properties: {
            body: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                    groupId: {
                        type: "string",
                        pattern: chatroomRegex,
                    },
                },
                additionalProperties: false,
            },
            headers: {
                type: "object",
                properties: {
                    moduleId: { type: "string" }
                },
                required: ["moduleId"],
                additionalProperties: true,
            },
            requestId: { type: "string" },
            router: { type: "string" },
        },
        required: ["router", "requestId", "headers", "body"],
        additionalProperties: true,
    });
    async execute(client: BaseWechatClient, request: ISysCallRequest): Promise<any> {
        if (!getNameByIdCommand.schema(request)) {
            let errorMessage = getNameByIdCommand.schema.errors?.map(item => item.message).join('\n');
            throw new Error(`request validate not pass...${errorMessage}`);
        }
        return await getNickById(client, request.body);
    }
    match(e: SysCallMethodEnum): boolean {
        return e === SysCallMethodEnum.getNameById;
    }
}

const commands: Command[] = [
    new SyncUserListCommand(),
    new SyncGroupUserCommand(),
    new GetConfigCommand(),
    new SaveConfigCommand(),
    new getNameByIdCommand(),
];

export async function callSysMethod(client: BaseWechatClient, request: ISysCallRequest) {
    // throw exception
    let method = asEnum(SysCallMethodEnum, request.router as any);
    const command = commands.find(cmd => cmd.match(method));

    if (!command) {
        throw new Error("Invalid method");
    }

    return await command.execute(client, request);
}