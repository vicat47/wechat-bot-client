import { MqttClient } from "mqtt";
import { IWechatConfig } from "../config";
import BaseWechatMessage, { IWechatMqttSendMessage, WechatMessageTypeEnum } from "./base_wechat";
import { IBaseContentMessage, IGroupUserContent, IUserContent } from "./data";
import { callSysMethod } from "../system/api";
import { ISysCallRequest, ISysCallResponse, SysCallStatusEnum, getPromiseByRequestId } from "../system/sys_call";

const SEND_MESSAGE_TOPIC_REG = new RegExp(/wechat\/[^\/]+\/send\/.+/);
const SYS_CALL_MESSAGE_TOPIC_REG = new RegExp(/wechat\/[^\/]+\/send\/sys/);
const SYS_CALL_MESSAGE_RECEVE_TOPIC_REG = new RegExp(/wechat\/[^\/]+\/receve\/sys/);

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
    abstract getUserList(): Promise<IBaseContentMessage<IUserContent>>;
    abstract getGroupUserList(): Promise<IBaseContentMessage<IGroupUserContent>>;
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

    subscribeMqttMessage() {
        this.subscribeSendMessage();
        this.subscribeSystemCallMessage();
        this.registMqttMessageProcessor();
    }

    private processSendMessage(wechatMessage: any) {
        let sendMessage = JSON.parse(wechatMessage.toString()) as IWechatMqttSendMessage;
        // TODO: 校验参数。
        if (sendMessage.msgType === WechatMessageTypeEnum.TEXT) {
            this.sendTxtMsg(sendMessage.content, sendMessage.groupId ?? sendMessage.targetId ?? '');
        }
    }

    private processSysCallMessage(request: ISysCallRequest) {
        // 处理请求
        callSysMethod(this, request)
            .then((data) => {
                let resp: ISysCallResponse = {
                    body: data,
                    params: undefined,
                    headers: undefined,
                    requestId: request.requestId,
                    status: SysCallStatusEnum.SUCCESS,
                }
                this.mqttClient.publish(`wechat/${this.config.id}/receve/sys`, JSON.stringify(resp));
            }).catch((e: Error) => {
                let resp: ISysCallResponse = {
                    body: e.message,
                    params: undefined,
                    headers: undefined,
                    requestId: request.requestId,
                    status: SysCallStatusEnum.ERROR,
                }
                this.mqttClient.publish(`wechat/${this.config.id}/receve/sys`, JSON.stringify(resp));
            });
    }

    private processSysCallRecvMessage(response: ISysCallResponse) {
        const requestId = response.requestId;
        const promise = getPromiseByRequestId(requestId);
        if (promise) {
            promise.resolve(response); // Resolve the promise with the system response
        }
    }

    private registMqttMessageProcessor() {
        let that = this;
        this.mqttClient.on("message", (topic: string, mqttMessage: any) => {
            if (SYS_CALL_MESSAGE_TOPIC_REG.exec(topic)) {
                that.processSysCallMessage(JSON.parse(mqttMessage) as ISysCallRequest);
            } else if (SYS_CALL_MESSAGE_RECEVE_TOPIC_REG.exec(topic)) {
                that.processSysCallRecvMessage(JSON.parse(mqttMessage) as ISysCallResponse);
            } else if (SEND_MESSAGE_TOPIC_REG.exec(topic)) {
                that.processSendMessage(mqttMessage);
            }
        });
    }

    private subscribeSendMessage() {
        this.mqttClient.subscribe(`wechat/${ this.config.id }/send/#`);
    }

    private subscribeSystemCallMessage() {
        this.mqttClient.subscribe(`wechat/${ this.config.id }/send/sys`);
        this.mqttClient.subscribe(`wechat/${ this.config.id }/receve/sys`);
    }
}