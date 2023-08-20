import { IWechatWebRequestService } from "../../../config";
import { BaseConfigService } from "../../../wechat/base_wechat";
import { BaseAiChatService } from "../lib";
import { AiChatService } from "../service";

import { BaiduThousandSailsService } from "./baidu_thousand_sails/service";
import { ChatGptService } from "./chatgpt/service";

export function aiChatSigletonFactory(param: {
    processService: AiChatService;
    configService: BaseConfigService;
    config: {[key: string]: IWechatWebRequestService};
}) {
    let singleton: {[k: string]: BaseAiChatService} = {};
    return function(modelType: string) {
        // 获取单例
        if (singleton[modelType] !== undefined && singleton[modelType] !== null) {
            return singleton[modelType];
        }
        // 创建实例
        let service;
        if (modelType === ChatGptService.modelType) {
            service = new ChatGptService(param.processService, param.configService, param.config[ChatGptService.modelType]);
        } else if (modelType === BaiduThousandSailsService.modelType) {
            service = new BaiduThousandSailsService(param.processService, param.configService, param.config[BaiduThousandSailsService.modelType] as any);
        }
        // 存入实例
        if (service !== undefined && service !== null) {
            singleton[modelType] = service;
        }
        return service;
    }
}