import {BaseWechatMessageProcessService} from "#wechat/message_processor/base_processor";
import {ISysCallResponse} from "#system/sys_call";
import BaseWechatMessage, {ISetConfig} from "#wechat/base_wechat";

export abstract class BaseConfigService {
    protected readonly service: BaseWechatMessageProcessService;

    constructor(service: BaseWechatMessageProcessService | BaseConfigService) {
        if (service instanceof BaseConfigService) {
            this.service = service.service;
        } else {
            this.service = service;
        }
    }

    abstract getConfig<T>(): Promise<ISysCallResponse<T>>;

    abstract getTargetConfig<T>(message: BaseWechatMessage): Promise<ISysCallResponse<T>>;

    abstract saveServiceConfig<T>(body: ISetConfig): Promise<ISysCallResponse<T>>;
}
