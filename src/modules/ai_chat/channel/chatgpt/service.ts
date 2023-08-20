import { AxiosInstance } from "axios";
import { SysCallStatusEnum } from "../../../../system/sys_call";
import BaseWechatMessage, { BaseConfigService } from "../../../../wechat/base_wechat";
import { IAiChatChatGptServiceConfig, IAiChatConfig, IAiChatServiceConfig } from "../../config";
import { HistoryManager, BaseAiChatService, IMessage } from "../../lib";
import { AiChatService } from "../../service";
import { IChatGPTReply, IChatGPTSendMessage } from "./api";
import restServiceFactory from "./request";
import { IWechatWebRequestService } from "../../../../config";
import { AiChatConfigDecorator } from "../lib";


class ChatGptHistoryManager extends HistoryManager<IMessage> {
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

export class ChatGptService extends BaseAiChatService {
    public static readonly modelType = 'chatGpt';
    private readonly configService: BaseConfigService;
    private readonly chatService: AiChatService;
    private readonly requestApiService: AxiosInstance;
    constructor(processService: AiChatService, configService: BaseConfigService, config: IWechatWebRequestService) {
        super(new ChatGptHistoryManager());
        this.chatService = processService;

        let wrappedConfigService = new AiChatConfigDecorator(configService);
        wrappedConfigService.modelType = ChatGptService.modelType;
        this.configService = wrappedConfigService;
        
        this.requestApiService = restServiceFactory(config)();
    }

    async chat(message: BaseWechatMessage, content: string, target: string): Promise<string[]> {
        let configResp = await this.configService.getTargetConfig<IAiChatChatGptServiceConfig>(message);
        if (configResp.status === SysCallStatusEnum.ERROR) {
            return ["配置读取出错"];
        }
        let config = configResp.body;
        if (config.prompt !== undefined) {
            this.historyManager.setPrompt(target, config.prompt);
        }
        
        let currentCommunication = {
            role: "user",
            content: content,
        };
        
        let history = this.historyManager.get(target);
        if (history === undefined) {
            history = [currentCommunication];
        }

        let sendData: IChatGPTSendMessage = {
            model: config.module,
            messages: history,
        }
        
        let aiReply = await this.requestApiService.post<IChatGPTReply>('', sendData)
            .then(d => d.data)
            .catch(e => {
                console.error(e);
            });
        if (aiReply === undefined || aiReply === null) {
            return ["服务网络波动，请稍后重试！"];
        }
        this.historyManager.append(target, currentCommunication);
        this.saveToken(message, aiReply);
        history = this.historyManager.append(target, {
            role: "assistant",
            content: aiReply.choices[0].message.content,
        });
        let reply = [];
        if (history.filter(item => item.role === 'user').length > config.memory) {
            reply.push("本次对话将清空之前上下文，请注意！");
            this.historyManager.clearHistory(target);
        }
        reply.push(aiReply.choices[0].message.content.replace("\\\\n", "\\n"));
        return reply;
    }
    async configPrompt(target: string, prompt: string, userId?: string, groupId?: string): Promise<any> {
        this.historyManager.setPrompt(target, prompt);
        return await this.configService.saveServiceConfig({
            userId: userId,
            groupId: groupId,
            configs: {
                prompt,
            }
        });
    }
    async saveToken(message: BaseWechatMessage, replyMessage: any): Promise<any> {
        let configResp = await this.configService.getTargetConfig<IAiChatChatGptServiceConfig>(message);
        if (configResp.status === SysCallStatusEnum.ERROR || configResp.body.modulePrice === undefined) {
            console.error("获取模型价格失败");
            return;
        }
        return await this.chatService.saveToken(message, replyMessage, configResp.body.modulePrice);
    }
}