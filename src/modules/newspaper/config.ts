import { IWechatWebRequestService, WechatBoardcastService, IWechatRoomService } from "../../config"

export interface IMorningNewspaperConfig extends IWechatRoomService, WechatBoardcastService, IWechatWebRequestService {
    api: string
    localFileName: string
}