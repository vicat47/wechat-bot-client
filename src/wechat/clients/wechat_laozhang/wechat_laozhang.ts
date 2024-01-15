import {snowflake} from "#/app";

const roomIdSplitter = "@"

export enum WechatMessageType {
    HEART_BEAT = 5005,
    RECV_TXT_MSG = 1,
    RECV_PIC_MSG = 3,
    USER_LIST = 5000,
    GET_USER_LIST_SUCCSESS = 5001,
    GET_USER_LIST_FAIL = 5002,
    TXT_MSG = 555,
    PIC_MSG = 500,
    AT_MSG = 550,
    CHATROOM_MEMBER = 5010,
    CHATROOM_MEMBER_NICK = 5020,
    PERSONAL_INFO = 6500,
    DEBUG_SWITCH = 6000,
    PERSONAL_DETAIL = 6550,
    DESTROY_ALL = 9999,
    NEW_FRIEND_REQUEST = 37,//微信好友请求消息
    AGREE_TO_FRIEND_REQUEST = 10000,//同意微信好友请求消息
    ATTATCH_FILE = 5003,
    CHAOS_TYPE = 49, // 啥都有，包括公众号捏。
}

class WeChatMessage {
    id: string;
    type: WechatMessageType;
    wxid: string = 'null';
    roomid: string = 'null';
    content: string = 'null';
    nickname: string = 'null';
    ext: string = 'null';

    constructor(type:number) {
        this.id = this.getId();
        this.type = type;
    }

    getId(): string {
        return snowflake.generate().toString();
    }

    toJSONString(): string {
        return JSON.stringify(this);
    }

    static text_msg(content:string, wxid:string): WeChatMessage {
        let msg = new WeChatMessage(WechatMessageType.TXT_MSG);
        msg.content = content;
        msg.wxid = wxid;
        return msg;
    }

    static personal_msg(): WeChatMessage {
        return new WeChatMessage(WechatMessageType.PERSONAL_INFO);
    }

    static user_list(): WeChatMessage {
        return new WeChatMessage(WechatMessageType.USER_LIST);
    }

    static group_user_list(): WeChatMessage {
        return new WeChatMessage(WechatMessageType.CHATROOM_MEMBER);
    }

    static group_user_nick(groupId: string, userId: string): WeChatMessage {
        const msg = new WeChatMessage(WechatMessageType.CHATROOM_MEMBER_NICK);
        msg.roomid = groupId;
        msg.wxid = userId;
        return msg;
    }
}

type WechatMsgContentType = string | any[] | XMLMessageContent
export class RecvMsg<T extends WechatMsgContentType> {
    /**
     * 实际的消息内容
     */
    content: T
    /**
     * 消息接收到的 ID，是时间字符串
     */
    id: string
    /**
     * 群内发送者的 wxid
     * 如果是单聊，则为空
     */
    id1?: string
    /**
     * 可能是自己的 id
     */
    id2?: string
    id3?: string
    srvid?: number
    /**
     * 接收时间
     */
    time?: string
    /**
     * 消息类型
     */
    type: WechatMessageType
    /**
     * 发送人 ID，若为群聊，则是群 id
     */
    wxid?: string
    /**
     * 消息状态
     */
    status?: string
    constructor(json: any) {
        this.content = json.content
        this.id = json.id
        this.type = json.type
        Object.assign(this, json)
    }
    public isRoomMsg(): boolean {
        if (this.id !== '' && (this.wxid?.indexOf(roomIdSplitter) ?? 0) > 0) {
            return true;
        }
        return false;
    }
}

export interface XMLMessageContent {
    content: string
    id1: string
    id2: string
    thumb?: string
    detail?: string
}

export default WeChatMessage;
