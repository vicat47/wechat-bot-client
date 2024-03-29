import path from "path";

import {AxiosInstance} from "axios";

import {IWechatConfig} from "#/config";
import {getClientName} from "#system/sys_config";
import BaseWechatMessage from "#wechat/base_wechat";

import {IDiffusionParam, IStableDiffusionResponse} from "./api";
import {IStableDiffusionConfig} from "./config";
import {ImageSendServiceFactory, StableDiffusionServiceFactory} from "./request";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";


export const serviceCode = path.basename(__dirname);

// let configList;
// try {
//     configList = config.get(`modules.${ path.basename(__dirname) }`) as IStableDiffusionConfig[];
// } catch(error) {
//     console.warn(`获取模块配置 modules.${ path.basename(__dirname) } 出错！`)
//     throw error;
// }

const regex = `AI画图[\n|\s]+(.+)\n+(.+)`;
const contentRegex = new RegExp(regex);

class StableDiffusionService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;
    serviceCode: string = serviceCode;

    private readonly requestService;
    private readonly sendMessageService: AxiosInstance;

    constructor(clientConfig: IWechatConfig, config: IStableDiffusionConfig) {
        super(clientConfig, config);
        this.requestService = StableDiffusionServiceFactory.createService(config.stableService);
        this.sendMessageService = ImageSendServiceFactory.createService(config.imageService);
    }

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        let config = this.serviceConfig as IStableDiffusionConfig;
        if (typeof message.content !== 'string') {
            return false;
        }
        // 处理单聊的情况
        if (message.groupId === null) {
            // 过滤用户
            if (config.singleContactWhiteList !== undefined && config.singleContactWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            let result = contentRegex.exec(message.content);
            if (result === null) {
                return false;
            }
            return true;
        }
        // 是否在接入的 roomId 中有
        if (config.attachedRoomId.indexOf(message.groupId) < 0) {
            return false;
        }
        // 不是 @ 我
        if (message.content.indexOf(`@${getClientName(this.clientId)} `) < 0) {
            return false;
        }
        // 去掉 @
        let content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();

        let result = contentRegex.exec(content);
        if (result === null) {
            return false;
        }
        return true;
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        if (typeof message.content !== 'string') {
            return null;
        }
        message.content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        let result = contentRegex.exec(message.content);
        if (result === null) {
            return null;
        }
        let target = message.groupId ? message.groupId: message.senderId;
        let prompt = result[1]
        let negativePrompt = result[2]
        let data:IDiffusionParam = {
            prompt: prompt,
            negative_prompt: negativePrompt,
            steps: 30
        }
        let imageResult = await this.requestService.post<IStableDiffusionResponse>("/sdapi/v1/txt2img", data)
            .then(res => res.data)
            .catch(() => {});
        if (imageResult === undefined || imageResult === null || imageResult.images[0] === undefined) {
            return "图片请求失败！请重试";
        }
        let base64 = imageResult.images[0]
        this.sendMessageService.post("/base64", {
            wxid: target,
            type: "png",
            data: base64
        })
        return null;
    }

    getServiceName(): string {
        return 'AI 绘图 bot';
    }

    getUsage(): string {
        return '使用 “AI画图 正向标签\n逆向标签”'
    }

}

export function register(wechatConfig: IWechatConfig, chatgptConfig: IStableDiffusionConfig): StableDiffusionService {
    return new StableDiffusionService(wechatConfig, chatgptConfig);
}

// const serviceList: StableDiffusionService[] = configList.map(c => new StableDiffusionService(config.get("wechat_server") as IWechatConfig, c));
// export default serviceList;
