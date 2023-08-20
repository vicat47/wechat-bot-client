import { AxiosInstance } from "axios";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import config from "config";
import path from "path";
import { IWechatConfig, IWechatService } from "../../config";

export const serviceCode = path.basename(__dirname);

class DingDongService extends BaseWechatMessageProcessService {
    public readonly serviceCode: string = serviceCode;

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        if (message.groupId === null && message.content === 'ding') {
            return true;
        }
        return false;
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        return 'dong';
    }

    getServiceName(): string {
        return '叮咚机器人';
    }

    getUseage(): string {
        return '叮咚机器人: 单聊发 ding 会回复 dong.'
    }

    async getTopics(): Promise<string[]> {
        let topicList = [];
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ this.clientId }/receve/users/${ adminUser }/#`);
        }
        return topicList;
    }
}

export function register(wechatConfig: IWechatConfig, moduleConfig: IWechatService): DingDongService {
    return new DingDongService(wechatConfig, moduleConfig);
}