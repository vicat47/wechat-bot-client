import { IWechatWebRequestService, IWechatRoomService } from "../../config";

export interface IChatGlmConfig extends IWechatRoomService, IWechatWebRequestService {
}