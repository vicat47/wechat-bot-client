import BaseWechatMessage, {ISystemMessage} from "#wechat/base_wechat";

export interface IPublisher {
    init(callback?: Function): Promise<void>;

    /**
     * 转发从服务端接受到的消息
     * @param msg
     */
    forward(msg: BaseWechatMessage): Promise<void>;

    /**
     * 发送消息
     * @param msg 要发送的消息
     */
    send(msg: ISystemMessage): Promise<void>;

    /**
     * 处理消息
     * @param msg
     */
    process(msg: ISystemMessage): Promise<any>;
}
