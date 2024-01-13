import {generateRequestId, ISysCallRequest, ISysCallResponse, SysCallStatusEnum} from "#system/sys_call";
import {IBaseWechatServiceConfig, IWechatConfig} from "#/config";
import {getClientName} from "#system/sys_config";
import BaseWechatMessage, {IWechatSendMessage, WechatMessageTypeEnum} from "#wechat/base_wechat";
import {snowflake} from "#/app";

export interface IWechatMessageProcessor {
    readonly handleNext: boolean

    getPriority(options?: {
        userId?: string,
        groupId?: string,
    }): Promise<string>;

    canProcess(message: BaseWechatMessage): Promise<boolean>;

    replyMessage(message: BaseWechatMessage): Promise<string | null>;

    getServiceName(): string;

    getUsage(): string;

    systemCall<T>(request: ISysCallRequest): Promise<ISysCallResponse<T>>;
}

/**
 * <h1>消息处理器</h1>
 * 消息处理器是各个模块用来处理消息的基类方法，现有不同的发送策略
 * - 本地发送策略：消息通过全局的 client 单例进行发送，直接调用发送接口
 * - 远程发送策略：消息通过 mqtt 发送到服务端以后，由服务端监听后进行发送
 */
export abstract class BaseWechatMessageProcessService implements IWechatMessageProcessor {
    public readonly serviceId: string;
    public readonly clientId: string;
    public readonly atRegex: RegExp;
    public abstract readonly handleNext: boolean;
    protected readonly serviceConfig: IBaseWechatServiceConfig;

    protected constructor(config: IWechatConfig, serviceConfig: IBaseWechatServiceConfig) {
        this.clientId = config.id;
        this.serviceConfig = serviceConfig;
        this.serviceId = serviceConfig.id;
        this.atRegex = new RegExp(`@${config.name}[\\s ]`);
    }

    public abstract get serviceCode(): string;

    abstract canProcess(message: BaseWechatMessage): Promise<boolean>;

    abstract replyMessage(message: BaseWechatMessage): Promise<string | null>;

    abstract getServiceName(): string;

    abstract getUsage(): string;

    public async getPriority(options?: {
        userId?: string,
        groupId?: string,
    }): Promise<string> {
        let resp = await this.systemCall<any>({
            body: {
                userId: options?.userId,
                groupId: options?.groupId,
            },
            headers: {moduleId: this.serviceId},
            requestId: generateRequestId(this.clientId, this.serviceId),
            router: "getConfig",
        });
        if (resp.status !== SysCallStatusEnum.ERROR && resp.body.priority) {
            return resp.body.priority;
        }
        throw new Error(`get Property failed.. caused by ${resp.body}`);
    }

    public simpleMessageProcessorTest(message: BaseWechatMessage, keywords: string[]) {
        if (typeof message.content !== 'string') {
            return false;
        }
        if (message.groupId !== null && `@${getClientName(this.clientId)} `.indexOf(message.content) < 0) {
            return false;
        }
        let content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        for (let keyword of keywords) {
            if (content === keyword) {
                return true;
            }
        }
        return false;
    }

    /**
     * 发起系统调用方法
     * @param request 请求参数
     * @returns 返回执行结果
     */
    public abstract systemCall<T>(request: ISysCallRequest): Promise<ISysCallResponse<T>>;

    // subscribeTopics(topicList: string[]) {
    //     for (let topic of topicList) {
    //         this.mqttClient.subscribe(topic);
    //     }
    // }

    // private processTopic() {
    //     let that = this;
    //     return async (topic: string, mqttMessage: any) => {
    //         // TODO: 校验参数
    //         let dataJson = JSON.parse(mqttMessage.toString());
    //         let reqMessage = dataJson as BaseWechatMessage;
    //         console.log(`topic ${topic} received message. processing ${JSON.stringify(reqMessage)}`)
    //         if (!await that.canProcess(reqMessage)) {
    //             return;
    //         }
    //         let msg = await that.replyMessage(reqMessage);
    //         if (msg === null) {
    //             return;
    //         }
    //         // todo 这里需要改改，改成指定的类型
    //         let resMsg: IWechatSendMessage = {
    //             id: snowflake.generate().toString(),
    //             service: that.serviceCode,
    //             groupId: reqMessage.groupId,
    //             targetId: reqMessage.senderId,
    //             msgType: WechatMessageTypeEnum.TEXT,
    //             content: msg
    //         }
    //         that.sendMessage(resMsg);
    //     }
    // }

    protected abstract triggerBroadcast(sendGroups: string[], sendUsers: string[], content: string): Promise<string | void>;

    /**
     * 发送回复文字消息
     * @param receivedMessage 接收到的消息
     * @param msg 要发送的文字消息
     */
    protected async sendReplyTextMessage(receivedMessage: BaseWechatMessage, msg: string) {
        let resMsg: IWechatSendMessage = {
            id: snowflake.generate().toString(),
            service: this.serviceCode,
            groupId: receivedMessage.groupId,
            targetId: receivedMessage.senderId,
            msgType: WechatMessageTypeEnum.TEXT,
            content: msg
        }
        await this.sendMessage(resMsg);
    }

    protected abstract sendMessage(message: IWechatSendMessage): Promise<void>;
}
