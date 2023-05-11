import { IWebServiceConfig, WechatRoomMsg } from "../../config";

export interface IChatGPTConfig extends WechatRoomMsg, IWebServiceConfig {
    prompt?: string
    module: string
    memory: number
}