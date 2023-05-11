import { AxiosInstance } from "axios";
import factory from "./request";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { ITemplateConfig } from "./config";
import path from 'path'
import config from "config";

let configList;
try {
    configList = config.get(`modules.${ path.basename(__dirname) }`) as ITemplateConfig[];
} catch(error) {
    console.warn(`获取模块配置 modules.${ path.basename(__dirname) } 出错！`)
    throw error;
}

const regex = `templateHeader\s*(.+)`;
const contentRegex = new RegExp(regex);

class TemplateService extends BaseWechatMessageProcessService {

    serviceCode: string = "service code";

    private _service;
    private _config: ITemplateConfig;

    get config(): ITemplateConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    
    constructor(config: ITemplateConfig) {
        super();
        this._service = factory.createService(config);
        this._config = config;
    }

    canProcess(message: BaseWechatMessage): boolean {
        // TODO: 修改关键字
        return BaseWechatMessageProcessService.simpleMessageProcessorTest(message, ['关键字列表']);
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        // 是否为 string
        if (typeof message.content !== 'string') {
            return null;
        }
        // 去除 @ 符
        message.content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
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

const serviceList: TemplateService[] = configList.map(c => new TemplateService(c));

export default serviceList;