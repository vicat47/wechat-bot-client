import {WechatIdTypeEnum} from "#wechat/base_wechat";

export const chatroomRegex = new RegExp(/^\d{4,15}@chatroom$/);
export const subscriptionRegex = new RegExp(/^gh_\w{4,15}$/);

export function getIdType(id: string) {
    if (chatroomRegex.test(id)) {
        // 群
        return WechatIdTypeEnum.GROUP_ID;
    } else if (subscriptionRegex.test(id)) {
        // 公众号
        return WechatIdTypeEnum.SUBSCRIPTION_ID;
    } else {
        // 人
        return WechatIdTypeEnum.USER_ID;
    }
}

export function isUser(id: string) {
    return getIdType(id) === WechatIdTypeEnum.USER_ID;
}

export function isGroup(id: string) {
    return getIdType(id) === WechatIdTypeEnum.GROUP_ID;
}
