import path from "path";

import {IWechatConfig} from "#/config";
import BaseWechatMessage from "#wechat/base_wechat";
import {ISystemConfig} from "./config";
import {commandFunctions, getCommand} from "./command";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";

export const serviceCode = path.basename(__dirname);

const keyword = 'sys'
const regex = `${ keyword }\\s+([\\s\\S]+)`;
const contentRegex = new RegExp(regex);

class SystemService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;
    public readonly serviceCode: string = serviceCode;

    constructor(wechatConfig: IWechatConfig, systemConfig: ISystemConfig) {
        super(wechatConfig, systemConfig);
    }

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        let config = this.serviceConfig as ISystemConfig;
        if (typeof message.content !== 'string') {
            return false;
        }
        // 群里但是不是 @ 我的
        if (message.groupId !== undefined && message.groupId !== null && !this.atRegex.test(message.content)) {
            return false;
        }
        // 去掉 @
        let content = message.content.replace(this.atRegex, '').trim();

        // 处理关键字
        if (content.substring(0, keyword.length) !== keyword) {
            return false;
        }
        // 处理单聊的情况
        if (message.groupId === null) {
            // 过滤用户
            if (config.singleContactWhiteList !== undefined && config.singleContactWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            return true;
        }
        // 是否在接入的 roomId 中有
        if (config.attachedRoomId.indexOf(message.groupId) < 0) {
            return false;
        }
        return true;
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        // 是否为 string
        if (typeof message.content !== 'string') {
            return null;
        }
        // 去除 @ 符
        message.content = message.content.replace(this.atRegex, '').trim();

        let result = contentRegex.exec(message.content);
        if (result === null) {
            return null;
        }

        let command = getCommand(result[1]);
        if (command === undefined || command === null) {
            return `命令 ${result[1]} 不存在，请检查`;
        }
        return await commandFunctions[command](this, message, result[1]);
    }

    getServiceName(): string {
        return 'system 模块';
    }

    getUsage(): string {
        return '"sys /command [args]"'
    }

}

export function register(wechatConfig: IWechatConfig, chatgptConfig: ISystemConfig): SystemService {
    return new SystemService(wechatConfig, chatgptConfig);
}
// const serviceList: SystemService[] = configList.map(c => new SystemService(config.get("wechat_server") as IWechatConfig, c));
// const serviceList: SystemService[] = [new SystemService()];
// export default serviceList;
