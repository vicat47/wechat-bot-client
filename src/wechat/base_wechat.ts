import { AxiosInstance } from "axios"
import * as mqtt from 'mqtt';
import { WechatXMLMessage } from "./xml_message"
import config from "config";
import { ISysCallRequest, ISysCallResponse, SysCallStatusEnum, generateRequestId, savePromiseForRequestId } from "../system/sys_call";
import { IWechatConfig, IWechatService } from "../config";
import { getClientName } from "../system/sys_config";
import { callSysMethod } from "../system/api";
import { globalClient } from "../app";

export const chatroomRegex = new RegExp(/^\d{4,15}@chatroom$/);
export const subscriptionRegex = new RegExp(/^gh_\w{4,15}$/);

export enum WechatMessageTypeEnum {
    TEXT = 1,
    PICTURE = 2,
    FILE = 3,
    XML = 4
}

export enum WechatClientTypeEnum {
    LAOZHANG = 0,
    COM = 1,
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
    canProcess(message: BaseWechatMessage): Promise<boolean>;
    replyMessage(message: BaseWechatMessage): Promise<string | null>;
    getServiceName(): string;
    getUseage(): string;
}

export abstract class BaseWechatMessageProcessService implements IWechatMessageProcessor {
    private mqttClient: mqtt.MqttClient;
    serviceId: string;
    protected clientId: string;
    abstract config: any;
    abstract service?: AxiosInstance;
    abstract get serviceCode(): string;
    abstract canProcess(message: BaseWechatMessage): Promise<boolean>;
    abstract replyMessage(message: BaseWechatMessage): Promise<string | null>;
    abstract getServiceName(): string;
    abstract getUseage(): string;
    triggerBoardcast?(): Promise<string | null>
    constructor(config: IWechatConfig, options: IWechatService) {
        this.clientId = config.id;
        this.serviceId = options.id;
        this.mqttClient = mqtt.connect(config.mqttUrl);
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

    getTopics(): string[] {
        let topicList: string[] = [];
        let roomIds = this.config.attachedRoomId?.map((roomId: string) => `wechat/${ this.clientId }/receve/groups/${ roomId }/#`);
        if (roomIds != undefined) {
            topicList = topicList.concat(roomIds);
        }
        if (this.config.singleContactWhiteList === undefined) {
            for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
                topicList.push(`wechat/${ this.clientId }/receve/users/${ adminUser }/#`);
            }
            return topicList;
        }
        let userIds = this.config.singleContactWhiteList.map((userId: string) => `wechat/${ this.clientId }/receve/users/${ userId }/#`);
        if (userIds != undefined) {
            topicList = topicList.concat(userIds);
        }
        return topicList;
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
            this.mqttClient.publish(`wechat/${this.clientId}/send/group/${ target }`, JSON.stringify(resMsg));
        }
        for (let user of sendUsers) {
            let resMsg: IWechatMqttSendMessage = {
                service: this.serviceCode,
                groupId: user,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            this.mqttClient.publish(`wechat/${this.clientId}/send/user/${ user }`, JSON.stringify(resMsg));
        }
    }

    private processTopic() {
        let that = this;
        return async (topic: string, mqttMessage: any) => {
            // TODO: 校验参数
            let dataJson = JSON.parse(mqttMessage.toString());
            let reqMessage = dataJson as BaseWechatMessage;
            console.log(`topic ${topic} receved message. processing ${JSON.stringify(reqMessage)}`)
            if (!await that.canProcess(reqMessage)) {
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
            this.mqttClient.publish(`wechat/${this.clientId}/send/group/${message.groupId}`, JSON.stringify(message));
            return;
        }
        this.mqttClient.publish(`wechat/${this.clientId}/send/user/${message.targetId}`, JSON.stringify(message));
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

    /**
     * 发起系统调用方法
     * @param request 请求参数
     * @returns 返回执行结果
     */
    public systemCall(request: ISysCallRequest): Promise<ISysCallResponse> {
        return new Promise((resolve, reject) => {
            const requestId = generateRequestId(`${this.clientId}`);
            request.requestId = requestId;
            savePromiseForRequestId(requestId, { resolve, reject });
            this.mqttClient.publish(`wechat/${this.clientId}/send/sys`, JSON.stringify(request));
        });
    }
}

export abstract class LocalWechatMessageProcessService extends BaseWechatMessageProcessService {
    constructor(config: IWechatConfig, options: IWechatService) {
        super(config, options);
    }

    /**
     * 发起系统调用方法
     * @param request 请求参数
     * @returns 返回执行结果
     */
    public async systemCall(request: ISysCallRequest): Promise<ISysCallResponse> {
        return await callSysMethod(globalClient[this.clientId], request).then((data) => {
            let resp: ISysCallResponse = {
                body: data,
                params: undefined,
                headers: undefined,
                requestId: request.requestId,
                status: SysCallStatusEnum.SUCCESS,
            }
            return resp;
        }).catch((e: Error) => {
            let resp: ISysCallResponse = {
                body: e.message,
                params: undefined,
                headers: undefined,
                requestId: request.requestId,
                status: SysCallStatusEnum.ERROR,
            }
            return resp;
        });
    }
}