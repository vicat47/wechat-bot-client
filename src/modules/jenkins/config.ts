import { IWechatWebRequestService, IWechatRoomService } from "../../config"

export interface IJenkinsConfig extends IWechatRoomService, IWechatWebRequestService {}