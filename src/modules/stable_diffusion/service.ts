import { AxiosInstance } from "axios";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { IDiffusionParam, IStableDiffusionResponse } from "./api";
import { IStableDiffusionConfig } from "./config";
import {StableDiffusionServiceFactory, ImageSendServiceFactory} from "./request";
import path from 'path'
import config from "config";

let configList;
try {
    configList = config.get(`modules.${ path.basename(__dirname) }`) as IStableDiffusionConfig[];
} catch(error) {
    console.warn(`获取模块配置 modules.${ path.basename(__dirname) } 出错！`)
    throw error;
}

const regex = `AI画图[\n|\s]+(.+)\n+(.+)`;
const contentRegex = new RegExp(regex);

class StableDiffusionService extends BaseWechatMessageProcessService {
    serviceCode: string = "service code";

    private _service;
    private _config: IStableDiffusionConfig;

    private sendService: AxiosInstance;

    get config(): IStableDiffusionConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    
    constructor(config: IStableDiffusionConfig) {
        super();
        this._service = StableDiffusionServiceFactory.createService(config.stableService);
        this.sendService = ImageSendServiceFactory.createService(config.imageService);
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
            let result = contentRegex.exec(message.content);
            if (result === null) {
                return false;
            }
            return true;
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
        message.content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
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
        let imageResult = await this.service.post<IStableDiffusionResponse>("/sdapi/v1/txt2img", data)
            .then(res => res.data)
            .catch(() => {});
        if (imageResult === undefined || imageResult === null || imageResult.images[0] === undefined) {
            return "图片请求失败！请重试";
        }
        let base64 = imageResult.images[0]
        this.sendService.post("/base64", {
            wxid: target,
            type: "png",
            data: base64
        })
        return null;
    }

    getServiceName(): string {
        return 'AI 绘图 bot';
    }

    getUseage(): string {
        return '使用 “AI画图 正向标签\n逆向标签”'
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

const serviceList: StableDiffusionService[] = configList.map(c => new StableDiffusionService(c));
export default serviceList;