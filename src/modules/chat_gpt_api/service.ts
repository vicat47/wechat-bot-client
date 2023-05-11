import { AxiosInstance } from "axios";
import factory from "./request";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { IChatGPTConfig } from "./config";
import { IChatGPTReply, IChatGPTSendMessage, IChatHistoryHolder } from "./api";
import { commandFunctions, getCommand } from "./command";
import config from "config";

const keyword = 'ai'
const regex = `${ keyword }\\s+([\\s\\S]+)`;
const contentRegex = new RegExp(regex);

const historyHolder: IChatHistoryHolder = {}

let configList: IChatGPTConfig[];

try {
    configList = config.get("modules.chat_gpt_api") as IChatGPTConfig[];
} catch(error) {
    console.warn("获取模块配置 modules.chat_gpt_api 出错！")
    throw error;
}

class ChatGPTService extends BaseWechatMessageProcessService {

    serviceCode: string = "chat-gpt-api-service";

    private _service;
    private _config: IChatGPTConfig;

    get config(): IChatGPTConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    
    constructor(config: IChatGPTConfig) {
        super();
        this._service = factory.createService(config);
        this._config = config;
    }

    canProcess(message: BaseWechatMessage): boolean {
        if (typeof message.content !== 'string') {
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
        if (message.content.indexOf(`@${config.get("wechat_server.name")} `) < 0) {
            return false;
        }
        // 去掉 @
        let content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
        return content.substring(0, keyword.length) === keyword;
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        // 是否为 string
        if (typeof message.content !== 'string') {
            return null;
        }
        // 去除 @ 符
        message.content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
        let target = message.groupId ? message.groupId: message.senderId;

        let result = contentRegex.exec(message.content);
        if (result === null) {
            return null;
        }

        if (historyHolder[target] === undefined || historyHolder[target] === null) {
            historyHolder[target] = []
            if (this.config.prompt !== undefined) {
                historyHolder[target].push({
                    role: "system",
                    content: this.config.prompt
                })
            }
        } else if (historyHolder[target].filter(item => item.role === 'user').length > this.config.memory) {
            this.sendReplyMessage(message, "本次对话将清空之前上下文，请注意！");
            historyHolder[target] = historyHolder[target].filter(item => item.role === 'system');
        }

        let command = getCommand(result[1]);
        if (command !== undefined) {
            commandFunctions[command](historyHolder, target, result[1]);
            return "配置成功";
        }

        historyHolder[target].push({
            role: "user",
            content: result[1]
        })
        let sendData: IChatGPTSendMessage = {
            model: this.config.module,
            messages: historyHolder[target]
        }
        let aiReply = await this.service.post<IChatGPTReply>('', sendData).then(d => d.data)
        .catch(() => {});
        if (aiReply === undefined || aiReply === null) {
            return "服务网络波动，请稍后重试！"
        }
        historyHolder[target].push({
            role: "assistant",
            content: aiReply.choices[0].message.content
        })
        return aiReply.choices[0].message.content;
    }

    getServiceName(): string {
        return 'chatgpt 对话';
    }

    getUseage(): string {
        return '"ai 要对ai说的话"'
    }

    getTopics(): string[] {
        let topicList = [];
        topicList.push(...this.config.attachedRoomId.map(roomId => {
            return `wechat/${ config.get("wechat_server.id") }/receve/groups/${ roomId }/#`
        }));
        if (this.config.singleContactWhiteList === undefined) {
            for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
                topicList.push(`wechat/${ config.get("wechat_server.id") }/receve/users/${ adminUser }/#`);
            }
            return topicList;
        }
        topicList.push(...this.config.singleContactWhiteList.map(userId => {
            return `wechat/${ config.get("wechat_server.id") }/receve/users/${ userId }/#`
        }));
        
        return topicList;
    }
}

const serviceList: ChatGPTService[] = configList.map(c => new ChatGPTService(c));
export default serviceList;