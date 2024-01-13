import {BaseConfigService} from "#wechat/config_service/base_config";
import {generateRequestId, ISysCallResponse, SysCallStatusEnum} from "#system/sys_call";
import config from "config";
import BaseWechatMessage, {ISetConfig} from "#wechat/base_wechat";

/**
 * 通过本地文件获取配置项的逻辑
 * 从 toml 文件中读取
 */
export class LocalConfigService extends BaseConfigService {
    public async getTargetConfig<T>(message: BaseWechatMessage): Promise<ISysCallResponse<T>> {
        return {
            headers: {moduleId: this.service.serviceId},
            body: config.get(`modules.${this.service.serviceCode}.${this.service.serviceId}`),
            params: undefined,
            requestId: generateRequestId(this.service.clientId, this.service.serviceId),
            status: SysCallStatusEnum.SUCCESS,
        }
    }

    public async getConfig<T>(): Promise<ISysCallResponse<T>> {
        return {
            headers: {moduleId: this.service.serviceId},
            body: config.get(`modules.${this.service.serviceCode}.${this.service.serviceId}`),
            params: undefined,
            requestId: generateRequestId(this.service.clientId, this.service.serviceId),
            status: SysCallStatusEnum.SUCCESS,
        }
    }

    public async saveServiceConfig<T>(body: ISetConfig): Promise<ISysCallResponse<T>> {
        return {
            headers: {moduleId: this.service.serviceId},
            body: 0 as T,
            params: undefined,
            requestId: generateRequestId(this.service.clientId, this.service.serviceId),
            status: SysCallStatusEnum.SUCCESS,
        }
    }
}
