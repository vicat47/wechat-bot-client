import BaseWechatMessage, { BaseConfigService, IWechatMqttSendMessage, LocalWechatMessageProcessService, SysCallConfigService, WechatMessageTypeEnum, isGroup, isUser } from "../../wechat/base_wechat";
import { IWatchdogConfig } from "./config";
import path from 'path'
import { IWechatConfig } from "../../config";
import { SysCallStatusEnum, generateRequestId } from "../../system/sys_call";
import { IBaseBehaviorContext, behaviorFactory } from "./behavior";
import { SysCallMethodEnum } from "../../system/api";

export const serviceCode = path.basename(__dirname);

class WatchdogService extends LocalWechatMessageProcessService {

    public readonly serviceCode: string = serviceCode;
    private readonly configService: BaseConfigService;
    private readonly behaviorFactory;

    constructor(clientConfig: IWechatConfig, config: IWatchdogConfig) {
        super(clientConfig, config);
        this.configService = new SysCallConfigService(this);
        this.behaviorFactory = behaviorFactory();
    }

    async canProcess(message: BaseWechatMessage): Promise<boolean> {
        if (message.senderId === this.clientId) {
            return false;
        }
        let configResp = await this.configService.getTargetConfig<IWatchdogConfig>(message);
        if (configResp.status !== SysCallStatusEnum.SUCCESS) {
            return false;
        }
        let msgReg = new RegExp(configResp.body.regex)
        if (typeof message.content !== 'string') {
            return false;
        }
        // TODO: preProcessor
        // TODO: predicate
        if (!msgReg.test(message.content)) {
            return false;
        }

        let users = configResp.body.watch.users;
        // 单聊
        if (message.groupId === undefined || message.groupId === null) {
            if (users !== undefined &&
                users.find(value => value === message.senderId) !== undefined) {
                return true;
            }
            return false;
        }

        // 群聊
        let groups = configResp.body.watch.groups;
        if (groups !== undefined &&
            message.groupId !== undefined &&
            message.groupId !== null &&
            groups.find((value) => {
                if (value.id === message.groupId) {
                    if (value.userIds === undefined) {
                        return true;
                    }
                    if (value.userIds.find(value => value === message.senderId)) {
                        return true;
                    }
                    return false;
                }
                return false;
            }) === undefined) {
            return false;
        }

        return true;
    }

    async replyMessage(message: BaseWechatMessage): Promise<string | null> {
        if (typeof message.content !== 'string') {
            return null;
        }
        if (message.senderId === this.clientId) {
            return null;
        }
        
        let configResp = await this.configService.getConfig<IWatchdogConfig>();
        if (configResp.status !== SysCallStatusEnum.SUCCESS) {
            return null;
        }
        const config = configResp.body;
        const context: IBaseBehaviorContext = {serviceCode: this.serviceCode};

        let behavior = this.behaviorFactory(config.behavior, config, context);
        let result = behavior?.execute(message);
        
        let [groupUserNick, groupName] = await Promise.all([this.systemCall({
            body: {
                groupId: message.groupId,
                userId: message.senderId,
            },
            requestId: generateRequestId(this.clientId, this.serviceId),
            router: SysCallMethodEnum.getNameById,
            headers: {
                moduleId: this.serviceId,
            }
        }), this.systemCall({
            body: {
                groupId: message.groupId,
            },
            requestId: generateRequestId(this.clientId, this.serviceId),
            router: SysCallMethodEnum.getNameById,
            headers: {
                moduleId: this.serviceId,
            }
        })]);

        let sourceUserString: string|undefined = undefined;
        let sourceGroupString: string|undefined = undefined;
        if (message.groupId && message.senderId) {
            sourceGroupString = `来自 ${groupName.body ?? "unknown"} 中的 ${groupUserNick.body ?? "unknown"} 的`;
        }
        if ((message.groupId === undefined || message.groupId === null) && message.senderId) {
            sourceUserString = `来自 ${groupUserNick.body ?? "unknown"} 的`
        }
        
        let postProcessor = config.postProcessor;
        if (result !== undefined && postProcessor !== undefined && postProcessor !== null) {
            const postProcessFunc = new Function("config", "context", "message", postProcessor);
            result = result.map(msg => postProcessFunc(config, context, msg));
        } else if (result !== undefined) {
            result = result.map(msg => {
                msg.content = `收到${sourceGroupString ?? sourceUserString ?? ""}转发消息：\n${message.content}`;
                return msg;
            });
        }

        // 发送消息
        result?.forEach(r => this.sendMessage(r));
        return null;
    }

    getServiceName(): string {
        return '看门狗服务';
    }

    getUseage(): string {
        return '被动监听群内消息并做出操作';
    }

    async getTopics(): Promise<string[]> {
        let topicList: string[] = [
            `wechat/${this.clientId}/receve/users/#`,
            `wechat/${this.clientId}/receve/groups/#`,
        ];
        return topicList;
    }
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: IWatchdogConfig): WatchdogService {
    return new WatchdogService(wechatConfig, chatgptConfig);
}
// const serviceList: TemplateService[] = configList.map(c => new TemplateService(config.get("wechat_server") as IWechatConfig, c));

// export default serviceList;