import BaseWechatMessage from "#/wechat/base_wechat";
import path from "path";
import {IBaseWechatServiceConfig, IWechatConfig} from "#/config";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";

export const serviceCode = path.basename(__dirname);

class DingDongService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;
    public readonly serviceCode: string = serviceCode;

    constructor(wechatConfig: IWechatConfig, moduleConfig: IBaseWechatServiceConfig) {
        super(wechatConfig, moduleConfig);
    }

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

    getUsage(): string {
        return '叮咚机器人: 单聊发 ding 会回复 dong.'
    }

}

export function register(wechatConfig: IWechatConfig, moduleConfig: IBaseWechatServiceConfig): DingDongService {
    return new DingDongService(wechatConfig, moduleConfig);
}
