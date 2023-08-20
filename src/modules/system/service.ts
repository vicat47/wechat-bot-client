import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { ISystemConfig } from "./config";
import { commandFunctions, getCommand } from "./command";
import config from "config";
import { IWechatConfig } from "../../config";
import { getClientName } from "../../system/sys_config";
import path from "path";

export const serviceCode = path.basename(__dirname);

const keyword = 'sys'
const regex = `${ keyword }\\s+([\\s\\S]+)`;
const contentRegex = new RegExp(regex);

class SystemService extends BaseWechatMessageProcessService {
    
    public readonly serviceCode: string = serviceCode;

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        let config = this.config as ISystemConfig;
        if (typeof message.content !== 'string') {
            return false;
        }
        // 处理单聊的情况
        if (message.groupId === null) {
            // 过滤用户
            if (config.singleContactWhiteList !== undefined && config.singleContactWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            return message.content.trim().substring(0, keyword.length) === keyword;
        }
        // 是否在接入的 roomId 中有
        if (config.attachedRoomId.indexOf(message.groupId) < 0) {
            return false;
        }
        // 不是 @ 我
        if (message.content.indexOf(`@${getClientName(this.clientId)} `) < 0) {
            return false;
        }
        // 去掉 @
        let content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        return content.substring(0, keyword.length) === keyword;
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

        let command = getCommand(result[1]);
        if (command === undefined || command === null) {
            return `命令 ${result[1]} 不存在，请检查`;
        }
        return await commandFunctions[command](this, message, result[1]);
    }

    getServiceName(): string {
        return 'system 模块';
    }

    getUseage(): string {
        return '"sys /command [args]"'
    }
    
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: ISystemConfig): SystemService {
    return new SystemService(wechatConfig, chatgptConfig);
}
// const serviceList: SystemService[] = configList.map(c => new SystemService(config.get("wechat_server") as IWechatConfig, c));
// const serviceList: SystemService[] = [new SystemService()];
// export default serviceList;