import {IWechatRoomServiceConfig, IWechatWebRequestServiceConfig} from "#/config";

export interface IStableDiffusionConfig extends IWechatRoomServiceConfig {
    stableService: IWechatWebRequestServiceConfig;
    imageService: IWechatWebRequestServiceConfig;
}
