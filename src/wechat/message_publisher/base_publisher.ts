import BaseWechatMessage, {ISystemMessage} from "#wechat/base_wechat";
import {BaseWechatClient} from "#wechat/clients/wechat_client";
import {IPublisher} from "#wechat/message_publisher/publish_interface";
import {ManagerConfigType} from "#wechat/message_publisher/manager";

/**
 * 消息处理与转发器
 * 该类主要实现通过某个渠道接收、广播消息到外部服务
 *
 * 例如：服务端接收消息后向 `mqtt` 服务器推送某些消息
 */
export abstract class BaseMessagePublisher implements IPublisher {
    protected client: BaseWechatClient;
    protected config: ManagerConfigType;

    constructor(config: ManagerConfigType, client: BaseWechatClient) {
        this.config = config;
        this.client = client;
    }

    public update(config?: ManagerConfigType, client?: BaseWechatClient) {
        if (config) {
            this.config = config;
        }
        if (client) {
            this.client = client;
        }
    }

    public abstract init(callback?: Function): Promise<void>;

    public abstract forward(msg: BaseWechatMessage): Promise<void>;

    public abstract process(msg: ISystemMessage): Promise<any>;

    public abstract send(msg: ISystemMessage): Promise<void>;
}
