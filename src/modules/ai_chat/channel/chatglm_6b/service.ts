import {AxiosInstance} from "axios";

import {IWechatWebRequestServiceConfig} from "#/config";
import BaseWechatMessage from "#wechat/base_wechat";

import {BaseAiChatService, HistoryManager, IMessage} from "#modules/ai_chat/lib";
import {AiChatService} from "#modules/ai_chat/service";

import restServiceFactory from "./request";

class ChatGlmHistoryManager extends HistoryManager<IMessage> {
    setPrompt(target: string, prompt: string): boolean {
        let history = this.get(target);
        if (history === undefined) {
            history = [{
                role: "system",
                content: prompt,
            }];
            this.historyCache.set(target, history);
            return true;
        } else if (history.filter(item => item.role === "system").length === 1)  {
            let cachedPrompt = history.filter(item => item.role === "system")[0];
            if (prompt !== cachedPrompt.content) {
                history = [{
                    role: "system",
                    content: prompt,
                }];
                this.historyCache.set(target, history);
                return true;
            }
        } else {
            history = [{
                role: "system",
                content: prompt,
            }];
            this.historyCache.set(target, history);
            return true;
        }
        return false;
    }
    clearHistory(target: string): boolean {
        let history = this.get(target)
        if (history === undefined) {
            return false;
        }
        history = history.filter(item => item.role === 'system');
        this.historyCache.set(target, history);
        return true;
    }
}

export class ChatGlmService extends BaseAiChatService {

    private readonly requestApiService: AxiosInstance;
    private readonly chatService: AiChatService;

    constructor(chatService: AiChatService, config: IWechatWebRequestServiceConfig) {
        super(new ChatGlmHistoryManager());
        this.chatService = chatService;
        this.requestApiService = restServiceFactory(config)();
    }

    async chat(message: BaseWechatMessage, content: string, target: string): Promise<string[]> {
        let aiReply = await this.requestApiService.post('/chat', {
            source: `${this.chatService.clientId}:${target}`,
            data: content,
        }).then(d => d.data)
        .catch(() => {});
        if (aiReply === undefined || aiReply === null) {
            return ["ai也不明白哦！"]
        }
        return [aiReply.data];
    }
    async saveToken(message: BaseWechatMessage, replyMessage: any): Promise<any> {
        console.log("chatglm save token... do nothing");
    }
    clearHistory(target: string): boolean {
        console.log("chatglm clear history... do nothing");
        return true;
    }
    clearAll(target: string): boolean {
        console.log("chatglm clear all history... do nothing");
        return true;
    }
}
