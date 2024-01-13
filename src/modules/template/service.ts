import path from "path";

import {AxiosInstance} from "axios";

import {IWechatConfig} from "#/config";
import {getClientName} from "#system/sys_config";
import BaseWechatMessage from "#wechat/base_wechat";

import factory from "./request";
import {ITemplateConfig} from "./config";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";

export const serviceCode = path.basename(__dirname);

// let configList;
// try {
//     configList = config.get(`modules.${ path.basename(__dirname) }`) as ITemplateConfig[];
// } catch(error) {
//     console.warn(`获取模块配置 modules.${ path.basename(__dirname) } 出错！`)
//     throw error;
// }

const regex = `templateHeader\s*(.+)`;
const contentRegex = new RegExp(regex);

class TemplateService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;
    public readonly serviceCode: string = serviceCode;
    private readonly service: AxiosInstance;
    constructor(clientConfig: IWechatConfig, config: ITemplateConfig) {
        super(clientConfig, config);
        this.service = factory.createService(config);
    }

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        // TODO: 修改关键字
        return this.simpleMessageProcessorTest(message, ['关键字列表']);
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        // 是否为 string
        if (typeof message.content !== 'string') {
            return null;
        }
        // 去除 @ 符
        message.content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        let result = contentRegex.exec(message.content);
        if (result === null) {
            return null;
        }
        return 'dong';
    }

    getServiceName(): string {
        return '服务名称';
    }

    getUsage(): string {
        return '服务描述'
    }
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: ITemplateConfig): TemplateService {
    return new TemplateService(wechatConfig, chatgptConfig);
}
// const serviceList: TemplateService[] = configList.map(c => new TemplateService(config.get("wechat_server") as IWechatConfig, c));

// export default serviceList;
