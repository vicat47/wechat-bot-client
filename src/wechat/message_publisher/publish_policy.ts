import {BaseMessagePublisher} from "#wechat/message_publisher/base_publisher";
import BaseWechatMessage, {ISystemMessage} from "#wechat/base_wechat";
import {IPublisher} from "#wechat/message_publisher/publish_interface";

export type publisherPolicy = 'all' | 'first';

export function policyFactory(publisherList: BaseMessagePublisher[], policy: publisherPolicy): BasePolicy {
    switch (policy) {
        case "all":
            return new AllPolicy(publisherList);
        case "first":
            return new FirstPolicy(publisherList);
    }
}

export abstract class BasePolicy implements IPublisher {
    protected publisherList: BaseMessagePublisher[];

    constructor(publisherList: BaseMessagePublisher[]) {
        this.publisherList = publisherList;
    }

    abstract init(callback?: Function): Promise<void>;

    abstract forward(msg: BaseWechatMessage): Promise<void>;

    abstract process(msg: ISystemMessage): Promise<any>;

    abstract send(msg: ISystemMessage): Promise<void>;
}

class AllPolicy extends BasePolicy {
    async init(callback?: Function): Promise<void> {
        let pList: Promise<void>[] = []
        for (const baseMessagePublisher of this.publisherList) {
            pList.push(baseMessagePublisher.init(callback));
        }
        await Promise.all(pList);
    }

    async forward(msg: BaseWechatMessage): Promise<void> {
        let pList: Promise<void>[] = []
        for (const baseMessagePublisher of this.publisherList) {
            pList.push(baseMessagePublisher.forward(msg));
        }
        await Promise.all(pList);
    }

    async process(msg: ISystemMessage): Promise<any> {
        let pList: Promise<void>[] = []
        for (const baseMessagePublisher of this.publisherList) {
            pList.push(baseMessagePublisher.process(msg));
        }
        await Promise.all(pList);
    }

    async send(msg: ISystemMessage): Promise<void> {
        let pList: Promise<void>[] = []
        for (const baseMessagePublisher of this.publisherList) {
            pList.push(baseMessagePublisher.send(msg));
        }
        await Promise.all(pList);
    }

}

class FirstPolicy extends BasePolicy {

    async init(callback?: Function): Promise<void> {
        let pList: Promise<void>[] = []
        for (const baseMessagePublisher of this.publisherList) {
            pList.push(baseMessagePublisher.init(callback));
        }
        await Promise.all(pList);
    }

    async forward(msg: BaseWechatMessage): Promise<void> {
        await this.publisherList.pop()?.forward(msg);
    }

    async process(msg: ISystemMessage): Promise<any> {
        await this.publisherList.pop()?.process(msg);
    }

    async send(msg: ISystemMessage): Promise<void> {
        await this.publisherList.pop()?.send(msg);
    }

}
