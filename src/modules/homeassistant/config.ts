import { IWechatWebRequestService, IWechatRoomService } from "../../config";

export interface IHomeAssistantConfig extends IWechatRoomService, IWechatWebRequestService {
    statePath: string;
    sensor: HomeAssistantSensor[]
}

export enum HomeAssistantSensorType {
    PM25 = 1,
    TEMPERATURE = 2,
    HUMIDITY = 3
}

export interface HomeAssistantSensor {
    name?: string,
    type: HomeAssistantSensorType,
    device_id: string
}