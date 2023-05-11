import { IWebServiceConfig, WechatRoomMsg } from "../../config";

export interface IStableDiffusionConfig extends WechatRoomMsg {
    stableService: IWebServiceConfig;
    imageService: IWebServiceConfig;
}