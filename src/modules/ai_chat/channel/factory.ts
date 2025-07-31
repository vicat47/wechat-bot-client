import {IWechatWebRequestServiceConfig} from "#/config";
import {BaseAiChatService} from "#modules/ai_chat/lib";
import {AiChatService} from "#modules/ai_chat/service";

import {BaiduThousandSailsService} from "./baidu_thousand_sails/service";
import {ChatGptService} from "./chatgpt/service";
import {N8NAiChatService} from "./n8n/service";
import {BaseConfigService} from "#system/config_service/base_config";

export function aiChatSingletonFactory(param: {
    processService: AiChatService;
    configService: BaseConfigService;
    config: { [key: string]: IWechatWebRequestServiceConfig };
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
        } else if (modelType === N8NAiChatService.modelType) {
            service = new N8NAiChatService(param.processService, param.configService, param.config[N8NAiChatService.modelType] as any);
        }
        // 存入实例
        if (service !== undefined && service !== null) {
            singleton[modelType] = service;
        }
        return service;
    }
}
