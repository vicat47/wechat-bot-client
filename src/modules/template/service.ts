import { AxiosInstance } from "axios";
import factory from "./request";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { ITemplateConfig } from "./config";
import path from 'path'
import config from "config";
import { getClientName } from "../../system/sys_config";
import { IWechatConfig } from "../../config";

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

class TemplateService extends BaseWechatMessageProcessService {

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

    getUseage(): string {
        return '服务描述'
    }

    async getTopics(): Promise<string[]> {
        let topicList = [];
        topicList.push(...(this.config as ITemplateConfig).attachedRoomId.map(roomId => {
            return `wechat/${ this.clientId }/receve/groups/${ roomId }/#`
        }));
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ this.clientId }/receve/users/${ adminUser }/#`);
        }
        return topicList;
    }
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: ITemplateConfig): TemplateService {
    return new TemplateService(wechatConfig, chatgptConfig);
}
// const serviceList: TemplateService[] = configList.map(c => new TemplateService(config.get("wechat_server") as IWechatConfig, c));

// export default serviceList;