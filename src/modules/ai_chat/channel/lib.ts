import { ISysCallResponse, SysCallStatusEnum } from "../../../system/sys_call";
import BaseWechatMessage, { BaseConfigService, ISetConfig } from "../../../wechat/base_wechat";
import { ChatGptService } from "./chatgpt/service";

export class AiChatConfigDecorator extends BaseConfigService {
    public modelType = ChatGptService.modelType;
    protected readonly wrapper: BaseConfigService;
    constructor(wrapper: BaseConfigService) {
        super(wrapper);
        this.wrapper = wrapper;
    }
    getConfig<T>(): Promise<ISysCallResponse<T>> {
        throw new Error("Method not implemented.");
    }
    async getTargetConfig<T>(message: BaseWechatMessage): Promise<ISysCallResponse<T>> {
        let resp = await this.wrapper.getTargetConfig<T>(message);
        if (resp.status === SysCallStatusEnum.SUCCESS) {
            resp.body = (resp.body as any)[this.modelType];
        }
        return resp;
    }
    saveServiceConfig<T>(body: ISetConfig): Promise<ISysCallResponse<T>> {
        // TODO: 实现保存配置
        // let resp = 
        throw new Error("Method not implemented.");
    }
}