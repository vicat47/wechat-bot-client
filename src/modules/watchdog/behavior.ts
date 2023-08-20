import BaseWechatMessage, { IWechatMqttSendMessage, WechatMessageTypeEnum, isGroup, isUser } from "../../wechat/base_wechat";
import { IWatchdogConfig, behavior } from "./config";

export function behaviorFactory() {
    return function(behaviorType: behavior, config: IWatchdogConfig, context: IBaseBehaviorContext): BaseBehavior | undefined {
        switch(behaviorType) {
            case "CALLMETHOD": return new CallMethodBehavoir(config, context);
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
    abstract execute(message: BaseWechatMessage): IWechatMqttSendMessage[] | undefined;
}

class CallMethodBehavoir extends BaseBehavior {
    execute(message: BaseWechatMessage): IWechatMqttSendMessage[] | undefined {
        if (this.config.method === undefined) {
            return undefined;
        }
        throw new Error("Method not implemented.");
    }
}

class ForwardBehavior extends BaseBehavior {
    execute(message: BaseWechatMessage): IWechatMqttSendMessage[] | undefined {
        let sendMessages: IWechatMqttSendMessage[] = []
        if (typeof message.content !== "string") {
            return undefined;
        }
        let content = message.content;
        this.config.forwardTargets?.forEach(target => {
            sendMessages.push({
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
    execute(message: BaseWechatMessage): IWechatMqttSendMessage[] | undefined {
        throw new Error("Method not implemented.");
    }
}