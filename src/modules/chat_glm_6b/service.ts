import { AxiosInstance } from "axios";
import factory from "./request";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { IChatGlmConfig } from "./config";
import config from "config";
import { IWechatConfig } from "../../config";
import { getClientName } from "../../system/sys_config";
import path from "path";

const regex = /ai\s+(.+)/;
const contentRegex = new RegExp(regex);
export const serviceCode = path.basename(__dirname);

// let configList;
// try {
//     configList = config.get("modules.chat_glm_6b") as IChatGlmConfig[];
// } catch(error) {
//     console.warn("获取模块配置 modules.chat_glm_6b 出错！")
//     throw error;
// }

class ChatGLMService extends BaseWechatMessageProcessService {

    serviceCode: string = serviceCode;

    private _service;
    private _config: IChatGlmConfig;

    get config(): IChatGlmConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    constructor(clientConfig: IWechatConfig, config: IChatGlmConfig) {
        super(clientConfig, config);
        this._service = factory.createService(config);
        this._config = config;
    }

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
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
        if (message.content.indexOf(`@${getClientName(this.clientId)} `) < 0) {
            return false;
        }
        // 去掉 @
        let content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        return content.substring(0, 2) === 'ai';
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        // 是否为 string
        if (typeof message.content !== 'string') {
            return null;
        }
        // 去除 @ 符
        message.content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        let target = message.groupId ? message.groupId: message.senderId;
        let result = contentRegex.exec(message.content);
        if (result === null) {
            return null;
        }
        let aiReply = await this.service.post('/chat', {
            source: `${this.clientId}:${target}`,
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
            return `wechat/${ this.clientId }/receve/groups/${ roomId }/#`
        }));
        
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ this.clientId }/receve/users/${ adminUser }/#`);
        }
        
        return topicList;
    }
}

export function register(wechatConfig: IWechatConfig, moduleConfig: IChatGlmConfig): ChatGLMService {
    return new ChatGLMService(wechatConfig, moduleConfig);
}

// const serviceList: ChatGLMService[] = configList.map(c => new ChatGLMService(config.get("wechat_server") as IWechatConfig, c));
// export default serviceList;