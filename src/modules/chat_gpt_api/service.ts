import config from "config";
import path from "path";
import NodeCache from "node-cache";

import { DataSource } from "typeorm";
import { AxiosInstance } from "axios";

import factory from "./request";
import BaseWechatMessage, { LocalWechatMessageProcessService } from "../../wechat/base_wechat";
import { IChatGPTConfig } from "./config";
import { IChatGPTReply, IChatGPTSendMessage, IChatHistoryHolder, IMessage } from "./api";
import { IWechatConfig } from "../../config";

import { wrapDatasourceConfig } from "../../data_source";
import { ChatGptRequest } from "./entity";
import { ISysCallResponse, SysCallStatusEnum, generateRequestId } from "../../system/sys_call";
import { chatGptCommandFactory } from "./command";

const keyword = 'ai'
const regex = `${ keyword }\\s+([\\s\\S]+)`;
const contentRegex = new RegExp(regex);
export const serviceCode = path.basename(__dirname);

// let configList: IChatGPTConfig[];

// try {
//     configList = config.get("modules.chat_gpt_api") as IChatGPTConfig[];
// } catch(error) {
//     console.warn("获取模块配置 modules.chat_gpt_api 出错！")
//     throw error;
// }

class ChatGPTService extends LocalWechatMessageProcessService {

    serviceCode: string = serviceCode;

    private _service;
    private _config: IChatGPTConfig;
    private datasource?: DataSource;
    private Ready: Promise<any>;
    private historyCache = new NodeCache({
        stdTTL: 3600,
        checkperiod: 1200,
        useClones: false,
    });
    atRegex: RegExp;

    get config(): IChatGPTConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    constructor(clientConfig: IWechatConfig, config: IChatGPTConfig) {
        super(clientConfig, config);
        this._service = factory.createService(config);
        this._config = config;
        this.serviceId = config.id;
        this.atRegex = new RegExp(`@${ clientConfig.name }[\\s ]`);
        if (config.datasource !== undefined && config.datasource !== null) {
            let datasource = new DataSource(wrapDatasourceConfig(config.datasource, [ChatGptRequest]));
            this.datasource = datasource
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
        // 处理单聊的情况
        if (message.groupId === null) {
            // 过滤用户
            if (this.config.singleContactWhiteList !== undefined && this.config.singleContactWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            return message.content.trim().substring(0, keyword.length) === keyword;
        }
        // 是否在接入的 roomId 中有
        if (this.config.attachedRoomId.indexOf(message.groupId) < 0) {
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

        // 处理指令
        let command = chatGptCommandFactory(result[1], this.serviceId, this.historyCache, this.datasource, this.systemCall, generateRequestId.bind(null, this.clientId, this.serviceId));
        if (command !== undefined) {
            await command.execute(message, result[1]);
            return "配置成功";
        }

        let { prompt, memory }: { prompt: string | undefined; memory: number; } = await this.getContextConfig(message);

        let history = this.historyCache.get<IMessage[]>(target);
        if (history === undefined) {
            history = [];
            if (prompt !== undefined) {
                history.push({
                    role: "system",
                    content: prompt
                });
                this.historyCache.set(target, history);
            }
        } else if (history.filter(item => item.role === 'user').length > memory) {
            this.sendReplyMessage(message, "本次对话将清空之前上下文，请注意！");
            history = history.filter(item => item.role === 'system');
            this.historyCache.set(target, history);
        }

        history.push({
            role: "user",
            content: result[1],
        });
        this.historyCache.set(target, history);
        let sendData: IChatGPTSendMessage = {
            model: this.config.module,
            messages: history,
        }
        let aiReply = await this.service.post<IChatGPTReply>('', sendData)
            .then(d => d.data)
            .catch(e => {
                console.error(e);
            });
        if (aiReply === undefined || aiReply === null) {
            return "服务网络波动，请稍后重试！"
        }
        this.saveToken(message, aiReply);
        history.push({
            role: "assistant",
            content: aiReply.choices[0].message.content,
        });
        this.historyCache.set(target, history);
        return aiReply.choices[0].message.content;
    }

    private async saveToken(message: BaseWechatMessage, aiReply: IChatGPTReply) {
        await this.Ready;
        let price = (await this.systemCall({
            headers: { moduleId: this.serviceId },
            body: {
                userId: message.senderId,
                groupId: message.groupId === null ? undefined : message.groupId,
                keys: ["modulePrice"],
            },
            requestId: generateRequestId(this.clientId, this.serviceId),
            router: "getConfig"
        })).body?.modulePrice;
        if (price === undefined) {
            console.error("模型价格获取失败！");
            return;
        }
        if (aiReply.usage === undefined || aiReply.model === undefined) {
            console.error("模型没有返回正确消息");
        }
        let inputPrice = price[`${ aiReply.model }_input`] / 1000 * aiReply.usage.prompt_tokens;
        let outputPrice = price[`${ aiReply.model }_output`] / 1000 * aiReply.usage.completion_tokens;
        let entity = new ChatGptRequest();
        entity.remoteId = aiReply.id;
        entity.userId = message.senderId;
        entity.groupId = (message.groupId === null? undefined: message.groupId) as any;
        entity.model = aiReply.model;
        entity.definePrice = `${price[`${ aiReply.model }_input`]},${price[`${ aiReply.model }_output`]}`;
        entity.completionTokens = aiReply.usage.completion_tokens;
        entity.promptTokens = aiReply.usage.prompt_tokens;
        entity.totalTokens = aiReply.usage.completion_tokens;
        entity.price = inputPrice + outputPrice;
        await this.datasource?.getRepository(ChatGptRequest).save(entity);
    }

    private async getContextConfig(message: BaseWechatMessage) {
        let configResp = await this.systemCall({
            headers: { moduleId: this.serviceId },
            body: {
                userId: message.senderId,
                groupId: message.groupId === null ? undefined : message.groupId,
                keys: ["memory", "prompt"],
            },
            requestId: generateRequestId(this.clientId, this.serviceId),
            router: "getConfig"
        }) as ISysCallResponse;

        let memory: number;
        let prompt: string | undefined = undefined;
        if (configResp.status !== SysCallStatusEnum.SUCCESS || configResp.body === undefined || configResp.body.memory === undefined) {
            console.error("could not query memory...");
            memory = 6;
        } else {
            memory = parseInt(configResp.body.memory);
            prompt = configResp.body.prompt;
        }
        if (Number.isNaN(memory)) {
            memory = 6;
        }
        return { prompt, memory };
    }

    getServiceName(): string {
        return 'chatgpt 对话';
    }

    getUseage(): string {
        return '"ai 要对ai说的话"'
    }
    
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: IChatGPTConfig): ChatGPTService {
    return new ChatGPTService(wechatConfig, chatgptConfig);
}

// const serviceList: ChatGPTService[] = createModuleServices(config.get("wechat_server.id"), SERVICE_CODE, ChatGPTService);
// const serviceList: ChatGPTService[] = configList.map(c => new ChatGPTService(config.get("wechat_server") as IWechatConfig, c));
// export default serviceList;