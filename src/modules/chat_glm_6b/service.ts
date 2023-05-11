import { AxiosInstance } from "axios";
import factory from "./request";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { IChatGlmConfig } from "./config";
import config from "config";

const regex = /ai\s+(.+)/;
const contentRegex = new RegExp(regex);

let configList;
try {
    configList = config.get("modules.chat_glm_6b") as IChatGlmConfig[];
} catch(error) {
    console.warn("获取模块配置 modules.chat_glm_6b 出错！")
    throw error;
}

class ChatGLMService extends BaseWechatMessageProcessService {

    serviceCode: string = "chat-glm-6b-service";

    private _service;
    private _config: IChatGlmConfig;

    get config(): IChatGlmConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    
    constructor(config: IChatGlmConfig) {
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
            return message.content.trim().substring(0, 2) === 'ai';
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
        return content.substring(0, 2) === 'ai';
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
        let aiReply = await this.service.post('/chat', {
            source: `${config.get("wechat_server.id")}:${target}`,
            data: result[1]
        }).then(d => d.data)
        .catch(() => {});
        if (aiReply === undefined || aiReply === null) {
            return "ai也不明白哦！"
        }
        return aiReply.data;
    }

    getServiceName(): string {
        return 'ai 对话';
    }

    getUseage(): string {
        return '"ai 要对ai说的话"'
    }

    getTopics(): string[] {
        let topicList = [];
        topicList.push(...this.config.attachedRoomId.map(roomId => {
            return `wechat/${ config.get("wechat_server.id") }/receve/groups/${ roomId }/#`
        }));
        
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ config.get("wechat_server.id") }/receve/users/${ adminUser }/#`);
        }
        
        return topicList;
    }
}

const serviceList: ChatGLMService[] = configList.map(c => new ChatGLMService(c));

export default serviceList;