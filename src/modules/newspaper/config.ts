import { IWebServiceConfig, WechatBoardcastMsg, WechatRoomMsg } from "../../config"

export interface IMorningNewspaperConfig extends WechatRoomMsg, WechatBoardcastMsg, IWebServiceConfig {
    api: string
    localFileName: string
}