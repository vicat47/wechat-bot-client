import config from "config";
import {AxiosInstance} from "axios";

import {IWechatConfig} from "#/config";
import {BaseWechatClient} from "#wechat/clients/wechat_client";
import {WechatXMLMessage} from "#wechat/xml_message";
import {IBaseContentMessage, IGroupUserContent, IGroupUserNickContent, IPersonalInfo, IUserContent} from "#wechat/data";
import BaseWechatMessage, {WechatMessageTypeEnum} from "#wechat/base_wechat";
import httpWechatServiceFactory from "#wechat/request";

import WeChatMessage, {RecvMsg, WechatMessageType, XMLMessageContent} from "./wechat_laozhang";
import { IConnectionManager } from "#/wechat/connection/connection_manager";
import WebSocketConnectionManager from "#/wechat/connection/impl/websocket_connection";

class WechatLaoZhangClient extends BaseWechatClient {
    private readonly websocketUrl: string;
    private readonly service: AxiosInstance;
    private readonly conn: IConnectionManager;

    constructor(config: IWechatConfig) {
        super(config);
        this.websocketUrl = config.webSocketUrl;
        this.service = httpWechatServiceFactory(config)();
        this.conn = new WebSocketConnectionManager();
    }

    async connect(): Promise<any> {
        // 取消因手动关闭导致的重连限制（由 connection manager 管理）
        // 绑定事件（重复绑定会被 connection manager 内部去重/覆盖请注意）
        this.conn.on("open", this.onOpen());
        // message 可能是 Buffer / string
        this.conn.on("message", async (data: any) => {
            // 把数据转发给原有的 onMessage 处理器
            await this.onMessage()(data);
        });
        this.conn.on("close", this.onClose());
        this.conn.on("error", this.onError());

        // 等待底层连接建立，同时保持 super.connect() 行为
        return await Promise.all([
            super.connect(),
            this.conn.connect(this.websocketUrl)
        ]);
    }

    async close(): Promise<void> {
        // 交由 connection manager 关闭并视为手动关闭（停止自动重连）
        await this.conn.close(true);
    }

    private onOpen(): () => void {
        return () => {
            console.log(`websocket ${this.id} 已连接`);
            // 通知管理员（只在第一次连接或重连成功时发送）
            (async () => {
                try {
                    for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
                        await this.sendTxtMsg(`wxid: ${this.id} 服务已启动，已连接`, adminUser);
                    }
                } catch (e) {
                    console.error("通知管理员失败：", e);
                }
            })();
        };
    }

    private onError(): (err: any) => void {
        return (err) => {
            console.error("websocket error:", err);
        };
    }

    async getMe(): Promise<IPersonalInfo> {
        let msg = WeChatMessage.personal_msg();
        let sendMsg = {
            para: msg
        }
        let res = await this.service.post("/api/get_personal_info", JSON.stringify(sendMsg));
        console.debug(res);
        let json = JSON.parse(res.data.content);
        return {
            code: json.wx_code,
            headImage: json.wx_head_image,
            id: json.wx_id,
            name: json.wx_name,
        };
    }

    async getUserList(): Promise<IBaseContentMessage<IUserContent>> {
        let msg = WeChatMessage.user_list();
        let sendMsg = {
            para: msg
        }
        const res = await this.service.post<IBaseContentMessage<IUserContent>>("/api/getcontactlist", JSON.stringify(sendMsg));
        console.debug(res);
        return res.data;
    }

    async getGroupUserList(): Promise<IBaseContentMessage<IGroupUserContent>> {
        let msg = WeChatMessage.group_user_list();
        let sendMsg = {
            para: msg
        }
        const res = await this.service.post<IBaseContentMessage<IGroupUserContent>>("/api/get_charroom_member_list", JSON.stringify(sendMsg));
        console.debug(res);
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
        console.debug(res);
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

    protected onMessage(): (data: any) => Promise<void> {
        let that = this;
        return async (data) => {
            // data 可能是 Buffer/string，根据原来代码处理
            const j = JSON.parse(data.toString());
            const type = j.type;
            switch (type) {
                case WechatMessageType.RECV_TXT_MSG:
                    console.log(data.toString());
                    super.processReceivedMessage(that.toWechatMessage(new RecvMsg<string>(j)));
                    break;
                case WechatMessageType.RECV_PIC_MSG:
                case WechatMessageType.CHAOS_TYPE:
                    console.log(data.toString());
                    try {
                        let c = j.content as XMLMessageContent;
                        let xmlMessage = new WechatXMLMessage(c.content);
                        j.content.content = xmlMessage;
                        super.processReceivedMessage(that.toWechatMessage(new RecvMsg<XMLMessageContent>(j)));
                    } catch (e) {
                        console.error(`XML 消息转换失败。。。\n${j}`);
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
