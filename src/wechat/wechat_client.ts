import { MqttClient } from "mqtt";
import { IWechatConfig } from "../config";
import BaseWechatMessage, { IWechatMqttSendMessage, WechatMessageTypeEnum } from "./base_wechat";

export interface IWechatClient {
    sendTxtMsg(content: string, target: string): Promise<any>;
    getMe(): Promise<any>
    onClose(): void
    onMessage(): (data: any) => Promise<void>;
    toWechatMessage(message: any): BaseWechatMessage;
}

export abstract class BaseWechatClient implements IWechatClient {
    protected config: IWechatConfig;

    abstract toWechatMessage(message: any): BaseWechatMessage;
    abstract sendTxtMsg(content: string, target: string): Promise<any>;
    abstract getMe(): Promise<any>;
    abstract onClose(): void;
    abstract onMessage(): (data: any) => Promise<void>;
    abstract get mqttClient(): MqttClient

    constructor(config: IWechatConfig) {
        this.config = config;
    }

    abstract connect(): Promise<void>;

    publishMqttMessage(wechatMessage: BaseWechatMessage) {
        if (wechatMessage.subscriptionId !== null) {
            console.log(`MQTT published on wechat/${this.config.id}/receve/subscriptions/${ wechatMessage.subscriptionId }`);
            this.mqttClient.publish(`wechat/${this.config.id}/receve/subscriptions/${ wechatMessage.subscriptionId }`, JSON.stringify(wechatMessage));
            return;
        }
        if (wechatMessage.groupId !== null) {
            let isAtMe = 'no';
            if (typeof wechatMessage.content === 'string' && wechatMessage.content.indexOf(`@${this.config.name} `) >= 0) {
                isAtMe = '@';
            }
            console.log(`MQTT published on wechat/${this.config.id}/receve/groups/${wechatMessage.groupId}/users/${wechatMessage.senderId}/${isAtMe}`)
            this.mqttClient.publish(`wechat/${this.config.id}/receve/groups/${wechatMessage.groupId}/users/${wechatMessage.senderId}/${isAtMe}`, JSON.stringify(wechatMessage));
            return;
        }
        console.log(`MQTT published on wechat/${this.config.id}/receve/users/${wechatMessage.senderId}`)
        this.mqttClient.publish(`wechat/${this.config.id}/receve/users/${wechatMessage.senderId}`, JSON.stringify(wechatMessage));
    }

    subscribeSendMessage() {
        let that = this;
        this.mqttClient.subscribe(`wechat/${ this.config.id }/send/#`);
        this.mqttClient.on("message", (topic: string, wechatMessage: any) => {
            let sendMessage = JSON.parse(wechatMessage.toString()) as IWechatMqttSendMessage;
            if (sendMessage.msgType === WechatMessageTypeEnum.TEXT) {
                that.sendTxtMsg(sendMessage.content, sendMessage.groupId ?? sendMessage.targetId ?? '');
            }
        });
    }
}