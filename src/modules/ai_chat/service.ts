import path from "path";

import {DataSource} from "typeorm";

import {IWechatConfig, StrBoolEnum} from "#/config";
import BaseWechatMessage from "#wechat/base_wechat";
import {SysCallStatusEnum} from "#system/sys_call";
import {wrapDatasourceConfig} from "#/data_source";

import {IAiChatConfig} from "./config";
import {IChatGPTReply} from "./channel/chatgpt/api";
import {ChatGptRequest} from "./entity";
import {aiChatCommandFactory} from "./command";
import {aiChatSigletonFactory} from "./channel/factory";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";
import {BaseConfigService} from "#wechat/config_service/base_config";
import {SysCallConfigService} from "#wechat/config_service/service/sys_call_config_service";

const keyword = 'ai'
const regex = `${keyword}\\s+([\\s\\S]+)`;
const contentRegex = new RegExp(regex);
export const serviceCode = path.basename(__dirname);

interface MessageRequestResolver {
    promise: Promise<any>;
    resolve: (value?: any) => void;
    reject: (reason: any) => void;
}

// TODO: 使用 Resolver 限制请求
class MessageRequest {
    private nextRequestPreResolver: MessageRequestResolver | null = null;
    private currentRequest: Promise<any> | null = null;

    private async handleRequest(requestFn: () => Promise<any>): Promise<any> {
        try {
            const result = await requestFn();
            this.currentRequest = null;
            this.nextRequestPreResolver?.resolve();
            this.currentRequest = this.nextRequestPreResolver?.promise ?? null;
            this.nextRequestPreResolver = null;
            return result;
        } catch (error) {
            this.currentRequest = null;
            this.nextRequestPreResolver?.resolve();
            this.currentRequest = this.nextRequestPreResolver?.promise ?? null;
            this.nextRequestPreResolver = null;
            throw error;
        }
    }

    async request(requestFn: () => Promise<any>): Promise<any> {
        if (this.currentRequest === null) {
            return this.handleRequest(requestFn);
        } else if (this.nextRequestPreResolver === null) {
            let item: MessageRequestResolver;
            const promise = new Promise((resolve, reject) => {
                item = {
                    promise,
                    resolve,
                    reject,
                };
                this.nextRequestPreResolver = item;
            });
            return promise;
        } else if (this.nextRequestPreResolver) {
            this.nextRequestPreResolver.reject("放弃当前请求");
            let item: MessageRequestResolver;
            const promise = new Promise((resolve, reject) => {
                item = {
                    promise,
                    resolve,
                    reject,
                };
                this.nextRequestPreResolver = item;
            });
            return promise;
        }
    }
}

