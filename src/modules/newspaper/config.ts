import {IWechatBroadcastServiceConfig, IWechatRoomServiceConfig, IWechatWebRequestServiceConfig} from "#/config";

export interface IMorningNewspaperConfig extends IWechatRoomServiceConfig, IWechatBroadcastServiceConfig, IWechatWebRequestServiceConfig {
    api: string
    localFileName: string
}
