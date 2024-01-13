import {JSONSchemaType} from "ajv";
import {IBaseWechatServiceConfig} from "#/config";

export type behavior = "CALLMETHOD" | "FORWARD" | "RECORD";

export interface IWatchdogWatchParam {
    users?: string[];
    groups?: {
        id: string;
        userIds?: string[];
    }[];
}

export interface IWatchdogConfig extends IBaseWechatServiceConfig {
    watch: IWatchdogWatchParam;
    preProcessor?: string;
    regex: string;
    predicate?: string;
    behavior: behavior;
    method?: string;
    postProcessor?: string;
    forwardTargets?: string[];
}

export const moduleConfigSchema: JSONSchemaType<IWatchdogConfig> = {
    type: "object",
    properties: {
        id: { type: "string" },
        default: { type: "string", nullable: true },
        watch: {
            type: "object",
            properties: {
                groups: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                            },
                            userIds: {
                                type: "array",
                                items: { type: "string" },
                                nullable: true,
                            }
                        },
                        nullable: true,
                        required: ["id"],
                        additionalProperties: true,
                    },
                    nullable: true,
                },
                users: {
                    description: "用户 ID 列表",
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                }
            },
            additionalProperties: false,
        },
        preProcessor: {
            description: "消息预处理器，用于在收到消息时对消息进行处理",
            type: "string",
            nullable: true,
        },
        regex: { type: "string" },
        predicate: {
            description: "消息判断器，在正则之后判断是否该处理该条消息",
            type: "string",
            nullable: true,
        },
        behavior: {
            type: "string",
            description: "FORWARD=转发到指定群/用户，RECORD=记录（预留，暂不实现）CALLMETHOD=方法调用（预留，暂不实现）",
            enum: ["CALLMETHOD", "FORWARD", "RECORD"],
        },
        method: { type: "string", nullable: true,},
        postProcessor: { type: "string", nullable: true,},
        forwardTargets: { type: "array", items: { type: "string" }, nullable: true },
    },
    required: ["id", "watch", "regex", "behavior"],
    additionalProperties: true,
};
