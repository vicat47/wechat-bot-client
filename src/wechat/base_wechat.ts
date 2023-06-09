import { AxiosInstance } from "axios"
import * as mqtt from 'mqtt';
import { WechatXMLMessage } from "./xml_message"
import config from "config";

export enum WechatMessageTypeEnum {
    TEXT = 1,
    PICTURE = 2,
    FILE = 3,
    XML = 4
}

export default class BaseWechatMessage {
    id: string
    groupId: string | null = null
    subscriptionId: string | null = null
    recvMsgType: WechatMessageTypeEnum
    senderId: string
    content: string | WechatXMLMessage

    constructor(id: string, groupId: string | null, subscriptionId: string | null, recvMsgType: WechatMessageTypeEnum, senderId: string, content: string | WechatXMLMessage) {
        this.id = id;
        this.groupId = groupId;
        this.subscriptionId = subscriptionId;
        this.recvMsgType = recvMsgType;
        this.senderId = senderId;
        this.content = content;
    }

    public static textMsg(id: string, groupId: string | null, senderId: string, content: string) {
        return new BaseWechatMessage(id, groupId, null, WechatMessageTypeEnum.TEXT, senderId, content);
    }

    public static imageMsg(id: string, groupId: string | null, senderId: string, content: WechatXMLMessage) {
        return new BaseWechatMessage(id, groupId, null, WechatMessageTypeEnum.TEXT, senderId, content);
    }
}

export interface IWechatMqttSendMessage {
    service: string
    groupId: string | null
    targetId: string | null
    content: string
    msgType: WechatMessageTypeEnum
}

export interface IWechatMessageProcessor {
    config: any;
    service?: AxiosInstance;
    canProcess(message: BaseWechatMessage): boolean;
    replyMessage(message: BaseWechatMessage): Promise<string | null>;
    getServiceName(): string;
    getUseage(): string;
}

export abstract class BaseWechatMessageProcessService implements IWechatMessageProcessor {
    private mqttClient: mqtt.MqttClient;
    abstract config: any;
    abstract service?: AxiosInstance;
    abstract get serviceCode(): string;
    abstract canProcess(message: BaseWechatMessage): boolean;
    abstract replyMessage(message: BaseWechatMessage): Promise<string | null>;
    abstract getServiceName(): string;
    abstract getUseage(): string;
    abstract getTopics(): string[];
    triggerBoardcast?(): Promise<string | null>
    constructor() {
        this.mqttClient = mqtt.connect(config.get("wechat_server.mqttUrl"));
        let that = this;
        this.mqttClient.on('connect', () => {
            console.log(`service ${ that.getServiceName() } mqtt connected`);
            that.mqttClient.publish(`wechat/services/${ that.serviceCode }`, JSON.stringify({
                msg: `Hello mqtt from ${ that.getServiceName() }`
            }));
            that.subscribeTopics(that.getTopics());
        });
        this.mqttClient.on('message', this.processTopic());
    }

    public static simpleMessageProcessorTest(message: BaseWechatMessage, keywords: string[]) {
        if (typeof message.content !== 'string') {
            return false;
        }
        if (message.groupId !== null && `@${config.get("wechat_server.name")} `.indexOf(message.content) < 0) {
            return false;
        }
        let content = message.content.replace(`@${config.get("wechat_server.name")} `, '').trim();
        for (let keyword of keywords) {
            if (content === keyword) {
                return true;
            }
        }
        return false;
    }

    subscribeTopics(topicList: string[]) {
        for (let topic of topicList) {
            this.mqttClient.subscribe(topic);
        }
    }

    protected sendBoardcast(sendGroups: string[], sendUsers: string[], content: string) {
        for (let target of sendGroups) {
            let resMsg: IWechatMqttSendMessage = {
                service: this.serviceCode,
                groupId: target,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            this.mqttClient.publish(`wechat/${config.get("wechat_server.id")}/send/group/${ target }`, JSON.stringify(resMsg));
        }
        for (let user of sendUsers) {
            let resMsg: IWechatMqttSendMessage = {
                service: this.serviceCode,
                groupId: user,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            this.mqttClient.publish(`wechat/${config.get("wechat_server.id")}/send/user/${ user }`, JSON.stringify(resMsg));
        }
    }

    private processTopic() {
        let that = this;
        return async (topic: string, wechatMessage: any) => {
            let reqMessage = JSON.parse(wechatMessage.toString()) as BaseWechatMessage;
            console.log(`topic ${topic} receved message. processing ${JSON.stringify(reqMessage)}`)
            if (!that.canProcess(reqMessage)) {
                return;
            }
            let msg = await that.replyMessage(reqMessage);
            if (msg === null) {
                return;
            }
            // todo 这里需要改改，改成指定的类型
            let resMsg: IWechatMqttSendMessage = {
                service: that.serviceCode,
                groupId: reqMessage.groupId,
                targetId: reqMessage.senderId,
                msgType: WechatMessageTypeEnum.TEXT,
                content: msg
            }
            that.sendMessage(resMsg);
        }
    }

    protected sendMessage(message: IWechatMqttSendMessage) {
        if (message.groupId !== null) {
            this.mqttClient.publish(`wechat/${config.get("wechat_server.id")}/send/group/${message.groupId}`, JSON.stringify(message));
            return;
        }
        this.mqttClient.publish(`wechat/${config.get("wechat_server.id")}/send/user/${message.targetId}`, JSON.stringify(message));
    }

    protected sendReplyMessage(recevedMessage: BaseWechatMessage, msg: string) {
        let resMsg: IWechatMqttSendMessage = {
            service: this.serviceCode,
            groupId: recevedMessage.groupId,
            targetId: recevedMessage.senderId,
            msgType: WechatMessageTypeEnum.TEXT,
            content: msg
        }
        this.sendMessage(resMsg);
    }
}