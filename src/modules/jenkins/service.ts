import path from "path";

import {IWechatConfig} from "#/config";
import {getClientName} from "#system/sys_config";
import BaseWechatMessage from "#wechat/base_wechat";

import factory from "./request";
import {IJenkinsConfig} from "./config";
import {IJenkinsMainPageApi} from "./api";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";

export const serviceCode = path.basename(__dirname);

// let configList;
// try {
//     configList = config.get("modules.jenkins") as IJenkinsConfig[];
// } catch(error) {
//     console.warn("获取模块配置 modules.jenkins 出错！")
//     throw error;
// }

const regex = `(jenkins)构建\s*(.+)`;
const jenkinsRegex = new RegExp(regex);


class JenkinsService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;
    public readonly serviceCode: string = serviceCode;
    private readonly service;

    constructor(clientConfig: IWechatConfig, config: IJenkinsConfig) {
        super(clientConfig, config);
        this.service = factory.createService(config);
    }

    public async canProcess(message: BaseWechatMessage): Promise<boolean> {
        let config = this.serviceConfig as IJenkinsConfig
        if (typeof message.content !== 'string') {
            return false;
        }
        if (message.groupId === null) {
            // 过滤用户
            if (config.singleContactWhiteList !== undefined && config.singleContactWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            let result = jenkinsRegex.exec(message.content);
            if (result === null) {
                return false;
            }
            return true;
        }
        if (config.attachedRoomId.indexOf(message.groupId) < 0) {
            return false;
        }
        // 不是 @ 我
        if (message.content.indexOf(`@${getClientName(this.clientId)} `) < 0) {
            return false;
        }
        let content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();

        let result = jenkinsRegex.exec(content);
        if (result === null) {
            return false;
        }
        return true;
    }

    public async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        if (typeof message.content !== 'string') {
            return null;
        }
        message.content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        let result = jenkinsRegex.exec(message.content);
        if (result === null) {
            return null;
        }
        let projectName = result[2].trim();
        let data = await this.service.get<IJenkinsMainPageApi>("/api/json");
        let job = data.data.jobs.filter((value) => value.name === projectName);
        if (job.length !== 1) {
            return "工程名称错误!请检查";
        }
        let jobDetail = job[0]
        let buildApi = `${jobDetail.url.replace((this.serviceConfig as IJenkinsConfig).baseUrl, "")}build`;

        let buildResult = await this.service.get(buildApi)
            .catch(() => {});
        if (!buildResult) {
            return "构建出错,请检查...";
        }

        return null;
    }

    public getUsage(): string {
        return "jenkins 构建用法: (服务名称)构建 实际构建远端的JOB名称"
    }
    public getServiceName(): string {
        return "jenkins 构建";
    }

}

export function register(wechatConfig: IWechatConfig, chatgptConfig: IJenkinsConfig): JenkinsService {
    return new JenkinsService(wechatConfig, chatgptConfig);
}

// const serviceList: JenkinsService[] = configList.map(c => new JenkinsService(config.get("wechat_server") as IWechatConfig, c));
// export default serviceList;
