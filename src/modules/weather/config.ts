import {IWechatRoomServiceConfig, IWechatWebRequestServiceConfig} from "#/config";

export interface IWeatherConfig extends IWechatRoomServiceConfig, IWechatWebRequestServiceConfig {
    cityId: number
}
