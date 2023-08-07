import { IWechatWebRequestService, IWechatRoomService } from "../../config";

export interface IWeatherConfig extends IWechatRoomService, IWechatWebRequestService {
    cityId: number
}