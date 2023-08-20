import path from "path";

import { DataSource } from "typeorm";

import BaseWechatMessage, { BaseConfigService, LocalWechatMessageProcessService, SysCallConfigService } from "../../wechat/base_wechat";
import { IAiChatConfig, IAiChatServiceConfig } from "./config";
import { IChatGPTReply } from "./channel/chatgpt/api";
import { IWechatConfig } from "../../config";

import { wrapDatasourceConfig } from "../../data_source";
import { ChatGptRequest } from "./entity";
import { SysCallStatusEnum } from "../../system/sys_call";
import { aiChatCommandFactory } from "./command";
import { aiChatSigletonFactory } from "./channel/factory";

const keyword = 'ai'
const regex = `${ keyword }\\s+([\\s\\S]+)`;
const contentRegex = new RegExp(regex);
export const serviceCode = path.basename(__dirname);


export class AiChatService extends LocalWechatMessageProcessService {

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
        let content = message.content.replace(this.atRegex, '').trim();
        if (content.substring(0, keyword.length) !== keyword) {
            return false;
        }
        let configResp = await this.configService.getTargetConfig<IAiChatConfig>(message);
        let config = configResp.body;
        if (configResp.status === SysCallStatusEnum.ERROR) {
            console.error("获取配置出错：" + configResp.body);
            config = this.config as IAiChatConfig;
        }
        config = config as IAiChatConfig;
        // 处理单聊的情况
        if (message.groupId === null) {
            // 过滤用户
            let singleWhiteList: string[] = config.singleContactWhiteList ?? [];
            if (singleWhiteList !== undefined && singleWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            return message.content.trim().substring(0, keyword.length) === keyword;
        }
        // 是否在接入的 roomId 中有
        let attachedRoomList: string[] = config.attachedRoomId ?? [];
        if (attachedRoomList.indexOf(message.groupId) < 0) {
            return false;
        }
        // 不是 @ 我
        if (!this.atRegex.test(message.content)) {
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
        // 去除 @ 符
        message.content = message.content.replace(this.atRegex, '').trim();
        let target = message.groupId ? message.groupId: message.senderId;

        let result = contentRegex.exec(message.content);
        if (result === null) {
            return null;
        }

        // 获取 service
        let configResp = await this.configService.getTargetConfig<IAiChatConfig>(message);
        // 默认使用 gpt
        let moduleType = "chatGpt";
        if (configResp.status !== SysCallStatusEnum.ERROR ) {
            moduleType = configResp.body.moduleType ?? moduleType;
        }

        // 对话
        let chatService = this.aiChatFactory(moduleType);
        if (chatService === undefined) {
            return `指定的模型${moduleType}未找到`;
        }

        // 处理指令
        let command = this.commandFactory?.(result[1], chatService);
        if (command !== undefined) {
            await command.execute(message, result[1]);
            return "配置成功";
        }
        
        let chatResult = await chatService.chat(message, result[0], target);
        if (chatResult.length > 1) {
            chatResult.splice(0, chatResult.length - 1)
                .forEach((msg: string) => this.sendReplyMessage(message, msg));
        }

        return chatResult[0];
    }

    public async saveToken(message: BaseWechatMessage, aiReply: IChatGPTReply, modulePrice: {[key: string]: number}) {
        // TODO: 修复该接口，传入精确的消息体
        await this.Ready;
        if (modulePrice === undefined || modulePrice === null) {
            console.error("模型价格获取失败！");
            return;
        }
        if (aiReply.usage === undefined || aiReply.model === undefined) {
            console.error("模型没有返回正确消息");
        }
        let inputPrice = modulePrice[`${ aiReply.model }_input`] / 1000 * aiReply.usage.prompt_tokens;
        let outputPrice = modulePrice[`${ aiReply.model }_output`] / 1000 * aiReply.usage.completion_tokens;
        let entity = new ChatGptRequest();
        entity.remoteId = aiReply.id;
        entity.userId = message.senderId;
        entity.groupId = (message.groupId === null? undefined: message.groupId) as any;
        entity.model = aiReply.model;
        entity.definePrice = `${modulePrice[`${ aiReply.model }_input`]},${modulePrice[`${ aiReply.model }_output`]}`;
        entity.completionTokens = aiReply.usage.completion_tokens;
        entity.promptTokens = aiReply.usage.prompt_tokens;
        entity.totalTokens = aiReply.usage.completion_tokens;
        entity.price = inputPrice + outputPrice;
        await this.datasource?.getRepository(ChatGptRequest).save(entity);
    }

    getServiceName(): string {
        return 'ai 对话';
    }

    getUseage(): string {
        return '"ai 要对ai说的话"'
    }
    
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: any): AiChatService {
    return new AiChatService(wechatConfig, chatgptConfig);
}