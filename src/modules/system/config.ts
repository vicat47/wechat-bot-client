import { IWechatWebRequestService, IWechatRoomService } from "../../config";

export interface ISystemConfig extends IWechatRoomService, IWechatWebRequestService {
    prompt?: string
    module: string
    memory: number
}