import {BaseMessagePublisher} from "#wechat/message_publisher/base_publisher";
import BaseWechatMessage, {ISystemMessage} from "#wechat/base_wechat";

export class DisabledPublisher extends BaseMessagePublisher {
    async init(callback?: Function): Promise<void> {
        callback?.();
    }

    async forward(msg: BaseWechatMessage): Promise<void> {
        // ignored
    }

    async process(msg: ISystemMessage): Promise<any> {
        // ignored
    }

    async send(msg: ISystemMessage): Promise<void> {
        // ignored
    }

}
