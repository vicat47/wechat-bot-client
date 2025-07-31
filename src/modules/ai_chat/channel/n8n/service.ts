import {BaseConfigService} from "#/system/config_service/base_config";
import BaseWechatMessage from "#/wechat/base_wechat";
import {AxiosInstance} from "axios";
import {BaseAiChatService, EmptyHistoryManager} from "../../lib";
import {AiChatService} from "../../service";
import restServiceFactory from "./request";
import {SysCallStatusEnum} from "#/system/sys_call";
import {IN8NWebhookReply} from "#modules/ai_chat/channel/n8n/api";
import {IN8NApiConfig} from "#modules/ai_chat/channel/n8n/config";

export class N8NAiChatService extends BaseAiChatService {

    public static readonly modelType = 'n8n';
    private readonly configService: BaseConfigService;
    private readonly chatService: AiChatService;
    private readonly requestApiService: AxiosInstance;

    constructor(processService: AiChatService, configService: BaseConfigService, config: IN8NApiConfig) {
        super(new EmptyHistoryManager());
        this.configService = configService;
        this.chatService = processService;
        this.requestApiService = restServiceFactory(config)();
    }

    async chat(message: BaseWechatMessage, content: string, target: string): Promise<string[]> {
        let configResp = await this.configService.getTargetConfig<IN8NApiConfig>(message);
        if (configResp.status === SysCallStatusEnum.ERROR) {
            return ["配置读取出错"];
        }

        // TODO: 分析配置问题
        let config = configResp.body as any;

        console.log(config)

        let aiReply = await this.requestApiService<IN8NWebhookReply[]>({
            url: config.n8n.webHookPath,
            method: "POST",
            data: {
                chatInput: content,
            },
            params: {
                userId: target
            }
        })
            .then(d => d.data)
            .catch(error => {
                console.error("Error in N8N AI chat request:", error);
            });
        if (aiReply === undefined || aiReply === null || aiReply.length === 0) {
            return ["服务网络波动，请稍后重试！"];
        }
        let reply = [];
        reply.push(aiReply[0].output)
        return reply;
    }

    async saveToken(message: BaseWechatMessage, replyMessage: any): Promise<any> {
        console.log("n8n 保存 token：Method not implemented.");
        return;
    }

}
