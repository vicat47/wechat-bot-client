import BaseWechatMessage, {IWechatSendMessage, WechatMessageTypeEnum} from "#wechat/base_wechat";

import {behavior, IWatchdogConfig} from "./config";
import {snowflake} from "#/app";
import {isGroup, isUser} from "#wechat/util";

export function behaviorFactory() {
    return function(behaviorType: behavior, config: IWatchdogConfig, context: IBaseBehaviorContext): BaseBehavior | undefined {
        switch(behaviorType) {
            case "CALLMETHOD":
                return new CallMethodBehavior(config, context);
            case "FORWARD": return new ForwardBehavior(config, context);
            case "RECORD": return new RecordBehavior(config, context);
        }
        return undefined;
    }
}

export interface IBaseBehaviorContext {
    serviceCode: string;
}

abstract class BaseBehavior {
    protected readonly config: IWatchdogConfig;
    protected readonly context: IBaseBehaviorContext;
    constructor(config: IWatchdogConfig, context: IBaseBehaviorContext) {
        this.config = config;
        this.context = context;
    }

    abstract execute(message: BaseWechatMessage): IWechatSendMessage[] | undefined;
}

class CallMethodBehavior extends BaseBehavior {
    execute(message: BaseWechatMessage): IWechatSendMessage[] | undefined {
        if (this.config.method === undefined) {
            return undefined;
        }
        throw new Error("Method not implemented.");
    }
}

class ForwardBehavior extends BaseBehavior {
    execute(message: BaseWechatMessage): IWechatSendMessage[] | undefined {
        let sendMessages: IWechatSendMessage[] = []
        if (typeof message.content !== "string") {
            return undefined;
        }
        let content = message.content;
        this.config.forwardTargets?.forEach(target => {
            sendMessages.push({
                id: snowflake.generate().toString(),
                service: this.context.serviceCode,
                groupId: isGroup(target) ? target : null,
                targetId: isUser(target) ? target : null,
                msgType: WechatMessageTypeEnum.TEXT,
                content
            });
        });
        return sendMessages;
    }
}

class RecordBehavior extends BaseBehavior {
    execute(message: BaseWechatMessage): IWechatSendMessage[] | undefined {
        throw new Error("Method not implemented.");
    }
}
