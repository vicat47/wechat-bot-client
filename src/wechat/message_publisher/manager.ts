import {BaseMessagePublisher} from "#wechat/message_publisher/base_publisher";
import {IWechatConfig} from "#/config";
import BaseWechatMessage, {ISystemMessage} from "#wechat/base_wechat";
import {BaseWechatClient} from "#wechat/clients/wechat_client";
import {BasePolicy, policyFactory, publisherPolicy} from "#wechat/message_publisher/publish_policy";
import {IPublisher} from "#wechat/message_publisher/publish_interface";
import {publisherFactory, publisherType} from "#wechat/message_publisher/publisher/factory";

export class MessagePublisherManager implements IPublisher {
    private readonly publisherList: BaseMessagePublisher[];
    private readonly policy: BasePolicy;
    private readonly client: BaseWechatClient;

    public constructor(types: publisherType[], config: IWechatConfig, client: BaseWechatClient, policy: publisherPolicy = "all") {
        this.client = client;
        this.publisherList = [];
        for (let type of new Set(types)) {
            this.publisherList.push(publisherFactory(type, config, this.client));
        }
        this.policy = policyFactory(this.publisherList, policy);
    }

    async init(callback?: Function): Promise<void> {
        await this.policy.init(callback);
    }

    async forward(msg: BaseWechatMessage): Promise<void> {
        await this.policy.forward(msg);
    }

    async process(msg: ISystemMessage): Promise<any> {
        await this.policy.process(msg);
    }

    async send(msg: ISystemMessage): Promise<void> {
        await this.policy.send(msg);
    }


}
