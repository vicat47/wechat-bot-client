import {AxiosInstance} from "axios";

import BaseWechatMessage from "#wechat/base_wechat";
import {SysCallStatusEnum} from "#system/sys_call";

import {IAiChatServiceConfig} from "#modules/ai_chat/config";
import {AiChatService} from "#modules/ai_chat/service";
import {BaseAiChatService, HistoryManager, IMessage} from "#modules/ai_chat/lib";
import {AiChatConfigDecorator} from "#modules/ai_chat/channel/lib";

import {IBaiduThousandSailsReply, IBaiduThousandSailsSendMessage} from "./api";
import restServiceFactory from "./request";
import {IBaiduThousandSailsApiConfig} from "./config";
import {BaseConfigService} from "#wechat/config_service/base_config";


export class BaiduThousandSailsHistoryManager extends HistoryManager<IMessage> {
    setPrompt(target: string, prompt: string): boolean {
        // TODO: 配置 prompt
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
        let history = this.get(target);
        if (history === undefined) {
            return false;
        }
        // TODO: 清除历史并保留 prompt，百度的 prompt 无法配置 system
        history = history.filter(item => item.role === 'system');
        this.historyCache.set(target, history);
        return true;
    }
}


export class BaiduThousandSailsService extends BaseAiChatService {
    public static readonly modelType = 'baiduThousandSails';
    private readonly configService: BaseConfigService;
    private readonly chatService: AiChatService;
    private readonly requestApiService: AxiosInstance;
    constructor(processService: AiChatService, configService: BaseConfigService, config: IBaiduThousandSailsApiConfig) {
        super(new BaiduThousandSailsHistoryManager());
        this.chatService = processService;

        let wrappedConfigService = new AiChatConfigDecorator(configService);
        wrappedConfigService.modelType = BaiduThousandSailsService.modelType;
        this.configService = wrappedConfigService;

        this.requestApiService = restServiceFactory(config)();
    }

    async chat(message: BaseWechatMessage, content: string, target: string): Promise<string[]> {
        let configResp = await this.configService.getTargetConfig<IAiChatServiceConfig>(message);
        if (configResp.status === SysCallStatusEnum.ERROR) {
            return ["配置读取出错"];
        }
        let config = configResp.body;

        if (config.prompt !== undefined) {
            this.historyManager.setPrompt(target, config.prompt);
        }
        // FIXME: 检查是否有未完成的请求，未完成的请求直接拒绝掉
        let currentCommunication = {
            role: "user",
            content: content,
        }

        // FIXME: 过滤掉历史中多余的用户信息/assistant 信息
        let currentMessage = this.historyManager.get(target);
        if (currentMessage === undefined) {
            currentMessage = [currentCommunication];
        } else {
            currentMessage.push(currentCommunication);
        }

        let sendData: IBaiduThousandSailsSendMessage = {
            messages: currentMessage,
            user_id: message.senderId,
        }

        let aiReply = await this.requestApiService.post<IBaiduThousandSailsReply>('/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions', sendData)
            .then(d => d.data)
            .catch(e => {
                console.error(e);
            });
        if (aiReply === undefined || aiReply === null) {
            return ["服务网络波动，请稍后重试！"];
        }
        if (aiReply.result === undefined || aiReply.result === null) {
            console.error(aiReply);
            console.error(sendData);
            return ["服务出错，请联系管理员"];
        }
        this.historyManager.append(target, currentCommunication);
        await this.saveToken(message, aiReply);
        let history = this.historyManager.append(target, {
            role: "assistant",
            content: aiReply.result,
        });
        let reply = [];
        if (history.filter(item => item.role === 'user').length > config.memory) {
            reply.push("本次对话将清空之前上下文，请注意！");
            this.historyManager.clearHistory(target);
        }
        reply.push(aiReply.result.replace("\\\\n", "\\n"));
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
        // TODO: 完成价格统计代码
        let configResp = await this.configService.getTargetConfig<IAiChatServiceConfig>(message);
        if (configResp.status === SysCallStatusEnum.ERROR || configResp.body.modulePrice === undefined) {
            console.error("获取模型价格失败");
            return;
        }
        return await this.chatService.saveToken(message, replyMessage, configResp.body.modulePrice);
    }
}
