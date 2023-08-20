import WebSocket from "ws";
import WeChatMessage, { RecvMsg, WechatMessageType, XMLMessageContent } from "./wechat_laozhang";
import BaseWechatMessage, { WechatMessageTypeEnum } from "../base_wechat";
import service from "../request";
import { IWechatConfig } from "../../config";
import * as mqtt from "mqtt";
import { BaseWechatClient } from "../wechat_client";
import { WechatXMLMessage } from "../xml_message";
import config from "config";
import { IBaseContentMessage, IGroupUserContent, IGroupUserNickContent, IUserContent } from "../data";
import httpWechatServiceFactory from "../request";
import { AxiosInstance } from "axios";

class WechatLaoZhangClient extends BaseWechatClient {
    private _mqttClient: mqtt.MqttClient | undefined;
    private websocket: WebSocket;
    private readonly service: AxiosInstance;

    constructor(config: IWechatConfig) {
        super(config);
        this.service = httpWechatServiceFactory(config)();
        this.websocket = new WebSocket(this.config.webSocketUrl);
        this.websocket.on("message", this.onMessage());
        this.websocket.on("close", this.onClose());
    }

    get mqttClient(): mqtt.MqttClient {
        if (this._mqttClient === undefined) {
            throw new Error("mqtt client not connected");
        }
        return this._mqttClient;
    }

    set mqttClient(mqttClient: mqtt.MqttClient) {
        this._mqttClient = mqttClient;
    }

    async connect(): Promise<any> {
        let that = this;
        return new Promise<void>((resolve, reject) =>
            that.websocket.on("open", async () => {
                console.log(`websocket ${that.config.id} 已连接`);
                await that.getMe();
                that.mqttClient = mqtt.connect(that.config.mqttUrl);
                console.log(`mqtt client 已连接`);
                that.subscribeMqttMessage();
                for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
                    await that.sendTxtMsg(`wxid: ${that.config.id} 服务已启动，已连接`, adminUser);
                }
                resolve();
            }
        ));
    }

    async getMe(): Promise<any> {
        let msg = WeChatMessage.personal_msg();
        let sendMsg = {
            para: msg
        }
        let res = await this.service.post("/api/get_personal_info", JSON.stringify(sendMsg));
        console.log(res);
        return res;
    }

    async getUserList(): Promise<IBaseContentMessage<IUserContent>> {
        let msg = WeChatMessage.user_list();
        let sendMsg = {
            para: msg
        }
        const res = await this.service.post<IBaseContentMessage<IUserContent>>("/api/getcontactlist", JSON.stringify(sendMsg));
        console.log(res);
        return res.data;
    }

    async getGroupUserList(): Promise<IBaseContentMessage<IGroupUserContent>> {
        let msg = WeChatMessage.group_user_list();
        let sendMsg = {
            para: msg
        }
        const res = await this.service.post<IBaseContentMessage<IGroupUserContent>>("/api/get_charroom_member_list", JSON.stringify(sendMsg));
        console.log(res);
        return res.data;
    }

    /**
     * 获取群成员昵称
     * @returns 返回查询到的昵称
     */
    async getGroupUserNick(groupId: string, userId: string): Promise<IBaseContentMessage<IGroupUserNickContent>> {
        let msg = WeChatMessage.group_user_nick(groupId, userId);
        let sendMsg = {
            para: msg
        }
        const res = await this.service.post<IBaseContentMessage<any>>("/api/getmembernick", JSON.stringify(sendMsg));
        console.log(res);
        if (typeof res.data.content !== 'string') {
            return res.data;
        }
        res.data.content = JSON.parse(res.data.content);
        return res.data;
    }

    async sendTxtMsg(content: string, target: string): Promise<any> {
        let msg = WeChatMessage.text_msg(content, target);
        let sendMsg = {
            para: msg
        }
        let res = await this.service.post("/api/sendtxtmsg", JSON.stringify(sendMsg));
        console.log(JSON.stringify(res.data));
        return res;
    }

    toWechatMessage(message: RecvMsg<any>): BaseWechatMessage {
        let wechatMessageType;
        switch (message.type) {
            case WechatMessageType.RECV_TXT_MSG:
                wechatMessageType = WechatMessageTypeEnum.TEXT; break;
            case WechatMessageType.RECV_PIC_MSG:
                wechatMessageType = WechatMessageTypeEnum.PICTURE; break;
            case WechatMessageType.CHAOS_TYPE:
                wechatMessageType = WechatMessageTypeEnum.XML; break;
            default:
                wechatMessageType = WechatMessageTypeEnum.TEXT; break;
        }
        if (message.isRoomMsg()) {
            return new BaseWechatMessage(message.id, message.wxid ?? null, null, wechatMessageType, message.id1 ?? '', message.content);
        } else if ((wechatMessageType === WechatMessageTypeEnum.XML || wechatMessageType === WechatMessageTypeEnum.PICTURE) && message.content.id1 !== undefined && message.content.id1) {
            // TODO: 区分公众号和其他 xml 内容
            let userId = message.content.id2 === "" ? message.content.id1 : message.content.id2;
            let groupId = message.content.id2 === "" ? null : message.content.id1;
            let xmlJsonContent = message.content.content;
            if (wechatMessageType === WechatMessageTypeEnum.PICTURE) {
                return new BaseWechatMessage(message.id, groupId, null, wechatMessageType, userId, message.content);
            }
            if ("gh_".indexOf(userId) < 0) {
                return new BaseWechatMessage(message.id, groupId, null, wechatMessageType, userId, xmlJsonContent);
            }
            return new BaseWechatMessage(message.id, null, userId, wechatMessageType, userId, xmlJsonContent);
        } else {
            return new BaseWechatMessage(message.id, null, null, wechatMessageType, message.wxid ?? '', message.content);
        }
    }

    onMessage(): (data: WebSocket.RawData) => Promise<void> {
        let that = this;
        return async (data) => {
            const j = JSON.parse(data.toString());
            const type = j.type;
            switch (type) {
                case WechatMessageType.RECV_TXT_MSG:
                    console.log(data.toString());
                    that.publishMqttMessage(that.toWechatMessage(new RecvMsg<string>(j)));
                    break;
                case WechatMessageType.RECV_PIC_MSG:
                case WechatMessageType.CHAOS_TYPE:
                    console.log(data.toString());
                    try {
                        let c = j.content as XMLMessageContent;
                        let xmlMessage = new WechatXMLMessage(c.content);
                        j.content.content = xmlMessage;
                        that.publishMqttMessage(that.toWechatMessage(new RecvMsg<XMLMessageContent>(j)));
                    } catch (e) {
                        console.log('XML 消息转换失败。。。');
                        return;
                    }
                    break;
                default:
                    break;
            }
        }
    }

    onClose(): () => Promise<void> {
        return async () => {
            console.log('disconnected');
        }
    }

}

export default WechatLaoZhangClient;