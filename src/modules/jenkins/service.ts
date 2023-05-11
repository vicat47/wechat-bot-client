import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import factory from "./request";
import { IJenkinsConfig } from "./config";
import { AxiosInstance } from "axios";
import { IJenkinsMainPageApi } from "./api";
import config from "config";

let configList;
try {
    configList = config.get("modules.jenkins") as IJenkinsConfig[];
} catch(error) {
    console.warn("获取模块配置 modules.jenkins 出错！")
    throw error;
}

const regex = `(jenkins)构建\s*(.+)`;
const jenkinsRegex = new RegExp(regex);


class JenkinsService extends BaseWechatMessageProcessService {
    getTopics(): string[] {
        let topicList = [];
        if (this.config.singleContactWhiteList !== undefined && this.config.singleContactWhiteList.length > 0) {
            topicList.push(...this.config.singleContactWhiteList.map(userId => {
                return `wechat/${ config.get("wechat_server.id") }/receve/users/${ userId }/#`
            }));
        }
        return topicList
    }
    serviceCode: string = "jenkins-build-trigger";
    private _service;
    private _config: IJenkinsConfig;

    get config(): IJenkinsConfig { return this._config };
    get service(): AxiosInstance { return this._service };
    
    constructor(config: IJenkinsConfig) {
        super();
        this._service = factory.createService(config);
        this._config = config;
    }

    public canProcess(message: BaseWechatMessage): boolean {
        if (typeof message.content !== 'string') {
            return false;
        }
        if (message.groupId === null) {
            // 过滤用户
            if (this.config.singleContactWhiteList !== undefined && this.config.singleContactWhiteList.indexOf(message.senderId) < 0) {
                return false;
            }
            let result = jenkinsRegex.exec(message.content);
            if (result === null) {
                return false;
            }
            return true;
        }
        if (this.config.attachedRoomId.indexOf(message.groupId) < 0) {
            return false;
        }
        // 不是 @ 我
        if (message.content.indexOf(`@${config.get("wechat_server.name")} `) < 0) {
            return false;
        }
        let content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
        
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
        message.content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
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
        let buildApi = `${jobDetail.url.replace(this.config.baseUrl, "")}build`;
        
        let buildResult = await this.service.get(buildApi)
            .catch(() => {});
        if (!buildResult) {
            return "构建出错,请检查...";
        }

        return null;
    }

    public getUseage(): string {
        return "jenkins 构建用法: (服务名称)构建 实际构建远端的JOB名称"
    }
    public getServiceName(): string {
        return "jenkins 构建";
    }

}

const serviceList: JenkinsService[] = configList.map(c => new JenkinsService(c));
export default serviceList;