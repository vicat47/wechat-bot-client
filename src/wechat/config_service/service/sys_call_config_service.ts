import {BaseConfigService} from "#wechat/config_service/base_config";
import {generateRequestId, ISysCallResponse} from "#system/sys_call";
import BaseWechatMessage, {ISetConfig} from "#wechat/base_wechat";

export class SysCallConfigService extends BaseConfigService {
    public async getConfig<T>(): Promise<ISysCallResponse<T>> {
        return await this.service.systemCall({
            headers: {moduleId: this.service.serviceId},
            requestId: generateRequestId(this.service.clientId, this.service.serviceId),
            router: "getConfig",
        }) as ISysCallResponse<T>;
    }

    public async getTargetConfig<T>(message: BaseWechatMessage): Promise<ISysCallResponse<T>> {
        return await this.service.systemCall({
            headers: {moduleId: this.service.serviceId},
            body: {
                userId: message.senderId,
                groupId: message.groupId === null ? undefined : message.groupId,
            },
            requestId: generateRequestId(this.service.clientId, this.service.serviceId),
            router: "getConfig"
        }) as ISysCallResponse<T>;
    }

    public async saveServiceConfig<T>(body: ISetConfig): Promise<ISysCallResponse<T>> {
        return await this.service.systemCall({
            body: body,
            headers: {
                moduleId: this.service.serviceId,
            },
            requestId: generateRequestId(this.service.clientId, this.service.serviceId),
            router: "saveConfig",
        }) as ISysCallResponse<T>;
    }
}
