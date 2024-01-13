import {BaseMessagePublisher} from "#wechat/message_publisher/base_publisher";
import BaseWechatMessage, {ISystemMessage} from "#wechat/base_wechat";

export class LocalPublisher extends BaseMessagePublisher {
    public init(callback?: Function): Promise<void> {
        return Promise.resolve(undefined);
    }

    public forward(msg: BaseWechatMessage): Promise<void> {
        return Promise.resolve(undefined);
    }

    public process(msg: ISystemMessage): Promise<any> {
        return Promise.resolve(undefined);
    }

    send(msg: ISystemMessage): Promise<void> {
        return Promise.resolve(undefined);
    }

}
