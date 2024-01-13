import {IWechatRoomServiceConfig, IWechatWebRequestServiceConfig} from "#/config";

export interface ISystemConfig extends IWechatRoomServiceConfig, IWechatWebRequestServiceConfig {
    prompt?: string
    module: string
    memory: number
}
