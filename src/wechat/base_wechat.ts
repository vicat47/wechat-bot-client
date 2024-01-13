import {WechatXMLMessage} from "./xml_message";
import {ISysCallRequest, ISysCallResponse} from "#system/sys_call";

export enum WechatIdTypeEnum {
    GROUP_ID,
    USER_ID,
    SUBSCRIPTION_ID,
}

export enum WechatMessageTypeEnum {
    TEXT = 1,
    PICTURE = 2,
    FILE = 3,
    XML = 4,
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

export enum SystemMessageTypeEnum {
    /**
     * See {@link IWechatSendMessage}
     */
    WECHAT_SEND_MESSAGE = 'wechat_send',
    /**
     * See {@link ISysCallRequest}
     */
    SYSCALL_REQUEST_MESSAGE = 'syscall_request',
    /**
     * See {@link ISysCallResponse}
     */
    SYSCALL_RESPONSE_MESSAGE = 'syscall_response',
}

export interface ISystemMessage {
    type: SystemMessageTypeEnum,
    data: IWechatSendMessage | ISysCallRequest | ISysCallResponse<any>
}

export interface IWechatSendMessage {
    id: string
    service: string
    groupId: string | null
    targetId: string | null
    content: string
    msgType: WechatMessageTypeEnum
}

export interface ISetConfig {
    userId?: string,
    groupId?: string,
    configs: { [k: string]: any }
}
