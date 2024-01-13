import {HttpType} from "#wechat/request";

enum WeChatMessageType {
    PERSONAL_INFO = 1,
    TXT_MSG = 2,
}

interface IWeChatMessageType {
    typeNum: WeChatMessageType
    typeMethod: HttpType
    typeBody: any
}

const IWeChatMessage = {
    [WeChatMessageType.PERSONAL_INFO]: {
        typeNum : WeChatMessageType.PERSONAL_INFO,
        typeMethod: HttpType.GET,
        typeBody: {}
    },
    [WeChatMessageType.TXT_MSG]: {
        typeNum : WeChatMessageType.PERSONAL_INFO,
        typeMethod: HttpType.POST,
        typeBody: {
            "wxid": "example",
            "msg": "example"
        }
    }
}



class WeChatMessage {

    type: IWeChatMessageType;

    constructor(type: WeChatMessageType) {
        this.type = IWeChatMessage[type];
    }

    static personal_msg(): WeChatMessage {
        return new WeChatMessage(WeChatMessageType.PERSONAL_INFO);
    }

    static text_msg(content:string, wxid:string): WeChatMessage {
        let msg = new WeChatMessage(WeChatMessageType.TXT_MSG);
        msg.type.typeBody = {
            "wxid": content,
            "msg": wxid
        }
        return msg;
    }

}

export default WeChatMessage;
