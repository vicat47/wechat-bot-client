import {BaseWechatMessageProcessService} from "#wechat/message_processor/base_processor";
import {IBaseWechatServiceConfig, IWechatConfig} from "#/config";
import {IWechatSendMessage, WechatMessageTypeEnum} from "#wechat/base_wechat";
import {generateRequestId, ISysCallRequest, ISysCallResponse, savePromiseForRequestId} from "#system/sys_call";
import * as mqtt from "mqtt";
import {snowflake} from "#/app";

/**
 * 远程的处理器，现在没有用处
 */
export abstract class RemoteWechatMessageProcessService extends BaseWechatMessageProcessService {
    // TODO: mqttClient 修改为 MsgBroker
    private readonly mqttClient: mqtt.MqttClient;

    protected constructor(config: IWechatConfig, options: IBaseWechatServiceConfig) {
        super(config, options);
        this.mqttClient = mqtt.connect(config.mqttUrl);
        this.mqttClient.on('connect', async () => {
            console.log(`service ${this.getServiceName()} mqtt connected`);
            this.mqttClient.publish(`wechat/services/${this.serviceCode}`, JSON.stringify({
                msg: `Hello mqtt from ${this.getServiceName()}`
            }));
            // let topics = await that.getTopics();
            // that.subscribeTopics(topics);
        });
        // this.mqttClient.on('message', this.processTopic());
    }

    /**
     * 发起系统调用方法
     * @param request 请求参数
     * @returns 返回执行结果
     */
    public async systemCall<T>(request: ISysCallRequest): Promise<ISysCallResponse<T>> {
        return new Promise((resolve, reject) => {
            const requestId = generateRequestId(`${this.clientId}`);
            request.requestId = requestId;
            savePromiseForRequestId(requestId, {resolve, reject});
            this.mqttClient.publish(`wechat/${this.clientId}/send/sys`, JSON.stringify(request));
        });
    }

    protected async triggerBroadcast(sendGroups: string[], sendUsers: string[], content: string) {
        for (let target of sendGroups) {
            let resMsg: IWechatSendMessage = {
                id: snowflake.generate().toString(),
                service: this.serviceCode,
                groupId: target,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            this.mqttClient.publish(`wechat/${this.clientId}/send/group/${target}`, JSON.stringify(resMsg));
        }
        for (let user of sendUsers) {
            let resMsg: IWechatSendMessage = {
                id: snowflake.generate().toString(),
                service: this.serviceCode,
                groupId: user,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            this.mqttClient.publish(`wechat/${this.clientId}/send/user/${user}`, JSON.stringify(resMsg));
        }
    }

    protected async sendMessage(message: IWechatSendMessage): Promise<void> {
        if (message.groupId !== null) {
            this.mqttClient.publish(`wechat/${this.clientId}/send/group/${message.groupId}`, JSON.stringify(message));
            return;
        }
        this.mqttClient.publish(`wechat/${this.clientId}/send/user/${message.targetId}`, JSON.stringify(message));
    }

}
