import {BaseMessagePublisher} from "#wechat/message_publisher/base_publisher";
import BaseWechatMessage, {ISystemMessage, IWechatSendMessage, SystemMessageTypeEnum} from "#wechat/base_wechat";
import {IWechatConfig} from "#/config";
import * as mqtt from "mqtt";
import {BaseWechatClient} from "#wechat/clients/wechat_client";
import {ISysCallRequest, ISysCallResponse} from "#system/sys_call";

const SEND_MESSAGE_TOPIC_REG = new RegExp(/wechat\/[^\/]+\/send\/.+/);
const SYS_CALL_MESSAGE_TOPIC_REG = new RegExp(/wechat\/[^\/]+\/send\/sys/);
const SYS_CALL_MESSAGE_RECEIVE_TOPIC_REG = new RegExp(/wechat\/[^\/]+\/receive\/sys/);

export class MqttPublisher extends BaseMessagePublisher {
    private mqttClient: mqtt.MqttClient;

    constructor(config: IWechatConfig, client: BaseWechatClient) {
        super(config, client);
        this.mqttClient = mqtt.connect(config.mqttUrl);
        this.mqttClient.subscribe(`wechat/${config.id}/send/#`);
        this.mqttClient.subscribe(`wechat/${config.id}/send/sys`);
        this.mqttClient.subscribe(`wechat/${config.id}/receive/sys`);
        this.mqttClient.on("message", async (topic: string, mqttMessage: any) => {
            if (SYS_CALL_MESSAGE_TOPIC_REG.exec(topic)) {
                client.processSysCallMessage(JSON.parse(mqttMessage) as ISysCallRequest);
            } else if (SYS_CALL_MESSAGE_RECEIVE_TOPIC_REG.exec(topic)) {
                client.processSysCallReceiveMessage(JSON.parse(mqttMessage) as ISysCallResponse<any>);
            } else if (SEND_MESSAGE_TOPIC_REG.exec(topic)) {
                await client.processSendMessage(JSON.parse(mqttMessage.toString()) as IWechatSendMessage);
            }
        });
    }

    public init(callback?: Function): Promise<void> {
        return new Promise((resolve, reject) => {
            this.mqttClient.on('connect', () => {
                console.log(`mqtt client 已连接`);
                callback?.();
                return resolve();
            });
            setTimeout(() => reject(), 10000);
        });
    }

    public async forward(msg: BaseWechatMessage): Promise<void> {
        if (msg.subscriptionId !== null) {
            console.log(`MQTT published on wechat/${this.client.id}/receive/subscriptions/${msg.subscriptionId}`);
            this.mqttClient.publish(`wechat/${this.client.id}/receive/subscriptions/${msg.subscriptionId}`, JSON.stringify(msg));
            return;
        }
        if (msg.groupId !== null) {
            let isAtMe = 'no';
            if (typeof msg.content === 'string' && msg.content.indexOf(`@${this.client.name} `) >= 0) {
                isAtMe = '@';
            }
            console.log(`MQTT published on wechat/${this.client.id}/receive/groups/${msg.groupId}/users/${msg.senderId}/${isAtMe}`);
            this.mqttClient.publish(`wechat/${this.client.id}/receive/groups/${msg.groupId}/users/${msg.senderId}/${isAtMe}`, JSON.stringify(msg));
            return;
        }
        console.log(`MQTT published on wechat/${this.client.id}/receive/users/${msg.senderId}`);
        this.mqttClient.publish(`wechat/${this.client.id}/receive/users/${msg.senderId}`, JSON.stringify(msg));
    }

    public async send(msg: ISystemMessage): Promise<void> {
        switch (msg.type) {
            case SystemMessageTypeEnum.SYSCALL_RESPONSE_MESSAGE:
                this.mqttClient.publish(`wechat/${this.client.id}/receive/sys`, JSON.stringify(msg.data));
                break;
        }
    }

    process(msg: ISystemMessage): Promise<any> {
        return Promise.resolve(undefined);
    }

}
