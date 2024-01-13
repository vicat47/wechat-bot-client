import WebSocket from "ws";
import {MqttClient} from "mqtt";
import {AxiosInstance} from "axios";

import httpWechatServiceFactory, {HttpType} from "#wechat/request";
import {BaseWechatClient} from "#wechat/clients/wechat_client";
import base_wechat from "#wechat/base_wechat";
import {IBaseContentMessage, IGroupUserContent, IGroupUserNickContent, IUserContent} from "#wechat/data";

import {IWechatConfig} from "#/config";
import WeChatMessage from "./wechat_com";

class WechatComClient extends BaseWechatClient {
    get mqttClient(): MqttClient {
        throw new Error("Method not implemented.");
    }

    async connect(): Promise<void> {
        await super.connect();
        throw new Error("Method not implemented.");
    }
    toWechatMessage(message: any): base_wechat {
        throw new Error("Method not implemented.");
    }
    url: string;
    websocket: WebSocket;
    private readonly service: AxiosInstance;
    constructor(config: IWechatConfig) {
        super(config);
        this.service = httpWechatServiceFactory(config)();
        this.url = config.webSocketUrl;
        this.websocket = new WebSocket(this.url);
    }

    async sendWeChatMessage(message: WeChatMessage): Promise<any> {
        switch (message.type.typeMethod) {
            case HttpType.GET:
                return this.service.get(`/api?type=${message.type.typeNum}`);
            case HttpType.POST:
                return this.service.post(`/api?type=${message.type.typeNum}`, JSON.stringify(message.type.typeBody));
            default:
                return Promise.reject();
        }
    }
    async getMe(): Promise<any> {
        let msg = WeChatMessage.personal_msg();
        let res = await this.sendWeChatMessage(msg);
        console.log(res);
        return res;
    }
    async sendTxtMsg(content: string, target: string): Promise<any> {
        let msg = WeChatMessage.text_msg(content, target);
        let res = await this.sendWeChatMessage(msg);
        console.log(res);
        return res;
    }
    getUserList(): Promise<IBaseContentMessage<IUserContent>> {
        throw new Error("Method not implemented.");
    }
    getGroupUserList(): Promise<IBaseContentMessage<IGroupUserContent>> {
        throw new Error("Method not implemented.");
    }
    getGroupUserNick(groupId: string, userId: string): Promise<IBaseContentMessage<IGroupUserNickContent>> {
        throw new Error("Method not implemented.");
    }
    onClose(): void {
        throw new Error("Method not implemented.");
    }
    onMessage(): (data: any) => Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export default WechatComClient;
