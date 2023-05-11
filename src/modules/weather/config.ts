import { IWebServiceConfig, WechatRoomMsg } from "../../config";

export interface IWeatherConfig extends WechatRoomMsg, IWebServiceConfig {
    cityId: number
}