export class AiChatService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;

    public readonly serviceCode: string = serviceCode;

    private readonly datasource?: DataSource;
    private readonly Ready: Promise<any>;
    private readonly configService: BaseConfigService;
    private readonly commandFactory?;
    private readonly aiChatFactory;

    constructor(clientConfig: IWechatConfig, config: IAiChatConfig) {
        super(clientConfig, config);

        this.configService = new SysCallConfigService(this);
        this.aiChatFactory = aiChatSigletonFactory({
            processService: this,
            configService: this.configService,
            config: config as any,
        });

        this.commandFactory = aiChatCommandFactory({
            clientId: this.clientId,
            serviceId: this.serviceId,
            configService: this.configService,
        });

        if (config.datasource !== undefined && config.datasource !== null) {
            let datasource = new DataSource(wrapDatasourceConfig(config.datasource, [ChatGptRequest]));
            this.datasource = datasource;
            this.Ready = new Promise((resolve, reject) => {
                datasource.initialize()
                    .then(_ => resolve(undefined))
                    .catch(reject);
            });
        } else {
            this.Ready = Promise.resolve(undefined);
        }
    }

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        if (typeof message.content !== 'string') {
            return false;
        }
        if (message.groupId !== undefined && message.groupId !== null && !this.atRegex.test(message.content)) {
            return false;
        }
        let content = message.content.replace(this.atRegex, '').trim();

        let configResp = await this.configService.getTargetConfig<IAiChatConfig>(message);
        let config = configResp.body;
        if (configResp.status === SysCallStatusEnum.ERROR) {
            console.error("获取配置出错：" + configResp.body);
            config = this.serviceConfig as IAiChatConfig;
        }
        config = config as IAiChatConfig
        if (config.default !== StrBoolEnum.TRUE && content.substring(0, keyword.length) !== keyword) {
            return false;
        }
        // 处理单聊的情况
        if (message.groupId === null) {
            // 过滤用户
            let singleWhiteList: string[] = config.singleContactWhiteList ?? [];
            if (singleWhiteList !== undefined && singleWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            return true;
        }
        // 是否在接入的 roomId 中有
        let attachedRoomList: string[] = config.attachedRoomId ?? [];
        if (attachedRoomList.indexOf(message.groupId) < 0) {
            return false;
        }
        return true;
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        try {
            await this.Ready;
            if (!this.datasource || !this.datasource.isInitialized) {
                console.error("数据库未连接，请检查！");
                return "服务内部错误，请联系管理员";
            }
        } catch (e) {
            console.error("数据库未连接，请检查！");
            return "服务内部错误，请联系管理员";
        }
        // 是否为 string
        if (typeof message.content !== 'string') {
            return null;
        }

        // 获取 service
        let configResp = await this.configService.getTargetConfig<IAiChatConfig>(message);
        // 默认使用 gpt
        let moduleType = "chatGpt";
        let isDefault = false;
        if (configResp.status !== SysCallStatusEnum.ERROR) {
            moduleType = configResp.body.moduleType ?? moduleType;
            isDefault = configResp.body.default === StrBoolEnum.TRUE;
        }

        // 去除 @ 符
        message.content = message.content.replace(this.atRegex, '').trim();
        let target = message.groupId ? message.groupId : message.senderId;

        // 处理消息
        let msgContent;
        if (isDefault) {
            msgContent = message.content.trim();
            if (msgContent.substring(0, keyword.length) === keyword) {
                let result = contentRegex.exec(message.content);
                if (result !== null) {
                    msgContent = result[1];
                }
            }
        } else {
            let result = contentRegex.exec(message.content);
            if (result === null) {
                return null;
            }
            msgContent = result[1];
        }

        // 对话
        let chatService = this.aiChatFactory(moduleType);
        if (chatService === undefined) {
            return `指定的模型${moduleType}未找到`;
        }

        // 处理指令
        let command = this.commandFactory?.(msgContent, chatService);
        if (command !== undefined) {
            await command.execute(message, msgContent);
            return "配置成功";
        }

        let chatResult = await chatService.chat(message, msgContent, target);
        if (chatResult.length > 1) {
            chatResult.splice(0, chatResult.length - 1)
                .forEach((msg: string) => this.sendReplyTextMessage(message, msg));
        }

        return chatResult[0];
    }

    public async saveToken(message: BaseWechatMessage, aiReply: IChatGPTReply, modulePrice: { [key: string]: number }) {
        // FIXME: 模型价格配置现在会带有模型类型前缀，请再获取价格时带着前缀重新获取
        await this.Ready;
        if (modulePrice === undefined || modulePrice === null) {
            console.error("模型价格获取失败！");
            return;
        }
        if (aiReply.usage === undefined || aiReply.model === undefined) {
            console.error("模型没有返回正确消息");
        }
        let inputPrice = modulePrice[`${aiReply.model}_input`] / 1000 * aiReply.usage.prompt_tokens;
        let outputPrice = modulePrice[`${aiReply.model}_output`] / 1000 * aiReply.usage.completion_tokens;
        let entity = new ChatGptRequest();
        entity.remoteId = aiReply.id;
        entity.userId = message.senderId;
        entity.groupId = (message.groupId === null ? undefined : message.groupId) as any;
        entity.model = aiReply.model;
        entity.definePrice = `${modulePrice[`${aiReply.model}_input`]},${modulePrice[`${aiReply.model}_output`]}`;
        entity.completionTokens = aiReply.usage.completion_tokens;
        entity.promptTokens = aiReply.usage.prompt_tokens;
        entity.totalTokens = aiReply.usage.completion_tokens;
        entity.price = inputPrice + outputPrice;
        await this.datasource?.getRepository(ChatGptRequest).save(entity);
    }

    getServiceName(): string {
        return 'ai 对话';
    }

    getUsage(): string {
        return '"ai 要对ai说的话"'
    }

}

export function register(wechatConfig: IWechatConfig, chatgptConfig: any): AiChatService {
    return new AiChatService(wechatConfig, chatgptConfig);
}
