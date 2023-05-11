import { AxiosInstance } from "axios";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import config from "config";

class DingDongService extends BaseWechatMessageProcessService {
    service?: AxiosInstance = undefined;
    serviceCode: string = "dingdong-bot";
    get config(): any { return null };

    canProcess(message: BaseWechatMessage): boolean {
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

    getTopics(): string[] {
        let topicList = [];
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ config.get("wechat_server.id") }/receve/users/${ adminUser }/#`);
        }
        return topicList;
    }
}

const serviceList: DingDongService[] = [
    new DingDongService()
]

export default serviceList;